import React, { useState, useEffect, useRef } from 'react';
import { UserPlus, MoreHorizontal, Trash2, Key, X, Save, Shield, User, Check, Edit2 } from 'lucide-react';

const DEFAULT_MEMBERS = [
  { id: '1', name: 'Umesh', email: 'umesh@zetheta.com', role: 'ADMIN', joined: 'May 2024', status: 'ACTIVE' },
  { id: '2', name: 'Sarah Chen', email: 'sarah.c@zetheta.com', role: 'DEVELOPER', joined: 'Oct 2024', status: 'ACTIVE' },
  { id: '3', name: 'Alex Rivera', email: 'alex.r@zetheta.com', role: 'VIEWER', joined: 'Jan 2025', status: 'ACTIVE' },
];

const TeamManagement: React.FC = () => {
  const [memberList, setMemberList] = useState(() => {
    const saved = localStorage.getItem('payorch_team_members');
    return saved ? JSON.parse(saved) : DEFAULT_MEMBERS;
  });

  const [is2faEnabled, setIs2faEnabled] = useState(() => {
    const saved = localStorage.getItem('payorch_2fa_enabled');
    return saved ? JSON.parse(saved) : true;
  });

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newMember, setNewMember] = useState({ name: '', email: '', role: 'VIEWER' });
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    localStorage.setItem('payorch_team_members', JSON.stringify(memberList));
    localStorage.setItem('payorch_2fa_enabled', JSON.stringify(is2faEnabled));
  }, [memberList, is2faEnabled]);

  // Click outside listener for actions menu
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setActiveMenuId(null);
      }
    };

    if (activeMenuId) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [activeMenuId]);

  const handleInviteMember = (e: React.FormEvent) => {
    e.preventDefault();
    const id = Math.random().toString(36).substr(2, 9);
    const memberToAdd = {
      ...newMember,
      id,
      joined: new Date().toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
      status: 'ACTIVE'
    };
    setMemberList([...memberList, memberToAdd]);
    setIsModalOpen(false);
    setNewMember({ name: '', email: '', role: 'VIEWER' });
  };

  const handleDeleteMember = (id: string) => {
    if (confirm('Are you sure you want to remove this member from the workspace?')) {
      setMemberList(memberList.filter((m: any) => m.id !== id));
      setActiveMenuId(null);
    }
  };

  const handleChangeRole = (id: string, newRole: string) => {
    setMemberList(memberList.map((m: any) => m.id === id ? { ...m, role: newRole } : m));
    setActiveMenuId(null);
  };

  return (
    <div className="space-y-10">
      <div className="flex items-center justify-between">
        <div>
           <h3 className="text-[10px] font-black text-gray-500 uppercase tracking-[0.2em]">Workspace Members</h3>
           <p className="text-xs text-[#8b949e] mt-1">Manage user access levels and permissions for your team.</p>
        </div>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="flex items-center space-x-2 bg-[#6c47ff] hover:bg-[#5a36e0] text-white px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-widest shadow-lg shadow-[#6c47ff]/20 transition-all active:scale-95"
        >
          <UserPlus size={14} />
          <span>Invite Member</span>
        </button>
      </div>

      <div className="bg-[#161b22] border border-[#30363d] rounded-xl relative">
        <table className="w-full text-left">
          <thead className="bg-[#0d1117]/50 border-b border-[#30363d] text-[10px] font-black text-gray-500 uppercase tracking-widest">
            <tr>
              <th className="px-6 py-4 rounded-tl-xl">User</th>
              <th className="px-6 py-4">Role</th>
              <th className="px-6 py-4">Joined</th>
              <th className="px-6 py-4 text-right rounded-tr-xl">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#30363d]">
            {memberList.map((member: any) => (
              <tr key={member.id} className="hover:bg-white/[0.02] transition-colors group">
                <td className="px-6 py-4">
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#6c47ff] to-[#b066ff] flex items-center justify-center text-[10px] font-black text-white">
                      {member.name.split(' ').map((n: string) => n[0]).join('')}
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
                  <div className="flex items-center justify-end space-x-2 relative">
                    <button 
                      onClick={() => handleDeleteMember(member.id)}
                      className="p-2 text-gray-600 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"
                      title="Remove Member"
                    >
                      <Trash2 size={14} />
                    </button>
                    <div className="relative" ref={activeMenuId === member.id ? menuRef : null}>
                      <button 
                        onClick={() => setActiveMenuId(activeMenuId === member.id ? null : member.id)}
                        className={`p-2 transition-colors rounded-md ${activeMenuId === member.id ? 'bg-[#6c47ff]/20 text-white' : 'text-gray-500 hover:text-white hover:bg-white/5'}`}
                      >
                        <MoreHorizontal size={14} />
                      </button>
                      
                      {activeMenuId === member.id && (
                        <div className="absolute right-0 top-10 w-48 bg-[#1c2128] border border-[#30363d] rounded-lg shadow-2xl z-[100] overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                          <div className="px-4 py-2 border-b border-[#30363d] bg-[#0d1117]/50">
                            <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Change Role</span>
                          </div>
                          {['ADMIN', 'DEVELOPER', 'VIEWER'].map((role) => (
                            <button 
                              key={role}
                              onClick={() => handleChangeRole(member.id, role)}
                              className={`w-full flex items-center justify-between px-4 py-2.5 text-xs transition-colors ${
                                member.role === role ? 'text-[#6c47ff] bg-[#6c47ff]/5' : 'text-gray-400 hover:text-[#e6edf3] hover:bg-white/5'
                              }`}
                            >
                              <span>{role}</span>
                              {member.role === role && <Check size={12} />}
                            </button>
                          ))}
                          <button 
                            onClick={() => handleDeleteMember(member.id)}
                            className="w-full flex items-center space-x-3 px-4 py-3 text-xs text-red-500/70 hover:text-red-500 hover:bg-red-500/10 transition-colors border-t border-[#30363d]"
                          >
                            <Trash2 size={14} />
                            <span>Remove Member</span>
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

      <section className="pt-8 border-t border-[#30363d]">
        <div className="mb-6">
           <h3 className="text-[10px] font-black text-gray-500 uppercase tracking-[0.2em]">Security Controls</h3>
        </div>

        <div className={`bg-[#161b22] border rounded-xl p-6 transition-all ${is2faEnabled ? 'border-[#6c47ff]/30' : 'border-[#30363d]'}`}>
           <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                 <div className={`p-2 rounded-lg border transition-colors ${is2faEnabled ? 'bg-red-500/10 border-red-500/20 text-red-500' : 'bg-gray-800 border-gray-700 text-gray-500'}`}>
                    <Key size={18} />
                 </div>
                 <div>
                    <h4 className={`text-sm font-bold uppercase tracking-tight transition-colors ${is2faEnabled ? 'text-[#e6edf3]' : 'text-gray-500'}`}>Two-Factor Authentication</h4>
                    <p className="text-xs text-[#8b949e]">Require 2FA for all members in this workspace.</p>
                 </div>
              </div>
              <div className="flex items-center space-x-2">
                 <span className={`text-[10px] font-black uppercase tracking-widest mr-2 transition-colors ${is2faEnabled ? 'text-[#3fb950]' : 'text-gray-600'}`}>
                   {is2faEnabled ? 'Enabled' : 'Disabled'}
                 </span>
                 <button 
                    onClick={() => setIs2faEnabled(!is2faEnabled)}
                    className={`w-10 h-5 rounded-full relative transition-all duration-300 ${is2faEnabled ? 'bg-[#6c47ff]' : 'bg-[#30363d]'}`}
                 >
                    <div className={`absolute top-1 w-3 h-3 bg-white rounded-full shadow-sm transition-all duration-300 ${is2faEnabled ? 'right-1' : 'left-1'}`}></div>
                 </button>
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

      {/* Invite Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0d1117]/80 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-[#161b22] border border-[#30363d] rounded-2xl w-full max-w-md overflow-hidden shadow-2xl animate-in zoom-in-95 duration-300">
            <div className="px-6 py-4 border-b border-[#30363d] flex items-center justify-between bg-[#1c2128]">
              <h3 className="text-[#e6edf3] font-bold uppercase tracking-widest text-sm flex items-center space-x-2">
                <UserPlus size={16} className="text-[#6c47ff]" />
                <span>Invite New Member</span>
              </h3>
              <button 
                onClick={() => setIsModalOpen(false)}
                className="text-[#8b949e] hover:text-[#e6edf3] transition-colors"
              >
                <X size={20} />
              </button>
            </div>
            
            <form onSubmit={handleInviteMember} className="p-6 space-y-4">
              <div>
                <label className="block text-[10px] font-black text-gray-500 uppercase tracking-[0.2em] mb-2 ml-1">Full Name</label>
                <input 
                  autoFocus
                  required
                  type="text" 
                  value={newMember.name}
                  onChange={(e) => setNewMember({...newMember, name: e.target.value})}
                  placeholder="e.g. John Doe"
                  className="w-full bg-[#0d1117] border border-[#30363d] rounded-lg py-2.5 px-4 text-sm text-[#e6edf3] focus:outline-none focus:border-[#6c47ff] transition-all"
                />
              </div>
              <div>
                <label className="block text-[10px] font-black text-gray-500 uppercase tracking-[0.2em] mb-2 ml-1">Email Address</label>
                <input 
                  required
                  type="email" 
                  value={newMember.email}
                  onChange={(e) => setNewMember({...newMember, email: e.target.value})}
                  placeholder="john@example.com"
                  className="w-full bg-[#0d1117] border border-[#30363d] rounded-lg py-2.5 px-4 text-sm text-[#e6edf3] focus:outline-none focus:border-[#6c47ff] transition-all"
                />
              </div>
              <div>
                <label className="block text-[10px] font-black text-gray-500 uppercase tracking-[0.2em] mb-2 ml-1">Workspace Role</label>
                <select 
                  value={newMember.role}
                  onChange={(e) => setNewMember({...newMember, role: e.target.value})}
                  className="w-full bg-[#0d1117] border border-[#30363d] rounded-lg py-2.5 px-4 text-sm text-[#e6edf3] focus:outline-none focus:border-[#6c47ff] transition-all cursor-pointer appearance-none"
                >
                  <option value="ADMIN">Admin (Full Access)</option>
                  <option value="DEVELOPER">Developer (Technical Access)</option>
                  <option value="VIEWER">Viewer (Read Only)</option>
                </select>
              </div>
              
              <button 
                type="submit"
                className="w-full bg-[#6c47ff] hover:bg-[#5a36e0] text-white px-6 py-3 rounded-lg text-xs font-bold uppercase tracking-widest shadow-lg shadow-[#6c47ff]/20 transition-all active:scale-95 flex items-center justify-center space-x-2 mt-4"
              >
                <UserPlus size={14} />
                <span>Send Invitation</span>
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default TeamManagement;

