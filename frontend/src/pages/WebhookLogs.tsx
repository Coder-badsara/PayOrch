import React, { useEffect, useState } from 'react';
import { getWebhookLogs } from '../api/api';
import { format } from 'date-fns';
import { RefreshCcw, Webhook, CheckCircle, XCircle, AlertTriangle, Calendar, Filter } from 'lucide-react';
import CustomDatePicker from '../components/CustomDatePicker';

const WebhookLogs: React.FC = () => {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filter state
  const [gateway, setGateway] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  
  // Pagination state
  const [page, setPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const pageSize = 10;

  const fetchLogs = async (pageNumber = page) => {
    setLoading(true);
    const startTime = Date.now();
    try {
      const response = await getWebhookLogs({
        gateway: gateway || undefined,
        start_date: startDate || undefined,
        end_date: endDate || undefined,
        page: pageNumber,
      });

      const elapsed = Date.now() - startTime;
      const remaining = Math.max(0, 600 - elapsed);
      if (remaining > 0) await new Promise(resolve => setTimeout(resolve, remaining));

      setLogs(Array.isArray(response.data.results) ? response.data.results : []);
      setTotalCount(response.data.count || 0);
      setError(null);
    } catch (err) {
      setError('Failed to fetch webhook logs');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setPage(1);
    fetchLogs(1);
  }, [gateway, startDate, endDate]);

  useEffect(() => {
    fetchLogs(page);
  }, [page]);

  const totalPages = Math.ceil(totalCount / pageSize);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'PROCESSED':
      case 'SUCCESS': return <CheckCircle size={16} className="text-green-400" />;
      case 'FAILED': return <XCircle size={16} className="text-red-400" />;
      case 'DUPLICATE': return <AlertTriangle size={16} className="text-yellow-400" />;
      default: return <Webhook size={16} className="text-gray-400" />;
    }
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-2xl font-bold">Webhook Logs</h1>
          <p className="text-gray-400">Track and debug incoming webhook notifications.</p>
        </div>
        <button 
          onClick={fetchLogs}
          disabled={loading}
          className="flex items-center space-x-2 bg-indigo-600 hover:bg-indigo-700 active:scale-90 disabled:opacity-70 disabled:active:scale-100 px-4 py-2 rounded-lg transition-all duration-200 shadow-lg shadow-indigo-500/20"
        >
          <RefreshCcw size={18} className={`${loading ? 'animate-spin' : ''} transition-transform duration-500`} />
          <span className="font-medium tracking-wide">{loading ? 'Refreshing...' : 'Refresh'}</span>
        </button>
      </div>

      {/* Filters */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="relative">
          <label className="block text-xs text-gray-500 mb-1 ml-1 uppercase font-bold tracking-wider">Gateway</label>
          <div className="relative">
            <select 
              value={gateway}
              onChange={(e) => setGateway(e.target.value)}
              className="w-full bg-gray-950 border border-gray-800 rounded-lg py-2.5 px-4 focus:outline-none focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600/20 appearance-none text-sm transition-all"
            >
              <option value="">All Gateways</option>
              <option value="STRIPE">Stripe</option>
              <option value="RAZORPAY">Razorpay</option>
              <option value="PAYU">PayU</option>
              <option value="UPI">UPI</option>
            </select>
            <Filter size={14} className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-600 pointer-events-none" />
          </div>
        </div>
        
        <CustomDatePicker 
          label="Start Date"
          value={startDate}
          onChange={setStartDate}
          maxDate={new Date()}
        />

        <CustomDatePicker 
          label="End Date"
          value={endDate}
          onChange={setEndDate}
          maxDate={new Date()}
        />

        <div className="flex items-end">
          <button 
            onClick={() => { setGateway(''); setStartDate(''); setEndDate(''); }}
            className="w-full bg-gray-900 hover:bg-gray-800 text-gray-400 hover:text-white py-2.5 px-4 rounded-lg border border-gray-800 hover:border-gray-700 transition-all text-sm font-medium"
          >
            Clear Filters
          </button>
        </div>
      </div>

      <div className="space-y-4">
        {loading && logs.length === 0 ? (
          <div className="text-center py-20 text-gray-500">Loading logs...</div>
        ) : logs.length === 0 ? (
          <div className="text-center py-20 text-gray-500">No webhooks received yet.</div>
        ) : (
          logs.map((log) => (
            <div key={log.id} className="bg-gray-950 border border-gray-800 rounded-xl overflow-hidden">
              <div className="flex items-center justify-between p-4 bg-gray-900/50 border-b border-gray-800">
                <div className="flex items-center space-x-4">
                  <div className="bg-gray-800 p-2 rounded-lg">
                    {getStatusIcon(log.status)}
                  </div>
                  <div>
                    <div className="flex items-center space-x-2">
                      <span className="font-bold text-sm uppercase tracking-wider">{log.gateway_name}</span>
                      <span className="text-gray-600">•</span>
                      <span className="text-indigo-400 text-sm font-mono">{log.event_type}</span>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      ID: {log.id} • {format(new Date(log.created_at), 'MMM d, yyyy HH:mm:ss')}
                    </p>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-tighter ${
                    log.signature_valid ? 'bg-green-900/30 text-green-400' : 'bg-red-900/30 text-red-400'
                  }`}>
                    {log.signature_valid ? 'SIG VALID' : 'SIG INVALID'}
                  </span>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-tighter bg-gray-800 text-gray-400`}>
                    {log.status}
                  </span>
                </div>
              </div>
              <div className="p-4">
                <details className="group">
                  <summary className="text-xs text-indigo-400 cursor-pointer hover:text-indigo-300 list-none flex items-center space-x-1">
                    <span className="group-open:rotate-90 transition-transform inline-block">▶</span>
                    <span>View Raw Payload</span>
                  </summary>
                  <pre className="mt-4 bg-black/40 p-4 rounded text-xs overflow-auto font-mono text-gray-400 border border-gray-800">
                    {JSON.stringify(log.raw_payload, null, 2)}
                  </pre>
                </details>
                {log.processing_error && (
                  <div className="mt-4 p-3 bg-red-900/10 border border-red-900/30 rounded-lg">
                    <p className="text-xs text-red-400 font-mono">{log.processing_error}</p>
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Pagination */}
      {totalCount > 0 && (
        <div className="mt-6 flex items-center justify-between bg-gray-950 border border-gray-800 rounded-xl p-4">
          <div className="text-sm text-gray-500">
            Showing <span className="font-medium text-gray-300">{(page - 1) * pageSize + 1}</span> to <span className="font-medium text-gray-300">{Math.min(page * pageSize, totalCount)}</span> of <span className="font-medium text-gray-300">{totalCount}</span> logs
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1 || loading}
              className="px-4 py-2 bg-gray-900 border border-gray-800 rounded-lg text-sm font-medium hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Previous
            </button>
            <div className="px-4 text-sm font-medium text-gray-400">
              Page {page} of {totalPages || 1}
            </div>
            <button
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page === totalPages || loading}
              className="px-4 py-2 bg-gray-900 border border-gray-800 rounded-lg text-sm font-medium hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Next
            </button>
          </div>
        </div>
      )}
      
      {error && (
        <div className="mt-4 p-4 bg-red-900/20 border border-red-900/50 text-red-400 rounded-lg">
          {error}
        </div>
      )}
    </div>
  );
};

export default WebhookLogs;
