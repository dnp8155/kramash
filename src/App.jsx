import { Toaster } from "@/components/ui/toaster"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import PageNotFound from './lib/PageNotFound';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import UserNotRegisteredError from '@/components/UserNotRegisteredError';
import ScrollToTop from './components/ScrollToTop';
import { ThemeProvider } from '@/lib/ThemeProvider';
import AppLayout from '@/components/layout/AppLayout';
import ErrorBoundary from '@/components/common/ErrorBoundary';
import Dashboard from '@/pages/Dashboard';
import Events from '@/pages/Events';
import Team from '@/pages/Team';
import Financial from '@/pages/Financial';
import RateEstimator from '@/pages/RateEstimator';
import Quotation from '@/pages/Quotation';
import Preferences from '@/pages/Preferences';
import AppUpdates from '@/pages/AppUpdates';
import Plan from '@/pages/Plan';

const AuthenticatedApp = () => {
  const { isLoadingAuth, isLoadingPublicSettings, authError, navigateToLogin } = useAuth();

  // Show loading spinner while checking app public settings or auth
  if (isLoadingPublicSettings || isLoadingAuth) {
    return (
      <div className="fixed inset-0 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin"></div>
      </div>
    );
  }

  // Handle authentication errors
  if (authError) {
    if (authError.type === 'user_not_registered') {
      return <UserNotRegisteredError />;
    } else if (authError.type === 'auth_required') {
      // Redirect to login automatically
      navigateToLogin();
      return null;
    }
  }

  // Render the main app
  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route path="/" element={<ErrorBoundary><Dashboard /></ErrorBoundary>} />
        <Route path="/events" element={<ErrorBoundary><Events /></ErrorBoundary>} />
        <Route path="/team" element={<ErrorBoundary><Team /></ErrorBoundary>} />
        <Route path="/financial" element={<ErrorBoundary><Financial /></ErrorBoundary>} />
        <Route path="/rate-estimator" element={<ErrorBoundary><RateEstimator /></ErrorBoundary>} />
        <Route path="/quotation" element={<ErrorBoundary><Quotation /></ErrorBoundary>} />
        <Route path="/preferences" element={<ErrorBoundary><Preferences /></ErrorBoundary>} />
        <Route path="/app-updates" element={<ErrorBoundary><AppUpdates /></ErrorBoundary>} />
        <Route path="/plan" element={<ErrorBoundary><Plan /></ErrorBoundary>} />
      </Route>
      <Route path="*" element={<PageNotFound />} />
    </Routes>
  );
};


function App() {

  return (
    <AuthProvider>
      <ThemeProvider>
        <QueryClientProvider client={queryClientInstance}>
          <Router>
            <ScrollToTop />
            <AuthenticatedApp />
          </Router>
          <Toaster />
        </QueryClientProvider>
      </ThemeProvider>
    </AuthProvider>
  )
}

export default App