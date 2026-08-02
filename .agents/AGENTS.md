# WPHub Project Master Roadmap

```
STEP 1  Project Foundation              ✅
STEP 2  Monorepo / Workspace            ✅
STEP 3  Authentication                  ✅
STEP 4  Database Foundation             ✅
STEP 5  Site Management                 ✅
STEP 6  Hosting Orchestration           ✅
STEP 7  Real Docker Engine              ✅
STEP 8  Universal Routing               ✅
STEP 9  Universal CMS Provisioning      ✅
STEP 10 SSL / HTTPS / Certificates      ✅
STEP 11 Domains & DNS                   🔜 ← CURRENT FOCUS
STEP 12 File Manager                    🔜
STEP 13 Backup / Restore                🔜
STEP 14 Logs / Metrics                  🔜
STEP 15 Desktop Integration             🔜
STEP 16 Production Hardening            🔜
```

## Architectural Guidelines & Directives
- **Universal CMS Architecture**: Every CMS plugin module must be self-contained in `apps/backend/src/installers/modules/<slug>/` exposing `manifest.json`, `generateConfig()`, `executeInstall()`, and `verifyInstall()`.
- **Zero Hardcoded CMS Routes**: Routing Engine (`siteResolver.ts`, `webServerEngine.ts`, `php-router.php`) delegates all routing natively to isolated site document roots (`public_html`, `public`, `web`, `pub`, `current`).
- **Production Control Panel Standards**: Operates identically to cPanel, Plesk, RunCloud, CyberPanel, and LocalWP.
