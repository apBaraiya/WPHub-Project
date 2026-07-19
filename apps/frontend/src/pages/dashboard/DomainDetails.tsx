import React, { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Button } from '@wphub/ui';
import {
  ArrowLeft,
  Shield,
  RefreshCw,
  Plus,
  Trash2,
  Lock,
  Unlock,
  CheckCircle,
  TrendingUp,
} from 'lucide-react';

interface DNSRecord {
  id: string;
  type: 'A' | 'CNAME' | 'MX' | 'TXT';
  host: string;
  value: string;
  ttl: number;
}

const initialDnsRecords: DNSRecord[] = [
  { id: 'dns-1', type: 'A', host: '@', value: '185.199.108.153', ttl: 3600 },
  { id: 'dns-2', type: 'CNAME', host: 'www', value: 'mycoolblog.com', ttl: 14400 },
  { id: 'dns-3', type: 'MX', host: '@', value: '10 mail.wphub.cloud', ttl: 3600 },
  { id: 'dns-4', type: 'TXT', host: '@', value: 'v=spf1 include:wphub.cloud ~all', ttl: 3600 },
];

export const DomainDetails: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<
    'overview' | 'dns' | 'ssl' | 'redirects' | 'subdomains' | 'stats' | 'settings'
  >('overview');

  // DNS records state
  const [dnsRecords, setDnsRecords] = useState<DNSRecord[]>(initialDnsRecords);
  const [dnsType, setDnsType] = useState<'A' | 'CNAME' | 'MX' | 'TXT'>('A');
  const [dnsHost, setDnsHost] = useState('');
  const [dnsValue, setDnsValue] = useState('');
  const dnsTtl = 3600;

  // Subdomains state
  const [subdomains, setSubdomains] = useState<string[]>([
    'shop.mycoolblog.com',
    'dev.mycoolblog.com',
  ]);
  const [subdomainName, setSubdomainName] = useState('');

  // Lock status
  const [isLocked, setIsLocked] = useState(true);

  const handleAddDns = (e: React.FormEvent) => {
    e.preventDefault();
    if (!dnsHost || !dnsValue) return;
    const newRecord: DNSRecord = {
      id: Math.random().toString(),
      type: dnsType,
      host: dnsHost,
      value: dnsValue,
      ttl: dnsTtl,
    };
    setDnsRecords([...dnsRecords, newRecord]);
    setDnsHost('');
    setDnsValue('');
  };

  const handleDeleteDns = (recordId: string) => {
    setDnsRecords(dnsRecords.filter((r) => r.id !== recordId));
  };

  const handleAddSubdomain = (e: React.FormEvent) => {
    e.preventDefault();
    if (!subdomainName) return;
    setSubdomains([...subdomains, `${subdomainName}.mycoolblog.com`]);
    setSubdomainName('');
  };

  const handleDeleteSubdomain = (sub: string) => {
    setSubdomains(subdomains.filter((s) => s !== sub));
  };

  return (
    <div className="space-y-6">
      {/* Header back button */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => navigate('/domains')}
          className="p-2 rounded-lg bg-slate-900 border border-slate-800 text-slate-400 hover:text-slate-200 transition-colors"
        >
          <ArrowLeft size={16} />
        </button>
        <div>
          <h2 className="text-lg font-semibold text-slate-100">Manage: mycoolblog.com</h2>
          <p className="text-xs text-slate-400 mt-1">Domain ID: {id}</p>
        </div>
      </div>

      {/* Tabs list */}
      <div className="flex border-b border-slate-800 text-sm overflow-x-auto">
        {(
          [
            { id: 'overview', label: 'Overview' },
            { id: 'dns', label: 'DNS Zone Editor' },
            { id: 'ssl', label: 'SSL Setup' },
            { id: 'redirects', label: 'Redirects' },
            { id: 'subdomains', label: 'Subdomains' },
            { id: 'stats', label: 'Statistics' },
            { id: 'settings', label: 'General Settings' },
          ] as const
        ).map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2.5 font-medium border-b-2 transition-all whitespace-nowrap focus:outline-none ${
              activeTab === tab.id
                ? 'border-indigo-500 text-indigo-400 font-semibold'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Overview tab */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-fade-in">
          {/* Connection card */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-4">
            <h3 className="text-sm font-semibold text-slate-200 uppercase tracking-wider">
              Connection Details
            </h3>
            <div className="p-4 bg-slate-950/60 border border-slate-800/80 rounded-lg flex items-center gap-3">
              <CheckCircle size={20} className="text-emerald-400 shrink-0" />
              <div className="text-xs">
                <p className="font-semibold text-slate-200">Domain is fully active</p>
                <p className="text-slate-500 mt-0.5">
                  DNS checks resolved correctly. Traffic flows to cloud.
                </p>
              </div>
            </div>
            <div className="space-y-2 text-xs">
              <div className="flex justify-between py-1 border-b border-slate-800/50">
                <span className="text-slate-400">DNS Provider</span>
                <span className="text-slate-200 font-medium">WPHub DNS Manager</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-800/50">
                <span className="text-slate-400">Target IP Host</span>
                <span className="text-slate-200 font-medium">185.199.108.153</span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-slate-400">SSL Type</span>
                <span className="text-slate-200 font-medium">Let&apos;s Encrypt Wildcard</span>
              </div>
            </div>
          </div>

          {/* Nameservers card */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-4">
            <h3 className="text-sm font-semibold text-slate-200 uppercase tracking-wider">
              WPHub Cloud Nameservers
            </h3>
            <p className="text-xs text-slate-400">
              Point your domain registry nameservers configuration to:
            </p>
            <div className="space-y-2 font-mono text-xs">
              <div className="p-2.5 bg-slate-950 border border-slate-800/60 rounded flex items-center justify-between">
                <span>ns1.wphub.cloud</span>
                <span className="text-[10px] text-emerald-400 font-sans">Active</span>
              </div>
              <div className="p-2.5 bg-slate-950 border border-slate-800/60 rounded flex items-center justify-between">
                <span>ns2.wphub.cloud</span>
                <span className="text-[10px] text-emerald-400 font-sans">Active</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* DNS Tab */}
      {activeTab === 'dns' && (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-6 animate-fade-in">
          {/* Add DNS Record form */}
          <form onSubmit={handleAddDns} className="grid grid-cols-1 sm:grid-cols-4 gap-3 items-end">
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                Type
              </label>
              <select
                value={dnsType}
                onChange={(e: any) => setDnsType(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-indigo-500"
              >
                <option value="A">A</option>
                <option value="CNAME">CNAME</option>
                <option value="MX">MX</option>
                <option value="TXT">TXT</option>
              </select>
            </div>
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                Host / Name
              </label>
              <input
                type="text"
                required
                placeholder="@ or www"
                value={dnsHost}
                onChange={(e) => setDnsHost(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-indigo-500"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                Value / Points to
              </label>
              <input
                type="text"
                required
                placeholder="IP address or target hostname"
                value={dnsValue}
                onChange={(e) => setDnsValue(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-indigo-500"
              />
            </div>
            <Button
              type="submit"
              variant="primary"
              className="flex items-center justify-center gap-1.5 w-full"
            >
              <Plus size={16} />
              Add Record
            </Button>
          </form>

          {/* DNS zone records listing */}
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-800 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  <th className="pb-3">Type</th>
                  <th className="pb-3">Host</th>
                  <th className="pb-3">Value</th>
                  <th className="pb-3">TTL</th>
                  <th className="pb-3 text-right">Delete</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800 text-xs font-mono">
                {dnsRecords.map((rec) => (
                  <tr key={rec.id} className="hover:bg-slate-800/10">
                    <td className="py-3 font-semibold text-indigo-400">{rec.type}</td>
                    <td className="py-3 text-slate-200">{rec.host}</td>
                    <td className="py-3 text-slate-300 break-all">{rec.value}</td>
                    <td className="py-3 text-slate-400">{rec.ttl}</td>
                    <td className="py-3 text-right">
                      <button
                        onClick={() => handleDeleteDns(rec.id)}
                        className="text-red-400 hover:text-red-300 transition-colors p-1"
                      >
                        <Trash2 size={14} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* SSL Tab */}
      {activeTab === 'ssl' && (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-6 animate-fade-in max-w-xl">
          <div className="flex items-center gap-3">
            <Shield size={24} className="text-indigo-400" />
            <div>
              <h3 className="text-sm font-semibold text-slate-200">SSL Certificate Status</h3>
              <p className="text-xs text-slate-500">Auto SSL installation on Let&apos;s Encrypt</p>
            </div>
          </div>

          <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-lg flex items-center justify-between">
            <span className="text-xs font-bold">Let&apos;s Encrypt Wildcard SSL is active</span>
            <span className="text-[10px] bg-emerald-500/25 px-2 py-0.5 rounded uppercase font-semibold">
              Verified
            </span>
          </div>

          <div className="space-y-4 text-xs">
            <div className="flex justify-between py-1.5 border-b border-slate-800">
              <span className="text-slate-400">Issuer</span>
              <span className="text-slate-200 font-semibold">Let&apos;s Encrypt Authority</span>
            </div>
            <div className="flex justify-between py-1.5 border-b border-slate-800">
              <span className="text-slate-400">SSL Version</span>
              <span className="text-slate-200 font-semibold">TLSv1.3</span>
            </div>
            <div className="flex justify-between py-1.5 border-b border-slate-800">
              <span className="text-slate-400">Expires At</span>
              <span className="text-slate-200 font-semibold">October 11, 2026</span>
            </div>
          </div>

          <Button variant="secondary" className="flex items-center gap-2">
            <RefreshCw size={14} />
            Force Re-Issue Certificate
          </Button>
        </div>
      )}

      {/* Redirects tab */}
      {activeTab === 'redirects' && (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-6 animate-fade-in max-w-xl">
          <h3 className="text-sm font-semibold text-slate-200">Add HTTP Redirect</h3>
          <p className="text-xs text-slate-400">Redirect paths or directories to alternate URLs.</p>
          <div className="space-y-3">
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                Path Source
              </label>
              <div className="flex items-center">
                <span className="bg-slate-950 border border-slate-800 border-r-0 rounded-l-lg px-3 py-2 text-xs text-slate-500">
                  mycoolblog.com/
                </span>
                <input
                  type="text"
                  placeholder="old-url"
                  className="flex-1 bg-slate-950 border border-slate-800 rounded-r-lg px-3 py-2 text-sm focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                Destination URL
              </label>
              <input
                type="text"
                placeholder="https://newdomain.com/blog"
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-indigo-500"
              />
            </div>
            <Button variant="primary">Add Redirect Rule</Button>
          </div>
        </div>
      )}

      {/* Subdomains tab */}
      {activeTab === 'subdomains' && (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-6 animate-fade-in">
          <form onSubmit={handleAddSubdomain} className="flex gap-3 items-end max-w-md">
            <div className="flex-1">
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                New Subdomain Prefix
              </label>
              <div className="flex items-center">
                <input
                  type="text"
                  required
                  placeholder="shop"
                  value={subdomainName}
                  onChange={(e) =>
                    setSubdomainName(e.target.value.toLowerCase().replace(/[^a-z0-9]/g, ''))
                  }
                  className="flex-1 bg-slate-950 border border-slate-800 rounded-l-lg px-3 py-2 text-sm focus:outline-none focus:border-indigo-500"
                />
                <span className="bg-slate-950 border border-slate-800 border-l-0 rounded-r-lg px-3 py-2 text-xs text-slate-500">
                  .mycoolblog.com
                </span>
              </div>
            </div>
            <Button type="submit" variant="primary">
              Add Subdomain
            </Button>
          </form>

          <div className="space-y-2">
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              Active Subdomains list
            </h4>
            <div className="divide-y divide-slate-800 border border-slate-800 rounded-xl overflow-hidden bg-slate-950/40">
              {subdomains.map((sub) => (
                <div key={sub} className="p-4 flex items-center justify-between">
                  <span className="text-sm font-semibold text-slate-200">{sub}</span>
                  <button
                    onClick={() => handleDeleteSubdomain(sub)}
                    className="text-red-400 hover:text-red-300 p-1 text-xs flex items-center gap-1 hover:underline"
                  >
                    <Trash2 size={12} />
                    Delete Subdomain
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Stats tab */}
      {activeTab === 'stats' && (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-4 animate-fade-in">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="text-sm font-semibold text-slate-200">Domain Visitor Statistics</h3>
              <p className="text-xs text-slate-500">Unique visitors count mapping last 7 days</p>
            </div>
            <div className="flex items-center gap-1 text-emerald-400 text-xs font-semibold">
              <TrendingUp size={16} />
              <span>+18.4% this week</span>
            </div>
          </div>

          {/* Simple Custom SVG Chart */}
          <div className="h-48 w-full border border-slate-800/80 rounded-lg p-4 bg-slate-950/30">
            <svg
              viewBox="0 0 700 150"
              className="w-full h-full text-indigo-500 fill-none overflow-visible"
            >
              <path
                d="M 50,120 L 150,110 L 250,70 L 350,90 L 450,40 L 550,55 L 650,20"
                stroke="currentColor"
                strokeWidth="3"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path
                d="M 50,120 L 150,110 L 250,70 L 350,90 L 450,40 L 550,55 L 650,20 L 650,150 L 50,150 Z"
                className="fill-indigo-500/10"
              />
              {/* Dots */}
              {[
                { x: 50, y: 120, label: 'Mon' },
                { x: 150, y: 110, label: 'Tue' },
                { x: 250, y: 70, label: 'Wed' },
                { x: 350, y: 90, label: 'Thu' },
                { x: 450, y: 40, label: 'Fri' },
                { x: 550, y: 55, label: 'Sat' },
                { x: 650, y: 20, label: 'Sun' },
              ].map((dot, idx) => (
                <g key={idx}>
                  <circle
                    cx={dot.x}
                    cy={dot.y}
                    r="5"
                    className="fill-indigo-400 stroke-slate-900 stroke-2"
                  />
                  <text
                    x={dot.x}
                    y="145"
                    fontSize="10"
                    textAnchor="middle"
                    fill="#6b7280"
                    className="font-sans font-normal"
                  >
                    {dot.label}
                  </text>
                </g>
              ))}
            </svg>
          </div>
        </div>
      )}

      {/* General Settings tab */}
      {activeTab === 'settings' && (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-6 animate-fade-in max-w-xl">
          <div className="flex items-center justify-between p-4 bg-slate-950/60 border border-slate-800 rounded-lg">
            <div className="text-xs">
              <h4 className="font-semibold text-slate-200">Domain Transfer Lock</h4>
              <p className="text-slate-500 mt-0.5">
                Prevent unauthorized domain transfer attempts.
              </p>
            </div>
            <button
              onClick={() => setIsLocked(!isLocked)}
              className={`p-2 rounded-lg border flex items-center justify-center transition-colors ${
                isLocked
                  ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                  : 'bg-red-500/10 border-red-500/20 text-red-400'
              }`}
            >
              {isLocked ? <Lock size={16} /> : <Unlock size={16} />}
            </button>
          </div>

          <div className="p-4 border border-slate-800 rounded-lg space-y-3">
            <h4 className="text-xs font-bold text-red-400 uppercase tracking-wider">Danger Zone</h4>
            <p className="text-xs text-slate-400">
              Removing the domain mapping will disrupt all connected web traffic immediately.
            </p>
            <Button
              variant="danger"
              onClick={() => {
                if (confirm('Verify domain mapping deletion?')) {
                  navigate('/domains');
                }
              }}
            >
              Remove Domain Assignment
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};
