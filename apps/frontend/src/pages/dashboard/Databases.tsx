import React, { useState, useEffect } from 'react';
import { api } from '../../api/client';
import { Button } from '@wphub/ui';
import {
  Database,
  Plus,
  Key,
  Eye,
  EyeOff,
  Trash2,
  ShieldCheck,
  Download,
  Loader2,
} from 'lucide-react';

interface DatabaseItem {
  id: string;
  name: string;
  user: string;
  pass: string;
  size: string;
  tables: number;
  isAssociatedWithSite?: boolean;
}

export const Databases: React.FC = () => {
  const [dbs, setDbs] = useState<DatabaseItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [showPasswords, setShowPasswords] = useState<Record<string, boolean>>({});

  const [dbPrefix] = useState('wphub_db_');
  const [dbSuffix, setDbSuffix] = useState('');
  const [dbUser, setDbUser] = useState('');
  const [dbPass, setDbPass] = useState('SecurePassword1!');

  const fetchDatabases = () => {
    setLoading(true);
    api
      .get('/databases')
      .then((res) => {
        setDbs(res.data.data);
        setLoading(false);
      })
      .catch((err) => {
        console.log('Error fetching databases:', err);
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchDatabases();
  }, []);

  const togglePassword = (id: string) => {
    setShowPasswords((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const handleCreateDb = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!dbSuffix || !dbUser || !dbPass) return;

    try {
      await api.post('/databases', {
        name: `${dbPrefix}${dbSuffix}`,
        dbUser,
        dbPass,
      });
      setDbSuffix('');
      setDbUser('');
      setDbPass('SecurePassword1!');
      fetchDatabases();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to create database instance.');
    }
  };

  const handleDeleteDb = async (id: string, name: string, isAssociated: boolean) => {
    if (isAssociated) {
      alert(
        `The database "${name}" is owned and used by an active WordPress installation. It cannot be deleted here.`,
      );
      return;
    }

    if (
      confirm(
        `Are you sure you want to drop the database "${name}"? All tables and records will be deleted permanently.`,
      )
    ) {
      try {
        await api.delete(`/databases/${id}`);
        fetchDatabases();
      } catch (err: any) {
        alert(err.response?.data?.error || 'Failed to drop database.');
      }
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Info */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
        <h2 className="text-lg font-semibold text-slate-100 flex items-center gap-2">
          <Database className="text-indigo-400" size={20} />
          Database Management
        </h2>
        <p className="text-xs text-slate-400 mt-1">
          Administer MariaDB/MySQL database users, sizes, tables, and backups configuration.
        </p>
      </div>

      {/* Grid: Create Database Form (left) + Database List (right) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-fade-in">
        {/* Create DB Form */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 h-fit space-y-4">
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
            Create MySQL Database
          </h3>
          <form onSubmit={handleCreateDb} className="space-y-3">
            <div>
              <label className="block text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                Database Name
              </label>
              <div className="flex items-center">
                <span className="bg-slate-950 border border-slate-800 border-r-0 rounded-l-lg px-3 py-2 text-xs text-slate-500">
                  {dbPrefix}
                </span>
                <input
                  type="text"
                  required
                  placeholder="wordpress"
                  value={dbSuffix}
                  onChange={(e) =>
                    setDbSuffix(e.target.value.toLowerCase().replace(/[^a-z0-9]/g, ''))
                  }
                  className="flex-1 bg-slate-950 border border-slate-800 rounded-r-lg px-3 py-2 text-sm focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                Database Username
              </label>
              <input
                type="text"
                required
                placeholder="wp_user"
                value={dbUser}
                onChange={(e) => setDbUser(e.target.value.replace(/[^a-zA-Z0-9]/g, ''))}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div>
              <label className="block text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                Database Password
              </label>
              <input
                type="password"
                required
                placeholder="SecurePassword!"
                value={dbPass}
                onChange={(e) => setDbPass(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-indigo-500"
              />
            </div>

            <Button
              type="submit"
              variant="primary"
              className="w-full mt-2 flex items-center justify-center gap-1.5"
            >
              <Plus size={16} />
              Create DB Instance
            </Button>
          </form>
        </div>

        {/* Database List */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              Active Database Instances
            </h3>
            {loading && <Loader2 size={14} className="animate-spin text-indigo-500" />}
          </div>

          <div className="overflow-x-auto">
            {dbs.length === 0 ? (
              <div className="text-center py-12 text-slate-500 text-sm">
                No active database instances found. Databases configured during CMS installations or
                created manually will appear here.
              </div>
            ) : (
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-800 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                    <th className="pb-3">Database / User</th>
                    <th className="pb-3">Password</th>
                    <th className="pb-3">Size / Tables</th>
                    <th className="pb-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800 text-xs font-mono">
                  {dbs.map((db) => (
                    <tr key={db.id} className="hover:bg-slate-800/10">
                      <td className="py-4 space-y-1">
                        <div className="flex items-center gap-2">
                          <p className="font-semibold text-slate-200">{db.name}</p>
                          {db.isAssociatedWithSite && (
                            <span className="text-[9px] bg-indigo-500/10 text-indigo-400 border border-indigo-500/25 px-1.5 py-0.5 rounded font-sans font-semibold">
                              System CMS
                            </span>
                          )}
                        </div>
                        <p className="text-[10px] text-slate-500 flex items-center gap-1">
                          <Key size={10} />
                          User: {db.user}
                        </p>
                      </td>
                      <td className="py-4">
                        <div className="flex items-center gap-2">
                          <span>{showPasswords[db.id] ? db.pass : '••••••••••••'}</span>
                          <button
                            onClick={() => togglePassword(db.id)}
                            className="text-slate-400 hover:text-slate-200"
                          >
                            {showPasswords[db.id] ? <EyeOff size={14} /> : <Eye size={14} />}
                          </button>
                        </div>
                      </td>
                      <td className="py-4 space-y-1">
                        <p className="text-slate-200">{db.size}</p>
                        <p className="text-[10px] text-slate-500 font-sans">{db.tables} Tables</p>
                      </td>
                      <td className="py-4 text-right">
                        <div className="flex justify-end gap-1.5">
                          <a
                            href="https://phpmyadmin.wphub.cloud"
                            target="_blank"
                            rel="noreferrer"
                            className="px-2.5 py-1 text-slate-300 hover:text-slate-100 hover:bg-slate-800 rounded border border-slate-700/60 flex items-center justify-center text-xs font-sans font-medium"
                          >
                            <ShieldCheck size={12} className="mr-1" />
                            phpMyAdmin
                          </a>
                          <Button
                            variant="secondary"
                            size="sm"
                            className="bg-transparent hover:bg-slate-800 text-slate-400 border border-slate-850 hover:border-slate-600 p-1"
                            title="Export Backup"
                          >
                            <Download size={14} />
                          </Button>
                          <Button
                            variant="danger"
                            size="sm"
                            disabled={db.isAssociatedWithSite}
                            onClick={() =>
                              handleDeleteDb(db.id, db.name, !!db.isAssociatedWithSite)
                            }
                            className="bg-transparent hover:bg-red-500/10 text-red-400 border border-red-500/20 hover:border-red-500/50 disabled:opacity-30"
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
    </div>
  );
};
