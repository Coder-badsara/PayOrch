import React, { useState, useEffect } from 'react';
import { Mail, Smartphone, Bell, Check, Plus, Trash2, RefreshCcw } from 'lucide-react';

const DEFAULT_EMAILS = ['ops@zetheta.com'];
const DEFAULT_TRIGGERS = [
  { id: 'circuit', label: 'Gateway circuit opens', desc: 'Notify immediately when a provider is automatically disabled.', enabled: true },
  { id: 'error_rate', label: 'High error rate detected', desc: 'Threshold exceedance (> 15% failures in 5 mins).', enabled: true, input: true, unit: '%', val: '15' },
  { id: 'webhook', label: 'Webhook delivery failure', desc: 'Notify after all retry attempts are exhausted.', enabled: false },
  { id: 'daily', label: 'Daily summary', desc: 'Send a transaction health report every morning.', enabled: true, input: true, unit: 'AM', val: '08:00' },
];

const AlertSettings: React.FC = () => {
  const [emails, setEmails] = useState<string[]>(() => {
    const saved = localStorage.getItem('payorch_alert_emails');
    return saved ? JSON.parse(saved) : DEFAULT_EMAILS;
  });

  const [emailEnabled, setEmailEnabled] = useState(() => {
    const saved = localStorage.getItem('payorch_alert_email_enabled');
    return saved ? JSON.parse(saved) : true;
  });

  const [triggers, setTriggers] = useState(() => {
    const saved = localStorage.getItem('payorch_alert_triggers');
    return saved ? JSON.parse(saved) : DEFAULT_TRIGGERS;
  });

  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    localStorage.setItem('payorch_alert_emails', JSON.stringify(emails));
    localStorage.setItem('payorch_alert_email_enabled', JSON.stringify(emailEnabled));
    localStorage.setItem('payorch_alert_triggers', JSON.stringify(triggers));
  }, [emails, emailEnabled, triggers]);

  const handleAddEmail = () => {
    setEmails([...emails, '']);
  };

  const handleDeleteEmail = (index: number) => {
    const newEmails = emails.filter((_, i) => i !== index);
    setEmails(newEmails.length > 0 ? newEmails : ['']);
  };

  const handleEmailChange = (index: number, value: string) => {
    const newEmails = [...emails];
    newEmails[index] = value;
    setEmails(newEmails);
  };

  const toggleTrigger = (id: string) => {
    setTriggers(prev => prev.map(t => 
      t.id === id ? { ...t, enabled: !t.enabled } : t
    ));
  };

  const handleTriggerValueChange = (id: string, val: string) => {
    setTriggers(prev => prev.map(t => 
      t.id === id ? { ...t, val } : t
    ));
  };

  const handleSave = () => {
    setIsSaving(true);
    setTimeout(() => {
      setIsSaving(false);
      alert('Notification preferences saved successfully!');
    }, 800);
  };

  return (
    <div className="space-y-10">
      <section>
        <div className="mb-6">
          <h3 className="text-[10px] font-black text-gray-500 uppercase tracking-[0.2em]">Notification Channels</h3>
          <p className="text-xs text-[#8b949e] mt-1">Configure where alerts are sent when system events occur.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className={`bg-[#161b22] border rounded-xl p-6 transition-all ${emailEnabled ? 'border-[#6c47ff]/30' : 'border-[#30363d] opacity-80'}`}>
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center space-x-3">
                <div className={`p-2 rounded-lg border transition-colors ${emailEnabled ? 'bg-indigo-500/10 border-indigo-500/20 text-[#6c47ff]' : 'bg-gray-800 border-gray-700 text-gray-500'}`}>
                  <Mail size={18} />
                </div>
                <h4 className={`text-sm font-bold uppercase tracking-tight transition-colors ${emailEnabled ? 'text-[#e6edf3]' : 'text-gray-500'}`}>Email Alerts</h4>
              </div>
              <button 
                onClick={() => setEmailEnabled(!emailEnabled)}
                className={`w-10 h-5 rounded-full relative transition-all duration-300 ${emailEnabled ? 'bg-[#6c47ff]' : 'bg-[#30363d]'}`}
              >
                <div className={`absolute top-1 w-3 h-3 bg-white rounded-full shadow-sm transition-all duration-300 ${emailEnabled ? 'right-1' : 'left-1'}`}></div>
              </button>
            </div>

            <div className="space-y-3">
              {emails.map((email, index) => (
                <div key={index} className="relative group animate-in fade-in slide-in-from-left-2 duration-300">
                  <input 
                    type="email" 
                    value={email}
                    onChange={(e) => handleEmailChange(index, e.target.value)}
                    disabled={!emailEnabled}
                    placeholder="ops@yourcompany.com"
                    className="w-full bg-[#0d1117] border border-[#30363d] rounded-lg py-2.5 px-4 text-sm text-[#e6edf3] focus:outline-none focus:border-[#6c47ff] disabled:opacity-50 disabled:cursor-not-allowed transition-all" 
                  />
                  <button 
                    onClick={() => handleDeleteEmail(index)}
                    disabled={!emailEnabled}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-red-500 transition-colors disabled:hidden"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
              <button 
                onClick={handleAddEmail}
                disabled={!emailEnabled}
                className="text-[10px] font-black text-[#6c47ff] hover:text-[#5a36e0] transition-colors uppercase tracking-widest flex items-center space-x-1 mt-2 disabled:opacity-30 disabled:cursor-not-allowed"
              >
                <Plus size={12} />
                <span>Add Email Address</span>
              </button>
            </div>
          </div>

          <div className="bg-[#161b22] border border-[#30363d] rounded-xl p-6 opacity-40 cursor-not-allowed grayscale relative overflow-hidden">
            <div className="absolute inset-0 flex items-center justify-center bg-black/20 backdrop-blur-[1px] z-10">
               <span className="bg-gray-900 border border-gray-700 text-gray-400 px-3 py-1 rounded text-[10px] font-black uppercase tracking-widest">Coming Soon</span>
            </div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-3">
                <div className="bg-gray-500/10 p-2 rounded-lg border border-gray-500/20 text-gray-400">
                  <Smartphone size={18} />
                </div>
                <h4 className="text-sm font-bold text-gray-400 uppercase tracking-tight">SMS Alerts</h4>
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
            {triggers.map((trigger) => (
              <div key={trigger.id} className="p-4 flex items-center justify-between hover:bg-white/[0.02] transition-colors group">
                <div className="flex items-start space-x-4">
                  <div className="mt-1">
                    <button 
                      onClick={() => toggleTrigger(trigger.id)}
                      className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-all ${
                        trigger.enabled 
                          ? 'bg-[#6c47ff] border-[#6c47ff]' 
                          : 'bg-transparent border-[#30363d] group-hover:border-[#6c47ff]/50'
                      }`}
                    >
                      {trigger.enabled && <Check size={12} className="text-white" />}
                    </button>
                  </div>
                  <div onClick={() => toggleTrigger(trigger.id)} className="cursor-pointer">
                    <h5 className={`text-sm font-bold tracking-tight transition-colors ${trigger.enabled ? 'text-[#e6edf3]' : 'text-gray-500'}`}>{trigger.label}</h5>
                    <p className="text-xs text-[#8b949e]">{trigger.desc}</p>
                  </div>
                </div>
                {trigger.input && (
                  <div className={`flex items-center space-x-2 transition-opacity ${trigger.enabled ? 'opacity-100' : 'opacity-30'}`}>
                    <input 
                      type="text" 
                      value={trigger.val} 
                      onChange={(e) => handleTriggerValueChange(trigger.id, e.target.value)}
                      disabled={!trigger.enabled}
                      className="w-16 bg-[#0d1117] border border-[#30363d] rounded-md py-1 px-2 text-xs text-center font-mono text-[#6c47ff] focus:outline-none focus:border-[#6c47ff]" 
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
         <button 
          onClick={handleSave}
          disabled={isSaving}
          className="flex items-center space-x-2 bg-[#6c47ff] hover:bg-[#5a36e0] disabled:bg-gray-800 text-white px-8 py-3 rounded-xl text-xs font-bold uppercase tracking-widest shadow-xl shadow-[#6c47ff]/20 transition-all active:scale-95"
         >
            {isSaving ? <RefreshCcw size={16} className="animate-spin" /> : <Bell size={16} />}
            <span>{isSaving ? 'Saving Changes...' : 'Save Preferences'}</span>
         </button>
      </div>
    </div>
  );
};

export default AlertSettings;

