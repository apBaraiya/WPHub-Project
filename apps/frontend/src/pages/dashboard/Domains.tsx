import { api } from '../../api/client';
import { Button } from '@wphub/ui';
import {
  Network,
  Plus,
  Shield,
  Search,
  ExternalLink,
  Settings,
  Trash2,
  CheckCircle,
  XCircle,
  RefreshCw,
} from 'lucide-react';

interface DomainItem {
  id: string;
  domain: string;
  type: string;
  status: 'ACTIVE' | 'PENDING' | 'EXPIRED';
  ssl: boolean;
  dnsValid: boolean;
  createdAt: string;
}

export const Domains: React.FC = () => {
  const navigate = useNavigate();
  const [domains, setDomains] = useState<DomainItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  const fetchDomains = async () => {
    setIsLoading(true);
    try {
      // 1. Fetch sites from backend API to extract all site domains
      const res = await api.get('/sites');
      const siteList = res.data?.data || [];
      const siteDomains: DomainItem[] = siteList.map((site: any) => ({
        id: 'site-' + site.id,
        domain: site.domain,
        type: site.domain.endsWith('wphub.cloud') ? 'Cloud Subdomain' : 'Custom Domain',
        status: site.status === 'ACTIVE' ? 'ACTIVE' : 'PENDING',
        ssl: true,
        dnsValid: true,
        createdAt: site.createdAt
          ? new Date(site.createdAt).toLocaleDateString()
          : new Date().toLocaleDateString(),
      }));

      // 2. Fetch locally registered custom domains
      const data = localStorage.getItem('wphub_user_domains');
      let customDomains: DomainItem[] = [];
      if (data) {
        try {
          const parsed = JSON.parse(data);
          customDomains = parsed.filter(
            (d: any) =>
              d.domain !== 'wp.dev' &&
              d.domain !== 'test.online' &&
              d.domain !== 'testportfolio.site' &&
              d.domain !== 'mycoolblog.com' &&
              d.domain !== 'shop.wphub.cloud',
          );
        } catch (e) {
          customDomains = [];
        }
      }

      // Merge lists avoiding duplicates
      const map = new Map<string, DomainItem>();
      siteDomains.forEach((d) => map.set(d.domain.toLowerCase(), d));
      customDomains.forEach((d) => {
        if (!map.has(d.domain.toLowerCase())) {
          map.set(d.domain.toLowerCase(), d);
        }
      });

      setDomains(Array.from(map.values()));
    } catch (err) {
      console.error('Failed to load site domains:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDomains();
  }, []);

  const handleDelete = (id: string) => {
    if (confirm('Are you sure you want to delete this domain assignment?')) {
      const updated = domains.filter((d) => d.id !== id);
      setDomains(updated);
      localStorage.setItem('wphub_user_domains', JSON.stringify(updated));
    }
  };

  const filtered = domains.filter((d) =>
    d.domain.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header Panel */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-slate-100 flex items-center gap-2">
            <Network className="text-indigo-400" size={20} />
            Domain Management
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Map custom domains, edit zones, configure SSL certificates, and configure redirects
          </p>
        </div>
        <Button
          variant="primary"
          onClick={() => navigate('/domains/add')}
          className="flex items-center gap-2"
        >
          <Plus size={16} />
          Add Domain
        </Button>
      </div>

      {/* Domain Table List */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
        <div className="mb-4 relative">
          <input
            type="text"
            placeholder="Search domain..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="bg-slate-950 border border-slate-800 rounded-lg pl-10 pr-4 py-2 text-sm w-72 focus:outline-none focus:border-indigo-500"
          />
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
        </div>

        <div className="overflow-x-auto">
          {isLoading ? (
            <div className="flex justify-center py-12">
              <RefreshCw className="h-8 w-8 animate-spin text-indigo-500" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-12 text-slate-500 text-sm">
              No domains connected yet. Click &quot;Add Domain&quot; to connect a domain!
            </div>
          ) : (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-800 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  <th className="pb-3">Domain</th>
                  <th className="pb-3">Type</th>
                  <th className="pb-3">Status</th>
                  <th className="pb-3">SSL</th>
                  <th className="pb-3">DNS Setup</th>
                  <th className="pb-3">Created</th>
                  <th className="pb-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800 text-sm">
                {filtered.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-800/10">
                    <td className="py-4 font-semibold text-slate-200">{item.domain}</td>
                    <td className="py-4">
                      <span className="text-slate-400 text-xs">{item.type}</span>
                    </td>
                    <td className="py-4">
                      <span
                        className={`inline-block text-xs px-2.5 py-0.5 rounded-full font-semibold ${
                          item.status === 'ACTIVE'
                            ? 'bg-emerald-500/10 text-emerald-400'
                            : item.status === 'PENDING'
                              ? 'bg-amber-500/10 text-amber-400 animate-pulse'
                              : 'bg-red-500/10 text-red-400'
                        }`}
                      >
                        {item.status}
                      </span>
                    </td>
                    <td className="py-4">
                      {item.ssl ? (
                        <div className="flex items-center gap-1.5 text-xs text-emerald-400">
                          <Shield size={14} className="fill-emerald-400/20" />
                          <span>Active SSL</span>
                        </div>
                      ) : (
                        <div className="text-xs text-slate-500">None</div>
                      )}
                    </td>
                    <td className="py-4">
                      {item.dnsValid ? (
                        <div className="flex items-center gap-1.5 text-xs text-emerald-400">
                          <CheckCircle size={14} />
                          <span>Configured</span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1.5 text-xs text-amber-400">
                          <XCircle size={14} />
                          <span>Missing Records</span>
                        </div>
                      )}
                    </td>
                    <td className="py-4 text-xs text-slate-400">
                      {new Date(item.createdAt).toLocaleDateString()}
                    </td>
                    <td className="py-4 text-right">
                      <div className="flex justify-end gap-1.5">
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => navigate(`/domains/${item.id}`)}
                          className="bg-transparent hover:bg-slate-800 text-slate-300 border border-slate-700/60 hover:border-slate-500 text-xs py-1"
                        >
                          <Settings size={14} className="mr-1 inline-block" />
                          Manage
                        </Button>
                        <a
                          href={`http://${item.domain}`}
                          target="_blank"
                          rel="noreferrer"
                          className="px-2.5 py-1 text-slate-300 hover:text-slate-100 hover:bg-slate-800 rounded border border-slate-700/60 flex items-center justify-center text-xs"
                          title="Open Live Site"
                        >
                          <ExternalLink size={14} />
                        </a>
                        <Button
                          variant="danger"
                          size="sm"
                          onClick={() => handleDelete(item.id)}
                          className="bg-transparent hover:bg-red-500/10 text-red-400 border border-red-500/20 hover:border-red-500/50"
                        >
                          <Trash2 size={14} />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
};
