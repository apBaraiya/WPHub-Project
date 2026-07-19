import React, { useState } from 'react';
import { FileText, Terminal, Download, Trash2 } from 'lucide-react';

interface LogLine {
  timestamp: string;
  level: 'INFO' | 'WARN' | 'ERROR';
  message: string;
}

const mockLogs: Record<string, LogLine[]> = {
  php: [
    {
      timestamp: '2026-07-11 15:30:12',
      level: 'INFO',
      message: 'PHP Memory Limit set successfully to 512M',
    },
    {
      timestamp: '2026-07-11 15:30:14',
      level: 'WARN',
      message: 'PHP Warning: Array to string conversion in wp-includes/types.php line 42',
    },
    {
      timestamp: '2026-07-11 15:31:01',
      level: 'INFO',
      message: 'OPcache bytecode cached successfully',
    },
  ],
  nginx: [
    { timestamp: '2026-07-11 15:30:11', level: 'INFO', message: 'Nginx started master process' },
    {
      timestamp: '2026-07-11 15:32:02',
      level: 'INFO',
      message: 'GET /index.php HTTP/1.1 200 OK 0.045s',
    },
    {
      timestamp: '2026-07-11 15:33:14',
      level: 'ERROR',
      message: 'Nginx client connection timed out (ECONNRESET) on socket',
    },
  ],
  apache: [
    {
      timestamp: '2026-07-11 15:30:00',
      level: 'INFO',
      message: 'Apache configuration syntax verified - OK',
    },
    {
      timestamp: '2026-07-11 15:30:05',
      level: 'INFO',
      message: 'Apache/2.4.52 (Unix) configured -- resuming normal operations',
    },
  ],
  wordpress: [
    {
      timestamp: '2026-07-11 15:30:15',
      level: 'INFO',
      message: 'WP Core: Initialized successfully on version 6.4.3',
    },
    {
      timestamp: '2026-07-11 15:30:18',
      level: 'INFO',
      message: 'WP Theme: Loaded active template "Twenty Twenty-Four"',
    },
    {
      timestamp: '2026-07-11 15:32:20',
      level: 'WARN',
      message: 'WP Plugin Notice: Akismet API connection failed, retrying in 300s',
    },
  ],
  provision: [
    {
      timestamp: '2026-07-11 15:29:40',
      level: 'INFO',
      message: 'Provision Task: Triggering MariaDB docker database container instantiation',
    },
    {
      timestamp: '2026-07-11 15:29:45',
      level: 'INFO',
      message: 'Provision Task: Database wphub_db_wp1 initialized successfully',
    },
    {
      timestamp: '2026-07-11 15:29:58',
      level: 'INFO',
      message: 'Provision Task: SSL request registered successfully to LetsEncrypt DV',
    },
  ],
  system: [
    {
      timestamp: '2026-07-11 15:00:00',
      level: 'INFO',
      message: 'System Cron: Completed automatic daily database optimization cron',
    },
    {
      timestamp: '2026-07-11 15:30:00',
      level: 'INFO',
      message: 'System Manager: Sync status - healthy',
    },
  ],
};

export const Logs: React.FC = () => {
  const [activeTab, setActiveTab] = useState<keyof typeof mockLogs>('php');
  const [logs, setLogs] = useState(mockLogs);

  const handleClear = () => {
    setLogs({
      ...logs,
      [activeTab]: [],
    });
  };

  const getLevelColor = (level: LogLine['level']) => {
    switch (level) {
      case 'ERROR':
        return 'text-red-400 font-bold';
      case 'WARN':
        return 'text-amber-400 font-semibold';
      default:
        return 'text-indigo-400';
    }
  };

  return (
    <div className="space-y-6 flex flex-col h-[calc(100vh-140px)]">
      {/* Header Panel */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-wrap gap-2 items-center justify-between shrink-0">
        <div className="flex items-center gap-2">
          <FileText className="text-indigo-400" size={18} />
          <h2 className="text-sm font-semibold text-slate-200">Diagnostic Logs Stream</h2>
        </div>

        <div className="flex gap-2">
          <button className="p-1.5 rounded bg-slate-950 hover:bg-slate-800 border border-slate-800 text-slate-400 hover:text-slate-200 text-xs flex items-center gap-1">
            <Download size={13} />
            Export Log
          </button>
          <button
            onClick={handleClear}
            className="p-1.5 rounded bg-slate-950 hover:bg-red-500/10 border border-slate-800 hover:border-red-500/20 text-red-400 text-xs flex items-center gap-1"
          >
            <Trash2 size={13} />
            Clear console
          </button>
        </div>
      </div>

      {/* Tabs list */}
      <div className="flex border-b border-slate-800 text-xs overflow-x-auto shrink-0">
        {(
          [
            { id: 'php', label: 'PHP Engine' },
            { id: 'nginx', label: 'Nginx Access' },
            { id: 'apache', label: 'Apache server' },
            { id: 'wordpress', label: 'WordPress Core' },
            { id: 'provision', label: 'Orchestration Logs' },
            { id: 'system', label: 'System Cron' },
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

      {/* Console Output Panel */}
      <div className="flex-1 bg-slate-950 border border-slate-900 rounded-xl p-6 font-mono text-xs overflow-y-auto scrollbar-thin text-slate-300 min-h-0 flex flex-col gap-2">
        <div className="flex items-center gap-2 text-slate-500 border-b border-slate-900 pb-2 mb-2 shrink-0">
          <Terminal size={14} />
          <span>WPHub Diagnostic Console - v1.0.0-cli</span>
        </div>

        <div className="flex-1 overflow-y-auto space-y-1.5 min-h-0">
          {logs[activeTab].length === 0 ? (
            <div className="text-slate-600 italic py-4">
              Console is empty. No new logs captured.
            </div>
          ) : (
            logs[activeTab].map((line, idx) => (
              <div key={idx} className="flex gap-4 hover:bg-slate-900/40 py-0.5 rounded">
                <span className="text-slate-600 select-none shrink-0 font-normal">
                  {line.timestamp}
                </span>
                <span className={`shrink-0 uppercase w-12 ${getLevelColor(line.level)}`}>
                  [{line.level}]
                </span>
                <span className="break-all font-normal text-slate-300">{line.message}</span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
