import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { graphql, useLazyLoadQuery } from 'react-relay';
import type { AdminDashboardQuery as AdminDashboardQueryType } from '../__generated__/AdminDashboardQuery.graphql';

const GetAllTokensQuery = graphql`
  query AdminDashboardQuery {
    getAllTokens {
      userId
      tokens
      lastRefill
    }
  }
`;

export const AdminDashboard = () => {
  const [refreshKey, setRefreshKey] = useState(0);
  const navigate = useNavigate();
  const [isAuthorized, setIsAuthorized] = useState(false);

  useEffect(() => {
    const adminToken = localStorage.getItem('adminToken');
    if (!adminToken || adminToken !== 'admin-session') {
      setIsAuthorized(false);
      navigate('/admin');
    } else {
      setIsAuthorized(true);
    }
  }, [navigate]);

  const data = useLazyLoadQuery<AdminDashboardQueryType>(
    GetAllTokensQuery,
    {},
    { fetchPolicy: 'network-only', fetchKey: refreshKey }
  );

  const handleRefresh = () => {
    setRefreshKey(prev => prev + 1);
  };

  const handleLogout = () => {
    localStorage.removeItem('adminToken');
    navigate('/admin');
  };

  const buckets = data?.getAllTokens || [];

  if (!isAuthorized) {
    return (
      <div className="min-h-screen bg-gray-100 flex flex-col items-center justify-center">
        <div className="bg-yellow-100 border border-yellow-400 text-yellow-700 px-4 py-3 rounded mb-4">
          <p>Administrator authentication required.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <div className="w-full flex justify-between items-center p-4 bg-white shadow-sm">
        <h1 className="text-2xl font-bold text-gray-800">Admin Dashboard</h1>
        <div className="flex space-x-4">
          <button
            onClick={handleRefresh}
            className="px-4 py-2 rounded bg-indigo-600 hover:bg-indigo-700 text-white font-medium"
          >
            Refresh Data
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
        <div className="bg-white shadow-lg rounded-lg p-6 mb-8">
          <h2 className="text-xl font-bold mb-6">User Token Buckets</h2>

          {buckets.length === 0 ? (
            <div className="text-center py-4 text-gray-500">No token buckets found</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full bg-white">
                <thead>
                  <tr>
                    <th className="py-2 px-4 border-b border-gray-200 bg-gray-50 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      User ID
                    </th>
                    <th className="py-2 px-4 border-b border-gray-200 bg-gray-50 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      Tokens
                    </th>
                    <th className="py-2 px-4 border-b border-gray-200 bg-gray-50 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      Last Refill
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {buckets.map((bucket, index) => {
                    const tokens = bucket?.tokens ?? 0;
                    const lastRefill = bucket?.lastRefill;
                    
                    return (
                      <tr key={bucket?.userId || index} className={index % 2 === 0 ? 'bg-gray-50' : 'bg-white'}>
                        <td className="py-2 px-4 border-b border-gray-200">
                          {bucket?.userId || 'Unknown'}
                        </td>
                        <td className="py-2 px-4 border-b border-gray-200">
                          <span
                            className={`inline-block rounded-full px-3 py-1 text-sm font-semibold ${
                              tokens <= 2
                                ? 'bg-red-100 text-red-800'
                                : tokens <= 5
                                ? 'bg-yellow-100 text-yellow-800'
                                : 'bg-green-100 text-green-800'
                            }`}
                          >
                            {tokens}
                          </span>
                        </td>
                        <td className="py-2 px-4 border-b border-gray-200">
                          {lastRefill
                            ? new Date(lastRefill).toLocaleString()
                            : 'N/A'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}; 