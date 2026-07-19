import React, { useState } from 'react';
import { Button } from '@wphub/ui';
import { ShieldCheck, RefreshCw, Lock, Sparkles, CheckCircle2 } from 'lucide-react';

interface SSLCert {
  domain: string;
  issuer: string;
  type: string;
  status: 'ACTIVE' | 'EXPIRED' | 'PENDING';
  issuedAt: string;
  expiresAt: string;
  autoRenew: boolean;
}

const initialCerts: SSLCert[] = [
  {
    domain: 'mycoolblog.com',
    issuer: "Let's Encrypt Authority",
    type: 'Wildcard DV SSL',
    status: 'ACTIVE',
    issuedAt: '2026-07-02',
    expiresAt: '2026-10-02',
    autoRenew: true,
  },
  {
    domain: 'shop.wphub.cloud',
    issuer: "Let's Encrypt Authority",
    type: 'Standard DV SSL',
    status: 'ACTIVE',
    issuedAt: '2026-07-05',
    expiresAt: '2026-10-05',
    autoRenew: true,
  },
];

export const SSLCertificates: React.FC = () => {
  const [certs, setCerts] = useState<SSLCert[]>(initialCerts);

  const toggleAutoRenew = (domain: string) => {
    setCerts(certs.map((c) => (c.domain === domain ? { ...c, autoRenew: !c.autoRenew } : c)));
  };

  const handleRenew = (domain: string) => {
    alert(`Triggered SSL manual renewal cron request for ${domain}.`);
  };

  return (
    <div className="space-y-6">
      {/* Header Info */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
        <h2 className="text-lg font-semibold text-slate-100 flex items-center gap-2">
          <ShieldCheck className="text-indigo-400" size={20} />
          SSL Certificates
        </h2>
        <p className="text-xs text-slate-400 mt-1">
          Secure your applications with automatic wildcard TLS/SSL certificates issued by Let&apos;s
          Encrypt.
        </p>
      </div>

      {/* SSL Certificates List */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-4">
        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
          Active TLS/SSL Protections
        </h3>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-800 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                <th className="pb-3">Domain Details</th>
                <th className="pb-3">Issuer / Type</th>
                <th className="pb-3">Status</th>
                <th className="pb-3">Valid Range</th>
                <th className="pb-3 text-center">Auto-Renew</th>
                <th className="pb-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800 text-xs font-sans">
              {certs.map((item) => (
                <tr key={item.domain} className="hover:bg-slate-800/10">
                  <td className="py-4 font-semibold text-slate-200">{item.domain}</td>
                  <td className="py-4 space-y-1">
                    <p className="text-slate-300 font-medium">{item.issuer}</p>
                    <p className="text-[10px] text-slate-500 font-mono">{item.type}</p>
                  </td>
                  <td className="py-4">
                    <span
                      className={`inline-block text-[10px] px-2 py-0.5 rounded uppercase font-bold ${
                        item.status === 'ACTIVE'
                          ? 'bg-emerald-500/10 text-emerald-400'
                          : 'bg-amber-500/10 text-amber-400'
                      }`}
                    >
                      {item.status}
                    </span>
                  </td>
                  <td className="py-4 space-y-1 text-slate-400 text-[11px] font-mono">
                    <p>Issued: {item.issuedAt}</p>
                    <p>Expiry: {item.expiresAt}</p>
                  </td>
                  <td className="py-4 text-center">
                    <button
                      onClick={() => toggleAutoRenew(item.domain)}
                      className={`px-3 py-1 text-[11px] rounded-lg border font-semibold transition-colors ${
                        item.autoRenew
                          ? 'bg-indigo-600/10 border-indigo-500/20 text-indigo-400'
                          : 'bg-slate-800 border-slate-700 text-slate-400'
                      }`}
                    >
                      {item.autoRenew ? 'Enabled' : 'Disabled'}
                    </button>
                  </td>
                  <td className="py-4 text-right">
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => handleRenew(item.domain)}
                      className="bg-transparent hover:bg-slate-800 text-slate-300 border border-slate-700/60 text-xs py-1 flex items-center gap-1 ml-auto"
                    >
                      <RefreshCw size={12} />
                      Renew
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Let's Encrypt Info Panel */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="p-4 bg-slate-950/40 border border-slate-800 rounded-lg flex items-start gap-3">
          <CheckCircle2 className="text-indigo-400 shrink-0 mt-0.5" size={18} />
          <div className="text-xs space-y-1">
            <h4 className="font-semibold text-slate-200">Wildcard TLS Support</h4>
            <p className="text-slate-500 leading-relaxed">
              Automatic wildcard mappings secure both parent domains and nested subdomains
              instantly.
            </p>
          </div>
        </div>
        <div className="p-4 bg-slate-950/40 border border-slate-800 rounded-lg flex items-start gap-3">
          <Lock className="text-indigo-400 shrink-0 mt-0.5" size={18} />
          <div className="text-xs space-y-1">
            <h4 className="font-semibold text-slate-200">HTTP/2 & TLS v1.3</h4>
            <p className="text-slate-500 leading-relaxed">
              Encrypted connections standardly configured on modern cipher suites for web routing
              loads.
            </p>
          </div>
        </div>
        <div className="p-4 bg-slate-950/40 border border-slate-800 rounded-lg flex items-start gap-3">
          <Sparkles className="text-indigo-400 shrink-0 mt-0.5" size={18} />
          <div className="text-xs space-y-1">
            <h4 className="font-semibold text-slate-200">Zero Configuration</h4>
            <p className="text-slate-500 leading-relaxed">
              Certificates are automatically requested, configured, and renewed in the proxy worker
              background.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
