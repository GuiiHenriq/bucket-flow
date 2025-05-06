import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { Login } from './components/auth/Login';
import { Register } from './components/auth/Register';
import { RelayEnvironmentProvider, useLazyLoadQuery } from 'react-relay';
import { environment } from './relay';
import { PIXTransaction } from './components/PIXTransaction';
import { GraphQLResponseViewer } from './components/GraphQLResponseViewer';
import TokenCounter from './components/TokenCounter';
import Toast from './components/Toast';
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

const Dashboard = () => {
  const data = useLazyLoadQuery<AppGetTokensQueryType>(
    GetTokensQuery, 
    {}, 
    { fetchPolicy: 'network-only' }
  );
  const navigate = useNavigate();
  
  const [tokens, setTokens] = useState<number>(data?.getTokens?.tokens ?? 0);

  const handleLogout = () => {
    localStorage.removeItem('token');
    navigate('/');
  };

  const handleTokensUpdated = (newTokens: number) => {
    setTokens(newTokens);
  };

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col items-center justify-center">
      <div className="w-full flex justify-end items-center p-4 bg-white shadow-sm">
        <button
          onClick={handleLogout}
          className="ml-4 px-4 py-2 rounded bg-gray-200 hover:bg-gray-300 text-gray-700 font-medium border border-gray-300"
        >
          Logout
        </button>
      </div>
      <div className="flex flex-col items-center justify-center gap-8 w-full max-w-lg mx-auto">
        <TokenCounter current={tokens} max={MAX_TOKENS} />
        <h1 className="text-3xl font-bold text-center mb-4">PIX Transaction</h1>
        <PIXTransaction onTokensUpdated={handleTokensUpdated} />
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
        <Route
          path="/dashboard"
          element={
            <PrivateRoute>
              <Suspense fallback={
                <div className="min-h-screen bg-gray-100 flex flex-col items-center justify-center">
                  <div className="w-48 h-28 flex items-center justify-center text-gray-400 animate-pulse">
                    Carregando tokens...
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