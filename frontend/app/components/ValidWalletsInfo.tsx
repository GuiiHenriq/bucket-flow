import { useState } from 'react';

const VALID_WALLETS = [
  {
    key: '12345678900',
    type: 'CPF',
    description: 'João Silva - Banco Digital'
  },
  {
    key: 'joao@example.com',
    type: 'Email',
    description: 'João Silva - Banco Digital (Savings)'
  }
];

export const ValidWalletsInfo = () => {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div className="w-full bg-blue-50 border border-blue-200 rounded-md overflow-hidden">
      <div 
        className="px-4 py-3 flex justify-between items-center cursor-pointer hover:bg-blue-100 transition-colors"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-blue-500 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span className="font-medium text-blue-700">Valid test wallets for transactions</span>
        </div>
        <svg 
          xmlns="http://www.w3.org/2000/svg" 
          className={`h-5 w-5 text-blue-500 transform transition-transform ${isExpanded ? 'rotate-180' : ''}`} 
          fill="none" 
          viewBox="0 0 24 24" 
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </div>
      
      {isExpanded && (
        <div className="px-4 py-3 bg-white border-t border-blue-200">
          <p className="text-sm text-gray-600 mb-2">
            These are the available test wallets you can use for testing transactions:
          </p>
          <ul className="space-y-2">
            {VALID_WALLETS.map((wallet, index) => (
              <li key={index} className="flex items-start">
                <div className="bg-blue-100 text-blue-800 text-xs font-medium px-2.5 py-0.5 rounded-full mt-0.5 mr-2">
                  {wallet.type}
                </div>
                <div>
                  <code className="text-sm font-mono bg-gray-100 px-1 py-0.5 rounded">{wallet.key}</code>
                  <p className="text-xs text-gray-500">{wallet.description}</p>
                </div>
              </li>
            ))}
          </ul>
          <div className="mt-3 pt-2 border-t border-gray-100">
            <p className="text-xs text-gray-500 italic">
              Note: These wallets are for testing purposes only. Success rate is 80% - some requests may randomly fail.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}; 