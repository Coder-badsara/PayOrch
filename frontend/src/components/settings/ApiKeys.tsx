import React, { useState, useEffect, useRef } from 'react';
import { Copy, Globe, Clock, Plus, Trash2, MoreHorizontal, X, Shield, Key as KeyIcon, Check, Edit2 } from 'lucide-react';

const DEFAULT_KEYS = [
  { id: '1', name: 'Production Main', prefix: 'po_live_sk_••••••••', fullKey: 'po_live_sk_1234567890abcdef', created: 'Oct 12, 2025', lastUsed: '2 hours ago', status: 'ACTIVE' },
  { id: '2', name: 'Staging Environment', prefix: 'po_test_sk_••••••••', fullKey: 'po_test_sk_0987654321fedcba', created: 'Nov 05, 2025', lastUsed: '5 days ago', status: 'ACTIVE' },
  { id: '3', name: 'Legacy Mobile App', prefix: 'po_live_sk_••••••••', fullKey: 'po_live_sk_legacy_key_xyz', created: 'Jan 20, 2025', lastUsed: '3 months ago', status: 'REVOKED' },
];

const DEFAULT_IPS = ['52.12.45.190', '162.158.11.4'];

const ApiKeys: React.FC = () => {
  const [keys, setKeys] = useState(() => {
    const saved = localStorage.getItem('payorch_api_keys');
    return saved ? JSON.parse(saved) : DEFAULT_KEYS;
  });

  const [ips, setIps] = useState<string[]>(() => {
    const saved = localStorage.getItem('payorch_ip_allowlist');
    return saved ? JSON.parse(saved) : DEFAULT_IPS;
  });

  const [isEnforced, setIsEnforced] = useState(() => {
    const saved = localStorage.getItem('payorch_ip_enforced');
    return saved ? JSON.parse(saved) : false;
  });

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [newKeyName, setNewKeyName] = useState('');
  const [editKeyName, setEditKeyName] = useState('');
  const [editingKeyId, setEditingKeyId] = useState<string | null>(null);
  const [generatedKey, setGeneratedKey] = useState<string | null>(null);
  const [newIp, setNewIp] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [activeMenuId, setActiveKeyMenuId] = useState<string | null>(null);
  
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    localStorage.setItem('payorch_api_keys', JSON.stringify(keys));
    localStorage.setItem('payorch_ip_allowlist', JSON.stringify(ips));
    localStorage.setItem('payorch_ip_enforced', JSON.stringify(isEnforced));
  }, [keys, ips, isEnforced]);

  // Click outside listener for actions menu
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setActiveKeyMenuId(null);
      }
    };

    if (activeMenuId) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [activeMenuId]);

  const handleGenerateKey = (e: React.FormEvent) => {
    e.preventDefault();
    const randomSuffix = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
    const fullKey = `po_live_sk_${randomSuffix}`;
    const newKey = {
      id: Math.random().toString(36).substr(2, 9),
      name: newKeyName || 'New API Key',
      prefix: `po_live_sk_••••••••`,
      fullKey: fullKey,
      created: new Date().toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' }),
      lastUsed: 'Never',
      status: 'ACTIVE'
    };
    
    setGeneratedKey(fullKey);
    setKeys([newKey, ...keys]);
  };

  const handleRevokeKey = (id: string) => {
    if (confirm('Are you sure you want to revoke this API key? This action cannot be undone.')) {
      setKeys(keys.map((k: any) => k.id === id ? { ...k, status: 'REVOKED' } : k));
      setActiveKeyMenuId(null);
    }
  };

  const handleEditKey = (key: any) => {
    setEditingKeyId(key.id);
    setEditKeyName(key.name);
    setIsEditModalOpen(true);
    setActiveKeyMenuId(null);
  };

  const handleSaveKeyName = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingKeyId) {
      setKeys(keys.map((k: any) => k.id === editingKeyId ? { ...k, name: editKeyName } : k));
      setIsEditModalOpen(false);
      setEditingKeyId(null);
    }
  };

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleAddIp = () => {
    if (newIp && !ips.includes(newIp)) {
      setIps([...ips, newIp]);
      setNewIp('');
    }
  };

  const handleRemoveIp = (ip: string) => {
    setIps(ips.filter(i => i !== ip));
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setGeneratedKey(null);
    setNewKeyName('');
  };

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
           <h3 className="text-[10px] font-black text-gray-500 uppercase tracking-[0.2em]">Authentication Keys</h3>
           <p className="text-xs text-[#8b949e] mt-1">Manage secret keys used to integrate your applications with PayOrch.</p>
        </div>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="flex items-center space-x-2 bg-[#6c47ff] hover:bg-[#5a36e0] text-white px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-widest shadow-lg shadow-[#6c47ff]/20 transition-all active:scale-95"
        >
          <Plus size={14} />
          <span>Generate New Key</span>
        </button>
      </div>

      <div className="bg-[#161b22] border border-[#30363d] rounded-xl relative">
        <table className="w-full text-left">
          <thead className="bg-[#0d1117]/50 border-b border-[#30363d] text-[10px] font-black text-gray-500 uppercase tracking-widest">
            <tr>
              <th className="px-6 py-4 rounded-tl-xl">Name</th>
              <th className="px-6 py-4">Key Prefix</th>
              <th className="px-6 py-4">Created</th>
              <th className="px-6 py-4">Last Used</th>
              <th className="px-6 py-4">Status</th>
              <th className="px-6 py-4 text-right rounded-tr-xl">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#30363d]">
            {keys.map((key: any) => (
              <tr key={key.id} className="hover:bg-white/[0.02] transition-colors group">
                <td className="px-6 py-4">
                  <div className="text-sm font-bold text-[#e6edf3]">{key.name}</div>
                </td>
                <td className="px-6 py-4 font-mono text-[11px] text-gray-400">
                  {key.prefix}
                </td>
                <td className="px-6 py-4 text-xs text-gray-500">
                  {key.created}
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center space-x-2 text-xs text-gray-400 font-medium">
                     <Clock size={12} className="text-gray-600" />
                     <span>{key.lastUsed}</span>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-tighter border ${
                    key.status === 'ACTIVE' 
                      ? 'bg-[#3fb950]/10 border-[#3fb950]/20 text-[#3fb950]' 
                      : 'bg-red-500/10 border-red-500/20 text-red-500'
                  }`}>
                    {key.status}
                  </span>
                </td>
                <td className="px-6 py-4 text-right">
                  <div className="flex items-center justify-end space-x-2 relative">
                    <button 
                      onClick={() => handleCopy(key.fullKey, key.id)}
                      className={`p-1.5 transition-colors ${copiedId === key.id ? 'text-[#3fb950]' : 'text-gray-500 hover:text-[#6c47ff]'}`} 
                      title="Copy Full Key"
                    >
                      {copiedId === key.id ? <Check size={14} /> : <Copy size={14} />}
                    </button>
                    <button 
                      onClick={() => handleRevokeKey(key.id)}
                      disabled={key.status !== 'ACTIVE'}
                      className={`p-1.5 transition-colors ${key.status === 'ACTIVE' ? 'text-gray-500 hover:text-red-500' : 'text-gray-800 pointer-events-none'}`} 
                      title="Revoke Key"
                    >
                      <Trash2 size={14} />
                    </button>
                    <div className="relative" ref={activeMenuId === key.id ? menuRef : null}>
                      <button 
                        onClick={() => setActiveKeyMenuId(activeMenuId === key.id ? null : key.id)}
                        className={`p-1.5 transition-colors rounded-md ${activeMenuId === key.id ? 'bg-[#6c47ff]/20 text-white' : 'text-gray-500 hover:text-white hover:bg-white/5'}`}
                      >
                        <MoreHorizontal size={14} />
                      </button>
                      
                      {activeMenuId === key.id && (
                        <div className="absolute right-0 top-10 w-48 bg-[#1c2128] border border-[#30363d] rounded-lg shadow-2xl z-[100] overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                          <button 
                            onClick={() => handleEditKey(key)}
                            className="w-full flex items-center space-x-3 px-4 py-3 text-xs text-gray-400 hover:text-[#e6edf3] hover:bg-[#6c47ff]/10 transition-colors"
                          >
                            <Edit2 size={14} />
                            <span>Edit Key Name</span>
                          </button>
                          <button 
                            onClick={() => handleRevokeKey(key.id)}
                            disabled={key.status !== 'ACTIVE'}
                            className="w-full flex items-center space-x-3 px-4 py-3 text-xs text-red-500/70 hover:text-red-500 hover:bg-red-500/10 disabled:opacity-30 transition-colors border-t border-[#30363d]"
                          >
                            <Trash2 size={14} />
                            <span>Revoke Key</span>
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* IP Allowlist Section */}
      <div className="pt-8 border-t border-[#30363d]">
         <div className="mb-6">
            <h3 className="text-[10px] font-black text-gray-500 uppercase tracking-[0.2em]">Network Security</h3>
            <p className="text-xs text-[#8b949e] mt-1">Restrict API access to specific IP addresses or ranges.</p>
         </div>

         <div className="bg-[#161b22] border border-[#30363d] rounded-xl p-6 transition-all duration-300">
            <div className="flex items-center justify-between mb-6 pb-6 border-b border-[#30363d]">
               <div className="flex items-center space-x-4">
                  <div className={`p-2 rounded-lg border transition-colors ${isEnforced ? 'bg-indigo-500/10 border-indigo-500/20 text-[#6c47ff]' : 'bg-gray-800 border-gray-700 text-gray-500'}`}>
                     <Globe size={18} />
                  </div>
                  <div>
                     <h4 className={`text-sm font-bold uppercase tracking-tight transition-colors ${isEnforced ? 'text-[#e6edf3]' : 'text-gray-500'}`}>IP Allowlist</h4>
                     <p className="text-xs text-[#8b949e]">Only requests from these IPs will be accepted.</p>
                  </div>
               </div>
               <div className="flex items-center space-x-2">
                  <span className={`text-[10px] font-black uppercase tracking-widest mr-2 transition-colors ${isEnforced ? 'text-[#3fb950]' : 'text-gray-600'}`}>
                    {isEnforced ? 'Enforced' : 'Disabled'}
                  </span>
                  <button 
                    onClick={() => setIsEnforced(!isEnforced)}
                    className={`w-10 h-5 rounded-full relative transition-all duration-300 ${isEnforced ? 'bg-[#6c47ff]' : 'bg-[#30363d]'}`}
                  >
                    <div className={`absolute top-1 w-3 h-3 bg-white rounded-full shadow-sm transition-all duration-300 ${isEnforced ? 'right-1' : 'left-1'}`}></div>
                  </button>
               </div>
            </div>

            <div className="flex space-x-3 mb-6">
               <input 
                 type="text" 
                 value={newIp}
                 onChange={(e) => setNewIp(e.target.value)}
                 onKeyDown={(e) => e.key === 'Enter' && handleAddIp()}
                 placeholder="e.g. 192.168.1.1"
                 className="flex-1 bg-[#0d1117] border border-[#30363d] rounded-lg py-2.5 px-4 text-sm text-[#e6edf3] focus:outline-none focus:border-[#6c47ff] font-mono"
               />
               <button 
                onClick={handleAddIp}
                className="bg-[#6c47ff] hover:bg-[#5a36e0] text-white px-6 py-2 rounded-lg text-[10px] font-bold uppercase tracking-widest border border-transparent transition-all active:scale-95"
               >
                 Add IP
               </button>
            </div>

            <div className="flex flex-wrap gap-2">
               {ips.map(ip => (
                 <div key={ip} className="flex items-center space-x-2 bg-[#0d1117] border border-[#30363d] rounded-md px-3 py-1.5 group hover:border-red-500/30 transition-all">
                    <span className="text-xs font-mono text-gray-400">{ip}</span>
                    <button 
                      onClick={() => handleRemoveIp(ip)}
                      className="text-gray-600 hover:text-red-500 transition-colors"
                    >
                       <X size={12} />
                    </button>
                 </div>
               ))}
               {ips.length === 0 && (
                 <div className="text-xs text-[#8b949e] italic py-2">No IPs allowed. Warning: Access will be blocked if enforced.</div>
               )}
            </div>
         </div>
      </div>

      {/* Generate Key Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0d1117]/80 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-[#161b22] border border-[#30363d] rounded-2xl w-full max-w-md overflow-hidden shadow-2xl animate-in zoom-in-95 duration-300">
            <div className="px-6 py-4 border-b border-[#30363d] flex items-center justify-between bg-[#1c2128]">
              <h3 className="text-[#e6edf3] font-bold uppercase tracking-widest text-sm flex items-center space-x-2">
                <KeyIcon size={16} className="text-[#6c47ff]" />
                <span>{generatedKey ? 'Key Generated' : 'Generate API Key'}</span>
              </h3>
              <button 
                onClick={closeModal}
                className="text-[#8b949e] hover:text-[#e6edf3] transition-colors"
              >
                <X size={20} />
              </button>
            </div>
            
            {!generatedKey ? (
              <form onSubmit={handleGenerateKey} className="p-6 space-y-4">
                <div>
                  <label className="block text-[10px] font-black text-gray-500 uppercase tracking-[0.2em] mb-2 ml-1">Key Name</label>
                  <input 
                    autoFocus
                    required
                    type="text" 
                    value={newKeyName}
                    onChange={(e) => setNewKeyName(e.target.value)}
                    placeholder="e.g. Production Mobile App"
                    className="w-full bg-[#0d1117] border border-[#30363d] rounded-lg py-2.5 px-4 text-sm text-[#e6edf3] focus:outline-none focus:border-[#6c47ff] transition-all"
                  />
                </div>
                <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-3 flex items-start space-x-3">
                   <Shield size={16} className="text-blue-500 mt-0.5" />
                   <p className="text-[10px] text-blue-400 leading-relaxed uppercase tracking-tight">
                     For security, full secret keys are only shown once. Ensure you store them safely.
                   </p>
                </div>
                <button 
                  type="submit"
                  className="w-full bg-[#6c47ff] hover:bg-[#5a36e0] text-white px-6 py-3 rounded-lg text-xs font-bold uppercase tracking-widest shadow-lg shadow-[#6c47ff]/20 transition-all active:scale-95 flex items-center justify-center space-x-2"
                >
                  <Plus size={14} />
                  <span>Generate Key</span>
                </button>
              </form>
            ) : (
              <div className="p-6 space-y-6">
                <div>
                  <label className="block text-[10px] font-black text-gray-500 uppercase tracking-[0.2em] mb-2 ml-1">Your Secret Key</label>
                  <div className="relative group">
                    <input 
                      readOnly
                      type="text" 
                      value={generatedKey}
                      className="w-full bg-[#0d1117] border border-[#6c47ff]/50 rounded-lg py-3 px-4 pr-12 text-sm text-[#e6edf3] font-mono"
                    />
                    <button 
                      onClick={() => handleCopy(generatedKey, 'new-key')}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-[#6c47ff] hover:text-white transition-colors"
                    >
                      {copiedId === 'new-key' ? <Check size={18} /> : <Copy size={18} />}
                    </button>
                  </div>
                  <p className="text-[10px] text-yellow-500/80 mt-3 flex items-center italic">
                    <AlertCircle size={12} className="mr-1.5" />
                    Copy this key now. You won't be able to see it again.
                  </p>
                </div>
                <button 
                  onClick={closeModal}
                  className="w-full bg-white/5 hover:bg-white/10 text-white px-6 py-3 rounded-lg text-xs font-bold uppercase tracking-widest border border-[#30363d] transition-all"
                >
                  I've Saved the Key
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Edit Key Modal */}
      {isEditModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0d1117]/80 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-[#161b22] border border-[#30363d] rounded-2xl w-full max-w-md overflow-hidden shadow-2xl animate-in zoom-in-95 duration-300">
            <div className="px-6 py-4 border-b border-[#30363d] flex items-center justify-between bg-[#1c2128]">
              <h3 className="text-[#e6edf3] font-bold uppercase tracking-widest text-sm flex items-center space-x-2">
                <Edit2 size={16} className="text-[#6c47ff]" />
                <span>Edit API Key</span>
              </h3>
              <button 
                onClick={() => setIsEditModalOpen(false)}
                className="text-[#8b949e] hover:text-[#e6edf3] transition-colors"
              >
                <X size={20} />
              </button>
            </div>
            
            <form onSubmit={handleSaveKeyName} className="p-6 space-y-4">
              <div>
                <label className="block text-[10px] font-black text-gray-500 uppercase tracking-[0.2em] mb-2 ml-1">Key Name</label>
                <input 
                  autoFocus
                  required
                  type="text" 
                  value={editKeyName}
                  onChange={(e) => setEditKeyName(e.target.value)}
                  placeholder="e.g. Production Mobile App"
                  className="w-full bg-[#0d1117] border border-[#30363d] rounded-lg py-2.5 px-4 text-sm text-[#e6edf3] focus:outline-none focus:border-[#6c47ff] transition-all"
                />
              </div>
              <div className="pt-4 flex items-center space-x-3">
                <button 
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="flex-1 px-6 py-2.5 rounded-lg text-xs font-bold uppercase tracking-widest text-gray-400 hover:text-white hover:bg-white/5 transition-all"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  className="flex-1 bg-[#6c47ff] hover:bg-[#5a36e0] text-white px-6 py-2.5 rounded-lg text-xs font-bold uppercase tracking-widest shadow-lg shadow-[#6c47ff]/20 transition-all active:scale-95 flex items-center justify-center space-x-2"
                >
                  <Plus size={14} className="rotate-45" />
                  <span>Save Changes</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

const AlertCircle = ({ size, className }: { size: number, className?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
  </svg>
);

export default ApiKeys;

