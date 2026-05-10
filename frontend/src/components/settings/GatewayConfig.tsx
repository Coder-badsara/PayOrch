import React, { useState } from 'react';
import { Eye, EyeOff, Save, ExternalLink, ShieldCheck, ShieldAlert, RefreshCcw } from 'lucide-react';

const AlertTriangleIcon = ({ size, className }: { size: number, className?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><path d="M12 9v4"/><path d="M12 17h.01"/>
  </svg>
);

const initialGateways = [
  { id: 'razorpay', name: 'Razorpay', enabled: true, lastTested: '5 mins ago', status: 'ENABLED', docs: 'https://razorpay.com/docs/payments/api/' },
  { id: 'stripe', name: 'Stripe', enabled: true, lastTested: '12 mins ago', status: 'ENABLED', docs: 'https://stripe.com/docs/api' },
  { id: 'payu', name: 'PayU', enabled: false, lastTested: '2 hours ago', status: 'DISABLED', docs: 'https://www.payu.in/docs' },
  { id: 'upi', name: 'UPI', enabled: true, lastTested: 'Just now', status: 'ENABLED', docs: 'https://www.npci.org.in/what-we-do/upi/product-overview' },
];

const GatewayConfig: React.FC = () => {
  const [gatewayList, setGatewayList] = useState(initialGateways);
  const [expandedId, setExpandedId] = useState<string | null>('razorpay');
  const [showSecrets, setShowSecrets] = useState<Record<string, boolean>>({});
  const [savingId, setSavingId] = useState<string | null>(null);

  const toggleSecret = (id: string) => {
    setShowSecrets(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const handleToggle = (id: string, enabled: boolean) => {
    setGatewayList(prev => prev.map(g => 
      g.id === id ? { ...g, enabled, status: enabled ? 'ENABLED' : 'DISABLED' } : g
    ));
  };

  const handleSave = (id: string) => {
    setSavingId(id);
    setTimeout(() => {
      setSavingId(null);
      alert(`${id.toUpperCase()} configuration saved successfully!`);
    }, 800);
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-6">
        {gatewayList.map((gateway) => (
          <div 
            key={gateway.id} 
            className={`bg-[#161b22] border rounded-xl overflow-hidden transition-all hover:border-[#444c56] ${
              expandedId === gateway.id ? 'border-[#6c47ff]/50 ring-1 ring-[#6c47ff]/10' : 'border-[#30363d]'
            }`}
          >
            <div className="p-6 flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div className={`p-3 rounded-lg transition-colors ${gateway.enabled ? 'bg-[#3fb950]/10' : 'bg-gray-800/50'}`}>
                  {gateway.enabled ? <ShieldCheck className="text-[#3fb950]" size={24} /> : <ShieldAlert className="text-gray-500" size={24} />}
                </div>
                <div>
                  <h3 className="text-lg font-bold text-[#e6edf3] uppercase tracking-tight">{gateway.name}</h3>
                  <div className="flex items-center space-x-2 mt-1">
                    <span className={`flex items-center space-x-1 text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider transition-colors ${
                      gateway.enabled ? 'bg-[#3fb950]/20 text-[#3fb950]' : 'bg-gray-800 text-gray-500'
                    }`}>
                      <span className={`w-1.5 h-1.5 rounded-full mr-1.5 ${gateway.enabled ? 'bg-[#3fb950] animate-pulse' : 'bg-gray-500'}`}></span>
                      {gateway.status}
                    </span>
                    <span className="text-[10px] text-[#8b949e] font-medium uppercase tracking-widest">Last Tested: {gateway.lastTested}</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center space-x-4">
                <div className="flex items-center space-x-2 bg-[#0d1117] p-1 rounded-lg border border-[#30363d]">
                   <button 
                    onClick={() => handleToggle(gateway.id, true)}
                    className={`px-3 py-1.5 rounded-md text-[10px] font-black uppercase tracking-tighter transition-all ${
                      gateway.enabled ? 'bg-[#3fb950] text-[#0d1117]' : 'text-gray-500 hover:text-gray-300'
                    }`}
                   >
                     Active
                   </button>
                   <button 
                    onClick={() => handleToggle(gateway.id, false)}
                    className={`px-3 py-1.5 rounded-md text-[10px] font-black uppercase tracking-tighter transition-all ${
                      !gateway.enabled ? 'bg-[#f85149] text-[#0d1117]' : 'text-gray-500 hover:text-gray-300'
                    }`}
                   >
                     Pause
                   </button>
                </div>
                <button 
                  onClick={() => setExpandedId(expandedId === gateway.id ? null : gateway.id)}
                  className={`px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-widest border transition-all ${
                    expandedId === gateway.id 
                      ? 'bg-gray-800 border-gray-700 text-white' 
                      : 'bg-[#6c47ff]/10 hover:bg-[#6c47ff]/20 text-[#6c47ff] border-[#6c47ff]/20'
                  }`}
                >
                  {expandedId === gateway.id ? 'Close' : 'Configure'}
                </button>
              </div>
            </div>

            {expandedId === gateway.id && (
              <div className="px-6 pb-6 pt-2 border-t border-[#30363d] bg-[#0d1117]/30 animate-in slide-in-from-top-2 duration-300">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
                  <div className="space-y-4">
                    <div>
                      <label className="block text-[10px] font-black text-gray-500 uppercase tracking-[0.2em] mb-2 ml-1">API Key</label>
                      <div className="relative group">
                        <input 
                          type={showSecrets[`${gateway.id}_key`] ? 'text' : 'password'}
                          defaultValue="rzp_test_SmTmc9FMbxwOOm"
                          className="w-full bg-[#0d1117] border border-[#30363d] rounded-lg py-2.5 px-4 text-sm text-[#e6edf3] focus:outline-none focus:border-[#6c47ff] focus:ring-1 focus:ring-[#6c47ff]/20 transition-all font-mono"
                        />
                        <button 
                          onClick={() => toggleSecret(`${gateway.id}_key`)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-600 hover:text-gray-300 transition-colors"
                        >
                          {showSecrets[`${gateway.id}_key`] ? <EyeOff size={16} /> : <Eye size={16} />}
                        </button>
                      </div>
                    </div>
                    <div>
                      <label className="block text-[10px] font-black text-gray-500 uppercase tracking-[0.2em] mb-2 ml-1">API Secret</label>
                      <div className="relative group">
                        <input 
                          type={showSecrets[`${gateway.id}_secret`] ? 'text' : 'password'}
                          defaultValue="••••••••••••••••••••••••"
                          className="w-full bg-[#0d1117] border border-[#30363d] rounded-lg py-2.5 px-4 text-sm text-[#e6edf3] focus:outline-none focus:border-[#6c47ff] focus:ring-1 focus:ring-[#6c47ff]/20 transition-all font-mono"
                        />
                        <button 
                          onClick={() => toggleSecret(`${gateway.id}_secret`)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-600 hover:text-gray-300 transition-colors"
                        >
                          {showSecrets[`${gateway.id}_secret`] ? <EyeOff size={16} /> : <Eye size={16} />}
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <label className="block text-[10px] font-black text-gray-500 uppercase tracking-[0.2em] mb-2 ml-1">Webhook Secret</label>
                      <div className="relative group">
                        <input 
                          type={showSecrets[`${gateway.id}_wh`] ? 'text' : 'password'}
                          defaultValue="whsec_razorpay_xxxx"
                          className="w-full bg-[#0d1117] border border-[#30363d] rounded-lg py-2.5 px-4 text-sm text-[#e6edf3] focus:outline-none focus:border-[#6c47ff] focus:ring-1 focus:ring-[#6c47ff]/20 transition-all font-mono"
                        />
                        <button 
                          onClick={() => toggleSecret(`${gateway.id}_wh`)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-600 hover:text-gray-300 transition-colors"
                        >
                          {showSecrets[`${gateway.id}_wh`] ? <EyeOff size={16} /> : <Eye size={16} />}
                        </button>
                      </div>
                    </div>
                    <div>
                      <label className="block text-[10px] font-black text-gray-500 uppercase tracking-[0.2em] mb-2 ml-1">Environment</label>
                      <select className="w-full bg-[#0d1117] border border-[#30363d] rounded-lg py-2.5 px-4 text-sm text-[#e6edf3] focus:outline-none focus:border-[#6c47ff] transition-all appearance-none cursor-pointer">
                        <option value="sandbox">Sandbox / Testing</option>
                        <option value="production">Live / Production</option>
                      </select>
                    </div>
                  </div>
                </div>

                <div className="flex justify-between items-center mt-8 pt-4 border-t border-[#30363d]">
                  <p className="text-xs text-yellow-500/80 flex items-center italic text-[10px]">
                    <AlertTriangleIcon size={12} className="mr-2" />
                    Changes will affect real-time routing logic immediately.
                  </p>
                  <div className="flex space-x-3">
                    <a 
                      href={gateway.docs} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="flex items-center space-x-2 px-4 py-2 text-xs font-bold text-gray-400 hover:text-gray-200 transition-colors uppercase tracking-widest"
                    >
                      <ExternalLink size={14} />
                      <span>View Docs</span>
                    </a>
                    <button 
                      onClick={() => handleSave(gateway.id)}
                      disabled={savingId === gateway.id}
                      className="flex items-center space-x-2 bg-[#6c47ff] hover:bg-[#5a36e0] disabled:bg-gray-800 text-white px-6 py-2 rounded-lg text-xs font-bold uppercase tracking-widest shadow-lg shadow-[#6c47ff]/20 transition-all active:scale-95"
                    >
                      {savingId === gateway.id ? <RefreshCcw size={14} className="animate-spin" /> : <Save size={14} />}
                      <span>{savingId === gateway.id ? 'Saving...' : 'Save Changes'}</span>
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      <button className="w-full py-4 border border-dashed border-[#30363d] rounded-xl text-[#8b949e] hover:text-[#e6edf3] hover:border-[#6c47ff] hover:bg-[#6c47ff]/5 transition-all text-sm font-medium uppercase tracking-[0.2em]">
        + Add New Gateway Provider
      </button>
    </div>
  );
};

export default GatewayConfig;