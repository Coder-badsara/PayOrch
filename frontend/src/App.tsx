import React, { Component, type ErrorInfo, type ReactNode } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import PaymentSimulator from './pages/PaymentSimulator';
import WebhookLogs from './pages/WebhookLogs';
import GatewayHealth from './pages/GatewayHealth';
import Settings from './pages/Settings';

class ErrorBoundary extends Component<{ children: ReactNode }, { hasError: boolean, error: Error | null }> {
  constructor(props: { children: ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-gray-900 text-white p-20 flex flex-col items-center justify-center">
          <h1 className="text-4xl font-bold mb-4">Something went wrong.</h1>
          <pre className="bg-black p-4 rounded text-red-400 overflow-auto max-w-full">
            {this.state.error?.toString()}
          </pre>
          <button 
            onClick={() => window.location.reload()}
            className="mt-8 bg-indigo-600 px-6 py-2 rounded-lg"
          >
            Reload Page
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

const App: React.FC = () => {
  return (
    <ErrorBoundary>
      <Router>
        <Layout>
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/simulator" element={<PaymentSimulator />} />
            <Route path="/webhooks" element={<WebhookLogs />} />
            <Route path="/health" element={<GatewayHealth />} />
            <Route path="/settings" element={<Settings />} />
          </Routes>
        </Layout>
      </Router>
    </ErrorBoundary>
  );
};

export default App;
