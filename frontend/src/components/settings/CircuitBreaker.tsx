import React, { useState } from 'react';
import { Shield, RefreshCcw, Power, RotateCcw } from 'lucide-react';

const initialConfigs = [
  { id: 'razorpay', name: 'Razorpay', status: 'HEALTHY', threshold: 5, rate: 15, cooldown: 60 },
  { id: 'stripe', name: 'Stripe', status: 'HEALTHY', threshold: 5, rate: 15, cooldown: 60 },
  { id: 'payu', name: 'PayU', status: 'UNHEALTHY', threshold: 5, rate: 15, cooldown: 60 },
  { id: 'upi', name: 'UPI', status: 'HEALTHY', threshold: 5, rate: 15, cooldown: 60 },
];

const CircuitBreaker: React.FC = () => {
  const [configs, setConfigs] = useState(initialConfigs);
  const [saving, setSaving] = useState(false);

  const handleStatusOverride = (id: string, newStatus: string) => {
    setConfigs(prev => prev.map(c => 
      c.id === id ? { ...c, status: newStatus } : c
    ));
  };

  const handleConfigChange = (id: string, field: string, value: string) => {
    setConfigs(prev => prev.map(c => 
      c.id === id ? { ...c, [field]: parseInt(value) || 0 } : c
    ));
  };

  const handleSaveAll = () => {
    setSaving(true);
    setTimeout(() => {
      setSaving(false);
      alert('Circuit Breaker policies updated globally.');
    }, 800);
  };

  return (
    <div className="space-y-6">
      <div className="bg-[#6c47ff]/5 border border-[#6c47ff]/20 rounded-xl p-4 flex items-start space-x-4">
        <div className="bg-[#6c47ff]/20 p-2 rounded-lg">
          <Shield className="text-[#6c47ff]" size={20} />
        </div>
        <p className="text-sm text-[#8b949e] leading-relaxed">
          Circuit breakers automatically disable a gateway when error thresholds are exceeded. 
          Use <span className="text-white font-bold">Manual Overrides</span> to bypass automated logic for maintenance or emergency drills.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {configs.map((gateway) => (
          <div key={gateway.id} className={`bg-[#161b22] border rounded-xl p-6 transition-all duration-500 ${
            gateway.status === 'HEALTHY' ? 'border-[#30363d]' : 
            gateway.status === 'UNHEALTHY' ? 'border-red-500/50 shadow-[0_0_15px_-5px_rgba(239,68,68,0.3)]' : 
            'border-green-500/50 shadow-[0_0_15px_-5px_rgba(34,197,94,0.3)]'
          }`}>
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-bold uppercase tracking-tight text-[#e6edf3]">{gateway.name}</h3>
              <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-tighter border transition-colors ${
                gateway.status === 'HEALTHY' ? 'bg-[#3fb950]/10 border-[#3fb950]/20 text-[#3fb950]' : 'bg-[#f85149]/10 border-[#f85149]/20 text-[#f85149]'
              }`}>
                {gateway.status}
              </span>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1.5">Failure Threshold</label>
                  <div className="relative">
                    <input 
                      type="number" 
                      value={gateway.threshold} 
                      onChange={(e) => handleConfigChange(gateway.id, 'threshold', e.target.value)}
                      className="w-full bg-[#0d1117] border border-[#30363d] rounded-lg py-2 px-3 text-sm text-white focus:outline-none focus:border-[#6c47ff]" 
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-gray-600 font-bold uppercase">Errors</span>
                  </div>
                </div>
                <div>
                  <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1.5">Error Rate (%)</label>
                  <div className="relative">
                    <input 
                      type="number" 
                      value={gateway.rate} 
                      onChange={(e) => handleConfigChange(gateway.id, 'rate', e.target.value)}
                      className="w-full bg-[#0d1117] border border-[#30363d] rounded-lg py-2 px-3 text-sm text-white focus:outline-none focus:border-[#6c47ff]" 
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-gray-600 font-bold uppercase">%</span>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1.5">Cooldown Period</label>
                <div className="relative">
                  <input 
                    type="number" 
                    value={gateway.cooldown} 
                    onChange={(e) => handleConfigChange(gateway.id, 'cooldown', e.target.value)}
                    className="w-full bg-[#0d1117] border border-[#30363d] rounded-lg py-2 px-3 text-sm text-white focus:outline-none focus:border-[#6c47ff]" 
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-gray-600 font-bold uppercase">Seconds</span>
                </div>
              </div>

              <div className="pt-4 border-t border-[#30363d]">
                <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-3">Manual Override</p>
                <div className="grid grid-cols-3 gap-2">
                  <button 
                    onClick={() => handleStatusOverride(gateway.id, 'UNHEALTHY')}
                    className={`flex flex-col items-center justify-center py-2 rounded-lg border transition-all ${
                      gateway.status === 'UNHEALTHY' 
                        ? 'bg-red-500 text-[#0d1117] border-red-500 font-black' 
                        : 'bg-red-500/10 border-red-500/20 text-red-500 hover:bg-red-500/20'
                    }`}
                  >
                    <Power size={14} className="mb-1" />
                    <span className="text-[10px] font-bold">FORCE OPEN</span>
                  </button>
                  <button 
                    onClick={() => handleStatusOverride(gateway.id, 'HEALTHY')}
                    className={`flex flex-col items-center justify-center py-2 rounded-lg border transition-all ${
                      gateway.status === 'HEALTHY' 
                        ? 'bg-green-500 text-[#0d1117] border-green-500 font-black' 
                        : 'bg-green-500/10 border-green-500/20 text-green-500 hover:bg-green-500/20'
                    }`}
                  >
                    <Power size={14} className="mb-1 rotate-180" />
                    <span className="text-[10px] font-bold">FORCE CLOSE</span>
                  </button>
                  <button 
                    onClick={() => handleStatusOverride(gateway.id, 'HEALTHY')}
                    className="flex flex-col items-center justify-center py-2 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-indigo-500 hover:bg-indigo-500/20 transition-all active:scale-95"
                  >
                    <RotateCcw size={14} className="mb-1" />
                    <span className="text-[10px] font-bold">RESET</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="bg-[#161b22] border border-[#30363d] rounded-xl p-6 mt-8">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="bg-white/5 p-2 rounded-lg text-gray-400">
              <RefreshCcw size={20} className={saving ? 'animate-spin' : ''} />
            </div>
            <div>
              <h3 className="text-sm font-bold text-[#e6edf3] uppercase tracking-tight">System Policy Update</h3>
              <p className="text-xs text-[#8b949e]">Commit threshold changes to the production routing engine.</p>
            </div>
          </div>
          <button 
            onClick={handleSaveAll}
            disabled={saving}
            className="bg-[#6c47ff] hover:bg-[#5a36e0] disabled:bg-gray-800 text-white px-8 py-2 rounded-lg text-xs font-bold uppercase tracking-widest shadow-lg shadow-[#6c47ff]/20 transition-all active:scale-95"
          >
            {saving ? 'Syncing...' : 'Save All Policies'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default CircuitBreaker;
