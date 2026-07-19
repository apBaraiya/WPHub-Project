import React, { useState } from 'react';
import { Button } from '@wphub/ui';
import { History, Plus, Play, Download, Trash2, Calendar, Settings } from 'lucide-react';

interface BackupItem {
  id: string;
  name: string;
  type: 'Manual' | 'Scheduled';
  size: string;
  status: 'SUCCESS' | 'RUNNING' | 'FAILED';
  createdAt: string;
}

const initialBackups: BackupItem[] = [
  {
    id: 'bak-1',
    name: 'backup_auto_daily_2026-07-11',
    type: 'Scheduled',
    size: '142.5 MB',
    status: 'SUCCESS',
    createdAt: '2026-07-11 02:00',
  },
  {
    id: 'bak-2',
    name: 'backup_pre_wordpress_update',
    type: 'Manual',
    size: '138.2 MB',
    status: 'SUCCESS',
    createdAt: '2026-07-10 14:15',
  },
];

export const Backups: React.FC = () => {
  const [backups, setBackups] = useState<BackupItem[]>(initialBackups);
  const [isBackupRunning, setIsBackupRunning] = useState(false);
  const [autoBackupEnabled, setAutoBackupEnabled] = useState(true);

  const triggerBackup = () => {
    setIsBackupRunning(true);
    const newBackup: BackupItem = {
      id: Math.random().toString(),
      name: `backup_manual_${new Date().toISOString().split('T')[0]}`,
      type: 'Manual',
      size: 'Checking...',
      status: 'RUNNING',
      createdAt: new Date().toLocaleString(),
    };
    setBackups([newBackup, ...backups]);

    setTimeout(() => {
      setBackups((prev) =>
        prev.map((b) =>
          b.status === 'RUNNING' ? { ...b, status: 'SUCCESS', size: '141.2 MB' } : b,
        ),
      );
      setIsBackupRunning(false);
    }, 3000);
  };

  const handleRestore = (name: string) => {
    if (
      confirm(
        `Are you sure you want to restore the snapshot: ${name}? All active database modifications and files will be overwritten.`,
      )
    ) {
      alert(`Restoration snapshot job started for: ${name}`);
    }
  };

  const handleDelete = (id: string) => {
    if (confirm('Delete backup snapshot?')) {
      setBackups(backups.filter((b) => b.id !== id));
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Info */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-slate-100 flex items-center gap-2">
            <History className="text-indigo-400" size={20} />
            Backups & Recovery
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Create on-demand site backups, schedule automated snapshots, or restore previous
            environments instantly.
          </p>
        </div>
        <Button
          variant="primary"
          onClick={triggerBackup}
          disabled={isBackupRunning}
          className="flex items-center gap-2"
        >
          <Plus size={16} />
          {isBackupRunning ? 'Snapshot Running...' : 'Create Backup'}
        </Button>
      </div>

      {/* Grid: Auto Settings + Snapshot List */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Backup Settings Panel */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-5 h-fit">
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
            <Settings size={14} className="text-indigo-500" />
            Backup Preferences
          </h3>

          <div className="flex items-center justify-between p-3.5 bg-slate-950/45 border border-slate-800 rounded-lg">
            <div className="text-xs space-y-0.5">
              <p className="font-semibold text-slate-200">Daily Snapshots</p>
              <p className="text-slate-500">Auto backup runs at 02:00 UTC</p>
            </div>
            <button
              onClick={() => setAutoBackupEnabled(!autoBackupEnabled)}
              className={`px-3 py-1 text-[11px] rounded-lg border font-semibold transition-colors ${
                autoBackupEnabled
                  ? 'bg-indigo-600/10 border-indigo-500/20 text-indigo-400'
                  : 'bg-slate-800 border-slate-700 text-slate-400'
              }`}
            >
              {autoBackupEnabled ? 'Enabled' : 'Disabled'}
            </button>
          </div>

          <div className="p-3 bg-indigo-500/5 border border-indigo-500/10 rounded-lg flex items-start gap-2.5 text-xs text-indigo-400 leading-relaxed">
            <Calendar size={18} className="shrink-0 mt-0.5" />
            <p>
              Retention Policy: We store backup snapshots for 30 days on our S3-compatible cloud
              storage block before deletion.
            </p>
          </div>
        </div>

        {/* Snapshots Table */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 lg:col-span-2 space-y-4">
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
            Available Snapshots
          </h3>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-800 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  <th className="pb-3">Snapshot Name</th>
                  <th className="pb-3">Type</th>
                  <th className="pb-3">Size</th>
                  <th className="pb-3">Status</th>
                  <th className="pb-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800 text-xs font-mono">
                {backups.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-800/10">
                    <td className="py-4 space-y-1">
                      <p className="font-semibold text-slate-200">{item.name}</p>
                      <p className="text-[10px] text-slate-500 font-sans">{item.createdAt}</p>
                    </td>
                    <td className="py-4 text-slate-400">{item.type}</td>
                    <td className="py-4 text-slate-300">{item.size}</td>
                    <td className="py-4">
                      <span
                        className={`inline-block text-[10px] px-2 py-0.5 rounded uppercase font-bold ${
                          item.status === 'SUCCESS'
                            ? 'bg-emerald-500/10 text-emerald-400'
                            : item.status === 'RUNNING'
                              ? 'bg-amber-500/10 text-amber-400 animate-pulse'
                              : 'bg-red-500/10 text-red-400'
                        }`}
                      >
                        {item.status}
                      </span>
                    </td>
                    <td className="py-4 text-right">
                      <div className="flex justify-end gap-1.5">
                        <Button
                          variant="secondary"
                          size="sm"
                          disabled={item.status === 'RUNNING'}
                          onClick={() => handleRestore(item.name)}
                          className="bg-transparent hover:bg-indigo-600/10 text-indigo-400 border border-indigo-500/20 hover:border-indigo-500/50 text-xs py-1 flex items-center gap-1 disabled:opacity-40"
                        >
                          <Play size={12} />
                          Restore
                        </Button>
                        <Button
                          variant="secondary"
                          size="sm"
                          disabled={item.status === 'RUNNING'}
                          className="bg-transparent hover:bg-slate-800 text-slate-400 border border-slate-850 hover:border-slate-600 p-1 disabled:opacity-40"
                          title="Download Snapshot"
                        >
                          <Download size={14} />
                        </Button>
                        <Button
                          variant="danger"
                          size="sm"
                          disabled={item.status === 'RUNNING'}
                          onClick={() => handleDelete(item.id)}
                          className="bg-transparent hover:bg-red-500/10 text-red-400 border border-red-500/20 hover:border-red-500/50 p-1 disabled:opacity-40"
                        >
                          <Trash2 size={14} />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};
