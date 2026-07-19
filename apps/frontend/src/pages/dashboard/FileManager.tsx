import React, { useState, useEffect } from 'react';
import { api } from '../../api/client';
import { Button } from '@wphub/ui';
import {
  FolderOpen,
  File,
  ChevronDown,
  ChevronRight,
  FolderPlus,
  FilePlus,
  Trash2,
  Lock,
  Search,
  Check,
  AlertCircle,
  Loader2,
} from 'lucide-react';

interface FileNode {
  id: string; // Base64 encoded path
  name: string;
  type: 'file' | 'folder';
  size?: string;
  permissions: string;
  updatedAt: string;
  isOpen?: boolean;
  children?: FileNode[];
}

export const FileManager: React.FC = () => {
  const [sites, setSites] = useState<any[]>([]);
  const [selectedSiteId, setSelectedSiteId] = useState('');
  const [directoryTree, setDirectoryTree] = useState<FileNode[]>([]);
  const [rightPaneFiles, setRightPaneFiles] = useState<FileNode[]>([]);
  const [activeFolderId, setActiveFolderId] = useState<string>('cHVibGljX2h0bWw='); // Base64 for public_html
  const [activeFolderPath, setActiveFolderPath] = useState<string>('public_html');
  const [selectedFileId, setSelectedFileId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);

  // Fetch user sites list on mount
  useEffect(() => {
    api
      .get('/sites')
      .then((res) => {
        setSites(res.data.data);
        if (res.data.data.length > 0) {
          setSelectedSiteId(res.data.data[0].id);
        }
      })
      .catch((err) => console.log('Error fetching sites:', err));
  }, []);

  // Fetch directory tree and current path listing when site or active folder shifts
  useEffect(() => {
    if (!selectedSiteId) return;

    setLoading(true);
    // 1. Fetch directory tree for sidebar navigation
    api
      .get(`/files/tree?siteId=${selectedSiteId}`)
      .then((res) => {
        setDirectoryTree(res.data.data);
      })
      .catch((err) => console.log('Error loading directory tree:', err));

    // 2. Fetch immediate folder contents for main right explorer pane
    api
      .get(`/files/list?siteId=${selectedSiteId}&path=${activeFolderPath}`)
      .then((res) => {
        setRightPaneFiles(res.data.data);
        setLoading(false);
      })
      .catch((err) => {
        console.log('Error loading folder files list:', err);
        setLoading(false);
      });
  }, [selectedSiteId, activeFolderPath]);

  const refreshListings = () => {
    if (!selectedSiteId) return;
    setLoading(true);
    api.get(`/files/tree?siteId=${selectedSiteId}`).then((res) => setDirectoryTree(res.data.data));
    api
      .get(`/files/list?siteId=${selectedSiteId}&path=${activeFolderPath}`)
      .then((res) => {
        setRightPaneFiles(res.data.data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  };

  const handleToggleTree = (nodeId: string, nodeName: string) => {
    // Decode relative path from base64 ID
    try {
      const decodedPath = atob(nodeId);
      setActiveFolderId(nodeId);
      setActiveFolderPath(decodedPath);
    } catch (e) {
      setActiveFolderId(nodeId);
      setActiveFolderPath(nodeName);
    }
  };

  const handleDelete = async () => {
    if (!selectedFileId || !selectedSiteId) return;

    // Find target path
    const file = rightPaneFiles.find((f) => f.id === selectedFileId);
    if (!file) return;

    const relativePath =
      activeFolderPath === 'public_html' ? file.name : `${activeFolderPath}/${file.name}`;

    if (confirm(`Are you sure you want to delete ${file.name}?`)) {
      try {
        await api.post('/files/delete', {
          siteId: selectedSiteId,
          path: relativePath,
        });
        setSelectedFileId(null);
        refreshListings();
      } catch (err: any) {
        alert(err.response?.data?.error || 'Failed to delete resource.');
      }
    }
  };

  const handleCreateResource = async (isFolder: boolean) => {
    if (!selectedSiteId) return;
    const typeLabel = isFolder ? 'folder' : 'file';
    const name = prompt(`Enter new ${typeLabel} name:`);
    if (!name || !name.trim()) return;

    try {
      await api.post('/files/create', {
        siteId: selectedSiteId,
        path: activeFolderPath,
        name: name.trim(),
        isFolder,
      });
      refreshListings();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to create resource.');
    }
  };

  const filteredFiles = rightPaneFiles.filter((file) =>
    file.name.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  // Recursive tree component
  const TreeItem: React.FC<{ node: FileNode; depth: number }> = ({ node, depth }) => {
    if (node.type !== 'folder') return null;
    const isSelected = activeFolderId === node.id;
    return (
      <div className="select-none">
        <div
          onClick={() => handleToggleTree(node.id, node.name)}
          style={{ paddingLeft: `${depth * 10}px` }}
          className={`flex items-center gap-2 py-1.5 px-3 text-xs rounded-lg cursor-pointer transition-colors ${
            isSelected
              ? 'bg-indigo-600/10 text-indigo-400 font-semibold'
              : 'text-slate-400 hover:bg-slate-800/40 hover:text-slate-200'
          }`}
        >
          {node.children && node.children.length > 0 ? (
            <ChevronDown size={12} />
          ) : (
            <ChevronRight size={12} />
          )}
          <FolderOpen size={13} className={isSelected ? 'text-indigo-400' : 'text-slate-500'} />
          <span>{node.name}</span>
        </div>
        {node.children && node.children.length > 0 && (
          <div className="mt-0.5">
            {node.children.map((child) => (
              <TreeItem key={child.id} node={child} depth={depth + 1} />
            ))}
          </div>
        )}
      </div>
    );
  };

  if (sites.length === 0) {
    return (
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-8 text-center space-y-4">
        <AlertCircle size={36} className="text-amber-500 mx-auto" />
        <div className="space-y-1">
          <h4 className="text-slate-200 font-semibold">No Websites Found</h4>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            You must create a website inside the Sites dashboard panel first to manage its files.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 flex flex-col h-[calc(100vh-140px)] animate-fade-in">
      {/* Action Toolbar */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-wrap gap-4 items-center justify-between shrink-0">
        <div className="flex flex-wrap gap-2 items-center">
          {/* Site Selector Dropdown */}
          <select
            value={selectedSiteId}
            onChange={(e) => {
              setSelectedSiteId(e.target.value);
              setActiveFolderId('cHVibGljX2h0bWw=');
              setActiveFolderPath('public_html');
              setSelectedFileId(null);
            }}
            className="bg-slate-950 border border-slate-800 text-slate-300 text-xs rounded-lg px-3 py-1.5 focus:outline-none focus:border-indigo-500 cursor-pointer font-semibold mr-2"
          >
            {sites.map((site) => (
              <option key={site.id} value={site.id}>
                {site.name} ({site.domain})
              </option>
            ))}
          </select>

          <Button
            variant="secondary"
            size="sm"
            onClick={() => handleCreateResource(false)}
            className="flex items-center gap-1.5 text-xs py-1.5 border-slate-700/60 bg-transparent hover:bg-slate-800"
          >
            <FilePlus size={14} />
            New File
          </Button>

          <Button
            variant="secondary"
            size="sm"
            onClick={() => handleCreateResource(true)}
            className="flex items-center gap-1.5 text-xs py-1.5 border-slate-700/60 bg-transparent hover:bg-slate-800"
          >
            <FolderPlus size={14} />
            New Folder
          </Button>

          <Button
            variant="secondary"
            size="sm"
            disabled={!selectedFileId}
            onClick={handleDelete}
            className="flex items-center gap-1.5 text-xs py-1.5 border-red-900/45 bg-transparent hover:bg-red-500/10 text-red-400 disabled:opacity-40"
          >
            <Trash2 size={14} />
            Delete
          </Button>
        </div>

        {/* Search */}
        <div className="relative">
          <input
            type="text"
            placeholder="Search files..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="bg-slate-950 border border-slate-800 rounded-lg pl-9 pr-4 py-1.5 text-xs w-52 focus:outline-none focus:border-indigo-500"
          />
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
        </div>
      </div>

      {/* Explorer Split Panel */}
      <div className="flex-1 flex gap-6 overflow-hidden min-h-0">
        {/* Left Side: Directories Tree */}
        <div className="w-64 border border-slate-800 bg-slate-900/60 rounded-xl p-4 overflow-y-auto shrink-0 flex flex-col gap-2">
          <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">
            Directories
          </h3>
          <div className="space-y-1">
            {directoryTree.map((node) => (
              <TreeItem key={node.id} node={node} depth={1} />
            ))}
          </div>
        </div>

        {/* Right Side: Directory contents list table */}
        <div className="flex-1 border border-slate-800 bg-slate-900 rounded-xl p-6 overflow-hidden flex flex-col">
          <h3 className="text-xs font-bold text-slate-300 mb-4 shrink-0 flex items-center justify-between">
            <span className="flex items-center gap-2">
              <FolderOpen size={16} className="text-indigo-400" />
              <span>/{activeFolderPath}</span>
            </span>
            {loading && <Loader2 size={14} className="animate-spin text-indigo-500" />}
          </h3>

          <div className="flex-1 overflow-y-auto min-h-0">
            {filteredFiles.length === 0 ? (
              <div className="text-center py-16 text-slate-500 text-xs">
                This directory is empty.
              </div>
            ) : (
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-800 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                    <th className="pb-3 w-8"></th>
                    <th className="pb-3">Name</th>
                    <th className="pb-3">Size</th>
                    <th className="pb-3">Permissions</th>
                    <th className="pb-3 text-right">Modified</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800 text-xs">
                  {filteredFiles.map((file) => (
                    <tr
                      key={file.id}
                      onClick={() => setSelectedFileId(file.id)}
                      onDoubleClick={() => {
                        if (file.type === 'folder') {
                          handleToggleTree(file.id, file.name);
                        }
                      }}
                      className={`cursor-pointer ${
                        selectedFileId === file.id
                          ? 'bg-indigo-600/10 hover:bg-indigo-600/15'
                          : 'hover:bg-slate-800/10'
                      }`}
                    >
                      <td className="py-3 text-center">
                        {selectedFileId === file.id && (
                          <Check size={12} className="text-indigo-400 mx-auto" />
                        )}
                      </td>
                      <td className="py-3 font-semibold text-slate-200 flex items-center gap-2">
                        {file.type === 'folder' ? (
                          <FolderOpen size={14} className="text-slate-400" />
                        ) : (
                          <File size={14} className="text-slate-500" />
                        )}
                        <span>{file.name}</span>
                      </td>
                      <td className="py-3 text-slate-400 font-mono">{file.size || '--'}</td>
                      <td className="py-3 font-mono text-slate-500 flex items-center gap-1">
                        <Lock size={10} />
                        <span>{file.permissions}</span>
                      </td>
                      <td className="py-3 text-right text-slate-400">{file.updatedAt}</td>
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
