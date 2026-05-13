import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000/v1';
const API_KEY = 'your-internal-api-key-here-12345678'; // Should be in .env but hardcoding for demo

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
    'X-API-Key': API_KEY,
  },
});

export const getTransactions = (params?: { gateway?: string; start_date?: string; end_date?: string; page?: number }) => 
  api.get('/payments/', { params: { ...params, _t: Date.now() } });
export const getGatewayHealth = () => api.get('/health/gateways/', { params: { _t: Date.now() } });
export const getWebhookLogs = (params?: { gateway?: string; start_date?: string; end_date?: string; page?: number }) => 
  api.get('/webhooks-logs/', { params: { ...params, _t: Date.now() } });
export const createPayment = (data: any) => api.post('/payments/', data);
export const updatePaymentStatus = (paymentId: string, status: string) => 
  api.post(`/payments/${paymentId}/update_status/`, { status });
export const resetGatewayCircuit = (gatewayName: string) => 
  api.post('/health/gateways/', { gateway_name: gatewayName, action: 'reset' });

export default api;
