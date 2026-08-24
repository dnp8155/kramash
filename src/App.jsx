import { Toaster } from "@/components/ui/toaster"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import { BrowserRouter as Router, Route, Routes, Navigate } from 'react-router-dom';
import PageNotFound from './lib/PageNotFound';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import UserNotRegisteredError from '@/components/UserNotRegisteredError';
import ScrollToTop from './components/ScrollToTop';
import AppLayout from '@/components/layout/AppLayout';
import Events from '@/pages/Events';
import Team from '@/pages/Team';
import Financial from '@/pages/Financial';
import RateEstimator from '@/pages/RateEstimator';
import Quotation from '@/pages/Quotation';
import SignPdf from '@/pages/SignPdf';
import Preferences from '@/pages/Preferences';
import AppUpdates from '@/pages/AppUpdates';
import YourPlan from '@/pages/YourPlan';
// Add page imports here

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
      {/* Add your page Route elements here */}
      <Route element={<AppLayout />}>
        <Route path="/" element={<Navigate to="/events" replace />} />
        <Route path="/events" element={<Events />} />
        <Route path="/team" element={<Team />} />
        <Route path="/financial" element={<Financial />} />
        <Route path="/rate-estimator" element={<RateEstimator />} />
        <Route path="/quotation" element={<Quotation />} />
        <Route path="/sign-pdf" element={<SignPdf />} />
        <Route path="/preferences" element={<Preferences />} />
        <Route path="/app-updates" element={<AppUpdates />} />
        <Route path="/plan" element={<YourPlan />} />
      </Route>
      <Route path="*" element={<PageNotFound />} />
    </Routes>
  );
};


function App() {

  return (
    <AuthProvider>
      <QueryClientProvider client={queryClientInstance}>
        <Router>
          <ScrollToTop />
          <AuthenticatedApp />
        </Router>
        <Toaster />
      </QueryClientProvider>
    </AuthProvider>
  )
}

export default App