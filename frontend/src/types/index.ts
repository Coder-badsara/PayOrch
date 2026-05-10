export interface Transaction {
  id: string;
  idempotency_key: string;
  amount: number;
  currency: string;
  status: 'INITIATED' | 'PENDING_GATEWAY' | 'PROCESSING' | 'SUCCESS' | 'FAILED' | 'REFUNDED' | 'CAPTURED';
  gateway_name: string;
  created_at: string;
  updated_at: string;
}

export interface GatewayHealth {
  gateway_name: string;
  status: 'HEALTHY' | 'DEGRADED' | 'UNHEALTHY' | 'CIRCUIT_OPEN';
  success_rate: number;
  avg_latency_ms: number;
  p95_latency_ms?: number;
  total_count: number;
  error_count: number;
  last_checked_at: string;
}

export interface WebhookLog {
  id: string;
  gateway_name: string;
  event_type: string;
  raw_payload: any;
  status: string;
  created_at: string;
}
