import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000/api/v1';
const API_KEY = 'your-internal-api-key-here-12345678'; // Should be in .env but hardcoding for demo

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
    'X-API-Key': API_KEY,
  },
});

export const getTransactions = (params?: { gateway?: string; start_date?: string; end_date?: string; page?: number }) => 
  api.get('/transactions/', { params: { ...params, _t: Date.now() } });

export const getGatewayHealth = () => 
  api.get('/gateways/', { params: { _t: Date.now() } });

export const getWebhookLogs = (params?: { gateway?: string; start_date?: string; end_date?: string; page?: number }) => 
  api.get('/webhooks-logs/', { params: { ...params, _t: Date.now() } });

export const createPayment = (data: any) => 
  api.post('/transactions/', data);

export const getTransactionDetails = (paymentId: string) => 
  api.get(`/transactions/${paymentId}/`);

export const updatePaymentStatus = (paymentId: string, status: string) => 
  api.post(`/transactions/${paymentId}/update_state/`, { state: status });

export const resetGatewayCircuit = (gatewayName: string) => 
  api.post('/gateways/reset/', { gateway: gatewayName });

export default api;
