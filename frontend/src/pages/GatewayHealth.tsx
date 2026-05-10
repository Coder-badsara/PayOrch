import React, { useEffect, useState, useCallback } from 'react';
import { getGatewayHealth } from '../api/api';
import type { GatewayHealth as GatewayHealthType } from '../types';
import { RefreshCcw, Activity, Shield, ShieldAlert, ShieldOff, Zap, AlertTriangle, BarChart3, Clock } from 'lucide-react';

const GatewayHealth: React.FC = () => {
  const [healthData, setHealthData] = useState<GatewayHealthType[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [lastRefreshed, setLastRefreshed] = useState<Date>(new Date());

  const fetchHealth = useCallback(async (isAuto = false) => {
    if (!isAuto) setLoading(true);
    const startTime = Date.now();
    try {
      const response = await getGatewayHealth();
      
      const elapsed = Date.now() - startTime;
      const remaining = isAuto ? 0 : Math.max(0, 600 - elapsed);
      if (remaining > 0) await new Promise(resolve => setTimeout(resolve, remaining));

      const data = Array.isArray(response.data) ? response.data : 
                  response.data.gateways ? Object.values(response.data.gateways) : [];
      setHealthData(data as GatewayHealthType[]);
      setLastRefreshed(new Date());
      setError(null);
    } catch (err) {
      setError('Failed to fetch gateway health status');
      console.error(err);
    } finally {
      if (!isAuto) setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchHealth();
  }, [fetchHealth]);

  // Auto-refresh interval
  useEffect(() => {
    let interval: number | undefined;
    if (autoRefresh) {
      interval = window.setInterval(() => {
        fetchHealth(true);
      }, 10000); // 10 seconds
    }
    return () => clearInterval(interval);
  }, [autoRefresh, fetchHealth]);

  const getStatusInfo = (status: string) => {
    switch (status) {
      case 'HEALTHY': 
        return { 
          icon: <Shield className="text-green-400" />, 
          color: 'text-green-400',
          bg: 'bg-green-400/10',
          border: 'border-green-500/20',
          glow: 'shadow-[0_0_20px_-5px_rgba(34,197,94,0.3)]',
          label: 'Healthy'
        };
      case 'DEGRADED': 
        return { 
          icon: <ShieldAlert className="text-yellow-400" />, 
          color: 'text-yellow-400',
          bg: 'bg-yellow-400/10',
          border: 'border-yellow-500/20',
          glow: 'shadow-[0_0_20px_-5px_rgba(234,179,8,0.3)]',
          label: 'Degraded'
        };
      case 'DOWN':
      case 'UNHEALTHY':
      case 'CIRCUIT_OPEN':
        return { 
          icon: <ShieldOff className="text-red-400" />, 
          color: 'text-red-400',
          bg: 'bg-red-400/10',
          border: 'border-red-500/20',
          glow: 'shadow-[0_0_20px_-5px_rgba(239,68,68,0.3)]',
          label: status === 'CIRCUIT_OPEN' ? 'Circuit Open' : 'Down'
        };
      default: 
        return { 
          icon: <Activity className="text-gray-400" />, 
          color: 'text-gray-400',
          bg: 'bg-gray-400/10',
          border: 'border-gray-500/20',
          glow: '',
          label: status
        };
    }
  };

  return (
    <div>
      <div className="flex flex-col md:flex-row md:justify-between md:items-center mb-8 gap-4">
        <div>
          <h1 className="text-2xl font-bold">Gateway Health</h1>
          <p className="text-gray-400">Monitoring real-time performance and reliability.</p>
        </div>
        
        <div className="flex items-center space-x-3 bg-gray-950 border border-gray-800 p-1.5 rounded-xl">
          <button 
            onClick={() => setAutoRefresh(!autoRefresh)}
            className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-all text-xs font-bold uppercase tracking-wider ${
              autoRefresh 
                ? 'bg-indigo-500 text-white shadow-lg shadow-indigo-500/20' 
                : 'text-gray-500 hover:text-gray-300'
            }`}
          >
            <Zap size={14} className={autoRefresh ? 'fill-current' : ''} />
            <span>{autoRefresh ? 'Live Monitoring On' : 'Auto Refresh Off'}</span>
          </button>
          
          <div className="w-px h-6 bg-gray-800"></div>

          <button 
            onClick={() => fetchHealth()}
            disabled={loading}
            className="flex items-center space-x-2 bg-indigo-600/10 hover:bg-indigo-600/20 text-indigo-400 active:scale-90 disabled:opacity-70 disabled:active:scale-100 px-4 py-2 rounded-lg transition-all"
          >
            <RefreshCcw size={14} className={`${loading ? 'animate-spin' : ''}`} />
            <span className="text-xs font-bold uppercase tracking-wider">{loading ? 'Updating...' : 'Refresh Now'}</span>
          </button>
        </div>
      </div>

      <div className="flex items-center justify-end mb-4 text-[10px] text-gray-500 font-mono uppercase tracking-widest">
        <Clock size={10} className="mr-1" />
        Last Updated: {lastRefreshed.toLocaleTimeString()}
      </div>

      {loading && healthData.length === 0 ? (
        <div className="text-center py-20 text-gray-500">
          <RefreshCcw size={48} className="animate-spin mx-auto mb-4 opacity-20" />
          <p>Analyzing gateway signals...</p>
        </div>
      ) : healthData.length === 0 ? (
        <div className="text-center py-20 text-gray-950 bg-gray-900/20 border border-dashed border-gray-800 rounded-2xl">
          <AlertTriangle size={48} className="mx-auto mb-4 text-gray-800" />
          <p className="text-gray-500 max-w-xs mx-auto text-sm">No health data available. Check if the orchestration background tasks are active.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {healthData.map((gateway) => {
            const statusInfo = getStatusInfo(gateway.status);
            return (
              <div key={gateway.gateway_name} className={`bg-gray-950 border ${statusInfo.border} ${statusInfo.glow} rounded-2xl p-6 transition-all duration-700`}>
                <div className="flex items-center justify-between mb-8">
                  <div className="flex items-center space-x-3">
                    <div className={`${statusInfo.bg} p-2.5 rounded-xl`}>
                      {statusInfo.icon}
                    </div>
                    <div>
                      <h2 className="text-lg font-black uppercase tracking-tighter">{gateway.gateway_name}</h2>
                      <div className="flex items-center text-[10px] font-bold text-gray-500 uppercase tracking-widest mt-0.5">
                        <BarChart3 size={10} className="mr-1" />
                        {gateway.total_count} Requests
                      </div>
                    </div>
                  </div>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-tighter border ${statusInfo.border} ${statusInfo.bg} ${statusInfo.color}`}>
                    {statusInfo.label}
                  </span>
                </div>

                <div className="space-y-6">
                  <div>
                    <div className="flex justify-between text-xs mb-2">
                      <span className="text-gray-500 uppercase font-bold tracking-widest">Reliability</span>
                      <span className={`${statusInfo.color} font-mono font-bold`}>{(gateway.success_rate * 100).toFixed(1)}%</span>
                    </div>
                    <div className="w-full bg-gray-900 h-2 rounded-full overflow-hidden p-0.5">
                      <div 
                        className={`h-full rounded-full transition-all duration-1000 ease-out ${
                          gateway.success_rate > 0.9 ? 'bg-green-500' : gateway.success_rate > 0.7 ? 'bg-yellow-500' : 'bg-red-500'
                        }`}
                        style={{ width: `${gateway.success_rate * 100}%` }}
                      ></div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-white/5 p-3 rounded-xl border border-white/5">
                      <p className="text-[10px] text-gray-500 uppercase font-bold tracking-widest mb-1 text-center">Avg Latency</p>
                      <p className="text-xl font-mono text-indigo-400 text-center font-bold">{Math.round(gateway.avg_latency_ms)}<span className="text-[10px] ml-0.5 opacity-50 uppercase">ms</span></p>
                    </div>
                    <div className="bg-white/5 p-3 rounded-xl border border-white/5">
                      <p className="text-[10px] text-gray-500 uppercase font-bold tracking-widest mb-1 text-center">P95 Burst</p>
                      <p className="text-xl font-mono text-pink-400 text-center font-bold">{(gateway as any).p95_latency_ms ? Math.round((gateway as any).p95_latency_ms) : '-'}<span className="text-[10px] ml-0.5 opacity-50 uppercase">ms</span></p>
                    </div>
                  </div>

                  <div className="pt-4 border-t border-white/5 flex justify-between items-center">
                    <div className="flex flex-col">
                      <span className="text-[10px] text-gray-600 uppercase font-bold tracking-widest">Failure Rate</span>
                      <span className="text-xs font-mono text-red-400/70">{(gateway as any).error_count} ERRORS</span>
                    </div>
                    <div className="text-right">
                      <span className="text-[10px] text-gray-600 uppercase font-bold tracking-widest block">Status Ticked</span>
                      <span className="text-xs text-gray-400 font-mono">
                        {gateway.last_checked_at ? new Date(gateway.last_checked_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'WAITING'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {error && (
        <div className="mt-8 p-4 bg-red-900/20 border border-red-500/20 text-red-400 rounded-2xl flex items-start space-x-3">
          <AlertTriangle size={20} className="mt-0.5 flex-shrink-0" />
          <div>
            <p className="font-bold text-sm uppercase tracking-wider">System Link Disrupted</p>
            <p className="text-xs opacity-80">{error}</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default GatewayHealth;
