import assert from 'assert';
import fs from 'fs';
import path from 'path';
import { sslService } from './sslService';
import wordpressPlugin from '../installers/modules/wordpress';
import laravelPlugin from '../installers/modules/laravel';
import ghostPlugin from '../installers/modules/ghost';

async function runSslTests() {
  console.log('Starting STEP 10 — Universal SSL / HTTPS / Certificate Management & CMS Enforcement Tests...');
  const testHost = 'test-ssl-domain.wphub.cloud';

  sslService.ensureStorageDirs();

  // Test 1: Pre-requisite DNS Verification
  const dnsResult = await sslService.verifyDns(testHost);
  assert.strictEqual(dnsResult.valid, true, 'DNS verification for cloud subdomain should be valid');
  console.log('✔ Test 1 Passed: DNS verification succeeded.');

  // Test 2: Provision Certificate
  const certMeta = await sslService.provisionCertificate(testHost);
  assert.strictEqual(certMeta.hostname, testHost);
  assert.strictEqual(certMeta.status, 'ACTIVE');
  assert.strictEqual(certMeta.issuer, "Let's Encrypt");
  assert.strictEqual(certMeta.httpsValid, true);

  const keyPath = path.join(process.cwd(), 'runtimes', 'ssl', `${testHost}.key`);
  const crtPath = path.join(process.cwd(), 'runtimes', 'ssl', `${testHost}.crt`);

  assert.strictEqual(fs.existsSync(keyPath), true, 'Key file should exist in infrastructure storage');
  assert.strictEqual(fs.existsSync(crtPath), true, 'Certificate file should exist in infrastructure storage');

  const keyContent = fs.readFileSync(keyPath, 'utf8');
  assert.ok(keyContent.includes('-----BEGIN PRIVATE KEY-----'), 'Key content should be valid PEM');
  console.log('✔ Test 2 Passed: Automatic TLS certificate provisioning & secure key storage succeeded.');

  // Test 3: Traefik dynamic YAML configuration & HTTP -> HTTPS redirect rule
  const yamlPath = path.join(process.cwd(), 'wphub', 'infrastructure', 'traefik', 'dynamic', `ssl-${testHost}.json`);
  assert.strictEqual(fs.existsSync(yamlPath), true, 'Traefik dynamic config file should exist');

  const content = fs.readFileSync(yamlPath, 'utf8');
  const parsed = JSON.parse(content);
  assert.strictEqual(
    parsed.http.middlewares['forwarded-headers'].headers.customRequestHeaders['X-Forwarded-Proto'],
    'https',
    'X-Forwarded-Proto header should be https',
  );
  assert.strictEqual(
    parsed.http.middlewares['redirect-to-https'].redirectScheme.scheme,
    'https',
    'HTTP router should use redirectScheme https',
  );
  console.log('✔ Test 3 Passed: Traefik dynamic config & X-Forwarded-Proto header verification succeeded.');

  // Test 4: Auto renewal check
  const renewResult = await sslService.checkAndRenewCertificates();
  assert.ok(renewResult.checked > 0, 'Should check active certificates');
  console.log('✔ Test 4 Passed: Certificate expiry tracking & renewal check succeeded.');

  // Test 5: Safe deletion & isolation
  const isolatedHost = 'isolated-site.wphub.cloud';
  await sslService.provisionCertificate(isolatedHost);
  const statusBefore = await sslService.getCertificateStatus(isolatedHost);
  assert.ok(statusBefore !== null, 'Certificate should exist before deletion');

  await sslService.deleteCertificate(isolatedHost);
  const statusAfter = await sslService.getCertificateStatus(isolatedHost);
  assert.strictEqual(statusAfter, null, 'Certificate should be null after deletion');
  console.log('✔ Test 5 Passed: Site isolation & certificate deletion succeeded.');

  // Test 6: Canonical Protocol Resolution
  const proto = await sslService.getCanonicalDomainProtocol(testHost);
  assert.strictEqual(proto, 'https', 'Canonical protocol for active domain should be https');
  console.log('✔ Test 6 Passed: Canonical domain protocol resolution returned "https".');

  // Test 7: WordPress wp-config.php Reverse Proxy Header Generation
  const dummyWebRoot = path.join(process.cwd(), 'tmp_test_wp_' + Date.now());
  await fs.promises.mkdir(dummyWebRoot, { recursive: true });
  await wordpressPlugin.generateConfig!({
    siteId: 'test-wp',
    domain: testHost,
    sitePath: dummyWebRoot,
    webRoot: dummyWebRoot,
    config: {
      siteId: 'test-wp',
      appName: 'WordPress',
      appVersion: '6.4.3',
      protocol: 'https',
      domain: testHost,
      directory: '',
      siteName: 'Test WP',
      siteDescription: '',
      adminUser: 'admin',
      adminPass: 'pass',
      adminEmail: 'admin@test.com',
      dbPrefix: 'wp_',
    },
    dbConfig: {
      dbName: 'test',
      dbUser: 'root',
      dbPass: 'pass',
      dbHost: '127.0.0.1',
      dbPort: 3306,
    },
  });

  const wpConfigGenerated = fs.readFileSync(path.join(dummyWebRoot, 'wp-config.php'), 'utf8');
  assert.ok(
    wpConfigGenerated.includes('HTTP_X_FORWARDED_PROTO'),
    'wp-config.php must handle HTTP_X_FORWARDED_PROTO for HTTPS detection',
  );
  assert.ok(
    wpConfigGenerated.includes("$_SERVER['HTTPS'] = 'on'"),
    'wp-config.php must set $_SERVER["HTTPS"] = "on" when forwarded proto is https',
  );
  console.log('✔ Test 7 Passed: WordPress wp-config.php reverse-proxy header generation verified.');

  // Test 8: Laravel & Ghost HTTPS Configuration
  const dummyLaravelRoot = path.join(process.cwd(), 'tmp_test_laravel_' + Date.now(), 'public');
  await fs.promises.mkdir(dummyLaravelRoot, { recursive: true });
  await laravelPlugin.generateConfig!({
    siteId: 'test-laravel',
    domain: testHost,
    sitePath: path.dirname(dummyLaravelRoot),
    webRoot: dummyLaravelRoot,
    config: {
      siteId: 'test-laravel',
      appName: 'Laravel',
      appVersion: '10.x',
      protocol: 'https',
      domain: testHost,
      directory: '',
      siteName: 'Test Laravel',
      siteDescription: '',
      adminUser: 'admin',
      adminPass: 'pass',
      adminEmail: 'admin@test.com',
      dbPrefix: '',
    },
    dbConfig: {
      dbName: 'test',
      dbUser: 'root',
      dbPass: 'pass',
      dbHost: '127.0.0.1',
      dbPort: 3306,
    },
  });

  const envGenerated = fs.readFileSync(path.join(dummyLaravelRoot, '..', '.env'), 'utf8');
  assert.ok(
    envGenerated.includes(`APP_URL=https://${testHost}`),
    'Laravel .env must set APP_URL with https:// scheme',
  );
  console.log('✔ Test 8 Passed: Laravel .env APP_URL HTTPS configuration verified.');

  // Test 9: Existing HTTP Site Sync / Migration to HTTPS
  const dummyGhostRoot = path.join(process.cwd(), 'tmp_test_ghost_' + Date.now());
  await fs.promises.mkdir(dummyGhostRoot, { recursive: true });
  await ghostPlugin.generateConfig!({
    siteId: 'test-ghost',
    domain: testHost,
    sitePath: dummyGhostRoot,
    webRoot: dummyGhostRoot,
    config: {
      siteId: 'test-ghost',
      appName: 'Ghost',
      appVersion: '5.75.0',
      protocol: 'http',
      domain: testHost,
      directory: '',
      siteName: 'Test Ghost',
      siteDescription: '',
      adminUser: 'admin',
      adminPass: 'pass',
      adminEmail: 'admin@test.com',
      dbPrefix: '',
    },
    dbConfig: {
      dbName: 'test',
      dbUser: 'root',
      dbPass: 'pass',
      dbHost: '127.0.0.1',
      dbPort: 3306,
    },
  });

  await sslService.syncSiteHttpsConfig('test-ghost', testHost, dummyGhostRoot);
  const ghostConfigSynced = JSON.parse(fs.readFileSync(path.join(dummyGhostRoot, 'config.production.json'), 'utf8'));
  assert.strictEqual(ghostConfigSynced.url, `https://${testHost}`, 'Ghost site config must sync URL to https://');
  console.log('✔ Test 9 Passed: Existing site HTTPS migration/sync verified.');

  // Cleanup temporary test directories
  await fs.promises.rm(dummyWebRoot, { recursive: true, force: true }).catch(() => {});
  await fs.promises.rm(path.dirname(dummyLaravelRoot), { recursive: true, force: true }).catch(() => {});
  await fs.promises.rm(dummyGhostRoot, { recursive: true, force: true }).catch(() => {});

  // Cleanup test host
  await sslService.deleteCertificate(testHost);
  console.log('🎉 ALL STEP 10 UNIVERSAL SSL / HTTPS & CMS ENFORCEMENT TESTS PASSED SUCCESSFULLY!');
}

runSslTests().catch((err) => {
  console.error('❌ SSL Test Failure:', err);
  process.exit(1);
});
