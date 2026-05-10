import React, { useState } from 'react';
import { Settings as SettingsIcon, Shield, Globe, Bell, Key, Users, Workflow } from 'lucide-react';
import GatewayConfig from '../components/settings/GatewayConfig';
import CircuitBreaker from '../components/settings/CircuitBreaker';
import RoutingRules from '../components/settings/RoutingRules';
import AlertsNotifications from '../components/settings/AlertsNotifications';
import ApiKeys from '../components/settings/ApiKeys';
import TeamManagement from '../components/settings/TeamManagement';

const tabs = [
  { id: 'gateways', label: 'Gateways', icon: Globe },
  { id: 'routing', label: 'Routing Rules', icon: Workflow },
  { id: 'webhooks', label: 'Webhooks', icon: Bell },
  { id: 'circuit-breaker', label: 'Circuit Breaker', icon: Shield },
  { id: 'alerts', label: 'Alerts', icon: Bell },
  { id: 'api-keys', label: 'API Keys', icon: Key },
  { id: 'team', label: 'Team', icon: Users },
];

const Settings: React.FC = () => {
  const [activeTab, setActiveTab] = useState('gateways');

  const renderTabContent = () => {
    switch (activeTab) {
      case 'gateways':
        return <GatewayConfig />;
      case 'routing':
        return <RoutingRules />;
      case 'webhooks':
        return (
          <div className="flex flex-col items-center justify-center py-20 bg-[#161b22] border border-dashed border-[#30363d] rounded-2xl">
             <Bell size={48} className="text-gray-800 mb-4" />
             <h4 className="text-[#e6edf3] font-bold uppercase tracking-widest text-xs">Webhook Policy Engine</h4>
             <p className="text-[#8b949e] text-xs mt-2 italic">Configuration module is being calibrated. Check back soon.</p>
          </div>
        );
      case 'circuit-breaker':
        return <CircuitBreaker />;
      case 'alerts':
        return <AlertsNotifications />;
      case 'api-keys':
        return <ApiKeys />;
      case 'team':
        return <TeamManagement />;
      default:
        return null;
    }
  };

  return (
    <div className="max-w-6xl mx-auto pb-20">
      <div className="mb-8">
        <h1 className="text-2xl font-bold flex items-center space-x-2 text-[#e6edf3]">
          <SettingsIcon className="text-[#6c47ff]" size={28} />
          <span>Settings</span>
        </h1>
        <p className="text-[#8b949e] mt-1">Configure your PayOrch workspace, security policies, and gateway integrations.</p>
      </div>

      {/* Tab Navigation */}
      <div className="flex space-x-1 border-b border-[#30363d] mb-8 overflow-x-auto scrollbar-hide">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center space-x-2 px-6 py-4 text-sm font-bold uppercase tracking-widest transition-all whitespace-nowrap border-b-2 ${
                isActive 
                  ? 'border-[#6c47ff] text-[#e6edf3] bg-[#6c47ff]/5' 
                  : 'border-transparent text-[#8b949e] hover:text-[#e6edf3] hover:bg-white/5'
              }`}
            >
              <Icon size={14} className={isActive ? 'text-[#6c47ff]' : ''} />
              <span className="text-[10px]">{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Tab Panel */}
      <div className="animate-in fade-in slide-in-from-bottom-2 duration-500">
        {renderTabContent()}
      </div>
    </div>
  );
};

export default Settings;
