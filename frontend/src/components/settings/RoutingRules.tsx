import React from 'react';
import { MoreVertical, GripVertical, Plus, AlertCircle } from 'lucide-react';

const rules = [
  { id: 1, type: 'currency', operator: 'equals', value: 'INR', target: 'UPI', priority: 1 },
  { id: 2, type: 'amount', operator: 'greater_than', value: '10000', target: 'Razorpay', priority: 2 },
  { id: 3, type: 'currency', operator: 'equals', value: 'USD', target: 'Stripe', priority: 3 },
];

const RoutingRules: React.FC = () => {
  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
           <h3 className="text-[10px] font-black text-gray-500 uppercase tracking-[0.2em]">Active Routing Logic</h3>
           <p className="text-xs text-[#8b949e] mt-1">Rules are evaluated from top to bottom (Priority 1 is highest).</p>
        </div>
        <button className="flex items-center space-x-2 bg-[#6c47ff] hover:bg-[#5a36e0] text-white px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-widest shadow-lg shadow-[#6c47ff]/20 transition-all">
          <Plus size={14} />
          <span>Add Rule</span>
        </button>
      </div>

      <div className="space-y-3">
        {rules.map((rule) => (
          <div key={rule.id} className="bg-[#161b22] border border-[#30363d] rounded-xl p-4 flex items-center group hover:border-[#444c56] transition-all">
            <div className="mr-4 text-[#30363d] group-hover:text-gray-500 cursor-grab active:cursor-grabbing transition-colors">
              <GripVertical size={20} />
            </div>
            
            <div className="flex-1 flex items-center space-x-4">
               <div className="w-8 h-8 flex items-center justify-center rounded-lg bg-[#0d1117] border border-[#30363d] text-[10px] font-bold text-gray-400">
                  {rule.priority}
               </div>
               
               <div className="flex items-center space-x-3 text-sm">
                  <span className="text-[#8b949e] font-bold uppercase text-[10px] tracking-widest">IF</span>
                  <select className="bg-[#0d1117] border border-[#30363d] rounded-md px-2 py-1 text-xs text-[#e6edf3] focus:outline-none focus:border-[#6c47ff]">
                     <option>{rule.type}</option>
                  </select>
                  <select className="bg-[#0d1117] border border-[#30363d] rounded-md px-2 py-1 text-xs text-[#e6edf3] focus:outline-none focus:border-[#6c47ff]">
                     <option>{rule.operator.replace('_', ' ')}</option>
                  </select>
                  <input type="text" defaultValue={rule.value} className="w-24 bg-[#0d1117] border border-[#30363d] rounded-md px-2 py-1 text-xs text-[#e6edf3] focus:outline-none focus:border-[#6c47ff]" />
                  
                  <span className="text-[#6c47ff] font-black px-2">→</span>
                  
                  <span className="text-[#8b949e] font-bold uppercase text-[10px] tracking-widest">ROUTE TO</span>
                  <select className="bg-[#0d1117] border border-[#30363d] rounded-md px-2 py-1 text-xs text-[#e6edf3] font-bold focus:outline-none focus:border-[#6c47ff]">
                     <option>{rule.target}</option>
                  </select>
               </div>
            </div>

            <button className="p-2 text-gray-600 hover:text-gray-300 transition-colors">
              <MoreVertical size={18} />
            </button>
          </div>
        ))}
      </div>

      <div className="pt-8 border-t border-[#30363d]">
        <div className="bg-[#0d1117] border border-[#30363d] rounded-xl p-6 flex items-center justify-between">
           <div className="flex items-center space-x-4">
              <div className="bg-yellow-500/10 p-2 rounded-lg border border-yellow-500/20 text-yellow-500">
                 <AlertCircle size={18} />
              </div>
              <div>
                 <h4 className="text-sm font-bold text-[#e6edf3] uppercase tracking-tight">Fallback Gateway</h4>
                 <p className="text-xs text-[#8b949e]">Used when no routing rules above are matched.</p>
              </div>
           </div>
           <select className="bg-[#161b22] border border-[#30363d] rounded-lg px-4 py-2 text-sm text-[#e6edf3] font-bold focus:outline-none focus:border-[#6c47ff]">
              <option>UPI</option>
              <option>Razorpay</option>
              <option>Stripe</option>
           </select>
        </div>
      </div>
    </div>
  );
};

export default RoutingRules;
