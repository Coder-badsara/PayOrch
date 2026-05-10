import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, 
  CreditCard, 
  Activity, 
  Webhook, 
  Settings 
} from 'lucide-react';

const SidebarItem = ({ to, icon: Icon, label, active }: { to: string, icon: any, label: string, active: boolean }) => (
  <Link 
    to={to} 
    className={`flex items-center space-x-3 p-3 rounded-lg transition-colors ${
      active ? 'bg-indigo-600 text-white' : 'text-gray-400 hover:bg-gray-800 hover:text-white'
    }`}
  >
    <Icon size={20} />
    <span>{label}</span>
  </Link>
);

const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const location = useLocation();

  return (
    <div className="flex h-screen bg-gray-900 text-white">
      {/* Sidebar */}
      <div className="w-64 bg-gray-950 border-r border-gray-800 p-4 flex flex-col">
        <div className="flex items-center space-x-3 mb-10 px-2">
          <div className="bg-indigo-600 p-2 rounded-lg">
            <CreditCard size={24} />
          </div>
          <h1 className="text-xl font-bold">PayOrch</h1>
        </div>

        <nav className="flex-1 space-y-2">
          <SidebarItem 
            to="/" 
            icon={LayoutDashboard} 
            label="Dashboard" 
            active={location.pathname === '/'} 
          />
          <SidebarItem 
            to="/simulator" 
            icon={CreditCard} 
            label="Payment Simulator" 
            active={location.pathname === '/simulator'} 
          />
          <SidebarItem 
            to="/webhooks" 
            icon={Webhook} 
            label="Webhook Logs" 
            active={location.pathname === '/webhooks'} 
          />
          <SidebarItem 
            to="/health" 
            icon={Activity} 
            label="Gateway Health" 
            active={location.pathname === '/health'} 
          />
        </nav>

        <div className="mt-auto pt-4 border-t border-gray-800">
          <SidebarItem 
            to="/settings" 
            icon={Settings} 
            label="Settings" 
            active={location.pathname === '/settings'} 
          />
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-auto bg-gray-900 p-8">
        {children}
      </div>
    </div>
  );
};

export default Layout;
