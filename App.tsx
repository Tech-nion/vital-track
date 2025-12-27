import React, { useState } from 'react';
import { Loader2 } from 'lucide-react';

// Dummy AuthView to prevent crashes
const AuthView: React.FC<{ onLogin: (user: any) => void }> = ({ onLogin }) => {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50">
      <h1 className="text-2xl font-bold text-indigo-600 mb-4">Login</h1>
      <button
        className="px-6 py-3 bg-indigo-600 text-white rounded-xl font-bold"
        onClick={() =>
          onLogin({ id: '1', name: 'Demo User', email: 'demo@example.com' })
        }
      >
        Login as Demo
      </button>
    </div>
  );
};

const App: React.FC = () => {
  const [isAuthChecking, setIsAuthChecking] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);

  // Show loader while checking auth (simulate)
  if (isAuthChecking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <Loader2 className="w-10 h-10 text-indigo-600 animate-spin" />
      </div>
    );
  }

  // Show AuthView if not logged in
  if (!currentUser) {
    return <AuthView onLogin={(user) => setCurrentUser(user)} />;
  }

  // Main App Content
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 p-4">
      <h1 className="text-3xl font-black text-indigo-600 mb-4">
        Welcome, {currentUser.name}!
      </h1>
      <p className="text-slate-700 mb-6">This is a minimal deployable version of VitalTrack.</p>
      <button
        className="px-6 py-3 bg-red-500 text-white rounded-xl font-bold"
        onClick={() => setCurrentUser(null)}
      >
        Logout
      </button>
    </div>
  );
};

export default App;
