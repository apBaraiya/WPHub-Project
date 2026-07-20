import fs from 'fs';
import path from 'path';
import https from 'https';
import { spawn, execSync, exec, ChildProcess } from 'child_process';
import { logger } from '@wphub/utils';
import { prisma, isDbOffline } from '../repositories/prisma';
import { inMemoryDb } from '../repositories/inMemoryDb';

const WORKSPACE_ROOT = path.resolve(process.cwd());
const RUNTIMES_DIR = path.join(WORKSPACE_ROOT, 'runtimes');
const PHP_DIR = path.join(RUNTIMES_DIR, 'php');
const PHP_ZIP_PATH = path.join(RUNTIMES_DIR, 'php.zip');

const PHP_WIN_URL =
  'https://windows.php.net/downloads/releases/archives/php-8.2.12-nts-Win32-vs16-x64.zip';

// MariaDB Paths & Config
const MARIADB_DIR = path.join(RUNTIMES_DIR, 'mariadb');
const MARIADB_ZIP_PATH = path.join(RUNTIMES_DIR, 'mariadb.zip');
const MARIADB_WIN_URL =
  'https://archive.mariadb.org/mariadb-10.11.2/winx64-packages/mariadb-10.11.2-winx64.zip';

// phpMyAdmin Paths & Config
const PMA_DIR = path.join(RUNTIMES_DIR, 'phpmyadmin');
const PMA_ZIP_PATH = path.join(RUNTIMES_DIR, 'phpmyadmin.zip');
const PMA_URL =
  'https://files.phpmyadmin.net/phpMyAdmin/5.2.1/phpMyAdmin-5.2.1-all-languages.zip';

// Track active PHP servers
const activeProcesses = new Map<string, ChildProcess>();
const portMap = new Map<string, number>();
let nextAvailablePort = 8080;

let isPhpReady = false;
let phpCommandPath = 'php'; // Default fallback to system path

let isMariaDbReady = false;
let mariadbProcess: ChildProcess | null = null;
let pmaProcess: ChildProcess | null = null;

// Download helper with redirect support
async function downloadZip(url: string, dest: string): Promise<void> {
  return new Promise((resolve, reject) => {
    logger.info(`Downloading zip from ${url} to ${dest}...`);
    const file = fs.createWriteStream(dest);
    https
      .get(url, (response) => {
        if (
          response.statusCode &&
          response.statusCode >= 300 &&
          response.statusCode < 400 &&
          response.headers.location
        ) {
          file.close();
          fs.unlink(dest, () => {});
          downloadZip(response.headers.location, dest).then(resolve).catch(reject);
          return;
        }
        response.pipe(file);
        file.on('finish', () => {
          file.close();
          resolve();
        });
      })
      .on('error', (err) => {
        file.close();
        fs.unlink(dest, () => {});
        reject(err);
      });
  });
}

function checkSystemPhp(): boolean {
  try {
    execSync('php -v', { stdio: 'ignore' });
    logger.info('System PHP detected on path.');
    isPhpReady = true;
    phpCommandPath = 'php';
    return true;
  } catch (e) {
    return false;
  }
}

async function downloadPHPZip(downloadUrl: string = PHP_WIN_URL): Promise<void> {
  return downloadZip(downloadUrl, PHP_ZIP_PATH);
}

async function extractPHPZip(): Promise<void> {
  logger.info('Extracting PHP runtime...');
  await fs.promises.mkdir(PHP_DIR, { recursive: true });

  const command =
    process.platform === 'win32'
      ? `powershell -Command "Expand-Archive -Path '${PHP_ZIP_PATH}' -DestinationPath '${PHP_DIR}' -Force"`
      : `unzip -o "${PHP_ZIP_PATH}" -d "${PHP_DIR}"`;

  return new Promise((resolve, reject) => {
    exec(command, (err: any) => {
      if (err) {
        reject(err);
      } else {
        // Cleanup zip
        fs.unlink(PHP_ZIP_PATH, () => {});
        resolve();
      }
    });
  });
}

export const runtimeManager = {
  isReady() {
    return isPhpReady;
  },

  getPhpCommand() {
    return phpCommandPath;
  },

  getSitePort(siteId: string): number | undefined {
    return portMap.get(siteId);
  },

  async ensurePHPRuntime() {
    if (checkSystemPhp()) {
      return;
    }

    const localPhpExe = path.join(PHP_DIR, process.platform === 'win32' ? 'php.exe' : 'php');
    if (fs.existsSync(localPhpExe)) {
      logger.info(`Local PHP runtime detected at: ${localPhpExe}`);

      // Auto-verify and write php.ini configurations
      const phpIniPath = path.join(PHP_DIR, 'php.ini');
      const phpIniContent = `[PHP]\r\nextension_dir = "ext"\r\nextension=curl\r\nextension=mbstring\r\nextension=openssl\r\nextension=pdo_sqlite\r\nextension=sqlite3\r\nextension=mysqli\r\n`;
      try {
        fs.writeFileSync(phpIniPath, phpIniContent, 'utf8');
      } catch (iniErr: any) {
        logger.warn(`Could not verify php.ini configuration: ${iniErr.message}`);
      }

      phpCommandPath = localPhpExe;
      isPhpReady = true;
      return;
    }

    // Run downloader asynchronously in the background
    (async () => {
      try {
        await fs.promises.mkdir(RUNTIMES_DIR, { recursive: true });
        await downloadPHPZip();
        await extractPHPZip();

        // Write php.ini configuration to enable extensions
        const phpIniPath = path.join(PHP_DIR, 'php.ini');
        const phpIniContent = `[PHP]\r\nextension_dir = "ext"\r\nextension=curl\r\nextension=mbstring\r\nextension=openssl\r\nextension=pdo_sqlite\r\nextension=sqlite3\r\nextension=mysqli\r\n`;
        try {
          await fs.promises.writeFile(phpIniPath, phpIniContent, 'utf8');
        } catch (iniErr: any) {
          logger.warn(`Could not create php.ini configuration: ${iniErr.message}`);
        }

        phpCommandPath = localPhpExe;
        isPhpReady = true;
        logger.info('Portable PHP runtime successfully installed and ready!');

        // Start loopback servers for all active sites
        try {
          let sitesList: any[] = [];
          if (isDbOffline) {
            sitesList = inMemoryDb.sites.filter((s: any) => s.status === 'ACTIVE');
          } else {
            sitesList = await prisma.site.findMany({ where: { status: 'ACTIVE' } });
          }

          for (const site of sitesList) {
            const sitePath = path.join(WORKSPACE_ROOT, 'sites', site.id);
            const webRoot = path.join(sitePath, 'public_html');
            await runtimeManager.startPhpServer(site.id, webRoot);
          }
        } catch (startErr: any) {
          logger.error(`Error starting site runtimes after PHP load: ${startErr.message}`);
        }
      } catch (err: any) {
        logger.error(
          `Failed downloading/extracting portable PHP: ${err.message}. Using system command fallback.`,
        );
      }
    })();
  },

  async startPhpServer(siteId: string, webRoot: string): Promise<number> {
    if (activeProcesses.has(siteId)) {
      return portMap.get(siteId)!;
    }

    // Find available port
    const port = nextAvailablePort;
    nextAvailablePort++;

    logger.info(`Spawning loopback PHP server for site: ${siteId} on port: ${port}`);

    // Create site webroot if not exists
    await fs.promises.mkdir(webRoot, { recursive: true });

    // Spawn server process using the central PHP router script to prevent 404s on subpages/rewrites
    const routerPath = path.join(RUNTIMES_DIR, 'php-router.php');
    const customIniPath = path.join(WORKSPACE_ROOT, 'sites', siteId, 'config', 'php.ini');
    
    const args = ['-S', `127.0.0.1:${port}`, '-t', webRoot];
    if (fs.existsSync(customIniPath)) {
      args.push('-c', customIniPath);
    }
    args.push(routerPath);

    const proc = spawn(phpCommandPath, args, {
      stdio: 'pipe',
      detached: false,
    });

    proc.stdout.on('data', (data) => {
      logger.info(`[PHP Server ${siteId}]: ${data.toString().trim()}`);
    });

    proc.stderr.on('data', (data) => {
      logger.warn(`[PHP Server ${siteId} Error]: ${data.toString().trim()}`);
    });

    proc.on('error', (err) => {
      logger.error(`PHP server spawn error for site ${siteId}: ${err.message}`);
    });

    activeProcesses.set(siteId, proc);
    portMap.set(siteId, port);

    return port;
  },

  stopPhpServer(siteId: string) {
    const proc = activeProcesses.get(siteId);
    if (proc) {
      proc.kill();
      activeProcesses.delete(siteId);
      portMap.delete(siteId);
      logger.info(`Stopped loopback PHP server for site: ${siteId}`);
    }
  },

  addDomainToHosts(domain: string) {
    const HOSTS_FILE =
      process.platform === 'win32' ? 'C:\\Windows\\System32\\drivers\\etc\\hosts' : '/etc/hosts';

    try {
      if (!fs.existsSync(HOSTS_FILE)) return;
      const content = fs.readFileSync(HOSTS_FILE, 'utf8');
      const line = `127.0.0.1 ${domain}`;

      const regex = new RegExp(`^\\s*127\\.0\\.0\\.1\\s+${domain.replace(/\./g, '\\.')}\\b`, 'm');
      if (!regex.test(content)) {
        try {
          fs.appendFileSync(HOSTS_FILE, `\r\n${line}\r\n`);
          logger.info(`Successfully mapped ${domain} to 127.0.0.1 in hosts file.`);
        } catch (writeErr: any) {
          if (
            process.platform === 'win32' &&
            (writeErr.code === 'EACCES' || writeErr.code === 'EPERM')
          ) {
            logger.info(
              `Permission denied for hosts file. Triggering elevated PowerShell UAC prompt for ${domain}...`,
            );
            const tempScriptPath = path.join(WORKSPACE_ROOT, 'cache', `add-host-${Date.now()}.ps1`);
            const scriptContent = `Add-Content -Path "C:\\Windows\\System32\\drivers\\etc\\hosts" -Value "\`r\`n127.0.0.1 ${domain}\`r\`n"`;
            fs.mkdirSync(path.dirname(tempScriptPath), { recursive: true });
            fs.writeFileSync(tempScriptPath, scriptContent, 'utf8');

            const psCmd =
              `powershell -Command "Start-Process powershell -ArgumentList '-ExecutionPolicy Bypass -File \\"${tempScriptPath}\\"' -Verb RunAs -WindowStyle Hidden"`.replace(
                /\\"/g,
                '""',
              );
            try {
              execSync(psCmd);
            } catch (uacErr: any) {
              logger.warn(`PowerShell hosts file elevation failed: ${uacErr.message}`);
            }

            setTimeout(() => {
              try {
                fs.unlinkSync(tempScriptPath);
              } catch (e) {
                /* ignore */
              }
            }, 5000);
          } else {
            throw writeErr;
          }
        }
      }
    } catch (err: any) {
      logger.error(`Could not write to local hosts file: ${err.message}.`);
    }
  },

  removeDomainFromHosts(domain: string) {
    const HOSTS_FILE =
      process.platform === 'win32' ? 'C:\\Windows\\System32\\drivers\\etc\\hosts' : '/etc/hosts';

    try {
      if (!fs.existsSync(HOSTS_FILE)) return;
      const content = fs.readFileSync(HOSTS_FILE, 'utf8');

      const lines = content.split(/\r?\n/);
      const filteredLines = lines.filter((line) => {
        const trimmed = line.trim();
        return !(trimmed.startsWith('127.0.0.1') && trimmed.includes(domain));
      });

      const newContent = filteredLines.join('\r\n');
      if (content !== newContent) {
        try {
          fs.writeFileSync(HOSTS_FILE, newContent);
          logger.info(`Removed ${domain} mapping from hosts file.`);
        } catch (writeErr: any) {
          if (
            process.platform === 'win32' &&
            (writeErr.code === 'EACCES' || writeErr.code === 'EPERM')
          ) {
            logger.info(
              `Permission denied for hosts file. Triggering elevated PowerShell UAC prompt to remove ${domain}...`,
            );
            const tempScriptPath = path.join(
              WORKSPACE_ROOT,
              'cache',
              `remove-host-${Date.now()}.ps1`,
            );
            const escapedContent = newContent.replace(/"/g, '`"').replace(/`/g, '``');
            const scriptContent = `Set-Content -Path "C:\\Windows\\System32\\drivers\\etc\\hosts" -Value @'\r\n${escapedContent}\r\n'@`;

            fs.mkdirSync(path.dirname(tempScriptPath), { recursive: true });
            fs.writeFileSync(tempScriptPath, scriptContent, 'utf8');

            const psCmd =
              `powershell -Command "Start-Process powershell -ArgumentList '-ExecutionPolicy Bypass -File \\"${tempScriptPath}\\"' -Verb RunAs -WindowStyle Hidden"`.replace(
                /\\"/g,
                '""',
              );
            try {
              execSync(psCmd);
            } catch (uacErr: any) {
              logger.warn(`PowerShell hosts file elevation failed: ${uacErr.message}`);
            }

            setTimeout(() => {
              try {
                fs.unlinkSync(tempScriptPath);
              } catch (e) {
                /* ignore */
              }
            }, 5000);
          } else {
            throw writeErr;
          }
        }
      }
    } catch (err: any) {
      logger.warn(`Could not update hosts file: ${err.message}`);
    }
  },

  isMariaDbReady() {
    return isMariaDbReady;
  },

  getMariaDbDir() {
    return MARIADB_DIR;
  },

  async ensureMariaDBRuntime() {
    const localExe = path.join(
      MARIADB_DIR,
      'bin',
      process.platform === 'win32' ? 'mariadbd.exe' : 'mariadbd',
    );
    if (fs.existsSync(localExe)) {
      logger.info(`Local MariaDB server detected at: ${localExe}`);
      isMariaDbReady = true;
      await this.startMariaDB();
      return;
    }

    try {
      await fs.promises.mkdir(RUNTIMES_DIR, { recursive: true });
      if (!fs.existsSync(MARIADB_ZIP_PATH)) {
        await downloadZip(MARIADB_WIN_URL, MARIADB_ZIP_PATH);
      }

      logger.info('Extracting MariaDB package...');
      const tempExtract = path.join(RUNTIMES_DIR, `temp_mariadb_${Date.now()}`);
      await fs.promises.mkdir(tempExtract, { recursive: true });
      const command =
        process.platform === 'win32'
          ? `powershell -Command "Expand-Archive -Path '${MARIADB_ZIP_PATH}' -DestinationPath '${tempExtract}' -Force"`
          : `unzip -o "${MARIADB_ZIP_PATH}" -d "${tempExtract}"`;

      await new Promise<void>((resolve, reject) => {
        exec(command, (err) => {
          if (err) reject(err);
          else resolve();
        });
      });

      // Locate the wrapper directory and copy files
      const content = await fs.promises.readdir(tempExtract);
      const wrapperDir = content.find((d) => d.startsWith('mariadb-'));
      if (wrapperDir) {
        await fs.promises.cp(path.join(tempExtract, wrapperDir), MARIADB_DIR, {
          recursive: true,
          force: true,
        });
      } else {
        await fs.promises.cp(tempExtract, MARIADB_DIR, { recursive: true, force: true });
      }

      // Cleanup temp folder & zip
      await fs.promises.rm(tempExtract, { recursive: true, force: true }).catch(() => {});
      await fs.promises.unlink(MARIADB_ZIP_PATH).catch(() => {});

      // Initialize database system tables
      logger.info('Initializing MariaDB database engine...');
      const installDbExe = path.join(
        MARIADB_DIR,
        'bin',
        process.platform === 'win32' ? 'mariadb-install-db.exe' : 'mariadb-install-db',
      );
      const initCmd = `"${installDbExe}" --datadir="${path.join(MARIADB_DIR, 'data')}"`;
      await new Promise<void>((resolve, reject) => {
        exec(initCmd, (err) => {
          if (err) {
            logger.error(`MariaDB data init failed: ${err.message}`);
            reject(err);
          } else {
            resolve();
          }
        });
      });

      isMariaDbReady = true;
      logger.info('MariaDB runtime successfully initialized!');
      await this.startMariaDB();
    } catch (err: any) {
      logger.error(`Failed setting up portable MariaDB: ${err.message}`);
    }
  },

  async startMariaDB() {
    if (mariadbProcess) return;
    const daemonExe = path.join(
      MARIADB_DIR,
      'bin',
      process.platform === 'win32' ? 'mariadbd.exe' : 'mariadbd',
    );
    if (!fs.existsSync(daemonExe)) return;

    // Create basic my.ini config
    const myIniPath = path.join(MARIADB_DIR, 'my.ini');
    if (!fs.existsSync(myIniPath)) {
      const myIniContent = `[mysqld]\r\nport=3306\r\nbind-address=127.0.0.1\r\ndatadir=data\r\n`;
      fs.writeFileSync(myIniPath, myIniContent, 'utf8');
    }

    logger.info('Starting portable MariaDB daemon process...');
    mariadbProcess = spawn(daemonExe, ['--defaults-file=' + myIniPath, '--console'], {
      cwd: MARIADB_DIR,
      stdio: 'ignore',
      detached: false,
    });

    mariadbProcess.on('error', (err) => {
      logger.error(`MariaDB daemon error: ${err.message}`);
    });
  },

  async ensurePMARuntime() {
    const localIndex = path.join(PMA_DIR, 'index.php');
    if (fs.existsSync(localIndex)) {
      logger.info('Local phpMyAdmin runtime detected.');
      await this.startPMA();
      return;
    }

    try {
      await fs.promises.mkdir(RUNTIMES_DIR, { recursive: true });
      if (!fs.existsSync(PMA_ZIP_PATH)) {
        await downloadZip(PMA_URL, PMA_ZIP_PATH);
      }

      logger.info('Extracting phpMyAdmin package...');
      const tempExtract = path.join(RUNTIMES_DIR, `temp_pma_${Date.now()}`);
      await fs.promises.mkdir(tempExtract, { recursive: true });
      const command =
        process.platform === 'win32'
          ? `powershell -Command "Expand-Archive -Path '${PMA_ZIP_PATH}' -DestinationPath '${tempExtract}' -Force"`
          : `unzip -o "${PMA_ZIP_PATH}" -d "${tempExtract}"`;

      await new Promise<void>((resolve, reject) => {
        exec(command, (err) => {
          if (err) reject(err);
          else resolve();
        });
      });

      // Locate wrapper directory and copy files
      const content = await fs.promises.readdir(tempExtract);
      const wrapperDir = content.find((d) => d.toLowerCase().startsWith('phpmyadmin-'));
      if (wrapperDir) {
        await fs.promises.cp(path.join(tempExtract, wrapperDir), PMA_DIR, {
          recursive: true,
          force: true,
        });
      } else {
        await fs.promises.cp(tempExtract, PMA_DIR, { recursive: true, force: true });
      }

      // Cleanup temp folder & zip
      await fs.promises.rm(tempExtract, { recursive: true, force: true }).catch(() => {});
      await fs.promises.unlink(PMA_ZIP_PATH).catch(() => {});

      // Write phpMyAdmin config file
      const configPath = path.join(PMA_DIR, 'config.inc.php');
      const configContent = `<?php\r\n$cfg['Servers'][1]['host'] = '127.0.0.1';\r\n$cfg['Servers'][1]['port'] = '3306';\r\n$cfg['Servers'][1]['auth_type'] = 'config';\r\n$cfg['Servers'][1]['user'] = 'root';\r\n$cfg['Servers'][1]['password'] = '';\r\n$cfg['Servers'][1]['AllowNoPassword'] = true;\r\n$cfg['blowfish_secret'] = 'wphub_blowfish_secret_hash_key_32_chars';\r\n`;
      await fs.promises.writeFile(configPath, configContent, 'utf8');

      logger.info('phpMyAdmin runtime successfully initialized!');
      await this.startPMA();
    } catch (err: any) {
      logger.error(`Failed setting up portable phpMyAdmin: ${err.message}`);
    }
  },

  async startPMA() {
    if (pmaProcess) return;
    logger.info('Starting portable phpMyAdmin server on port 8090...');
    pmaProcess = spawn(phpCommandPath, ['-S', '127.0.0.1:8090', '-t', PMA_DIR], {
      stdio: 'ignore',
      detached: false,
    });

    pmaProcess.on('error', (err) => {
      logger.error(`phpMyAdmin process start error: ${err.message}`);
    });
  },

  async runMariaDBQuery(query: string): Promise<string> {
    const mysqlExe = path.join(
      MARIADB_DIR,
      'bin',
      process.platform === 'win32' ? 'mysql.exe' : 'mysql',
    );
    // Escape double quotes in query for command line execution
    const escapedQuery = query.replace(/"/g, '\\"');
    const cmd = `"${mysqlExe}" -h 127.0.0.1 -P 3306 -u root -e "${escapedQuery}"`;
    return new Promise((resolve, reject) => {
      exec(cmd, (err, stdout, stderr) => {
        if (err) reject(new Error(stderr || err.message));
        else resolve(stdout);
      });
    });
  },

  async ensureAllRuntimes() {
    try {
      await this.ensurePHPRuntime();
    } catch (e: any) {
      logger.error(`Failed ensuring PHP: ${e.message}`);
    }

    // Write central php-router.php script dynamically to prevent subpage 404s in built-in PHP dev server
    try {
      const routerScriptPath = path.join(RUNTIMES_DIR, 'php-router.php');
      const routerContent = `<?php
$root = $_SERVER['DOCUMENT_ROOT'];
chdir($root);
$path = '/' . ltrim(parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH), '/');

if (file_exists($root . $path)) {
    return false;
}

if (file_exists($root . '/index.php')) {
    $_SERVER['SCRIPT_NAME'] = '/index.php';
    $_SERVER['SCRIPT_FILENAME'] = $root . '/index.php';
    $_SERVER['PHP_SELF'] = '/index.php';
    include $root . '/index.php';
} else {
    return false;
}
`;
      await fs.promises.mkdir(RUNTIMES_DIR, { recursive: true });
      await fs.promises.writeFile(routerScriptPath, routerContent, 'utf8');
      logger.info('Successfully generated central php-router.php script.');
    } catch (err: any) {
      logger.error(`Failed generating php-router.php: ${err.message}`);
    }

    this.ensureMariaDBRuntime().catch((e) => {
      logger.error(`Failed ensuring MariaDB: ${e.message}`);
    });

    this.ensurePMARuntime().catch((e) => {
      logger.error(`Failed ensuring phpMyAdmin: ${e.message}`);
    });
  },
};
