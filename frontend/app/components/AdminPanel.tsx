import { useState, useEffect } from "react";
import { graphql, useLazyLoadQuery } from "react-relay";
import type { AdminPanelQuery as AdminPanelQueryType } from "../__generated__/AdminPanelQuery.graphql";

const AdminGetAllTokensQuery = graphql`
  query AdminPanelQuery {
    getTokens {
      tokens
      lastRefill
    }
  }
`;

interface TokenBucket {
  tokens: number;
  lastRefill: string;
}

export function AdminPanel() {
  const [isAdmin, setIsAdmin] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const data = isAdmin
    ? useLazyLoadQuery<AdminPanelQueryType>(AdminGetAllTokensQuery, {})
    : null;

  useEffect(() => {
    const checkAdminStatus = () => {
      const token = localStorage.getItem("authToken");
      if (!token) {
        setIsAdmin(false);
        setError("Você precisa estar autenticado para acessar este painel");
        return;
      }

      setIsAdmin(true);
    };

    checkAdminStatus();
  }, []);

  if (error) {
    return (
      <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
        <p>{error}</p>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="bg-yellow-100 border border-yellow-400 text-yellow-700 px-4 py-3 rounded mb-4">
        <p>Acesso restrito a administradores.</p>
      </div>
    );
  }

  const tokenBucket: TokenBucket = data?.getTokens || {
    tokens: 0,
    lastRefill: "",
  };

  return (
    <div className="bg-white shadow-lg rounded-lg p-6 mb-8">
      <h2 className="text-2xl font-bold mb-4">
        Painel Administrativo - Tokens
      </h2>

      <div className="overflow-x-auto">
        <table className="min-w-full bg-white">
          <thead>
            <tr>
              <th className="py-2 px-4 border-b border-gray-200 bg-gray-50 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                Usuário Atual
              </th>
              <th className="py-2 px-4 border-b border-gray-200 bg-gray-50 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                Tokens
              </th>
              <th className="py-2 px-4 border-b border-gray-200 bg-gray-50 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                Último Recarregamento
              </th>
            </tr>
          </thead>
          <tbody>
            <tr className="bg-gray-50">
              <td className="py-2 px-4 border-b border-gray-200">
                Usuário Atual
              </td>
              <td className="py-2 px-4 border-b border-gray-200">
                <span
                  className={`inline-block rounded-full px-3 py-1 text-sm font-semibold ${
                    tokenBucket.tokens <= 2
                      ? "bg-red-100 text-red-800"
                      : tokenBucket.tokens <= 5
                      ? "bg-yellow-100 text-yellow-800"
                      : "bg-green-100 text-green-800"
                  }`}
                >
                  {tokenBucket.tokens}
                </span>
              </td>
              <td className="py-2 px-4 border-b border-gray-200">
                {tokenBucket.lastRefill
                  ? new Date(tokenBucket.lastRefill).toLocaleString()
                  : "N/A"}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div className="mt-4 text-sm text-gray-500">
        <p>
          Este painel mostra informações sobre o bucket de tokens do usuário
          atual.
        </p>
        <p className="mt-1">Cores indicam status dos tokens:</p>
        <ul className="list-disc ml-5 mt-1">
          <li>
            <span className="text-green-700">Verde</span>: Tokens suficientes
          </li>
          <li>
            <span className="text-yellow-700">Amarelo</span>: Tokens limitados
          </li>
          <li>
            <span className="text-red-700">Vermelho</span>: Tokens quase
            esgotados
          </li>
        </ul>
      </div>
    </div>
  );
}
