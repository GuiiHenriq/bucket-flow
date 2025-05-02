import { RelayEnvironmentProvider } from 'react-relay';
import { environment } from './relay';
import { PIXTransaction } from './components/PIXTransaction';
import { GraphQLResponseViewer } from './components/GraphQLResponseViewer';

export default function App() {
  return (
    <RelayEnvironmentProvider environment={environment}>
      <div className="min-h-screen bg-gray-100">
        <div className="container mx-auto px-4 py-8">
          <h1 className="text-3xl font-bold text-center mb-8">PIX Transaction</h1>
          <PIXTransaction />
        </div>
      </div>
      <GraphQLResponseViewer />
    </RelayEnvironmentProvider>
  );
}