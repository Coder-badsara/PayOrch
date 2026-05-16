import React, { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { getTransactionDetails } from '../api/api';
import type { Transaction } from '../types';
import { X, ArrowLeft, Calendar, CreditCard, Hash, AlertTriangle, RefreshCcw, Timer } from 'lucide-react';

const PaymentFailed: React.FC = () => {
  const { paymentId } = useParams<{ paymentId: string }>();
  const navigate = useNavigate();
  const [transaction, setTransaction] = useState<Transaction | null>(null);
  const [loading, setLoading] = useState(true);
  const [countdown, setCountdown] = useState(30);

  useEffect(() => {
    const fetchDetails = async () => {
      if (!paymentId) return;
      try {
        const res = await getTransactionDetails(paymentId);
        setTransaction(res.data);
      } catch (err) {
        console.error('Failed to fetch transaction details:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchDetails();
  }, [paymentId]);

  // Auto-redirect timer logic
  useEffect(() => {
    if (loading || !transaction) return;

    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          navigate('/simulator');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [loading, transaction, navigate]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600"></div>
      </div>
    );
  }

  if (!transaction) {
    return (
      <div className="text-center py-20">
        <h2 className="text-2xl font-bold text-red-500">Transaction Not Found</h2>
        <Link to="/simulator" className="mt-4 inline-flex items-center text-indigo-400 hover:text-indigo-300">
          <ArrowLeft size={16} className="mr-2" />
          Back to Simulator
        </Link>
      </div>
    );
  }

  const formattedAmount = new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: transaction.currency || 'INR',
    minimumFractionDigits: 0,
  }).format(transaction.amount / 100);

  const formattedDate = new Date(transaction.created_at).toLocaleString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <div className="max-w-md mx-auto py-10">
      <div className="relative">
        {/* Error Icon Badge */}
        <div className="absolute -top-6 left-1/2 -translate-x-1/2 z-10">
          <div className="bg-red-500 rounded-full p-3 shadow-lg shadow-red-500/30">
            <X size={32} className="text-white" strokeWidth={3} />
          </div>
        </div>

        {/* Status Card */}
        <div className="bg-[#1a1c23] text-white rounded-3xl overflow-hidden shadow-2xl relative pt-12 pb-10 px-8 border border-red-500/10">
          <div className="text-center mb-8">
            <h1 className="text-2xl font-bold mb-1 font-sans tracking-tight">Payment Failed</h1>
            <p className="text-gray-400 text-sm">We couldn't process your transaction.</p>
          </div>

          <div className="border-t border-gray-800/50 my-6"></div>

          <div className="text-center mb-10">
            <p className="text-gray-400 text-[10px] mb-1 uppercase tracking-[0.2em] font-bold">Transaction Amount</p>
            <h2 className="text-5xl font-black tracking-tight text-red-400">{formattedAmount}</h2>
          </div>

          <div className="grid grid-cols-2 gap-4 mb-10">
            <div className="bg-gray-900/40 p-4 rounded-2xl border border-gray-800/50">
              <div className="flex items-center text-gray-400 mb-2">
                <Hash size={12} className="mr-1.5" />
                <span className="text-[10px] uppercase font-bold tracking-widest opacity-60">Payment ID</span>
              </div>
              <p className="text-sm font-mono font-bold tracking-wider truncate">
                 {transaction.id}
              </p>
            </div>

            <div className="bg-gray-900/40 p-4 rounded-2xl border border-gray-800/50">
              <div className="flex items-center text-gray-400 mb-2">
                <Calendar size={12} className="mr-1.5" />
                <span className="text-[10px] uppercase font-bold tracking-widest opacity-60">Failed At</span>
              </div>
              <p className="text-sm font-bold">{formattedDate}</p>
            </div>

            <div className="bg-gray-900/40 p-4 rounded-2xl border border-gray-800/50">
              <div className="flex items-center text-gray-400 mb-2">
                <CreditCard size={12} className="mr-1.5" />
                <span className="text-[10px] uppercase font-bold tracking-widest opacity-60">Gateway</span>
              </div>
              <div className="flex">
                <span className="text-[10px] font-black px-2 py-1 rounded-lg border bg-gray-500/20 text-gray-400 border-gray-500/30 uppercase">
                  {transaction.gateway_name || 'N/A'}
                </span>
              </div>
            </div>

            <div className="bg-gray-900/40 p-4 rounded-2xl border border-gray-800/50">
              <div className="flex items-center text-gray-400 mb-2">
                <AlertTriangle size={12} className="mr-1.5 text-red-400" />
                <span className="text-[10px] uppercase font-bold tracking-widest opacity-60">Error Code</span>
              </div>
              <p className="text-sm font-bold text-red-400 uppercase">{transaction.status}</p>
            </div>
          </div>

          <div className="flex flex-col space-y-3">
             <Link 
              to="/simulator" 
              className="flex items-center justify-center space-x-2 bg-indigo-600 hover:bg-indigo-700 text-white py-3 rounded-xl font-bold transition-all"
            >
              <RefreshCcw size={18} />
              <span>Try Again</span>
            </Link>
          </div>
        </div>
      </div>

      <div className="mt-8 text-center pb-10">
        <p className="text-gray-500 text-xs mb-4 flex items-center justify-center">
          <Timer size={14} className="mr-1.5" />
          Auto-redirecting to simulator in <span className="font-bold text-gray-400 mx-1">{countdown}s</span>
        </p>
        <Link 
          to="/" 
          className="bg-gray-800 hover:bg-gray-700 text-white px-8 py-3 rounded-xl font-bold transition-all inline-flex items-center"
        >
          <ArrowLeft size={18} className="mr-2" />
          Back to Dashboard
        </Link>
      </div>
    </div>
  );
};

export default PaymentFailed;
