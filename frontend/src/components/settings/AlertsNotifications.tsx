import React from 'react';
import { Mail, Smartphone, Bell, Check, Plus, Trash2 } from 'lucide-react';

const AlertSettings: React.FC = () => {
  return (
    <div className="space-y-10">
      <section>
        <div className="mb-6">
          <h3 className="text-[10px] font-black text-gray-500 uppercase tracking-[0.2em]">Notification Channels</h3>
          <p className="text-xs text-[#8b949e] mt-1">Configure where alerts are sent when system events occur.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-[#161b22] border border-[#30363d] rounded-xl p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-3">
                <div className="bg-indigo-500/10 p-2 rounded-lg border border-indigo-500/20 text-[#6c47ff]">
                  <Mail size={18} />
                </div>
                <h4 className="text-sm font-bold text-[#e6edf3] uppercase tracking-tight">Email Alerts</h4>
              </div>
              <div className="w-10 h-5 bg-[#6c47ff] rounded-full relative cursor-pointer">
                <div className="absolute right-1 top-1 w-3 h-3 bg-white rounded-full shadow-sm"></div>
              </div>
            </div>
            <div className="space-y-3">
              <div className="relative group">
                <input 
                  type="email" 
                  defaultValue="ops@zetheta.com"
                  className="w-full bg-[#0d1117] border border-[#30363d] rounded-lg py-2.5 px-4 text-sm text-[#e6edf3] focus:outline-none focus:border-[#6c47ff]" 
                />
                <button className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-red-500 transition-colors">
                  <Trash2 size={14} />
                </button>
              </div>
              <button className="text-[10px] font-black text-[#6c47ff] hover:text-[#5a36e0] transition-colors uppercase tracking-widest flex items-center space-x-1">
                <Plus size={12} />
                <span>Add Email</span>
              </button>
            </div>
          </div>

          <div className="bg-[#161b22] border border-[#30363d] rounded-xl p-6 opacity-50 cursor-not-allowed">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-3">
                <div className="bg-gray-500/10 p-2 rounded-lg border border-gray-500/20 text-gray-400">
                  <Smartphone size={18} />
                </div>
                <h4 className="text-sm font-bold text-gray-400 uppercase tracking-tight text-[10px]">SMS Alerts</h4>
              </div>
              <div className="w-10 h-5 bg-[#30363d] rounded-full relative">
                <div className="absolute left-1 top-1 w-3 h-3 bg-gray-600 rounded-full"></div>
              </div>
            </div>
            <div className="flex space-x-2">
              <input 
                type="text" 
                placeholder="+1 (555) 000-0000"
                disabled
                className="flex-1 bg-[#0d1117] border border-[#30363d] rounded-lg py-2 px-4 text-sm text-gray-600 focus:outline-none" 
              />
              <button className="bg-white/5 text-gray-600 px-4 py-2 rounded-lg text-[10px] font-bold uppercase tracking-widest border border-[#30363d]" disabled>
                Locked
              </button>
            </div>
          </div>
        </div>
      </section>

      <section className="pt-8 border-t border-[#30363d]">
        <div className="mb-6">
          <h3 className="text-[10px] font-black text-gray-500 uppercase tracking-[0.2em]">Alert Triggers</h3>
          <p className="text-xs text-[#8b949e] mt-1">Specify which events should trigger a notification.</p>
        </div>

        <div className="bg-[#161b22] border border-[#30363d] rounded-xl overflow-hidden">
          <div className="divide-y divide-[#30363d]">
            {[
              { label: 'Gateway circuit opens', desc: 'Notify immediately when a provider is automatically disabled.' },
              { label: 'High error rate detected', desc: 'Threshold exceedance (> 15% failures in 5 mins).', input: true, unit: '%' },
              { label: 'Webhook delivery failure', desc: 'Notify after all retry attempts are exhausted.' },
              { label: 'Daily summary', desc: 'Send a transaction health report every morning.', input: true, unit: 'AM', val: '08:00' },
            ].map((trigger, i) => (
              <div key={i} className="p-4 flex items-center justify-between hover:bg-white/[0.02] transition-colors group">
                <div className="flex items-start space-x-4">
                  <div className="mt-1">
                    <div className="w-5 h-5 rounded border-2 border-[#30363d] flex items-center justify-center cursor-pointer group-hover:border-[#6c47ff]">
                      <Check size={12} className="text-[#6c47ff]" />
                    </div>
                  </div>
                  <div>
                    <h5 className="text-sm font-bold text-[#e6edf3] tracking-tight">{trigger.label}</h5>
                    <p className="text-xs text-[#8b949e]">{trigger.desc}</p>
                  </div>
                </div>
                {trigger.input && (
                  <div className="flex items-center space-x-2">
                    <input 
                      type="text" 
                      defaultValue={trigger.val || '15'} 
                      className="w-16 bg-[#0d1117] border border-[#30363d] rounded-md py-1 px-2 text-xs text-center font-mono text-[#6c47ff]" 
                    />
                    <span className="text-[10px] font-black text-gray-600 uppercase">{trigger.unit}</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      <div className="flex justify-end pt-4">
         <button className="flex items-center space-x-2 bg-[#6c47ff] hover:bg-[#5a36e0] text-white px-8 py-3 rounded-xl text-xs font-bold uppercase tracking-widest shadow-xl shadow-[#6c47ff]/20 transition-all active:scale-95">
            <Bell size={16} />
            <span>Save Preferences</span>
         </button>
      </div>
    </div>
  );
};

export default AlertSettings;
