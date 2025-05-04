import { useEffect, useState } from 'react';
import { networkLogger } from '../relay';

export function GraphQLResponseViewer() {
  const [response, setResponse] = useState<any>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const unsubscribe = networkLogger.addListener((newResponse) => {
      setResponse(newResponse);
      setIsVisible(true);
    });

    return () => unsubscribe();
  }, []);

  if (!isVisible || !response) {
    return null;
  }

  return (
    <div className="fixed bottom-0 right-0 max-w-md w-full bg-white border border-gray-300 shadow-lg rounded-t-lg p-4 m-4 overflow-auto max-h-80 z-50">
      <div className="flex justify-between items-center mb-2">
        <h3 className="text-lg font-medium">GraphQL Response: {response.operation}</h3>
        <button 
          onClick={() => setIsVisible(false)}
          className="text-gray-500 hover:text-gray-700"
        >
          ×
        </button>
      </div>
      <div className="mb-2">
        <h4 className="text-sm font-medium">Variables:</h4>
        <pre className="text-xs bg-gray-100 p-2 rounded overflow-auto">
          {JSON.stringify(response.variables, null, 2)}
        </pre>
      </div>
      <div>
        <h4 className="text-sm font-medium">Response:</h4>
        <pre className="text-xs bg-gray-100 p-2 rounded overflow-auto">
          {JSON.stringify(response.response, null, 2)}
        </pre>
      </div>
    </div>
  );
}