import React, { useState, useEffect } from 'react';
import { api } from '../../api/client';
import { Button } from '@wphub/ui';
import {
  Sparkles,
  Download,
  ShieldCheck,
  ArrowLeft,
  Loader2,
  CheckCircle2,
  AlertTriangle,
  Eye,
  EyeOff,
} from 'lucide-react';

interface InstallerItem {
  name: string;
  category: 'CMS' | 'Framework' | 'E-Commerce' | 'Blog';
  desc: string;
  version: string;
  versions: string[];
  svgIcon: React.ReactNode;
}

// Inline official SVG paths to guarantee rendering without network requests
const WP_SVG = (
  <svg className="h-6 w-6 text-sky-500 fill-current" viewBox="0 0 24 24">
    <path d="M12 2C6.477 2 2 6.477 2 12c0 1.944.553 3.755 1.516 5.29L8.71 5.926c.725-.098 1.4-.09 1.4-.09.39-.02.35-.583-.04-.583-.75.02-2.09.02-3.15 0-.39 0-.41.564-.02.583.5.02.93.07.93.07l2.87 7.824-1.92 5.534L5.67 9.17s.35-.07.6-.07c.39 0 .39-.583 0-.583-.64.02-1.63.02-2.43 0-.39 0-.39.583 0 .583.35.02.67.07.67.07l3.65 10c-3.1-2-4.16-6.13-2.16-9.23C7.4 7.57 9.57 6.4 12 6.4c1.1 0 2.15.22 3.12.63l-.78 2.22c-.67-.18-1.25-.21-1.74-.21-1.12 0-2.23.49-2.9 1.93l-1.94 5.58 4.79-14.34c.75-.02 1.34-.09 1.34-.09.39 0 .39-.583 0-.583-.75.02-1.98.02-2.9 0-.39 0-.39.583 0 .583.47.02.83.07.83.07l1.37 3.74L15.3 16.3c1.78-4.5 1.9-7.8 1-9.5-.78-1.46-2.22-2.8-4.3-2.8zM12 0c6.627 0 12 5.373 12 12s-5.373 12-12 12S0 18.627 0 12 5.373 0 12 0z" />
  </svg>
);

const LARAVEL_SVG = (
  <svg className="h-6 w-6 text-red-500 fill-current" viewBox="0 0 24 24">
    <path d="M5.4 1.2h13.2L24 7.2v15.6l-5.4-3V7.2L13.2 4.2 8 7.2v12.6L2.6 17V4.2l2.8-3zm13.2 3l2.8 1.6-2.8 1.6-2.8-1.6 2.8-1.6zM8 8l2.8 1.6-2.8 1.6L5.2 9.6 8 8zm0 5.6l2.8 1.6-2.8 1.6-2.8-1.6 2.8-1.6z" />
  </svg>
);

const JOOMLA_SVG = (
  <svg className="h-6 w-6 text-amber-500 fill-current" viewBox="0 0 24 24">
    <path d="M12 0a12 12 0 1 0 12 12A12 12 0 0 0 12 0zm-1.8 17.5a1.8 1.8 0 1 1 1.8-1.8 1.8 1.8 0 0 1-1.8 1.8zm3.6-7.2a1.8 1.8 0 1 1 1.8-1.8 1.8 1.8 0 0 1-1.8 1.8zm-7.2 0a1.8 1.8 0 1 1 1.8-1.8 1.8 1.8 0 0 1-1.8 1.8zm3.6-3.6a1.8 1.8 0 1 1 1.8-1.8 1.8 1.8 0 0 1-1.8 1.8z" />
  </svg>
);

const DRUPAL_SVG = (
  <svg className="h-6 w-6 text-blue-500 fill-current" viewBox="0 0 24 24">
    <path d="M12 0c-3.1 4-6 8.5-6 11.5 0 3.3 2.7 6 6 6s6-2.7 6-6c0-3-2.9-7.5-6-11.5zm0 14c-1.7 0-3-1.3-3-3s1.3-3 3-3 3 1.3 3 3-1.3 3-3 3z" />
  </svg>
);

const GHOST_SVG = (
  <svg className="h-6 w-6 text-emerald-400 fill-current" viewBox="0 0 24 24">
    <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.4 16.2H6.6v-1.8h10.8v1.8zm0-3.6H6.6v-1.8h10.8v1.8zm0-3.6H6.6V7.2h10.8v1.8z" />
  </svg>
);

const PRESTASHOP_SVG = (
  <svg className="h-6 w-6 text-pink-500 fill-current" viewBox="0 0 24 24">
    <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm1.2 16.8h-2.4v-4.8h2.4v4.8zm0-7.2h-2.4V7.2h2.4v2.4z" />
  </svg>
);

const MAGENTO_SVG = (
  <svg className="h-6 w-6 text-orange-500 fill-current" viewBox="0 0 24 24">
    <path d="M12 0L2.4 5.5v11L12 22l9.6-5.5v-11L12 0zm4.8 14.8l-4.8 2.7-4.8-2.7v-5.6l4.8 2.8 4.8-2.8v5.6z" />
  </svg>
);

const installers: InstallerItem[] = [
  {
    name: 'WordPress',
    category: 'CMS',
    desc: 'The worlds most popular website builder and blogging publishing engine.',
    version: '6.4.3',
    versions: ['6.4.3', '6.3.2', '6.2.1'],
    svgIcon: WP_SVG,
  },
  {
    name: 'Laravel',
    category: 'Framework',
    desc: 'Elegant, modern web application framework for developers using PHP.',
    version: '10.3.4',
    versions: ['10.3.4', '9.5.2', '8.8.3'],
    svgIcon: LARAVEL_SVG,
  },
  {
    name: 'Ghost',
    category: 'Blog',
    desc: 'Professional publishing platform designed standardly for newsletters.',
    version: '5.75.0',
    versions: ['5.75.0', '4.48.0', '3.42.0'],
    svgIcon: GHOST_SVG,
  },
  {
    name: 'Drupal',
    category: 'CMS',
    desc: 'Enterprise content management framework for high-traffic environments.',
    version: '10.2.1',
    versions: ['10.2.1', '9.5.0', '8.9.20'],
    svgIcon: DRUPAL_SVG,
  },
  {
    name: 'Joomla',
    category: 'CMS',
    desc: 'Award-winning content management system with native multilingual features.',
    version: '5.0.2',
    versions: ['5.0.2', '4.4.0', '3.10.12'],
    svgIcon: JOOMLA_SVG,
  },
  {
    name: 'PrestaShop',
    category: 'E-Commerce',
    desc: 'Efficient and innovative e-commerce solution with international settings.',
    version: '8.1.3',
    versions: ['8.1.3', '1.7.8.10'],
    svgIcon: PRESTASHOP_SVG,
  },
  {
    name: 'Magento',
    category: 'E-Commerce',
    desc: 'Adobe Commerce robust business shopping platform for massive shops.',
    version: '2.4.6',
    versions: ['2.4.6', '2.4.5', '2.4.4'],
    svgIcon: MAGENTO_SVG,
  },
];

export const ScriptInstaller: React.FC = () => {
  const [selectedApp, setSelectedApp] = useState<InstallerItem | null>(null);
  const [sites, setSites] = useState<any[]>([]);
  const [selectedSiteId, setSelectedSiteId] = useState('');

  // Setup fields
  const [protocol, setProtocol] = useState('http://');
  const [directory, setDirectory] = useState('');
  const [appVersion, setAppVersion] = useState('');
  const [siteName, setSiteName] = useState('');
  const [siteDesc, setSiteDesc] = useState('');
  const [adminUser, setAdminUser] = useState('admin');
  const [adminPass, setAdminPass] = useState('SecurePassword1!');
  const [showPassword, setShowPassword] = useState(false);
  const [adminEmail, setAdminEmail] = useState('admin@company.com');
  const [dbName, setDbName] = useState('wp_db');
  const [dbPrefix, setDbPrefix] = useState('wp_');
  const [sslEnabled, setSslEnabled] = useState(true);
  const [autoUpdates, setAutoUpdates] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);

  // Install execution progress state
  const [installing, setInstalling] = useState(false);
  const [installStep, setInstallStep] = useState('');
  const [installProgress, setInstallProgress] = useState(0);
  const [installCompleted, setInstallCompleted] = useState(false);
  const [phpReady, setPhpReady] = useState(false);

  useEffect(() => {
    const checkRuntime = () => {
      api
        .get('/runtimes/status')
        .then((res) => {
          setPhpReady(res.data.data.phpReady);
        })
        .catch(() => {});
    };
    checkRuntime();
    const timer = setInterval(checkRuntime, 3000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    // Fetch active websites created by the logged in user
    api
      .get('/sites')
      .then((res) => {
        setSites(res.data.data);
        if (res.data.data.length > 0) {
          setSelectedSiteId(res.data.data[0].id);
        }
      })
      .catch((err) => console.log('Error fetching sites:', err));
  }, []);

  useEffect(() => {
    if (selectedApp) {
      setAppVersion(selectedApp.version);
      const slug = selectedApp.name.toLowerCase();
      setSiteName(`My ${selectedApp.name}`);
      setSiteDesc(`Web portal powered by ${selectedApp.name}`);
      setDbName(`${slug}_db`);
      setDbPrefix(`${slug.substring(0, 3)}_`);
    }
  }, [selectedApp]);

  // Dynamic Password strength indicator calculator
  const checkPasswordStrength = (pass: string) => {
    let score = 0;
    if (pass.length > 6) score += 20;
    if (pass.length > 10) score += 20;
    if (/[A-Z]/.test(pass)) score += 20;
    if (/[0-9]/.test(pass)) score += 20;
    if (/[^A-Za-z0-9]/.test(pass)) score += 20;
    return score;
  };

  const handleInstallClick = (app: InstallerItem) => {
    setSelectedApp(app);
  };

  const handleLaunchInstall = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSiteId || !selectedApp) return;

    const targetSite = sites.find((s) => s.id === selectedSiteId);
    const domain = targetSite ? targetSite.domain : '';

    setInstalling(true);
    setInstallCompleted(false);
    setInstallStep('Initializing...');
    setInstallProgress(5);

    try {
      // 1. Fire post request to start background autoinstall script jobs
      await api.post('/installers/install', {
        siteId: selectedSiteId,
        appName: selectedApp.name,
        appVersion,
        protocol,
        domain,
        directory,
        siteName,
        siteDescription: siteDesc,
        adminUser,
        adminPass,
        adminEmail,
        dbName,
        dbPrefix,
      });

      // 2. Open Event Source stream connections to listen to installer events
      const eventSource = new EventSource(
        `${api.defaults.baseURL}/installers/progress/${selectedSiteId}`,
      );

      eventSource.onmessage = (event) => {
        const data = JSON.parse(event.data);
        setInstallStep(data.step);
        setInstallProgress(data.progress);

        if (data.step === 'Completed') {
          eventSource.close();
          setInstalling(false);
          setInstallCompleted(true);
          // Auto clean up local storage site parameters so that components update
          localStorage.removeItem('wphub_user_domains');
        } else if (data.step === 'Failed') {
          eventSource.close();
          setInstalling(false);
          alert('Script installation failed. Please check log settings.');
        }
      };

      eventSource.onerror = () => {
        eventSource.close();
        setInstalling(false);
      };
    } catch (err: any) {
      setInstalling(false);
      alert(err.response?.data?.error?.message || 'Failed to initialize script autoinstaller.');
    }
  };

  const passStrength = checkPasswordStrength(adminPass);

  // RENDER INTERACTION WIZARD
  if (installCompleted && selectedApp) {
    return (
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-8 max-w-xl mx-auto space-y-6 text-center animate-fade-in">
        <CheckCircle2 size={56} className="text-emerald-400 mx-auto animate-bounce" />
        <div className="space-y-2">
          <h2 className="text-2xl font-bold text-slate-100">Installation Completed!</h2>
          <p className="text-sm text-slate-400">
            Congratulations, {selectedApp.name} has been successfully installed on your domain.
          </p>
        </div>

        <div className="bg-slate-950 p-4 rounded-lg border border-slate-800 text-left space-y-2.5 text-xs font-medium">
          <div className="flex justify-between">
            <span className="text-slate-500">Installation URL:</span>
            <a
              href={`${protocol}${sites.find((s) => s.id === selectedSiteId)?.domain}${directory ? '/' + directory : ''}`}
              target="_blank"
              rel="noreferrer"
              className="text-indigo-400 hover:underline"
            >
              {protocol}
              {sites.find((s) => s.id === selectedSiteId)?.domain}
              {directory ? '/' + directory : ''}
            </a>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500">Database Name:</span>
            <span className="text-slate-300 font-mono">{dbName}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500">Admin Username:</span>
            <span className="text-slate-300 font-semibold">{adminUser}</span>
          </div>
        </div>

        <Button variant="primary" onClick={() => setSelectedApp(null)} className="w-full">
          Back to Auto-Installer
        </Button>
      </div>
    );
  }

  if (installing) {
    return (
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-8 max-w-lg mx-auto space-y-6 text-center animate-fade-in">
        <Loader2 size={44} className="text-indigo-500 animate-spin mx-auto" />
        <div className="space-y-2">
          <h3 className="text-lg font-semibold text-slate-200">Installing {selectedApp?.name}</h3>
          <p className="text-xs text-indigo-400 font-semibold">
            {installStep} ({installProgress}%)
          </p>
        </div>

        {/* Custom Progress Bar */}
        <div className="w-full bg-slate-950 rounded-full h-2.5 overflow-hidden border border-slate-800">
          <div
            className="bg-indigo-500 h-2.5 rounded-full transition-all duration-500"
            style={{ width: `${installProgress}%` }}
          ></div>
        </div>
        <p className="text-[10px] text-slate-500">
          Please do not refresh the page or navigate away during setup.
        </p>
      </div>
    );
  }

  if (selectedApp) {
    return (
      <div className="space-y-6 animate-fade-in">
        {/* Wizard Header Back Button */}
        <div className="flex items-center gap-4">
          <button
            onClick={() => setSelectedApp(null)}
            className="p-2 rounded-lg bg-slate-900 border border-slate-800 text-slate-400 hover:text-slate-200 transition-colors"
          >
            <ArrowLeft size={16} />
          </button>
          <div>
            <h2 className="text-lg font-semibold text-slate-100 flex items-center gap-2">
              Install {selectedApp.name}
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              Configure and deploy application wizard settings
            </p>
          </div>
        </div>

        {sites.length === 0 ? (
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-8 text-center space-y-4">
            <AlertTriangle size={36} className="text-amber-500 mx-auto" />
            <div className="space-y-1">
              <h4 className="text-slate-200 font-semibold">No Websites Mapped</h4>
              <p className="text-xs text-slate-400 max-w-sm mx-auto">
                You must create at least one hosting website setup inside the Sites panel before
                installing scripts.
              </p>
            </div>
          </div>
        ) : (
          <form onSubmit={handleLaunchInstall} className="space-y-6 max-w-4xl">
            {/* 1. Software Setup Card */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-4">
              <h3 className="text-sm font-bold text-slate-300 border-b border-slate-800 pb-3 flex items-center gap-2">
                Software Setup
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-semibold text-slate-300">
                <div className="space-y-2">
                  <label className="block text-slate-400">Choose Installation Site</label>
                  <select
                    value={selectedSiteId}
                    onChange={(e) => setSelectedSiteId(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-xs focus:outline-none focus:border-indigo-500"
                  >
                    {sites.map((site) => (
                      <option key={site.id} value={site.id}>
                        {site.name} ({site.domain})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="block text-slate-400">Choose Protocol</label>
                  <select
                    value={protocol}
                    onChange={(e) => setProtocol(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-xs focus:outline-none focus:border-indigo-500"
                  >
                    <option value="http://">http://</option>
                    <option value="https://">https://</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="block text-slate-400">In Directory (Subfolder)</label>
                  <input
                    type="text"
                    placeholder="e.g. blog (leave empty for webroot)"
                    value={directory}
                    onChange={(e) =>
                      setDirectory(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))
                    }
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-xs focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div className="space-y-2">
                  <label className="block text-slate-400">Choose Version</label>
                  <select
                    value={appVersion}
                    onChange={(e) => setAppVersion(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-xs focus:outline-none focus:border-indigo-500"
                  >
                    {selectedApp.versions.map((ver) => (
                      <option key={ver} value={ver}>
                        {ver}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* 2. Site Settings Card */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-4">
              <h3 className="text-sm font-bold text-slate-300 border-b border-slate-800 pb-3 flex items-center gap-2">
                Site Settings
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-semibold text-slate-300">
                <div className="space-y-2">
                  <label className="block text-slate-400">Site Name</label>
                  <input
                    type="text"
                    required
                    value={siteName}
                    onChange={(e) => setSiteName(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-xs focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div className="space-y-2">
                  <label className="block text-slate-400">Site Description / Tagline</label>
                  <input
                    type="text"
                    required
                    value={siteDesc}
                    onChange={(e) => setSiteDesc(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-xs focus:outline-none focus:border-indigo-500"
                  />
                </div>

                {selectedApp.name === 'WordPress' && (
                  <div className="space-y-2 flex items-center gap-2 mt-6">
                    <input
                      type="checkbox"
                      id="wpmultisite"
                      className="h-4 w-4 bg-slate-950 border-slate-800 rounded"
                    />
                    <label htmlFor="wpmultisite" className="text-slate-400 cursor-pointer">
                      Enable Multisite (WPMU)
                    </label>
                  </div>
                )}
              </div>
            </div>

            {/* 3. Admin Account Card */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-4">
              <h3 className="text-sm font-bold text-slate-300 border-b border-slate-800 pb-3 flex items-center gap-2">
                Admin Account
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-semibold text-slate-300">
                <div className="space-y-2">
                  <label className="block text-slate-400">Admin Username</label>
                  <input
                    type="text"
                    required
                    value={adminUser}
                    onChange={(e) => setAdminUser(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-xs focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div className="space-y-2">
                  <label className="block text-slate-400">Admin Password</label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      value={adminPass}
                      onChange={(e) => setAdminPass(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 pr-10 text-xs focus:outline-none focus:border-indigo-500"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"
                    >
                      {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                    </button>
                  </div>
                  {/* Strength Bar */}
                  <div className="mt-1.5 flex gap-1 items-center">
                    <div className="h-1 flex-1 bg-slate-800 rounded">
                      <div
                        className={`h-1 rounded ${
                          passStrength < 40
                            ? 'bg-red-500'
                            : passStrength < 80
                              ? 'bg-amber-500'
                              : 'bg-emerald-500'
                        }`}
                        style={{ width: `${passStrength}%` }}
                      ></div>
                    </div>
                    <span className="text-[9px] text-slate-500 font-bold uppercase">
                      {passStrength < 40 ? 'Bad' : passStrength < 80 ? 'Good' : 'Strong'}
                    </span>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="block text-slate-400">Admin Email</label>
                  <input
                    type="email"
                    required
                    value={adminEmail}
                    onChange={(e) => setAdminEmail(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-xs focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>
            </div>

            {/* 4. Collapsible Advanced Settings Accordion */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
              <button
                type="button"
                onClick={() => setShowAdvanced(!showAdvanced)}
                className="w-full px-6 py-4 flex items-center justify-between text-sm font-semibold text-slate-300 hover:bg-slate-800/20 transition-colors"
              >
                <span>Advanced Options</span>
                <span className="text-xs text-indigo-400">{showAdvanced ? 'Hide' : 'Show'}</span>
              </button>

              {showAdvanced && (
                <div className="px-6 pb-6 pt-2 grid grid-cols-1 md:grid-cols-2 gap-4 border-t border-slate-800/60 text-xs font-semibold text-slate-300 animate-fade-in">
                  <div className="space-y-2">
                    <label className="block text-slate-400">Database Name</label>
                    <input
                      type="text"
                      value={dbName}
                      onChange={(e) => setDbName(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-xs focus:outline-none focus:border-indigo-500 font-mono"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="block text-slate-400">Table Prefix</label>
                    <input
                      type="text"
                      value={dbPrefix}
                      onChange={(e) => setDbPrefix(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-xs focus:outline-none focus:border-indigo-500 font-mono"
                    />
                  </div>

                  <div className="space-y-4 md:col-span-2 pt-2 border-t border-slate-800/40 grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="flex items-center gap-2.5">
                      <input
                        type="checkbox"
                        id="ssl_install"
                        checked={sslEnabled}
                        onChange={(e) => setSslEnabled(e.target.checked)}
                        className="h-4 w-4 bg-slate-950 border-slate-800 rounded"
                      />
                      <label htmlFor="ssl_install" className="text-slate-400 cursor-pointer">
                        Configure SSL Routing Certificate
                      </label>
                    </div>

                    <div className="flex items-center gap-2.5">
                      <input
                        type="checkbox"
                        id="auto_up"
                        checked={autoUpdates}
                        onChange={(e) => setAutoUpdates(e.target.checked)}
                        className="h-4 w-4 bg-slate-950 border-slate-800 rounded"
                      />
                      <label htmlFor="auto_up" className="text-slate-400 cursor-pointer">
                        Enable Automated Script Minor Updates
                      </label>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <Button
              type="submit"
              variant="primary"
              disabled={!phpReady}
              className="flex items-center gap-2 py-2.5 text-sm disabled:opacity-40"
            >
              <Download size={16} />
              {phpReady ? 'Install Application' : 'Waiting for PHP Runtime...'}
            </Button>
          </form>
        )}
      </div>
    );
  }

  // RENDER PRIMARY LIST CARDS
  return (
    <div className="space-y-6">
      {/* Header Info */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-slate-100 flex items-center gap-2">
            <Sparkles className="text-indigo-400" size={20} />
            Script Auto-Installer
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Deploy standard web applications, blogs, and framework configurations in one click
          </p>
        </div>
      </div>

      {!phpReady && (
        <div className="p-4 bg-amber-500/10 border border-amber-500/20 text-amber-400 rounded-xl flex items-start gap-3 animate-pulse">
          <AlertTriangle size={18} className="shrink-0 mt-0.5" />
          <div className="text-xs">
            <p className="font-semibold text-slate-200">
              System PHP Runtime is initializing in the background...
            </p>
            <p className="mt-1 leading-relaxed opacity-85">
              WordPress, Joomla, Drupal, and Laravel installations will be paused until
              initialization completes. This only happens on the first launch of WPHub as it bundles
              the runtime environment.
            </p>
          </div>
        </div>
      )}

      {/* Grid installers list */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {installers.map((item) => (
          <div
            key={item.name}
            className="bg-slate-900 border border-slate-800 rounded-xl p-5 flex flex-col justify-between hover:border-slate-700 transition-all hover:translate-y-[-2px] relative overflow-hidden group"
          >
            <div className="absolute top-0 right-0 w-16 h-16 bg-indigo-500/5 rounded-full blur-xl group-hover:bg-indigo-500/10 transition-colors"></div>

            <div className="space-y-3">
              <div className="flex items-center justify-between gap-3">
                <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">
                  {item.category}
                </span>
                <span className="text-[10px] text-slate-500 font-mono">v{item.version}</span>
              </div>

              {/* Logo icon container rendering SVG */}
              <div className="h-10 w-10 bg-slate-950/80 border border-slate-800 rounded-lg flex items-center justify-center p-2">
                {item.svgIcon}
              </div>

              <div>
                <h3 className="text-base font-semibold text-slate-200 group-hover:text-indigo-400 transition-colors">
                  {item.name}
                </h3>
                <p className="text-xs text-slate-400 mt-1 line-clamp-3 leading-relaxed">
                  {item.desc}
                </p>
              </div>
            </div>

            <div className="mt-5 pt-4 border-t border-slate-800/80 flex items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-1 text-slate-500">
                <ShieldCheck size={14} className="text-indigo-500" />
                <span>Verified</span>
              </div>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => handleInstallClick(item)}
                className="bg-slate-950 hover:bg-indigo-600 border-slate-800/80 hover:border-indigo-500 text-slate-300 hover:text-slate-100 py-1.5 flex items-center gap-1"
              >
                <Download size={12} />
                Install
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
