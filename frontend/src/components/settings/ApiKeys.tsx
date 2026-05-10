import React from 'react';
import { Copy, Globe, Clock, Plus, Trash2, MoreHorizontal } from 'lucide-react';

const apiKeys = [
  { id: 1, name: 'Production Main', prefix: 'po_live_sk_••••••••', created: 'Oct 12, 2025', lastUsed: '2 hours ago', status: 'ACTIVE' },
  { id: 2, name: 'Staging Environment', prefix: 'po_test_sk_••••••••', created: 'Nov 05, 2025', lastUsed: '5 days ago', status: 'ACTIVE' },
  { id: 3, name: 'Legacy Mobile App', prefix: 'po_live_sk_••••••••', created: 'Jan 20, 2025', lastUsed: '3 months ago', status: 'REVOKED' },
];

const ApiKeys: React.FC = () => {
  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
           <h3 className="text-[10px] font-black text-gray-500 uppercase tracking-[0.2em]">Authentication Keys</h3>
           <p className="text-xs text-[#8b949e] mt-1">Manage secret keys used to integrate your applications with PayOrch.</p>
        </div>
        <button className="flex items-center space-x-2 bg-[#6c47ff] hover:bg-[#5a36e0] text-white px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-widest shadow-lg shadow-[#6c47ff]/20 transition-all active:scale-95">
          <Plus size={14} />
          <span>Generate New Key</span>
        </button>
      </div>

      <div className="bg-[#161b22] border border-[#30363d] rounded-xl overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-[#0d1117]/50 border-b border-[#30363d] text-[10px] font-black text-gray-500 uppercase tracking-widest">
            <tr>
              <th className="px-6 py-4">Name</th>
              <th className="px-6 py-4">Key Prefix</th>
              <th className="px-6 py-4">Created</th>
              <th className="px-6 py-4">Last Used</th>
              <th className="px-6 py-4">Status</th>
              <th className="px-6 py-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#30363d]">
            {apiKeys.map((key) => (
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
                  <div className="flex items-center justify-end space-x-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button className="p-1.5 text-gray-500 hover:text-[#6c47ff] transition-colors" title="Copy Prefix">
                      <Copy size={14} />
                    </button>
                    <button className={`p-1.5 transition-colors ${key.status === 'ACTIVE' ? 'text-gray-500 hover:text-red-500' : 'text-gray-800 pointer-events-none'}`} title="Revoke Key">
                      <Trash2 size={14} />
                    </button>
                    <button className="p-1.5 text-gray-500 hover:text-white transition-colors">
                      <MoreHorizontal size={14} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="pt-8 border-t border-[#30363d]">
         <div className="mb-6">
            <h3 className="text-[10px] font-black text-gray-500 uppercase tracking-[0.2em]">Network Security</h3>
            <p className="text-xs text-[#8b949e] mt-1">Restrict API access to specific IP addresses or ranges.</p>
         </div>

         <div className="bg-[#161b22] border border-[#30363d] rounded-xl p-6">
            <div className="flex items-center justify-between mb-6 pb-6 border-b border-[#30363d]">
               <div className="flex items-center space-x-4">
                  <div className="bg-indigo-500/10 p-2 rounded-lg border border-indigo-500/20 text-[#6c47ff]">
                     <Globe size={18} />
                  </div>
                  <div>
                     <h4 className="text-sm font-bold text-[#e6edf3] uppercase tracking-tight">IP Allowlist</h4>
                     <p className="text-xs text-[#8b949e]">Only requests from these IPs will be accepted.</p>
                  </div>
               </div>
               <div className="flex items-center space-x-2">
                  <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest mr-2 text-gray-600">Enforced</span>
                  <div className="w-10 h-5 bg-[#30363d] rounded-full relative cursor-not-allowed">
                     <div className="absolute left-1 top-1 w-3 h-3 bg-gray-500 rounded-full shadow-sm"></div>
                  </div>
               </div>
            </div>

            <div className="flex space-x-3 mb-6">
               <input 
                 type="text" 
                 placeholder="e.g. 192.168.1.1"
                 className="flex-1 bg-[#0d1117] border border-[#30363d] rounded-lg py-2.5 px-4 text-sm text-[#e6edf3] focus:outline-none focus:border-[#6c47ff] font-mono"
               />
               <button className="bg-white/5 hover:bg-white/10 text-gray-300 px-6 py-2 rounded-lg text-[10px] font-bold uppercase tracking-widest border border-[#30363d]">
                 Add IP
               </button>
            </div>

            <div className="flex flex-wrap gap-2">
               {['52.12.45.190', '162.158.11.4'].map(ip => (
                 <div key={ip} className="flex items-center space-x-2 bg-[#0d1117] border border-[#30363d] rounded-md px-3 py-1.5 group">
                    <span className="text-xs font-mono text-gray-400">{ip}</span>
                    <button className="text-gray-600 hover:text-red-500 transition-colors">
                       <Plus size={12} className="rotate-45" />
                    </button>
                 </div>
               ))}
            </div>
         </div>
      </div>
    </div>
  );
};

export default ApiKeys;
