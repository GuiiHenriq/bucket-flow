import { useState } from "react";
import { graphql, useMutation } from "react-relay";
import type { PIXTransactionMutation } from "../__generated__/PIXTransactionMutation.graphql";

interface PIXTransactionProps {
  onTokensUpdated?: (tokens: number) => void;
}

const PIXQueryMutation = graphql`
  mutation PIXTransactionMutation($key: String!) {
    queryPixKey(key: $key) {
      success
      message
      key
      accountInfo {
        name
        bank
        accountType
        accountNumber
      }
    }
  }
`;

export function PIXTransaction({ onTokensUpdated }: PIXTransactionProps) {
  const [key, setKey] = useState("");
  const [value, setValue] = useState("");
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const [commit] = useMutation<PIXTransactionMutation>(PIXQueryMutation);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setResult(null);

    commit({
      variables: { key },
      onCompleted: (response, errors) => {
        if (errors) {
          setError(errors[0].message);
          return;
        }
        setResult(response.queryPixKey);
        
        if (onTokensUpdated) {
          onTokensUpdated(0);
        }
      },
      onError: (error) => {
        setError(error.message);
      },
    });
  };

  return (
    <div className="space-y-6">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label
            htmlFor="key"
            className="block text-sm font-medium text-gray-700"
          >
            PIX Key
          </label>
          <input
            type="text"
            id="key"
            value={key}
            onChange={(e) => setKey(e.target.value)}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
            placeholder="Enter PIX key"
            required
          />
        </div>

        <div>
          <label
            htmlFor="value"
            className="block text-sm font-medium text-gray-700"
          >
            Value
          </label>
          <input
            type="number"
            id="value"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
            placeholder="Enter value"
            required
          />
        </div>

        <button
          type="submit"
          className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
        >
          Query PIX
        </button>
      </form>

      {error && (
        <div className="rounded-md bg-red-50 p-4">
          <div className="flex">
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">Error</h3>
              <div className="mt-2 text-sm text-red-700">
                <p>{error}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {result && (
        <div className="rounded-md bg-green-50 p-4">
          <div className="flex">
            <div className="ml-3">
              <h3 className="text-sm font-medium text-green-800">Result</h3>
              <div className="mt-2 text-sm text-green-700">
                <p>Success: {result.success ? "Yes" : "No"}</p>
                <p>Message: {result.message}</p>
                {result.accountInfo && (
                  <div className="mt-2">
                    <p>Name: {result.accountInfo.name}</p>
                    <p>Bank: {result.accountInfo.bank}</p>
                    <p>Account Type: {result.accountInfo.accountType}</p>
                    <p>Account Number: {result.accountInfo.accountNumber}</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
