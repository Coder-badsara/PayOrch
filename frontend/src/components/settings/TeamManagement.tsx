import React from 'react';
import { UserPlus, MoreHorizontal, Trash2, Key } from 'lucide-react';

const members = [
  { id: 1, name: 'Umesh', email: 'umesh@zetheta.com', role: 'ADMIN', joined: 'May 2024', status: 'ACTIVE' },
  { id: 2, name: 'Sarah Chen', email: 'sarah.c@zetheta.com', role: 'DEVELOPER', joined: 'Oct 2024', status: 'ACTIVE' },
  { id: 3, name: 'Alex Rivera', email: 'alex.r@zetheta.com', role: 'VIEWER', joined: 'Jan 2025', status: 'ACTIVE' },
];

const TeamManagement: React.FC = () => {
  return (
    <div className="space-y-10">
      <div className="flex items-center justify-between">
        <div>
           <h3 className="text-[10px] font-black text-gray-500 uppercase tracking-[0.2em]">Workspace Members</h3>
           <p className="text-xs text-[#8b949e] mt-1">Manage user access levels and permissions for your team.</p>
        </div>
        <button className="flex items-center space-x-2 bg-[#6c47ff] hover:bg-[#5a36e0] text-white px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-widest shadow-lg shadow-[#6c47ff]/20 transition-all active:scale-95">
          <UserPlus size={14} />
          <span>Invite Member</span>
        </button>
      </div>

      <div className="bg-[#161b22] border border-[#30363d] rounded-xl overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-[#0d1117]/50 border-b border-[#30363d] text-[10px] font-black text-gray-500 uppercase tracking-widest">
            <tr>
              <th className="px-6 py-4">User</th>
              <th className="px-6 py-4">Role</th>
              <th className="px-6 py-4">Joined</th>
              <th className="px-6 py-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#30363d]">
            {members.map((member) => (
              <tr key={member.id} className="hover:bg-white/[0.02] transition-colors group">
                <td className="px-6 py-4">
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#6c47ff] to-[#b066ff] flex items-center justify-center text-[10px] font-black text-white">
                      {member.name.split(' ').map(n => n[0]).join('')}
                    </div>
                    <div>
                       <div className="text-sm font-bold text-[#e6edf3]">{member.name}</div>
                       <div className="text-[10px] text-gray-500 font-medium">{member.email}</div>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-widest border ${
                    member.role === 'ADMIN' ? 'bg-[#6c47ff]/10 border-[#6c47ff]/20 text-[#6c47ff]' :
                    member.role === 'DEVELOPER' ? 'bg-blue-500/10 border-blue-500/20 text-blue-400' :
                    'bg-gray-800 border-gray-700 text-gray-500'
                  }`}>
                    {member.role}
                  </span>
                </td>
                <td className="px-6 py-4 text-xs text-gray-500">
                  {member.joined}
                </td>
                <td className="px-6 py-4 text-right">
                  <div className="flex items-center justify-end space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button className="p-2 text-gray-500 hover:text-white transition-colors">
                      <MoreHorizontal size={14} />
                    </button>
                    <button className="p-2 text-gray-500 hover:text-red-500 transition-colors">
                      <Trash2 size={14} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <section className="pt-8 border-t border-[#30363d]">
        <div className="mb-6">
           <h3 className="text-[10px] font-black text-gray-500 uppercase tracking-[0.2em]">Security Controls</h3>
        </div>

        <div className="bg-[#161b22] border border-[#30363d] rounded-xl p-6">
           <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                 <div className="bg-red-500/10 p-2 rounded-lg border border-red-500/20 text-red-500">
                    <Key size={18} />
                 </div>
                 <div>
                    <h4 className="text-sm font-bold text-[#e6edf3] uppercase tracking-tight">Two-Factor Authentication</h4>
                    <p className="text-xs text-[#8b949e]">Require 2FA for all members in this workspace.</p>
                 </div>
              </div>
              <div className="flex items-center space-x-2">
                 <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest mr-2 text-red-500/80">Recommended</span>
                 <div className="w-10 h-5 bg-[#3fb950] rounded-full relative cursor-not-allowed">
                    <div className="absolute right-1 top-1 w-3 h-3 bg-white rounded-full shadow-sm"></div>
                 </div>
              </div>
           </div>
        </div>
      </section>

      <div className="bg-[#0d1117] border border-[#30363d] rounded-xl p-8 mt-10">
         <div className="flex flex-col items-center text-center max-w-sm mx-auto">
            <h4 className="text-[#e6edf3] font-bold uppercase tracking-tight">Enterprise Governance</h4>
            <p className="text-xs text-[#8b949e] mt-2 mb-6">
               Need SAML SSO, Custom RBAC roles, or advanced audit logs? 
               Upgrade to the Enterprise plan to unlock governance features.
            </p>
            <button className="bg-white/5 hover:bg-white/10 text-white px-6 py-2 rounded-lg text-[10px] font-black uppercase tracking-[0.2em] border border-[#30363d] transition-all">
               Talk to Sales
            </button>
         </div>
      </div>
    </div>
  );
};

export default TeamManagement;
