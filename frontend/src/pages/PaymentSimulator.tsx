import React, { useState } from 'react';
import { createPayment, updatePaymentStatus } from '../api/api';
import { Send, AlertCircle, CheckCircle2, RefreshCcw, CreditCard } from 'lucide-react';

type ApiError = {
  code?: string;
  message?: string;
};

type PaymentResponse = {
  payment_id?: string;
  id?: string;
  status?: string;
  gateway?: string;
  gateway_order_id?: string;
  checkout_payload?: Record<string, unknown>;
  replayed?: boolean;
};

const PaymentSimulator: React.FC = () => {
  const generateUUID = () => {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
      return crypto.randomUUID();
    }
    return Math.random().toString(36).substring(2) + Date.now().toString(36);
  };

  const [formData, setFormData] = useState({
    amount: '500',
    currency: 'INR',
    idempotencyKey: generateUUID(),
    preferred_gateway: '',
  });
  const [loading, setLoading] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [response, setResponse] = useState<PaymentResponse | null>(null);
  const [error, setError] = useState<ApiError | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setResponse(null);

    try {
      const res = await createPayment({
        amount: Math.round(parseFloat(formData.amount) * 100),
        currency: formData.currency,
        idempotencyKey: formData.idempotencyKey,
        metadata: {
          preferred_gateway: formData.preferred_gateway
        }
      });
      setResponse(res.data);
      // Reset UUID for next attempt
      setFormData(prev => ({ ...prev, idempotencyKey: generateUUID() }));
    } catch (err: any) {
      console.error('Payment initiation error:', err);
      const errorData = err.response?.data;
      if (errorData?.error?.message) {
        setError({
          code: errorData.error.code,
          message: errorData.error.message,
        });
      } else if (typeof errorData === 'object' && errorData) {
        setError({
          code: 'API_ERROR',
          message: JSON.stringify(errorData),
        });
      } else {
        setError({
          code: 'REQUEST_FAILED',
          message: err.message || 'Failed to initiate payment',
        });
      }
    } finally {
      setLoading(false);
    }
  };

  const handleStatusUpdate = async (newStatus: string) => {
    if (!response) return;
    const paymentId = response.payment_id || response.id;
    if (!paymentId) return;

    setUpdating(true);
    try {
      const res = await updatePaymentStatus(paymentId, newStatus);
      // Ensure we preserve the routing_history if the update doesn't return it
      setResponse(prev => ({
        ...prev,
        ...res.data,
        routing_history: (prev as any)?.routing_history
      }));
    } catch (err: any) {
      console.error('Status update error:', err);
      alert('Failed to update status: ' + (err.response?.data?.error || err.message));
    } finally {
      setUpdating(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold">Payment Simulator</h1>
        <p className="text-gray-400">Test the payment flow and routing logic.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Form ... rest same ... */}
        <div className="bg-gray-950 border border-gray-800 rounded-xl p-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-1">Amount</label>
              <input 
                type="number" 
                step="0.01"
                value={formData.amount}
                onChange={(e) => setFormData({...formData, amount: e.target.value})}
                className="w-full bg-gray-900 border border-gray-800 rounded-lg py-2 px-4 focus:outline-none focus:border-indigo-600"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-1">Currency</label>
              <select 
                value={formData.currency}
                onChange={(e) => setFormData({...formData, currency: e.target.value})}
                className="w-full bg-gray-900 border border-gray-800 rounded-lg py-2 px-4 focus:outline-none focus:border-indigo-600"
              >
                <option value="INR">INR</option>
                <option value="USD">USD</option>
                <option value="EUR">EUR</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-1">Payment ID</label>
              <input 
                type="text" 
                value={formData.idempotencyKey}
                onChange={(e) => setFormData({...formData, idempotencyKey: e.target.value as any})}
                className="w-full bg-gray-900 border border-gray-800 rounded-lg py-2 px-4 focus:outline-none focus:border-indigo-600 font-mono text-xs"
                required
              />
              <p className="mt-1 text-xs text-gray-500">Used as the idempotency key for this request.</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-1">Preferred Gateway (Optional)</label>
              <select 
                value={formData.preferred_gateway}
                onChange={(e) => setFormData({...formData, preferred_gateway: e.target.value})}
                className="w-full bg-gray-900 border border-gray-800 rounded-lg py-2 px-4 focus:outline-none focus:border-indigo-600"
              >
                <option value="">Auto-Route (Recommended)</option>
                <option value="STRIPE">Stripe</option>
                <option value="RAZORPAY">Razorpay</option>
                <option value="PAYU">PayU</option>
                <option value="UPI">UPI (Simulated)</option>
              </select>
            </div>
            <button 
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center space-x-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-800 py-3 rounded-lg font-semibold transition-colors mt-6"
            >
              {loading ? <RefreshCcw size={20} className="animate-spin" /> : <Send size={20} />}
              <span>{loading ? 'Processing...' : 'Simulate Payment'}</span>
            </button>
          </form>
        </div>

        {/* Results & Actions */}
        <div className="space-y-4">
          <h2 className="text-lg font-semibold flex items-center space-x-2">
            <span>Result</span>
          </h2>
          
          {response && (
            <div className="bg-gray-950 border border-gray-800 rounded-xl p-4 mb-4">
              <p className="text-[10px] text-gray-500 uppercase font-bold tracking-widest mb-3">Manual Actions</p>
              <div className="grid grid-cols-3 gap-2">
                <button 
                  onClick={() => handleStatusUpdate('CAPTURED')}
                  disabled={updating}
                  className="flex items-center justify-center space-x-1 py-2 bg-green-600/10 hover:bg-green-600/20 text-green-400 text-xs font-bold rounded-lg border border-green-600/20 transition-all active:scale-95 disabled:opacity-50"
                >
                  <CheckCircle2 size={14} />
                  <span>SUCCESS</span>
                </button>
                <button 
                  onClick={() => handleStatusUpdate('FAILED')}
                  disabled={updating}
                  className="flex items-center justify-center space-x-1 py-2 bg-red-600/10 hover:bg-red-600/20 text-red-400 text-xs font-bold rounded-lg border border-red-600/20 transition-all active:scale-95 disabled:opacity-50"
                >
                  <AlertCircle size={14} />
                  <span>FAILED</span>
                </button>
                <button 
                  onClick={() => handleStatusUpdate('PROCESSING')}
                  disabled={updating}
                  className="flex items-center justify-center space-x-1 py-2 bg-yellow-600/10 hover:bg-yellow-600/20 text-yellow-400 text-xs font-bold rounded-lg border border-yellow-600/20 transition-all active:scale-95 disabled:opacity-50"
                >
                  <RefreshCcw size={14} />
                  <span>PENDING</span>
                </button>
              </div>
            </div>
          )}
          
          {!response && !error && !loading && (
            <div className="bg-gray-900/50 border border-dashed border-gray-800 rounded-xl p-10 flex flex-col items-center justify-center text-gray-500">
              <CreditCard size={48} className="mb-4 opacity-20" />
              <p>Response will appear here</p>
            </div>
          )}

          {loading && (
            <div className="bg-gray-950 border border-gray-800 rounded-xl p-6 animate-pulse">
              <div className="h-4 bg-gray-800 rounded w-1/2 mb-4"></div>
              <div className="h-20 bg-gray-800 rounded mb-4"></div>
              <div className="h-4 bg-gray-800 rounded w-3/4"></div>
            </div>
          )}

          {error && (
            <div className="bg-red-900/20 border border-red-900/50 rounded-xl p-6">
              <div className="flex items-center space-x-2 text-red-400 mb-2">
                <AlertCircle size={20} />
                <span className="font-semibold">{error.code || 'Error Occurred'}</span>
              </div>
              <p className="text-red-300 text-sm">{error.message}</p>
            </div>
          )}

          {response && (
            <div className={`transition-all duration-500 rounded-xl p-6 border ${
              response.status === 'CAPTURED' || response.status === 'SUCCESS'
                ? 'bg-green-900/20 border-green-900/50 text-green-400'
                : response.status === 'FAILED'
                ? 'bg-red-900/20 border-red-900/50 text-red-400'
                : 'bg-yellow-900/20 border-yellow-900/50 text-yellow-400'
            }`}>
              <div className="flex items-center space-x-2 mb-4">
                {response.status === 'CAPTURED' || response.status === 'SUCCESS' ? <CheckCircle2 size={20} /> :
                 response.status === 'FAILED' ? <AlertCircle size={20} /> : <RefreshCcw size={20} className="animate-spin-slow" />}
                <span className="font-semibold">
                  {response.status === 'CAPTURED' || response.status === 'SUCCESS' ? 'Payment Successful' :
                   response.status === 'FAILED' ? 'Payment Failed' : 'Payment Processing'}
                </span>
              </div>
              <div className="space-y-3">
                <div className="flex justify-between text-sm opacity-80">
                  <span className="font-medium">Payment ID:</span>
                  <span className="font-mono">{response.payment_id || response.id}</span>
                </div>
                <div className="flex justify-between text-sm opacity-80">
                  <span className="font-medium">Gateway:</span>
                  <span className="bg-black/20 px-2 rounded text-xs uppercase font-bold">{response.gateway}</span>
                </div>
                <div className="flex justify-between text-sm opacity-80">
                  <span className="font-medium">Status:</span>
                  <span className="font-bold uppercase tracking-wider">{response.status}</span>
                </div>
                {response.replayed !== undefined && (
                  <div className="flex justify-between text-sm opacity-80">
                    <span className="font-medium">Replayed:</span>
                    <span>{response.replayed ? 'Yes' : 'No'}</span>
                  </div>
                )}
              </div>
              
              <div className="mt-6 pt-4 border-t border-current/10">
                <p className="text-xs opacity-70 mb-2 font-bold uppercase tracking-widest">Routing Analysis</p>
                <div className="bg-black/40 p-3 rounded text-xs font-medium italic">
                  {(() => {
                    const history = (response as any).routing_history || [];
                    if (history.length > 1) {
                      const failed = history.filter((h: any) => h.status === 'FAILED').map((h: any) => h.gateway);
                      const success = history.find((h: any) => h.status === 'SUCCESS')?.gateway;
                      return `${failed.join(', ')} failed to connect or error while connecting payment gateway routed to ${success}`;
                    } else if (history.length === 1) {
                      return `Payment successfully initiated with ${history[0].gateway}`;
                    }
                    return `Payment routed to ${response.gateway}`;
                  })()}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PaymentSimulator;
