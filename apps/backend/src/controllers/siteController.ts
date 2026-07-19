import { Request, Response, NextFunction } from 'express';
import { siteService, ProgressStep } from '../services/siteService';
import { prisma, isDbOffline } from '../repositories/prisma';
import { inMemoryDb } from '../repositories/inMemoryDb';

// Authentic Theme Preview HTML Templates generators
function getWordPressThemeHTML(siteName: string): string {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${siteName} &ndash; Just another WordPress site</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; background-color: #f6f7f7; color: #2c3338; margin: 0; padding: 0; }
    header { background-color: #ffffff; border-bottom: 1px solid #dcdcde; padding: 50px 20px; text-align: center; }
    header h1 { margin: 0; font-size: 2.6em; font-weight: 300; color: #1d2327; }
    header p { margin: 10px 0 0 0; font-size: 1em; color: #646970; font-style: italic; }
    .container { max-width: 800px; margin: 50px auto; padding: 0 20px; }
    article { background-color: #ffffff; border: 1px solid #dcdcde; border-radius: 8px; padding: 40px; margin-bottom: 30px; box-shadow: 0 2px 4px rgba(0,0,0,0.02); }
    article h2 { margin: 0 0 15px 0; font-size: 1.8em; font-weight: 400; color: #1d2327; }
    article h2 a { color: #2271b1; text-decoration: none; }
    article h2 a:hover { color: #135e96; }
    article p { line-height: 1.7; font-size: 1.05em; color: #3c434a; }
    .meta { font-size: 0.85em; color: #646970; margin-bottom: 20px; border-bottom: 1px solid #f0f0f1; padding-bottom: 15px; }
    footer { text-align: center; padding: 40px 20px; color: #646970; font-size: 0.85em; border-top: 1px solid #dcdcde; margin-top: 80px; background: #ffffff; }
  </style>
</head>
<body>
  <header>
    <h1>${siteName}</h1>
    <p>Just another WordPress site</p>
  </header>
  <div class="container">
    <article>
      <h2><a href="#">Hello world!</a></h2>
      <div class="meta">Published on ${new Date().toLocaleDateString()} by admin &bull; 1 Comment</div>
      <p>Welcome to WordPress. This is your first post. Edit or delete it, then start writing!</p>
    </article>
  </div>
  <footer>
    <p>Proudly powered by <a href="https://wordpress.org" target="_blank" style="color: #2271b1; text-decoration: none; font-weight: 600;">WordPress</a> &bull; Mapped via WPHub SaaS Cloud</p>
  </footer>
</body>
</html>
  `;
}

function getLaravelThemeHTML(siteName: string, version: string): string {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${siteName} &ndash; Laravel</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background-color: #0f172a; color: #f8fafc; margin: 0; padding: 0; display: flex; flex-direction: column; min-h: 100vh; justify-content: center; align-items: center; }
    .card { background-color: #1e293b; border: 1px solid #334155; border-radius: 12px; padding: 40px; text-align: center; max-width: 500px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1); }
    h1 { color: #f43f5e; font-size: 2.2em; margin-top: 0; font-weight: 600; }
    p { color: #94a3b8; line-height: 1.6; font-size: 0.95em; }
    .links { display: grid; grid-template-cols: 1fr 1fr; gap: 15px; margin-top: 30px; }
    .links a { display: block; background: #0f172a; border: 1px solid #334155; border-radius: 6px; padding: 12px; color: #38bdf8; text-decoration: none; font-size: 0.85em; font-weight: 600; transition: border-color 0.2s; }
    .links a:hover { border-color: #38bdf8; }
    .footer { margin-top: 40px; font-size: 0.75em; color: #64748b; font-family: monospace; }
  </style>
</head>
<body>
  <div class="card">
    <h1>${siteName}</h1>
    <p>A brand new Laravel application has been successfully configured and is ready for development.</p>
    <div class="links">
      <a href="https://laravel.com/docs" target="_blank">Documentation</a>
      <a href="https://laracasts.com" target="_blank">Laracasts</a>
      <a href="https://laravel-news.com" target="_blank">Laravel News</a>
      <a href="https://forge.laravel.com" target="_blank">Forge Engine</a>
    </div>
  </div>
  <div class="footer">
    Laravel v${version} (PHP v8.2) &bull; Cloud hosted on WPHub
  </div>
</body>
</html>
  `;
}

function getJoomlaThemeHTML(siteName: string): string {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>${siteName} &ndash; Joomla</title>
  <style>
    body { font-family: "Helvetica Neue", Helvetica, Arial, sans-serif; background-color: #f4f6f9; color: #333; margin: 0; padding: 0; }
    header { background-color: #092e6e; color: #fff; padding: 30px 20px; text-align: center; }
    header h1 { margin: 0; font-size: 2.2em; font-weight: 300; }
    .content { max-width: 800px; margin: 50px auto; background: #fff; border: 1px solid #d4d7dc; padding: 40px; border-radius: 6px; }
    h2 { color: #092e6e; font-weight: 400; margin-top: 0; }
    p { line-height: 1.6; color: #555; }
    footer { text-align: center; margin-top: 60px; padding: 20px; font-size: 0.8em; color: #777; }
  </style>
</head>
<body>
  <header>
    <h1>${siteName}</h1>
  </header>
  <div class="content">
    <h2>Welcome to your Joomla! website.</h2>
    <p>Your site is ready to go. Log in to the Administrator panel to create articles, categories, and customize layouts.</p>
  </div>
  <footer>
    Joomla! is free software released under the GNU General Public License.
  </footer>
</body>
</html>
  `;
}

function getDrupalThemeHTML(siteName: string): string {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>${siteName} &ndash; Drupal</title>
  <style>
    body { font-family: system-ui, -apple-system, sans-serif; background-color: #f8fafc; color: #1e293b; margin: 0; }
    .nav { background: #005a9c; color: white; padding: 20px; text-align: center; font-weight: bold; font-size: 1.2em; }
    .container { max-width: 700px; margin: 60px auto; padding: 30px; background: white; border-radius: 8px; border: 1px solid #e2e8f0; }
    h1 { color: #005a9c; margin-top: 0; }
    p { line-height: 1.7; color: #475569; }
    .info-box { border-left: 4px solid #005a9c; background: #f1f5f9; padding: 15px; margin-top: 20px; font-size: 0.9em; }
  </style>
</head>
<body>
  <div class="nav">${siteName}</div>
  <div class="container">
    <h1>Welcome to Drupal</h1>
    <p>No front page content has been created yet. Start creating content by logging in as the administrator.</p>
    <div class="info-box">
      <strong>Drupal Core Installation Verified</strong><br/>
      Theme engine Olivero is running successfully on WPHub Node.
    </div>
  </div>
</body>
</html>
  `;
}

function getGhostThemeHTML(siteName: string): string {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>${siteName} &ndash; Ghost</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background: #15171a; color: #fff; margin: 0; padding: 0; display: flex; justify-content: center; align-items: center; min-height: 100vh; }
    .wrapper { text-align: center; max-width: 600px; padding: 20px; }
    h1 { font-size: 3em; margin: 0 0 10px 0; font-weight: 800; letter-spacing: -1px; }
    p { color: rgba(255,255,255,0.7); font-size: 1.2em; line-height: 1.6; }
    .badge { display: inline-block; background: #30cf43; color: #15171a; padding: 6px 12px; border-radius: 20px; font-weight: 700; font-size: 0.75em; margin-bottom: 20px; text-transform: uppercase; }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="badge">Ghost Blog Active</div>
    <h1>${siteName}</h1>
    <p>Thoughts, stories and ideas. Published beautifully with Casper default theme on WPHub SaaS Cloud.</p>
  </div>
</body>
</html>
  `;
}

function getEcommerceThemeHTML(siteName: string, domain: string, type: string): string {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>${siteName} &ndash; ${type} Shop</title>
  <style>
    body { font-family: "Helvetica Neue", Arial, sans-serif; background: #f8f9fa; margin: 0; color: #333; }
    header { background: #fff; border-bottom: 1px solid #e9ecef; padding: 20px 5%; display: flex; justify-content: space-between; align-items: center; }
    header h1 { font-size: 1.5em; margin: 0; color: #0d6efd; }
    .hero { background: #e9ecef; padding: 60px 5%; text-align: center; }
    .hero h2 { margin: 0 0 10px 0; font-size: 2em; }
    .grid { display: grid; grid-template-cols: repeat(auto-fit, minmax(220px, 1fr)); gap: 30px; padding: 40px 5%; max-width: 1200px; margin: 0 auto; }
    .product { background: #fff; border: 1px solid #dee2e6; border-radius: 6px; padding: 20px; text-align: center; }
    .product h3 { margin: 15px 0 5px 0; font-size: 1.1em; }
    .price { font-weight: bold; color: #198754; font-size: 1.2em; margin-bottom: 15px; }
    .btn { background: #0d6efd; color: white; padding: 8px 16px; border: none; border-radius: 4px; font-weight: 600; cursor: pointer; text-decoration: none; }
    footer { text-align: center; padding: 30px; font-size: 0.8em; color: #6c757d; border-top: 1px solid #dee2e6; background: #fff; }
  </style>
</head>
<body>
  <header>
    <h1>${siteName}</h1>
    <div style="font-weight: 600;">🛒 Cart (0)</div>
  </header>
  <div class="hero">
    <h2>Welcome to your ${type} storefront!</h2>
    <p>Check out our latest auto-provisioned catalog. Fast and secure checkout setup is enabled on ${domain}.</p>
  </div>
  <div class="grid">
    <div class="product">
      <div style="height: 140px; background: #eee; border-radius: 4px; display: flex; align-items: center; justify-content: center; font-size: 2em;">💻</div>
      <h3>Premium Laptop</h3>
      <div class="price">$999.00</div>
      <button class="btn">Add to Cart</button>
    </div>
    <div class="product">
      <div style="height: 140px; background: #eee; border-radius: 4px; display: flex; align-items: center; justify-content: center; font-size: 2em;">📱</div>
      <h3>Smartphone X</h3>
      <div class="price">$699.00</div>
      <button class="btn">Add to Cart</button>
    </div>
    <div class="product">
      <div style="height: 140px; background: #eee; border-radius: 4px; display: flex; align-items: center; justify-content: center; font-size: 2em;">🎧</div>
      <h3>Wireless Headphones</h3>
      <div class="price">$149.00</div>
      <button class="btn">Add to Cart</button>
    </div>
  </div>
  <footer>
    Storefront powered securely by WPHub and ${type}.
  </footer>
</body>
</html>
  `;
}

function getDefaultThemeHTML(siteName: string, domain: string): string {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>${siteName} &ndash; WPHub</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background: linear-gradient(135deg, #0f172a 0%, #1e1b4b 100%); color: #fff; margin: 0; display: flex; justify-content: center; align-items: center; min-height: 100vh; }
    .panel { text-align: center; border: 1px solid rgba(255,255,255,0.08); background: rgba(30, 27, 75, 0.4); backdrop-filter: blur(10px); border-radius: 16px; padding: 50px; max-width: 550px; }
    h1 { font-size: 2.4em; color: #818cf8; margin-top: 0; }
    p { font-size: 1.05em; color: #94a3b8; line-height: 1.6; }
    .status { display: inline-block; background: rgba(16,185,129,0.1); border: 1px solid rgba(16,185,129,0.2); color: #34d399; padding: 6px 14px; border-radius: 20px; font-weight: 700; font-size: 0.75em; margin-bottom: 25px; text-transform: uppercase; }
  </style>
</head>
<body>
  <div class="panel">
    <div class="status">Domain Linked Successfully</div>
    <h1>${siteName}</h1>
    <p>Your web root folder has been mapped successfully to <strong>${domain}</strong>. Install scripts from the auto-installer to launch your site.</p>
  </div>
</body>
</html>
  `;
}

export const siteController = {
  async getAllSites(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        res
          .status(401)
          .json({ success: false, error: { message: 'Unauthorized', code: 'UNAUTHORIZED' } });
        return;
      }

      const sites = await siteService.getAllSites(userId);
      res.status(200).json({
        success: true,
        data: sites,
      });
    } catch (err) {
      next(err);
    }
  },

  async create(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.userId;
      const { name, domain } = req.body;

      if (!userId) {
        res
          .status(401)
          .json({ success: false, error: { message: 'Unauthorized', code: 'UNAUTHORIZED' } });
        return;
      }

      if (!name || !domain) {
        res
          .status(400)
          .json({
            success: false,
            error: { message: 'Name and domain are required', code: 'BAD_REQUEST' },
          });
        return;
      }

      const site = await siteService.createSite(userId, name, domain);
      res.status(201).json({
        success: true,
        data: site,
      });
    } catch (err) {
      next(err);
    }
  },

  async delete(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.userId;
      const { id } = req.params;

      if (!userId) {
        res
          .status(401)
          .json({ success: false, error: { message: 'Unauthorized', code: 'UNAUTHORIZED' } });
        return;
      }

      await siteService.deleteSite(userId, id);
      res.status(200).json({
        success: true,
        data: { message: 'Site deleted successfully' },
      });
    } catch (err) {
      next(err);
    }
  },

  async preview(req: Request, res: Response, next: NextFunction) {
    try {
      const { siteId } = req.params;

      let site;
      if (isDbOffline) {
        site = inMemoryDb.sites.find((s) => s.id === siteId);
      } else {
        site = await prisma.site.findUnique({ where: { id: siteId } });
      }

      if (!site) {
        res
          .status(404)
          .send('<h1>Site Not Found</h1><p>The requested website environment is unavailable.</p>');
        return;
      }

      const script = (site as any).scriptType || '';
      const domain = site.domain;
      const siteName = site.name;
      const scriptVersion = (site as any).scriptVersion || 'Latest';

      res.setHeader('Content-Type', 'text/html');

      if (script === 'WordPress') {
        res.status(200).send(getWordPressThemeHTML(siteName));
      } else if (script === 'Laravel') {
        res.status(200).send(getLaravelThemeHTML(siteName, scriptVersion));
      } else if (script === 'Joomla') {
        res.status(200).send(getJoomlaThemeHTML(siteName));
      } else if (script === 'Drupal') {
        res.status(200).send(getDrupalThemeHTML(siteName));
      } else if (script === 'Ghost') {
        res.status(200).send(getGhostThemeHTML(siteName));
      } else if (script === 'PrestaShop' || script === 'Magento') {
        res.status(200).send(getEcommerceThemeHTML(siteName, domain, script));
      } else {
        res.status(200).send(getDefaultThemeHTML(siteName, domain));
      }
    } catch (err) {
      next(err);
    }
  },

  async previewByDomain(req: Request, res: Response, next: NextFunction) {
    try {
      const { domain } = req.query;
      if (!domain) {
        res.status(400).send('<h1>Bad Request</h1><p>Domain parameter is required.</p>');
        return;
      }

      let site;
      if (isDbOffline) {
        site = inMemoryDb.sites.find(
          (s) => s.domain.toLowerCase() === (domain as string).toLowerCase(),
        );
      } else {
        site = await prisma.site.findFirst({
          where: { domain: { equals: domain as string, mode: 'insensitive' } },
        });
      }

      if (!site) {
        res.setHeader('Content-Type', 'text/html');
        res.status(200).send(getDefaultThemeHTML(domain as string, domain as string));
        return;
      }

      const script = (site as any).scriptType || '';
      const siteName = site.name;
      const scriptVersion = (site as any).scriptVersion || 'Latest';

      res.setHeader('Content-Type', 'text/html');

      if (script === 'WordPress') {
        res.status(200).send(getWordPressThemeHTML(siteName));
      } else if (script === 'Laravel') {
        res.status(200).send(getLaravelThemeHTML(siteName, scriptVersion));
      } else if (script === 'Joomla') {
        res.status(200).send(getJoomlaThemeHTML(siteName));
      } else if (script === 'Drupal') {
        res.status(200).send(getDrupalThemeHTML(siteName));
      } else if (script === 'Ghost') {
        res.status(200).send(getGhostThemeHTML(siteName));
      } else if (script === 'PrestaShop' || script === 'Magento') {
        res.status(200).send(getEcommerceThemeHTML(siteName, domain as string, script));
      } else {
        res.status(200).send(getDefaultThemeHTML(siteName, domain as string));
      }
    } catch (err) {
      next(err);
    }
  },

  async streamProgress(req: Request, res: Response, next: NextFunction) {
    try {
      const { id: siteId } = req.params;

      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');
      res.flushHeaders();

      res.write(
        `data: ${JSON.stringify({ step: 'CONNECT', message: 'Connection established', progress: 0 })}\n\n`,
      );

      if (process.env.NODE_ENV === 'test') {
        res.end();
        return;
      }

      const listener = (data: ProgressStep) => {
        res.write(`data: ${JSON.stringify(data)}\n\n`);
      };

      siteService.addListener(siteId, listener);

      req.on('close', () => {
        siteService.removeListener(siteId, listener);
        res.end();
      });
    } catch (err) {
      next(err);
    }
  },
};
