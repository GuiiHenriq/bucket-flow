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
  return (
    <div className="w-full bg-blue-100 border-2 border-blue-400 rounded-lg shadow-lg p-6 mb-6">
      <div className="flex items-center mb-4">
        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-blue-600 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <span className="font-bold text-lg text-blue-800">Valid test wallets for transactions</span>
      </div>
      <p className="text-base text-gray-700 mb-4">
        These are the available test wallets you can use for testing transactions:
      </p>
      <ul className="space-y-3">
        {VALID_WALLETS.map((wallet, index) => (
          <li key={index} className="flex items-start">
            <div className="bg-blue-200 text-blue-900 text-xs font-semibold px-3 py-1 rounded-full mt-0.5 mr-3">
              {wallet.type}
            </div>
            <div>
              <code className="text-base font-mono bg-gray-100 px-2 py-1 rounded-lg">{wallet.key}</code>
              <p className="text-sm text-gray-600">{wallet.description}</p>
            </div>
          </li>
        ))}
      </ul>
      <div className="mt-5 pt-3 border-t border-blue-200">
        <p className="text-sm text-blue-700 italic">
          Note: These wallets are for testing purposes only. Success rate is 80% - some requests may randomly fail.
        </p>
      </div>
    </div>
  );
}; 