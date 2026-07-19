import React, { useState, useEffect } from 'react';
import { WordPressSite } from '@wphub/types';
import { api } from '../../api/client';
import { Button } from '@wphub/ui';
import { Globe, Plus, Trash2, Cpu, RefreshCw, AlertTriangle } from 'lucide-react';

interface CustomDomain {
  domain: string;
}

export const SitesPage: React.FC = () => {
  const [sites, setSites] = useState<WordPressSite[]>([]);
  const [isLoadingSites, setIsLoadingSites] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newSiteName, setNewSiteName] = useState('');

  // Custom domains list retrieved from local storage
  const [userDomains, setUserDomains] = useState<CustomDomain[]>([]);
  const [domainOption, setDomainOption] = useState<'free' | 'custom'>('free');
  const [newSiteDomain, setNewSiteDomain] = useState('');
  const [selectedCustomDomain, setSelectedCustomDomain] = useState('');

  const [progressLogs, setProgressLogs] = useState<
    Record<string, { message: string; progress: number }>
  >({});

  const fetchSites = async () => {
    setIsLoadingSites(true);
    setErrorMsg(null);
    try {
      const res = await api.get('/sites');
      setSites(res.data.data);
    } catch (err: any) {
      setErrorMsg(
        err.response?.data?.error?.message || 'Provisioning service is temporarily unavailable.',
      );
    } finally {
      setIsLoadingSites(false);
    }
  };

  useEffect(() => {
    fetchSites();
  }, []);

  // Fetch registered custom domains when modal opens
  useEffect(() => {
    if (isModalOpen) {
      const data = localStorage.getItem('wphub_user_domains');
      if (data) {
        try {
          const list = JSON.parse(data);
          setUserDomains(list);
          if (list.length > 0) {
            setDomainOption('custom');
            setSelectedCustomDomain(list[0].domain);
          } else {
            setDomainOption('free');
          }
        } catch (e) {
          setUserDomains([]);
          setDomainOption('free');
        }
      } else {
        setUserDomains([]);
        setDomainOption('free');
      }
    }
  }, [isModalOpen]);

  useEffect(() => {
    const activeSources: Record<string, EventSource> = {};

    sites.forEach((site) => {
      if (site.status === 'PROVISIONING' && !activeSources[site.id]) {
        const apiBase =
          ((import.meta as any).env?.VITE_API_URL as string) || 'http://localhost:5000/api';
        const sseUrl = `${apiBase}/sites/${site.id}/progress`;
        const source = new EventSource(sseUrl);

        source.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            if (data.step === 'PROVISION_STAGE') {
              setProgressLogs((prev) => ({
                ...prev,
                [site.id]: { message: data.message, progress: data.progress },
              }));
            }
            if (data.progress === 100) {
              setSites((prev) =>
                prev.map((s) => (s.id === site.id ? { ...s, status: 'ACTIVE' } : s)),
              );
              source.close();
            }
            if (data.step === 'FAILED') {
              setSites((prev) =>
                prev.map((s) => (s.id === site.id ? { ...s, status: 'SUSPENDED' } : s)),
              );
              source.close();
            }
          } catch (err) {
            // Ignored
          }
        };

        source.onerror = () => {
          source.close();
        };

        activeSources[site.id] = source;
      }
    });

    return () => {
      Object.values(activeSources).forEach((src) => src.close());
    };
  }, [sites]);

  const handleCreateSite = async (e: React.FormEvent) => {
    e.preventDefault();

    let targetDomain = '';
    if (domainOption === 'custom') {
      if (!selectedCustomDomain) {
        alert('Please select a registered custom domain!');
        return;
      }
      targetDomain = selectedCustomDomain;
    } else {
      if (!newSiteDomain) return;
      targetDomain = newSiteDomain;
    }

    if (!newSiteName || !targetDomain) return;
    setErrorMsg(null);
    try {
      const res = await api.post('/sites', {
        name: newSiteName,
        domain: targetDomain,
      });
      setSites((prev) => [res.data.data, ...prev]);
      setNewSiteName('');
      setNewSiteDomain('');
      setSelectedCustomDomain('');
      setIsModalOpen(false);
    } catch (err: any) {
      setErrorMsg(
        err.response?.data?.error?.message || 'Provisioning service is temporarily unavailable.',
      );
      setIsModalOpen(false);
    }
  };

  const handleDeleteSite = async (id: string) => {
    if (!confirm('Are you sure you want to delete this WordPress environment?')) return;
    setErrorMsg(null);
    try {
      await api.delete(`/sites/${id}`);
      setSites((prev) => prev.filter((s) => s.id !== id));
    } catch (err: any) {
      setErrorMsg(
        err.response?.data?.error?.message || 'Provisioning service is temporarily unavailable.',
      );
    }
  };

  const filteredSites = sites.filter(
    (site) =>
      site.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      site.domain.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  return (
    <div className="space-y-6">
      {errorMsg && (
        <div className="p-4 bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl flex items-center gap-3">
          <AlertTriangle size={20} className="shrink-0" />
          <span className="text-sm font-medium">{errorMsg}</span>
        </div>
      )}

      {/* Header Info */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-slate-100 flex items-center gap-2">
            <Globe className="text-indigo-400" size={20} />
            WordPress Environments
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Provision, manage, and scale high-performance cloud WordPress instances
          </p>
        </div>
        <Button
          variant="primary"
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2"
        >
          <Plus size={16} />
          New WordPress Site
        </Button>
      </div>

      {/* Sites Listing Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
        <div className="mb-4">
          <input
            type="text"
            placeholder="Search site name or domain..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="bg-slate-950 border border-slate-800 rounded-lg px-4 py-2 text-sm w-72 focus:outline-none focus:border-indigo-500"
          />
        </div>

        <div className="overflow-x-auto">
          {isLoadingSites ? (
            <div className="flex justify-center py-12">
              <RefreshCw className="h-8 w-8 animate-spin text-indigo-500" />
            </div>
          ) : filteredSites.length === 0 ? (
            <div className="text-center py-12 text-slate-500 text-sm">
              No WordPress environments found. Click the button above to provision your first site!
            </div>
          ) : (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-800 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  <th className="pb-3">Site Details</th>
                  <th className="pb-3">Domain</th>
                  <th className="pb-3">Status</th>
                  <th className="pb-3">Tech Info</th>
                  <th className="pb-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800 text-sm">
                {filteredSites.map((site) => (
                  <tr key={site.id} className="hover:bg-slate-800/10">
                    <td className="py-4">
                      <p className="font-semibold text-slate-200">{site.name}</p>
                      <p className="text-[10px] text-slate-500">
                        Created: {new Date(site.createdAt).toLocaleDateString()}
                      </p>
                    </td>
                    <td className="py-4">
                      <a
                        href={`http://${site.domain}`}
                        target="_blank"
                        rel="noreferrer"
                        className="text-indigo-400 hover:underline font-medium"
                      >
                        {site.domain}
                      </a>
                    </td>
                    <td className="py-4">
                      {site.status === 'PROVISIONING' ? (
                        <div className="flex flex-col gap-1 max-w-[200px]">
                          <span className="inline-block text-[11px] w-fit px-2.5 py-0.5 rounded-full font-semibold bg-amber-500/10 text-amber-400 animate-pulse">
                            PROVISIONING
                          </span>
                          <span className="text-[10px] text-slate-400 font-normal truncate">
                            {progressLogs[site.id]?.message || 'Initializing...'} (
                            {progressLogs[site.id]?.progress || 10}%)
                          </span>
                        </div>
                      ) : (
                        <span
                          className={`inline-block text-xs px-2.5 py-0.5 rounded-full font-semibold ${
                            site.status === 'ACTIVE'
                              ? 'bg-emerald-500/10 text-emerald-400'
                              : 'bg-red-500/10 text-red-400'
                          }`}
                        >
                          {site.status}
                        </span>
                      )}
                    </td>
                    <td className="py-4 text-xs text-slate-400 space-y-1">
                      <div className="flex items-center gap-1">
                        <Cpu size={12} className="text-slate-500" />
                        <span>PHP {site.phpVersion}</span>
                      </div>
                      <p className="pl-4">WP {site.wpVersion}</p>
                    </td>
                    <td className="py-4 text-right">
                      <Button
                        variant="danger"
                        size="sm"
                        onClick={() => handleDeleteSite(site.id)}
                        className="bg-transparent hover:bg-red-500/10 text-red-400 border border-red-500/20 hover:border-red-500/50"
                      >
                        <Trash2 size={14} />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Creation Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-xl w-full max-w-md overflow-hidden shadow-2xl">
            <div className="p-6 border-b border-slate-800">
              <h3 className="text-lg font-semibold">Provision New WordPress Site</h3>
              <p className="text-xs text-slate-400 mt-1">
                Configure basic settings. Deployment runs on cloud infra.
              </p>
            </div>
            <form onSubmit={handleCreateSite} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                  Site Name
                </label>
                <input
                  type="text"
                  required
                  placeholder="My Creative Portfolio"
                  value={newSiteName}
                  onChange={(e) => setNewSiteName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                  Domain Type
                </label>
                <div className="flex gap-4 mb-2 text-xs">
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="radio"
                      name="domainOption"
                      checked={domainOption === 'free'}
                      onChange={() => setDomainOption('free')}
                      className="accent-indigo-500"
                    />
                    <span>Free wphub.cloud Subdomain</span>
                  </label>
                  {userDomains.length > 0 && (
                    <label className="flex items-center gap-1.5 cursor-pointer">
                      <input
                        type="radio"
                        name="domainOption"
                        checked={domainOption === 'custom'}
                        onChange={() => setDomainOption('custom')}
                        className="accent-indigo-500"
                      />
                      <span>Use Connected Custom Domain</span>
                    </label>
                  )}
                </div>

                {domainOption === 'free' ? (
                  <div className="flex items-center">
                    <input
                      type="text"
                      required
                      placeholder="portfolio"
                      value={newSiteDomain}
                      onChange={(e) => setNewSiteDomain(e.target.value)}
                      className="flex-grow bg-slate-950 border border-slate-800 rounded-l-lg px-4 py-2.5 text-sm focus:outline-none focus:border-indigo-500"
                    />
                    <span className="bg-slate-950 border border-slate-800 border-l-0 rounded-r-lg px-4 py-2.5 text-xs text-slate-500">
                      .wphub.cloud
                    </span>
                  </div>
                ) : (
                  <select
                    value={selectedCustomDomain}
                    onChange={(e) => setSelectedCustomDomain(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-indigo-500 cursor-pointer"
                  >
                    {userDomains.map((d) => (
                      <option key={d.domain} value={d.domain}>
                        {d.domain}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-800">
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() => setIsModalOpen(false)}
                >
                  Cancel
                </Button>
                <Button type="submit" variant="primary" size="sm">
                  Provision Site
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
