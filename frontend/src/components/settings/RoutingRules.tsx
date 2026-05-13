import React, { useState, useEffect } from 'react';
import { MoreVertical, GripVertical, Plus, AlertCircle, X, Save, ArrowUp, ArrowDown, Trash2, Workflow } from 'lucide-react';

const DEFAULT_RULES = [
  { id: '1', type: 'currency', operator: 'equals', value: 'INR', target: 'UPI', priority: 1 },
  { id: '2', type: 'amount', operator: 'greater_than', value: '10000', target: 'Razorpay', priority: 2 },
  { id: '3', type: 'currency', operator: 'equals', value: 'USD', target: 'Stripe', priority: 3 },
];

const RoutingRules: React.FC = () => {
  const [ruleList, setRuleList] = useState(() => {
    const saved = localStorage.getItem('payorch_routing_rules');
    return saved ? JSON.parse(saved) : DEFAULT_RULES;
  });

  const [fallbackGateway, setFallbackGateway] = useState(() => {
    return localStorage.getItem('payorch_fallback_gateway') || 'Stripe';
  });

  const [gateways, setGateways] = useState<any[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newRule, setNewRule] = useState({
    type: 'currency',
    operator: 'equals',
    value: '',
    target: ''
  });
  const [showMenu, setShowMenu] = useState<string | null>(null);
  
  // Drag and drop state
  const [draggedItemIndex, setDraggedItemIndex] = useState<number | null>(null);

  useEffect(() => {
    const savedGateways = localStorage.getItem('payorch_gateways');
    if (savedGateways) {
      const parsed = JSON.parse(savedGateways);
      setGateways(parsed);
      
      // If we have a saved fallback but it's not in the current gateways (e.g. deleted), 
      // or if no fallback is set, pick the first available gateway
      if (parsed.length > 0) {
        const currentFallback = localStorage.getItem('payorch_fallback_gateway');
        const fallbackExists = parsed.some((g: any) => g.name === currentFallback);
        if (!fallbackExists) {
          setFallbackGateway(parsed[0].name);
        }
      }

      if (parsed.length > 0 && !newRule.target) {
        setNewRule(prev => ({ ...prev, target: parsed[0].name }));
      }
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('payorch_routing_rules', JSON.stringify(ruleList));
  }, [ruleList]);

  useEffect(() => {
    localStorage.setItem('payorch_fallback_gateway', fallbackGateway);
  }, [fallbackGateway]);

  const handleAddRule = (e: React.FormEvent) => {
    e.preventDefault();
    const id = Math.random().toString(36).substr(2, 9);
    const ruleToAdd = {
      ...newRule,
      id,
      priority: ruleList.length + 1
    };
    setRuleList([...ruleList, ruleToAdd]);
    setIsModalOpen(false);
    setNewRule({
      type: 'currency',
      operator: 'equals',
      value: '',
      target: gateways[0]?.name || ''
    });
  };

  const moveRule = (index: number, direction: 'up' | 'down') => {
    const newRules = [...ruleList];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    
    if (targetIndex < 0 || targetIndex >= newRules.length) return;

    // Swap rules
    [newRules[index], newRules[targetIndex]] = [newRules[targetIndex], newRules[index]];
    
    // Update priorities
    const updatedRules = newRules.map((rule, idx) => ({
      ...rule,
      priority: idx + 1
    }));
    
    setRuleList(updatedRules);
    setShowMenu(null);
  };

  const deleteRule = (id: string) => {
    const filtered = ruleList.filter((r: any) => r.id !== id);
    const updated = filtered.map((rule: any, idx: number) => ({
      ...rule,
      priority: idx + 1
    }));
    setRuleList(updated);
    setShowMenu(null);
  };

  // HTML5 Drag and Drop handlers
  const onDragStart = (e: React.DragEvent, index: number) => {
    setDraggedItemIndex(index);
    e.dataTransfer.effectAllowed = 'move';
    // Add a ghost image or styling if desired
  };

  const onDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault(); // Necessary to allow dropping
    if (draggedItemIndex === null || draggedItemIndex === index) return;

    const newRules = [...ruleList];
    const itemBeingDragged = newRules[draggedItemIndex];
    
    // Remove from old position and insert at new position
    newRules.splice(draggedItemIndex, 1);
    newRules.splice(index, 0, itemBeingDragged);
    
    // Update priorities based on new array order
    const updatedWithPriority = newRules.map((rule, idx) => ({
      ...rule,
      priority: idx + 1
    }));

    setDraggedItemIndex(index);
    setRuleList(updatedWithPriority);
  };

  const onDragEnd = () => {
    setDraggedItemIndex(null);
  };

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
           <h3 className="text-[10px] font-black text-gray-500 uppercase tracking-[0.2em]">Active Routing Logic</h3>
           <p className="text-xs text-[#8b949e] mt-1">Rules are evaluated from top to bottom (Priority 1 is highest).</p>
        </div>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="flex items-center space-x-2 bg-[#6c47ff] hover:bg-[#5a36e0] text-white px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-widest shadow-lg shadow-[#6c47ff]/20 transition-all active:scale-95"
        >
          <Plus size={14} />
          <span>Add Rule</span>
        </button>
      </div>

      <div className="space-y-3">
        {ruleList.map((rule: any, index: number) => (
          <div 
            key={rule.id} 
            draggable
            onDragStart={(e) => onDragStart(e, index)}
            onDragOver={(e) => onDragOver(e, index)}
            onDragEnd={onDragEnd}
            className={`bg-[#161b22] border rounded-xl p-4 flex items-center group transition-all relative ${
              draggedItemIndex === index ? 'opacity-40 border-[#6c47ff] scale-[0.98] z-50' : 'border-[#30363d] hover:border-[#444c56]'
            } ${draggedItemIndex !== null && draggedItemIndex !== index ? 'cursor-grabbing' : ''}`}
          >
            <div className="mr-4 text-[#30363d] group-hover:text-gray-500 cursor-grab active:cursor-grabbing transition-colors">
              <GripVertical size={20} />
            </div>
            
            <div className="flex-1 flex items-center space-x-4">
               <div className="w-8 h-8 flex items-center justify-center rounded-lg bg-[#0d1117] border border-[#30363d] text-[10px] font-bold text-gray-400">
                  {rule.priority}
               </div>
               
               <div className="flex items-center space-x-3 text-sm flex-wrap gap-y-2">
                  <span className="text-[#8b949e] font-bold uppercase text-[10px] tracking-widest">IF</span>
                  <select 
                    value={rule.type}
                    onChange={(e) => {
                      const newList = [...ruleList];
                      newList[index].type = e.target.value;
                      setRuleList(newList);
                    }}
                    className="bg-[#0d1117] border border-[#30363d] rounded-md px-2 py-1 text-xs text-[#e6edf3] focus:outline-none focus:border-[#6c47ff] cursor-pointer"
                  >
                     <option value="currency">Currency</option>
                     <option value="amount">Amount</option>
                     <option value="gateway_available">Gateway Available</option>
                  </select>
                  <select 
                    value={rule.operator}
                    onChange={(e) => {
                      const newList = [...ruleList];
                      newList[index].operator = e.target.value;
                      setRuleList(newList);
                    }}
                    className="bg-[#0d1117] border border-[#30363d] rounded-md px-2 py-1 text-xs text-[#e6edf3] focus:outline-none focus:border-[#6c47ff] cursor-pointer"
                  >
                     <option value="equals">Equals</option>
                     <option value="greater_than">Greater Than</option>
                     <option value="less_than">Less Than</option>
                     <option value="not_equals">Not Equals</option>
                  </select>
                  <input 
                    type="text" 
                    value={rule.value} 
                    onChange={(e) => {
                      const newList = [...ruleList];
                      newList[index].value = e.target.value;
                      setRuleList(newList);
                    }}
                    className="w-24 bg-[#0d1117] border border-[#30363d] rounded-md px-2 py-1 text-xs text-[#e6edf3] focus:outline-none focus:border-[#6c47ff]" 
                  />
                  
                  <span className="text-[#6c47ff] font-black px-2">→</span>
                  
                  <span className="text-[#8b949e] font-bold uppercase text-[10px] tracking-widest">ROUTE TO</span>
                  <select 
                    value={rule.target}
                    onChange={(e) => {
                      const newList = [...ruleList];
                      newList[index].target = e.target.value;
                      setRuleList(newList);
                    }}
                    className="bg-[#0d1117] border border-[#30363d] rounded-md px-2 py-1 text-xs text-[#e6edf3] font-bold focus:outline-none focus:border-[#6c47ff] cursor-pointer"
                  >
                     {gateways.map(g => (
                       <option key={g.id} value={g.name}>{g.name}</option>
                     ))}
                     {gateways.length === 0 && <option>{rule.target}</option>}
                  </select>
               </div>
            </div>

            <div className="relative">
              <button 
                onClick={() => setShowMenu(showMenu === rule.id ? null : rule.id)}
                className="p-2 text-gray-600 hover:text-gray-300 transition-colors"
              >
                <MoreVertical size={18} />
              </button>
              
              {showMenu === rule.id && (
                <div className="absolute right-0 top-10 w-40 bg-[#1c2128] border border-[#30363d] rounded-lg shadow-xl z-[60] overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                  <button 
                    onClick={() => moveRule(index, 'up')}
                    disabled={index === 0}
                    className="w-full flex items-center space-x-2 px-4 py-2.5 text-xs text-gray-400 hover:text-[#e6edf3] hover:bg-[#6c47ff]/10 disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
                  >
                    <ArrowUp size={14} />
                    <span>Move Up</span>
                  </button>
                  <button 
                    onClick={() => moveRule(index, 'down')}
                    disabled={index === ruleList.length - 1}
                    className="w-full flex items-center space-x-2 px-4 py-2.5 text-xs text-gray-400 hover:text-[#e6edf3] hover:bg-[#6c47ff]/10 disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
                  >
                    <ArrowDown size={14} />
                    <span>Move Down</span>
                  </button>
                  <div className="border-t border-[#30363d] my-1"></div>
                  <button 
                    onClick={() => deleteRule(rule.id)}
                    className="w-full flex items-center space-x-2 px-4 py-2.5 text-xs text-red-500/70 hover:text-red-500 hover:bg-red-500/10 transition-colors"
                  >
                    <Trash2 size={14} />
                    <span>Delete Rule</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        ))}
        {ruleList.length === 0 && (
          <div className="py-12 border border-dashed border-[#30363d] rounded-xl flex flex-col items-center justify-center text-[#8b949e]">
            <Workflow size={32} className="mb-3 opacity-20" />
            <p className="text-xs uppercase tracking-widest font-bold">No routing rules defined</p>
            <button 
              onClick={() => setIsModalOpen(true)}
              className="mt-4 text-[#6c47ff] hover:underline text-xs font-bold uppercase tracking-widest"
            >
              Create your first rule
            </button>
          </div>
        )}
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
           <select 
             value={fallbackGateway}
             onChange={(e) => setFallbackGateway(e.target.value)}
             className="bg-[#161b22] border border-[#30363d] rounded-lg px-4 py-2 text-sm text-[#e6edf3] font-bold focus:outline-none focus:border-[#6c47ff] cursor-pointer appearance-none"
           >
              {gateways.map(g => (
                <option key={g.id} value={g.name}>{g.name}</option>
              ))}
              {gateways.length === 0 && <option value="Stripe">Stripe</option>}
           </select>
        </div>
      </div>

      {/* Add Rule Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0d1117]/80 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-[#161b22] border border-[#30363d] rounded-2xl w-full max-w-md overflow-hidden shadow-2xl animate-in zoom-in-95 duration-300">
            <div className="px-6 py-4 border-b border-[#30363d] flex items-center justify-between bg-[#1c2128]">
              <h3 className="text-[#e6edf3] font-bold uppercase tracking-widest text-sm flex items-center space-x-2">
                <Plus size={16} className="text-[#6c47ff]" />
                <span>Create Routing Rule</span>
              </h3>
              <button 
                onClick={() => setIsModalOpen(false)}
                className="text-[#8b949e] hover:text-[#e6edf3] transition-colors"
              >
                <X size={20} />
              </button>
            </div>
            
            <form onSubmit={handleAddRule} className="p-6 space-y-5">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-black text-gray-500 uppercase tracking-[0.2em] mb-2 ml-1">Condition</label>
                  <select 
                    value={newRule.type}
                    onChange={(e) => setNewRule({...newRule, type: e.target.value})}
                    className="w-full bg-[#0d1117] border border-[#30363d] rounded-lg py-2.5 px-4 text-sm text-[#e6edf3] focus:outline-none focus:border-[#6c47ff] transition-all cursor-pointer appearance-none"
                  >
                    <option value="currency">Currency</option>
                    <option value="amount">Amount</option>
                    <option value="gateway_available">Gateway Available</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-black text-gray-500 uppercase tracking-[0.2em] mb-2 ml-1">Operator</label>
                  <select 
                    value={newRule.operator}
                    onChange={(e) => setNewRule({...newRule, operator: e.target.value})}
                    className="w-full bg-[#0d1117] border border-[#30363d] rounded-lg py-2.5 px-4 text-sm text-[#e6edf3] focus:outline-none focus:border-[#6c47ff] transition-all cursor-pointer appearance-none"
                  >
                    <option value="equals">Equals</option>
                    <option value="greater_than">Greater Than</option>
                    <option value="less_than">Less Than</option>
                    <option value="not_equals">Not Equals</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-black text-gray-500 uppercase tracking-[0.2em] mb-2 ml-1">Value</label>
                <input 
                  autoFocus
                  required
                  type="text" 
                  value={newRule.value}
                  onChange={(e) => setNewRule({...newRule, value: e.target.value})}
                  placeholder="e.g. INR, 1000, active"
                  className="w-full bg-[#0d1117] border border-[#30363d] rounded-lg py-2.5 px-4 text-sm text-[#e6edf3] focus:outline-none focus:border-[#6c47ff] transition-all"
                />
              </div>

              <div>
                <label className="block text-[10px] font-black text-gray-500 uppercase tracking-[0.2em] mb-2 ml-1">Target Gateway</label>
                <select 
                  value={newRule.target}
                  onChange={(e) => setNewRule({...newRule, target: e.target.value})}
                  className="w-full bg-[#0d1117] border border-[#30363d] rounded-lg py-2.5 px-4 text-sm text-[#e6edf3] focus:outline-none focus:border-[#6c47ff] transition-all cursor-pointer appearance-none"
                >
                  {gateways.map(g => (
                    <option key={g.id} value={g.name}>{g.name}</option>
                  ))}
                  {gateways.length === 0 && (
                    <>
                      <option value="Stripe">Stripe</option>
                      <option value="Razorpay">Razorpay</option>
                      <option value="PayU">PayU</option>
                      <option value="UPI">UPI</option>
                    </>
                  )}
                </select>
              </div>

              <div className="pt-4 flex items-center space-x-3">
                <button 
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 px-6 py-2.5 rounded-lg text-xs font-bold uppercase tracking-widest text-gray-400 hover:text-white hover:bg-white/5 transition-all"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  className="flex-1 bg-[#6c47ff] hover:bg-[#5a36e0] text-white px-6 py-2.5 rounded-lg text-xs font-bold uppercase tracking-widest shadow-lg shadow-[#6c47ff]/20 transition-all active:scale-95 flex items-center justify-center space-x-2"
                >
                  <Save size={14} />
                  <span>Create Rule</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default RoutingRules;


