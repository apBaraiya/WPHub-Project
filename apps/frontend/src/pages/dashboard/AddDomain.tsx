import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../../api/client';
import { Button } from '@wphub/ui';
import { ArrowLeft, CheckCircle, XCircle, Loader2 } from 'lucide-react';

const extensionsList = [
  { ext: '.site' },
  { ext: '.com' },
  { ext: '.net' },
  { ext: '.org' },
  { ext: '.online' },
  { ext: '.store' },
  { ext: '.shop' },
  { ext: '.blog' },
  { ext: '.dev' },
  { ext: '.app' },
  { ext: '.tech' },
  { ext: '.xyz' },
  { ext: '.info' },
  { ext: '.co' },
  { ext: '.io' },
  { ext: '.ai' },
  { ext: '.me' },
  { ext: '.pro' },
  { ext: '.cloud' },
  { ext: '.live' },
  { ext: '.digital' },
  { ext: '.space' },
  { ext: '.wiki' },
  { ext: '.today' },
  { ext: '.world' },
];

export const AddDomain: React.FC = () => {
  const navigate = useNavigate();
  const [domainName, setDomainName] = useState('');
  const [selectedExt, setSelectedExt] = useState('.site');
  const [isChecking, setIsChecking] = useState(false);
  const [isAvailable, setIsAvailable] = useState<boolean | null>(null);
  const [failReason, setFailReason] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!domainName.trim()) {
      setIsChecking(false);
      setIsAvailable(null);
      setFailReason(null);
      return;
    }

    setIsChecking(true);
    setIsAvailable(null);
    setFailReason(null);

    const delayDebounceFn = setTimeout(async () => {
      try {
        const cleanExt = selectedExt.replace(/^\./, '');
        const res = await api.post('/domains/check', {
          name: domainName.toLowerCase().replace(/[^a-z0-9-]/g, ''),
          extension: cleanExt,
        });

        const data = res.data.data;
        if (data.available) {
          setIsAvailable(true);
          setFailReason(null);
        } else {
          setIsAvailable(false);
          setFailReason(data.reason || 'invalid_format');
        }
      } catch (err) {
        setIsAvailable(false);
        setFailReason('invalid_format');
      } finally {
        setIsChecking(false);
      }
    }, 500);

    return () => clearTimeout(delayDebounceFn);
  }, [domainName, selectedExt]);

  const handleCreateDomain = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAvailable || isChecking || isSubmitting) return;

    setIsSubmitting(true);
    try {
      const cleanExt = selectedExt.replace(/^\./, '');
      const sanitizedName = domainName.toLowerCase().replace(/[^a-z0-9-]/g, '');

      await api.post('/domains/create', {
        name: sanitizedName,
        extension: cleanExt,
      });

      const fullDomainName = `${sanitizedName}${selectedExt}`;
      const newDomain = {
        id: 'dom-' + Math.random().toString(36).substr(2, 9),
        domain: fullDomainName,
        type: selectedExt === '.site' ? 'Subdomain' : 'Primary',
        status: 'ACTIVE',
        ssl: true,
        dnsValid: true,
        createdAt: new Date().toISOString(),
      };

      const existingData = localStorage.getItem('wphub_user_domains');
      let list = [];
      if (existingData) {
        try {
          list = JSON.parse(existingData);
        } catch (e) {
          list = [];
        }
      }
      list.push(newDomain);
      localStorage.setItem('wphub_user_domains', JSON.stringify(list));

      alert(`Successfully registered ${fullDomainName} and verified on cloud infrastructure.`);
      navigate('/domains');
    } catch (err: any) {
      const msg =
        err.response?.data?.error?.message || 'Failed to register domain. Please check settings.';
      alert(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 w-full animate-fade-in">
      {/* Header Back Button */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => navigate('/domains')}
          className="p-2 rounded-lg bg-slate-900 border border-slate-800 text-slate-400 hover:text-slate-200 transition-colors"
        >
          <ArrowLeft size={16} />
        </button>
        <div>
          <h2 className="text-lg font-semibold text-slate-100">Connect Custom Domain</h2>
          <p className="text-xs text-slate-400 mt-1">
            Connect your brand domain to your WordPress cloud
          </p>
        </div>
      </div>

      {/* Lookup Card */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
        <form onSubmit={handleCreateDomain} className="space-y-6">
          <div className="space-y-2">
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Domain Name
            </label>
            <div className="flex gap-3 max-w-xl">
              <div className="flex-1 relative">
                <input
                  type="text"
                  required
                  placeholder="mycoolbusiness"
                  value={domainName}
                  onChange={(e) => {
                    setDomainName(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''));
                  }}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-4 pr-32 py-2.5 text-sm focus:outline-none focus:border-indigo-500"
                />

                {/* Spinner inside the input container */}
                {isChecking && (
                  <div className="absolute right-36 top-1/2 -translate-y-1/2">
                    <Loader2 size={16} className="animate-spin text-indigo-500" />
                  </div>
                )}

                {/* Extension Dropdown */}
                <select
                  value={selectedExt}
                  onChange={(e) => {
                    setSelectedExt(e.target.value);
                  }}
                  className="absolute right-2 top-1/2 -translate-y-1/2 bg-slate-900 border border-slate-800 text-slate-300 text-xs rounded px-2 py-1 focus:outline-none focus:border-indigo-500 cursor-pointer"
                >
                  {extensionsList.map((item) => (
                    <option key={item.ext} value={item.ext}>
                      {item.ext}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Feedback Display */}
          {domainName && (
            <div className="text-sm font-medium">
              {isChecking && (
                <span className="text-slate-400 flex items-center gap-1.5">
                  <Loader2 size={16} className="animate-spin text-indigo-500" />
                  Checking availability...
                </span>
              )}

              {isAvailable === true && (
                <span className="text-emerald-400 flex items-center gap-1.5">
                  <CheckCircle size={16} />✓ {domainName.toLowerCase().replace(/[^a-z0-9-]/g, '')}
                  {selectedExt} is available
                </span>
              )}

              {isAvailable === false && (
                <span className="text-red-400 flex items-center gap-1.5">
                  <XCircle size={16} />
                  {failReason === 'already_taken' &&
                    'This domain has already been registered on WPHub.'}
                  {failReason === 'public_domain_exists' &&
                    'This domain already exists on the Internet. Please choose another name.'}
                  {failReason === 'invalid_format' &&
                    'Invalid domain prefix format or label rules constraint.'}
                </span>
              )}
            </div>
          )}

          <Button
            type="submit"
            variant="primary"
            disabled={!isAvailable || isChecking || isSubmitting}
            className="flex items-center gap-2"
          >
            {isSubmitting && <Loader2 size={16} className="animate-spin" />}
            Create Domain
          </Button>
        </form>
      </div>

      {/* Suffix Price List Panel */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4">
          Supported Extensions & Tariffs
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-3 text-xs">
          {extensionsList.map((item) => (
            <div
              key={item.ext}
              className="p-3 bg-slate-950/60 border border-slate-800/60 rounded-lg flex items-center justify-center font-semibold text-slate-200 text-sm hover:border-slate-700 transition-colors"
            >
              {item.ext}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
