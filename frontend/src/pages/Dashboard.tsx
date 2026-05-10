import React, { useEffect, useState } from 'react';
import { getTransactions } from '../api/api';
import type { Transaction } from '../types';
import { format } from 'date-fns';
import { RefreshCcw, Search, Filter, Calendar } from 'lucide-react';
import CustomDatePicker from '../components/CustomDatePicker';

const Dashboard: React.FC = () => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
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

  const fetchTransactions = async (pageNumber = page) => {
    setLoading(true);
    const startTime = Date.now();
    try {
      const response = await getTransactions({
        gateway: gateway || undefined,
        start_date: startDate || undefined,
        end_date: endDate || undefined,
        page: pageNumber,
      });
      
      const elapsed = Date.now() - startTime;
      const remaining = Math.max(0, 600 - elapsed);
      if (remaining > 0) await new Promise(resolve => setTimeout(resolve, remaining));

      // DRF Paginated response has 'results' and 'count'
      const data = response.data.results;
      setTransactions(Array.isArray(data) ? data : []);
      setTotalCount(response.data.count || 0);
      setError(null);
    } catch (err) {
      setError('Failed to fetch transactions');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setPage(1);
    fetchTransactions(1);
  }, [gateway, startDate, endDate]);

  useEffect(() => {
    fetchTransactions(page);
  }, [page]);

  const totalPages = Math.ceil(totalCount / pageSize);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'SUCCESS':
      case 'CAPTURED': 
        return 'text-green-400 bg-green-400/10';
      case 'FAILED': 
        return 'text-red-400 bg-red-400/10';
      case 'PENDING':
      case 'PROCESSING':
      case 'PENDING_GATEWAY':
      case 'INITIATED':
        return 'text-yellow-400 bg-yellow-400/10';
      default: 
        return 'text-gray-400 bg-gray-400/10';
    }
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-2xl font-bold">Transactions</h1>
          <p className="text-gray-400">Manage and monitor all payment transactions.</p>
        </div>
        <button 
          onClick={fetchTransactions}
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

      {/* Table */}
      <div className="bg-gray-950 border border-gray-800 rounded-xl overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-gray-900/50 border-b border-gray-800 text-gray-400 text-sm uppercase">
            <tr>
              <th className="px-6 py-4 font-medium">Payment ID</th>
              <th className="px-6 py-4 font-medium">Amount</th>
              <th className="px-6 py-4 font-medium">Gateway</th>
              <th className="px-6 py-4 font-medium">Status</th>
              <th className="px-6 py-4 font-medium">Created</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-800">
            {loading && transactions.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-6 py-10 text-center text-gray-500">Loading transactions...</td>
              </tr>
            ) : transactions.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-6 py-10 text-center text-gray-500">No transactions found.</td>
              </tr>
            ) : (
              transactions.map((tx) => (
                <tr key={tx.id} className="hover:bg-gray-900/50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="font-mono text-sm">{tx.id.substring(0, 8)}...</div>
                    <div className="text-[10px] text-gray-500 font-mono mt-0.5">{tx.idempotency_key.substring(0, 12)}...</div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="font-semibold">{tx.amount / 100}</span> <span className="text-xs text-gray-500">{tx.currency}</span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="bg-gray-800 px-2 py-1 rounded text-xs uppercase tracking-wider">
                      {tx.gateway_name}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(tx.status)}`}>
                      {tx.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-gray-400 text-sm">
                    {format(new Date(tx.created_at), 'MMM d, yyyy HH:mm')}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalCount > 0 && (
        <div className="mt-6 flex items-center justify-between bg-gray-950 border border-gray-800 rounded-xl p-4">
          <div className="text-sm text-gray-500">
            Showing <span className="font-medium text-gray-300">{(page - 1) * pageSize + 1}</span> to <span className="font-medium text-gray-300">{Math.min(page * pageSize, totalCount)}</span> of <span className="font-medium text-gray-300">{totalCount}</span> transactions
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

export default Dashboard;
