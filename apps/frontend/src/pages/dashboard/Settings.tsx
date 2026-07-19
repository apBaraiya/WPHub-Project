import React, { useState } from 'react';
import { Button } from '@wphub/ui';
import { Settings, Save, Cpu, Sliders, Calendar, Key, ToggleLeft, ToggleRight } from 'lucide-react';

interface CronJob {
  id: string;
  name: string;
  schedule: string;
  command: string;
}

interface EnvVar {
  id: string;
  key: string;
  value: string;
}

export const SettingsPage: React.FC = () => {
  const [phpVersion, setPhpVersion] = useState('8.2');
  const [timezone, setTimezone] = useState('UTC');
  const [memoryLimit, setMemoryLimit] = useState('512M');
  const [uploadLimit, setUploadLimit] = useState('128M');

  // Cache options
  const [redisEnabled, setRedisEnabled] = useState(true);
  const [opCacheEnabled, setOpCacheEnabled] = useState(true);

  // Cron jobs state
  const [crons, setCrons] = useState<CronJob[]>([
    {
      id: 'cron-1',
      name: 'WP-Cron Trigger',
      schedule: '*/15 * * * *',
      command: 'wp cron event run --due-now',
    },
    { id: 'cron-2', name: 'Database Cleanup', schedule: '0 2 * * *', command: 'wp db optimize' },
  ]);
  const [cronName, setCronName] = useState('');
  const [cronSchedule, setCronSchedule] = useState('');
  const [cronCommand, setCronCommand] = useState('');

  // Environment variables state
  const [envVars, setEnvVars] = useState<EnvVar[]>([
    { id: 'env-1', key: 'WP_DEBUG', value: 'false' },
    { id: 'env-2', key: 'WP_CACHE', value: 'true' },
  ]);
  const [envKey, setEnvKey] = useState('');
  const [envVal, setEnvVal] = useState('');

  const handleAddCron = (e: React.FormEvent) => {
    e.preventDefault();
    if (!cronName || !cronSchedule || !cronCommand) return;
    setCrons([
      ...crons,
      {
        id: Math.random().toString(),
        name: cronName,
        schedule: cronSchedule,
        command: cronCommand,
      },
    ]);
    setCronName('');
    setCronSchedule('');
    setCronCommand('');
  };

  const handleAddEnv = (e: React.FormEvent) => {
    e.preventDefault();
    if (!envKey || !envVal) return;
    setEnvVars([...envVars, { id: Math.random().toString(), key: envKey, value: envVal }]);
    setEnvKey('');
    setEnvVal('');
  };

  const handleSaveGeneral = () => {
    alert(
      'General advanced settings saved successfully! PHP parameters will rebuild in background.',
    );
  };

  return (
    <div className="space-y-6">
      {/* Header Info */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
        <h2 className="text-lg font-semibold text-slate-100 flex items-center gap-2">
          <Settings className="text-indigo-400" size={20} />
          Advanced Environment Settings
        </h2>
        <p className="text-xs text-slate-400 mt-1">
          Adjust PHP variables, set background crons scheduling, environment parameters, and Purge
          Object Caches.
        </p>
      </div>

      {/* Grid panels */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* PHP settings */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-4">
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
            <Cpu size={14} className="text-indigo-400" />
            PHP Engine Configuration
          </h3>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                  PHP Version
                </label>
                <select
                  value={phpVersion}
                  onChange={(e) => setPhpVersion(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-indigo-500"
                >
                  <option value="8.1">PHP 8.1</option>
                  <option value="8.2">PHP 8.2 (Recommended)</option>
                  <option value="8.3">PHP 8.3</option>
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                  System Timezone
                </label>
                <select
                  value={timezone}
                  onChange={(e) => setTimezone(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-indigo-500"
                >
                  <option value="UTC">UTC (Default)</option>
                  <option value="EST">America/New_York (EST)</option>
                  <option value="IST">Asia/Kolkata (IST)</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                  Memory Limit
                </label>
                <select
                  value={memoryLimit}
                  onChange={(e) => setMemoryLimit(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-indigo-500"
                >
                  <option value="256M">256 MB</option>
                  <option value="512M">512 MB</option>
                  <option value="1024M">1024 MB</option>
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                  Max Upload Sizing
                </label>
                <select
                  value={uploadLimit}
                  onChange={(e) => setUploadLimit(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-indigo-500"
                >
                  <option value="64M">64 MB</option>
                  <option value="128M">128 MB</option>
                  <option value="256M">256 MB</option>
                </select>
              </div>
            </div>

            <div className="pt-2">
              <Button
                onClick={handleSaveGeneral}
                className="flex items-center gap-1.5 text-xs py-2"
              >
                <Save size={14} />
                Save PHP Parameters
              </Button>
            </div>
          </div>
        </div>

        {/* Cache controls */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-4">
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
            <Sliders size={14} className="text-indigo-400" />
            Caching Profiles
          </h3>
          <div className="space-y-4 text-xs">
            <div className="flex items-center justify-between p-3.5 bg-slate-950/45 border border-slate-800 rounded-lg">
              <div>
                <p className="font-semibold text-slate-200">Redis Object Cache</p>
                <p className="text-slate-500 mt-0.5">Speed up SQL lookups via in-memory caching.</p>
              </div>
              <button onClick={() => setRedisEnabled(!redisEnabled)} className="text-indigo-400">
                {redisEnabled ? (
                  <ToggleRight size={32} />
                ) : (
                  <ToggleLeft size={32} className="text-slate-600" />
                )}
              </button>
            </div>

            <div className="flex items-center justify-between p-3.5 bg-slate-950/45 border border-slate-800 rounded-lg">
              <div>
                <p className="font-semibold text-slate-200">Zend OPcache</p>
                <p className="text-slate-500 mt-0.5">
                  Cache compiled PHP script bytecode in shared memory.
                </p>
              </div>
              <button
                onClick={() => setOpCacheEnabled(!opCacheEnabled)}
                className="text-indigo-400"
              >
                {opCacheEnabled ? (
                  <ToggleRight size={32} />
                ) : (
                  <ToggleLeft size={32} className="text-slate-600" />
                )}
              </button>
            </div>

            <Button
              variant="secondary"
              onClick={() => alert('Purged all Redis object cache instances.')}
              className="w-full bg-slate-950 border-slate-850 hover:border-slate-700 text-xs py-2"
            >
              Purge Object Caches
            </Button>
          </div>
        </div>

        {/* Cron manager */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-4 lg:col-span-2">
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
            <Calendar size={14} className="text-indigo-400" />
            Cron Jobs Scheduler
          </h3>

          <form
            onSubmit={handleAddCron}
            className="grid grid-cols-1 sm:grid-cols-4 gap-3 items-end"
          >
            <div>
              <label className="block text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                Task Name
              </label>
              <input
                type="text"
                required
                placeholder="My Custom Task"
                value={cronName}
                onChange={(e) => setCronName(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-indigo-500"
              />
            </div>
            <div>
              <label className="block text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                Expression (Cron)
              </label>
              <input
                type="text"
                required
                placeholder="*/15 * * * *"
                value={cronSchedule}
                onChange={(e) => setCronSchedule(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-indigo-500"
              />
            </div>
            <div className="sm:col-span-2 flex gap-3">
              <div className="flex-grow">
                <label className="block text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                  Command line
                </label>
                <input
                  type="text"
                  required
                  placeholder="php my-script.php"
                  value={cronCommand}
                  onChange={(e) => setCronCommand(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-indigo-500"
                />
              </div>
              <Button type="submit" variant="primary" className="py-2 shrink-0">
                Add Cron
              </Button>
            </div>
          </form>

          {/* Active cron list */}
          <div className="divide-y divide-slate-800 border border-slate-800 rounded-xl bg-slate-950/30 overflow-hidden text-xs">
            {crons.map((cron) => (
              <div key={cron.id} className="p-4 flex items-center justify-between font-mono">
                <div className="space-y-1">
                  <p className="font-semibold text-slate-200 font-sans">{cron.name}</p>
                  <p className="text-[10px] text-indigo-400">Schedule: {cron.schedule}</p>
                  <p className="text-[10px] text-slate-500">Cmd: {cron.command}</p>
                </div>
                <button
                  onClick={() => setCrons(crons.filter((c) => c.id !== cron.id))}
                  className="text-red-400 hover:text-red-300 font-sans text-[11px] hover:underline"
                >
                  Remove Task
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Env vars */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-4 lg:col-span-2">
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
            <Key size={14} className="text-indigo-400" />
            Environment Variables
          </h3>

          <form onSubmit={handleAddEnv} className="flex gap-3 items-end max-w-xl">
            <div className="flex-1">
              <label className="block text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                Key Name
              </label>
              <input
                type="text"
                required
                placeholder="WP_DEBUG"
                value={envKey}
                onChange={(e) => setEnvKey(e.target.value.toUpperCase().replace(/[^A-Z0-9_]/g, ''))}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-indigo-500"
              />
            </div>
            <div className="flex-grow">
              <label className="block text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                Value
              </label>
              <input
                type="text"
                required
                placeholder="true"
                value={envVal}
                onChange={(e) => setEnvVal(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-indigo-500"
              />
            </div>
            <Button type="submit" variant="primary" className="py-2">
              Add Var
            </Button>
          </form>

          {/* Active Env list */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 font-mono text-xs">
            {envVars.map((v) => (
              <div
                key={v.id}
                className="p-3 bg-slate-950/60 border border-slate-850 rounded-lg flex items-center justify-between gap-3"
              >
                <div className="truncate">
                  <span className="text-indigo-400 font-semibold">{v.key}</span>
                  <span className="text-slate-500 mx-2">=</span>
                  <span className="text-slate-200">{v.value}</span>
                </div>
                <button
                  onClick={() => setEnvVars(envVars.filter((e) => e.id !== v.id))}
                  className="text-red-400 hover:text-red-300 font-sans text-[11px]"
                >
                  Delete
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
