import React, { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { getTransactionDetails } from '../api/api';
import { generateReceiptPDF } from '../api/pdf';
import type { Transaction } from '../types';
import { Check, Download, ArrowLeft, Calendar, CreditCard, User, Hash, Loader2, Timer } from 'lucide-react';

const PaymentSuccess: React.FC = () => {
  const { paymentId } = useParams<{ paymentId: string }>();
  const navigate = useNavigate();
  const [transaction, setTransaction] = useState<Transaction | null>(null);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);
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
          navigate('/');
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
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
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

  // Helper to generate consistent mock data from paymentId and Date
  const getMockData = (id: string, dateStr: string) => {
    // Generate prefix based on DATE (same for whole day)
    const dateObj = new Date(dateStr);
    const dateKey = `${dateObj.getFullYear()}-${dateObj.getMonth()}-${dateObj.getDate()}`;
    let dateHash = 0;
    for (let i = 0; i < dateKey.length; i++) {
      dateHash = dateKey.charCodeAt(i) + ((dateHash << 5) - dateHash);
    }
    const prefix = Math.abs(dateHash).toString().padStart(4, '0').substring(0, 4);

    // Generate remainder based on Transaction ID
    let idHash = 0;
    for (let i = 0; i < id.length; i++) {
      idHash = id.charCodeAt(i) + ((idHash << 5) - idHash);
    }
    const suffix = Math.abs(idHash).toString().padStart(8, '0').substring(0, 8);
    
    // 12-digit numeric reference (4 prefix + 8 suffix)
    const refNumber = `${prefix}${suffix}`;
    
    // Mock Senders
    const senders = ['Antonio Roberto', 'Sarah Jenkins', 'Michael Chen', 'Elena Rodriguez', 'David Smith', 'Priya Sharma'];
    const senderName = senders[Math.abs(idHash) % senders.length];
    
    return { refNumber, senderName };
  };

  const { refNumber, senderName } = getMockData(transaction.id, transaction.created_at);

  const handleDownloadPDF = async () => {
    if (!transaction) return;
    setDownloading(true);
    try {
      await generateReceiptPDF(transaction);
    } catch (err: any) {
      console.error('PDF generation failed:', err);
      alert(`Failed to generate PDF: ${err.message}`);
    } finally {
      setDownloading(false);
    }
  };

  const getGatewayColor = (name: string) => {
    switch (name.toUpperCase()) {
      case 'STRIPE': return 'bg-indigo-500/20 text-indigo-400 border-indigo-500/30';
      case 'RAZORPAY': return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
      case 'PAYU': return 'bg-green-500/20 text-green-400 border-green-500/30';
      case 'UPI': return 'bg-orange-500/20 text-orange-400 border-orange-500/30';
      default: return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
    }
  };

  return (
    <div className="max-w-md mx-auto py-10">
      <div className="relative">
        {/* Success Icon Badge */}
        <div className="absolute -top-6 left-1/2 -translate-x-1/2 z-10">
          <div className="bg-green-500 rounded-full p-3 shadow-lg shadow-green-500/30">
            <Check size={32} className="text-white" strokeWidth={3} />
          </div>
        </div>

        {/* Receipt Card */}
        <div 
          className="bg-[#1a1c23] text-white rounded-3xl overflow-hidden shadow-2xl relative pt-12 pb-10 px-8"
        >
          <div className="text-center mb-8">
            <h1 className="text-2xl font-bold mb-1 font-sans tracking-tight">Payment Success!</h1>
            <p className="text-gray-400 text-sm">Your payment has been successfully done.</p>
          </div>

          <div className="border-t border-gray-800/50 my-6"></div>

          <div className="text-center mb-10">
            <p className="text-gray-400 text-[10px] mb-1 uppercase tracking-[0.2em] font-bold">Total Payment</p>
            <h2 className="text-5xl font-black tracking-tight">{formattedAmount}</h2>
          </div>

          <div className="grid grid-cols-2 gap-4 mb-10">
            <div className="bg-gray-900/40 p-4 rounded-2xl border border-gray-800/50">
              <div className="flex items-center text-gray-400 mb-2">
                <Hash size={12} className="mr-1.5" />
                <span className="text-[10px] uppercase font-bold tracking-widest opacity-60">Payment ID</span>
              </div>
              <p className="text-sm font-mono font-bold tracking-wider">{transaction.id}</p>
            </div>

            <div className="bg-gray-900/40 p-4 rounded-2xl border border-gray-800/50">
              <div className="flex items-center text-gray-400 mb-2">
                <Calendar size={12} className="mr-1.5" />
                <span className="text-[10px] uppercase font-bold tracking-widest opacity-60">Payment Time</span>
              </div>
              <p className="text-sm font-bold">{formattedDate}</p>
            </div>

            <div className="bg-gray-900/40 p-4 rounded-2xl border border-gray-800/50">
              <div className="flex items-center text-gray-400 mb-2">
                <CreditCard size={12} className="mr-1.5" />
                <span className="text-[10px] uppercase font-bold tracking-widest opacity-60">Payment Method</span>
              </div>
              <div className="flex">
                <span className={`text-[10px] font-black px-2 py-1 rounded-lg border ${getGatewayColor(transaction.gateway_name)}`}>
                  {transaction.gateway_name || 'BANK TRANSFER'}
                </span>
              </div>
            </div>

            <div className="bg-gray-900/40 p-4 rounded-2xl border border-gray-800/50">
              <div className="flex items-center text-gray-400 mb-2">
                <User size={12} className="mr-1.5" />
                <span className="text-[10px] uppercase font-bold tracking-widest opacity-60">Sender Name</span>
              </div>
              <p className="text-sm font-bold truncate">{senderName}</p>
            </div>
          </div>

          <div id="download-btn-container" className="flex justify-center">
            <button 
              onClick={handleDownloadPDF}
              disabled={downloading}
              className="flex items-center space-x-2 text-gray-400 hover:text-white transition-colors group disabled:opacity-50"
            >
              {downloading ? (
                <Loader2 size={18} className="animate-spin" />
              ) : (
                <Download size={18} className="group-hover:translate-y-0.5 transition-transform" />
              )}
              <span className="text-sm font-semibold">
                {downloading ? 'Generating PDF...' : 'Get PDF Receipt'}
              </span>
            </button>
          </div>
        </div>
      </div>

      <div className="mt-8 text-center pb-10">
        <p className="text-gray-500 text-xs mb-4 flex items-center justify-center">
          <Timer size={14} className="mr-1.5" />
          Auto-redirecting to dashboard in <span className="font-bold text-gray-400 mx-1">{countdown}s</span>
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

export default PaymentSuccess;
