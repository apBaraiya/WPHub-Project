import React from 'react';
import { Cpu, HardDrive, LineChart, Activity, ArrowUpRight } from 'lucide-react';

interface MetricItem {
  label: string;
  value: string;
  desc: string;
  change: string;
  icon: any;
  iconColor: string;
}

const resources: MetricItem[] = [
  {
    label: 'CPU Usage',
    value: '14.2%',
    desc: 'Avg load across Kubernetes node cores',
    change: '-2.4%',
    icon: Cpu,
    iconColor: 'text-indigo-400',
  },
  {
    label: 'RAM Consumption',
    value: '2.4 GB / 8 GB',
    desc: 'Active Redis + Traefik containers',
    change: '+0.5%',
    icon: Activity,
    iconColor: 'text-emerald-400',
  },
  {
    label: 'Disk Allocation',
    value: '12.4 GB / 100 GB',
    desc: 'S3-compatible backups & media files',
    change: '12.4% total',
    icon: HardDrive,
    iconColor: 'text-purple-400',
  },
  {
    label: 'Network Bandwidth',
    value: '185.2 GB',
    desc: 'Egress traffic consumed this month',
    change: '+14.2% MoM',
    icon: LineChart,
    iconColor: 'text-pink-400',
  },
];

export const ResourceUsage: React.FC = () => {
  return (
    <div className="space-y-6">
      {/* Header Info */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
        <h2 className="text-lg font-semibold text-slate-100 flex items-center gap-2">
          <Cpu className="text-indigo-400" size={20} />
          Resource Metrics & Usage
        </h2>
        <p className="text-xs text-slate-400 mt-1">
          Detailed metrics showing container system status, disk bounds, requests speed, and
          ingress/egress bandwidth logs.
        </p>
      </div>

      {/* Grid: Stat Summary */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {resources.map((item) => {
          const Icon = item.icon;
          return (
            <div
              key={item.label}
              className="bg-slate-900 border border-slate-800 rounded-xl p-6 relative overflow-hidden group"
            >
              <div className="absolute top-0 right-0 w-20 h-20 bg-indigo-500/5 rounded-full blur-xl"></div>
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-400">{item.label}</span>
                <Icon size={18} className={item.iconColor} />
              </div>
              <p className="text-2xl font-bold mt-2 text-slate-200">{item.value}</p>
              <div className="flex items-center gap-1.5 mt-2 text-[10px]">
                <span className="text-emerald-400 font-semibold flex items-center">
                  {item.change}
                  <ArrowUpRight size={10} />
                </span>
                <span className="text-slate-500">{item.desc}</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Grid: Dual Column Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Core load graph */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-4">
          <div>
            <h3 className="text-sm font-semibold text-slate-200">CPU & RAM Load Thresholds</h3>
            <p className="text-xs text-slate-500 font-normal mt-0.5">
              Real-time usage stats over the last 15 seconds
            </p>
          </div>
          {/* Custom SVG Line Chart */}
          <div className="h-48 w-full bg-slate-950/40 border border-slate-850 rounded-lg p-4">
            <svg viewBox="0 0 500 120" className="w-full h-full overflow-visible text-indigo-500">
              {/* Grid Lines */}
              <line x1="0" y1="30" x2="500" y2="30" stroke="#1e293b" strokeDasharray="3" />
              <line x1="0" y1="60" x2="500" y2="60" stroke="#1e293b" strokeDasharray="3" />
              <line x1="0" y1="90" x2="500" y2="90" stroke="#1e293b" strokeDasharray="3" />

              {/* CPU Line */}
              <path
                d="M 0,90 L 50,80 L 100,50 L 150,60 L 200,30 L 250,70 L 300,55 L 350,85 L 400,20 L 450,45 L 500,35"
                stroke="currentColor"
                strokeWidth="2.5"
                fill="none"
                strokeLinecap="round"
              />
              {/* Memory Line (Green) */}
              <path
                d="M 0,40 L 50,45 L 100,42 L 150,48 L 200,43 L 250,44 L 300,46 L 350,45 L 400,42 L 450,44 L 500,43"
                stroke="#10b981"
                strokeWidth="2.5"
                fill="none"
                strokeLinecap="round"
              />
              {/* Legends */}
              <text x="10" y="20" fill="#6366f1" fontSize="10" fontWeight="bold">
                CPU Load
              </text>
              <text x="80" y="20" fill="#10b981" fontSize="10" fontWeight="bold">
                RAM Load
              </text>
            </svg>
          </div>
        </div>

        {/* Requests & Ingress charts */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-4">
          <div>
            <h3 className="text-sm font-semibold text-slate-200">HTTP Requests & Bandwidth</h3>
            <p className="text-xs text-slate-500 font-normal mt-0.5">
              Average network egress and requests per minute
            </p>
          </div>
          {/* Custom SVG Bar Chart */}
          <div className="h-48 w-full bg-slate-950/40 border border-slate-850 rounded-lg p-4">
            <svg viewBox="0 0 500 120" className="w-full h-full overflow-visible text-pink-500">
              <line x1="0" y1="30" x2="500" y2="30" stroke="#1e293b" strokeDasharray="3" />
              <line x1="0" y1="60" x2="500" y2="60" stroke="#1e293b" strokeDasharray="3" />
              <line x1="0" y1="90" x2="500" y2="90" stroke="#1e293b" strokeDasharray="3" />

              {/* Bars */}
              {[
                { x: 30, h: 40 },
                { x: 70, h: 60 },
                { x: 110, h: 30 },
                { x: 150, h: 70 },
                { x: 190, h: 80 },
                { x: 230, h: 50 },
                { x: 270, h: 90 },
                { x: 310, h: 65 },
                { x: 350, h: 45 },
                { x: 390, h: 85 },
                { x: 430, h: 95 },
                { x: 470, h: 60 },
              ].map((bar, idx) => (
                <rect
                  key={idx}
                  x={bar.x}
                  y={110 - bar.h}
                  width="18"
                  height={bar.h}
                  rx="3"
                  className="fill-indigo-500/80 hover:fill-indigo-400 transition-colors"
                />
              ))}
            </svg>
          </div>
        </div>
      </div>
    </div>
  );
};
