// @ts-ignore
import html2pdf from 'html2pdf.js';
import type { Transaction } from '../types';

export const generateReceiptPDF = async (transaction: Transaction) => {
  // Helper to generate consistent mock data from paymentId and Date
  const dateObj = new Date(transaction.created_at);
  const dateKey = `${dateObj.getFullYear()}-${dateObj.getMonth()}-${dateObj.getDate()}`;
  
  // Date-based prefix (same for whole day)
  let dateHash = 0;
  for (let i = 0; i < dateKey.length; i++) {
    dateHash = dateKey.charCodeAt(i) + ((dateHash << 5) - dateHash);
  }
  const prefix = Math.abs(dateHash).toString().padStart(4, '0').substring(0, 4);

  // Transaction-based suffix
  let idHash = 0;
  const id = transaction.id;
  for (let i = 0; i < id.length; i++) {
    idHash = id.charCodeAt(i) + ((idHash << 5) - idHash);
  }
  const suffix = Math.abs(idHash).toString().padStart(8, '0').substring(0, 8);
  const refNumber = `${prefix}${suffix}`;

  // Mock Senders
  const senders = ['Antonio Roberto', 'Sarah Jenkins', 'Michael Chen', 'Elena Rodriguez', 'David Smith', 'Priya Sharma'];
  const senderName = senders[Math.abs(idHash) % senders.length];

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

  const receiptHtml = `
    <div style="font-family: Arial, sans-serif; background-color: #111827; padding: 40px; color: white;">
      <div style="max-width: 400px; margin: 0 auto; background-color: #1a1c23; border-radius: 24px; padding: 32px; border: 1px solid #374151;">
        <div style="text-align: center; margin-bottom: 24px;">
          <h1 style="margin: 0; font-size: 24px;">Payment Success!</h1>
          <p style="color: #9ca3af; font-size: 14px; margin-top: 4px;">Your payment has been successfully done.</p>
        </div>
        
        <div style="border-top: 1px solid #374151; margin: 20px 0;"></div>
        
        <div style="text-align: center; margin-bottom: 32px;">
          <p style="color: #9ca3af; font-size: 10px; text-transform: uppercase; letter-spacing: 2px; font-weight: bold; margin-bottom: 4px;">Total Payment</p>
          <h2 style="margin: 0; font-size: 40px; font-weight: 900;">${formattedAmount}</h2>
        </div>
        
        <table style="width: 100%; border-spacing: 8px;">
          <tr>
            <td style="background-color: #111827; padding: 12px; border-radius: 12px; border: 1px solid #374151; width: 50%;">
              <p style="color: #9ca3af; font-size: 9px; text-transform: uppercase; margin: 0 0 4px 0;">Payment ID</p>
              <p style="margin: 0; font-size: 12px; font-weight: bold; font-family: monospace;">${transaction.id}</p>
            </td>
            <td style="background-color: #111827; padding: 12px; border-radius: 12px; border: 1px solid #374151; width: 50%;">
              <p style="color: #9ca3af; font-size: 9px; text-transform: uppercase; margin: 0 0 4px 0;">Payment Time</p>
              <p style="margin: 0; font-size: 12px; font-weight: bold;">${formattedDate}</p>
            </td>
          </tr>
          <tr>
            <td style="background-color: #111827; padding: 12px; border-radius: 12px; border: 1px solid #374151;">
              <p style="color: #9ca3af; font-size: 9px; text-transform: uppercase; margin: 0 0 4px 0;">Payment Method</p>
              <p style="margin: 0; font-size: 12px; font-weight: bold;">${transaction.gateway_name || 'BANK'}</p>
            </td>
            <td style="background-color: #111827; padding: 12px; border-radius: 12px; border: 1px solid #374151;">
              <p style="color: #9ca3af; font-size: 9px; text-transform: uppercase; margin: 0 0 4px 0;">Sender Name</p>
              <p style="margin: 0; font-size: 12px; font-weight: bold;">${senderName}</p>
            </td>
          </tr>
        </table>
        
        <div style="text-align: center; margin-top: 32px; color: #9ca3af; font-size: 12px;">
          Thank you for your payment.
        </div>
      </div>
    </div>
  `;

  const options = {
    margin: 0,
    filename: `Receipt-${refNumber}.pdf`,
    image: { type: 'jpeg', quality: 0.98 },
    html2canvas: { 
      scale: 2, 
      useCORS: true,
      backgroundColor: '#111827'
    },
    jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
  };

  await html2pdf().from(receiptHtml).set(options).save();
};
