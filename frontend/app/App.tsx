import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { Login } from './components/auth/Login';
import { Register } from './components/auth/Register';
import { AdminLogin } from './components/auth/AdminLogin';
import { AdminDashboard } from './components/AdminDashboard';
import { RelayEnvironmentProvider, useLazyLoadQuery } from 'react-relay';
import { environment } from './relay';
import { PIXTransaction } from './components/PIXTransaction';
import { GraphQLResponseViewer } from './components/GraphQLResponseViewer';
import TokenCounter from './components/TokenCounter';
import Toast from './components/Toast';
import { ValidWalletsInfo } from './components/ValidWalletsInfo';
import { useEffect, useState, Suspense } from 'react';
import { networkLogger } from './relay';
import { MAX_TOKENS } from './components/TokenCounter';
import { graphql } from 'relay-runtime';
import type { AppGetTokensQuery as AppGetTokensQueryType } from './__generated__/AppGetTokensQuery.graphql';

const GetTokensQuery = graphql`
  query AppGetTokensQuery {
    getTokens {
      tokens
      lastRefill
    }
  }
`;

const PrivateRoute = ({ children }: { children: React.ReactNode }) => {
  const token = localStorage.getItem('token');
  if (!token) {
    return <Navigate to="/" />;
  }
  return <>{children}</>;
};

const AdminRoute = ({ children }: { children: React.ReactNode }) => {
  const adminToken = localStorage.getItem('adminToken');
  if (!adminToken || adminToken !== 'admin-session') {
    return <Navigate to="/admin" />;
  }
  return <>{children}</>;
};

const Dashboard = () => {
  const [refreshKey, setRefreshKey] = useState(0);
  
  const data = useLazyLoadQuery<AppGetTokensQueryType>(
    GetTokensQuery, 
    {}, 
    { fetchPolicy: 'network-only', fetchKey: refreshKey }
  );
  const navigate = useNavigate();
  
  const [tokens, setTokens] = useState<number>(data?.getTokens?.tokens ?? 0);

  useEffect(() => {
    if (data?.getTokens) {
      setTokens(data.getTokens.tokens);
    }
  }, [data]);

  const handleLogout = () => {
    localStorage.removeItem('token');
    navigate('/');
  };

  const handleTokensUpdated = () => {
    setRefreshKey(prev => prev + 1);
  };

  const handleRefresh = () => {
    setRefreshKey(prev => prev + 1);
  };

  return (
    <div className="min-h-screen bg-gray-100">
      <div className="w-full flex justify-between items-center p-4 bg-white shadow-sm">
        <h1 className="text-2xl font-bold text-gray-800">PIX Dashboard</h1>
        <div className="flex space-x-4">
          <button
            onClick={handleRefresh}
            className="px-4 py-2 rounded bg-indigo-600 hover:bg-indigo-700 text-white font-medium"
          >
            Refresh
          </button>
          <button
            onClick={handleLogout}
            className="px-4 py-2 rounded bg-gray-200 hover:bg-gray-300 text-gray-700 font-medium border border-gray-300"
          >
            Logout
          </button>
        </div>
      </div>

      <div className="container mx-auto py-8 px-4">
        <div className="bg-white shadow-lg rounded-lg p-6 mb-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-bold">Available Tokens</h2>
            <TokenCounter current={tokens} max={MAX_TOKENS} />
          </div>
        </div>

        <div className="bg-white shadow-lg rounded-lg p-6">
          <h2 className="text-xl font-bold mb-6">PIX Transaction</h2>
          <ValidWalletsInfo />
          <div className="mt-6">
            <PIXTransaction onTokensUpdated={handleTokensUpdated} />
          </div>
        </div>
      </div>
    </div>
  );
};

const AppRoutes = () => {
  return (
    <>
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/admin" element={<AdminLogin />} />
        <Route
          path="/admin/dashboard"
          element={
            <AdminRoute>
              <Suspense fallback={
                <div className="min-h-screen bg-gray-100 flex flex-col items-center justify-center">
                  <div className="w-48 h-28 flex items-center justify-center text-gray-400 animate-pulse">
                    Loading admin data...
                  </div>
                </div>
              }>
                <AdminDashboard />
              </Suspense>
            </AdminRoute>
          }
        />
        <Route
          path="/dashboard"
          element={
            <PrivateRoute>
              <Suspense fallback={
                <div className="min-h-screen bg-gray-100 flex flex-col items-center justify-center">
                  <div className="w-48 h-28 flex items-center justify-center text-gray-400 animate-pulse">
                    Loading tokens...
                  </div>
                </div>
              }>
                <Dashboard />
              </Suspense>
            </PrivateRoute>
          }
        />
      </Routes>
    </>
  );
};

export default function App() {
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = networkLogger.addListener((data) => {
      const errors = data?.response?.errors;
      if (errors && Array.isArray(errors)) {
        const rateLimitError = errors.find((e: any) =>
          (e.message && e.message.toLowerCase().includes('rate limit')) ||
          (e.message && e.message.toLowerCase().includes('429'))
        );
        if (rateLimitError) {
          setToast('Limite de requisições atingido. Tente novamente em instantes.');
        }
      }
    });
    return () => unsubscribe();
  }, []);

  return (
    <RelayEnvironmentProvider environment={environment}>
      <Router>
        <AppRoutes />
        <GraphQLResponseViewer />
        {toast && <Toast message={toast} onClose={() => setToast(null)} />}
      </Router>
    </RelayEnvironmentProvider>
  );
}