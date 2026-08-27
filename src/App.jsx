import { Toaster } from "@/components/ui/toaster"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import { BrowserRouter as Router, Route, Routes, Navigate } from 'react-router-dom';
import PageNotFound from './lib/PageNotFound';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import UserNotRegisteredError from '@/components/UserNotRegisteredError';
import ScrollToTop from './components/ScrollToTop';
import AppLayout from '@/components/layout/AppLayout';
import ProtectedRoute from '@/components/ProtectedRoute';
import WorkspaceRoute from '@/components/auth/WorkspaceRoute';
import Login from '@/pages/Login';
import Register from '@/pages/Register';
import ForgotPassword from '@/pages/ForgotPassword';
import ResetPassword from '@/pages/ResetPassword';
import PhoneLogin from '@/pages/PhoneLogin';
import Onboarding from '@/pages/Onboarding';
import Landing from '@/pages/Landing';
import Dashboard from '@/pages/Dashboard';
import Events from '@/pages/Events';
import EventDetails from '@/pages/EventDetails';
import Clients from '@/pages/Clients';
import ClientDetails from '@/pages/ClientDetails';
import Team from '@/pages/Team';
import TeamMemberDetails from '@/pages/TeamMemberDetails';
import Financial from '@/pages/Financial';
import RateEstimator from '@/pages/RateEstimator';
import Quotation from '@/pages/Quotation';
import QuotationEditor from '@/pages/QuotationEditor';
import SignPdf from '@/pages/SignPdf';
import Preferences from '@/pages/Preferences';
import Settings from '@/pages/Settings';
import AppUpdates from '@/pages/AppUpdates';
import YourPlan from '@/pages/YourPlan';
import AdminRoute from '@/components/admin/AdminRoute';
import AdminLayout from '@/components/admin/AdminLayout';
import AdminDashboard from '@/pages/admin/AdminDashboard';
import AdminWorkspaces from '@/pages/admin/AdminWorkspaces';
import AdminWorkspaceDetails from '@/pages/admin/AdminWorkspaceDetails';
import AdminPlans from '@/pages/admin/AdminPlans';
import ClientQuotationView from '@/pages/ClientQuotationView';
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
      {/* Public auth routes */}
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/reset-password" element={<ResetPassword />} />
      <Route path="/phone-login" element={<PhoneLogin />} />

      {/* Public landing page */}
      <Route path="/" element={<Landing />} />

      {/* Public client-facing quotation view + online signing */}
      <Route path="/q/:id" element={<ClientQuotationView />} />

      {/* Authenticated but no workspace yet → onboarding */}
      <Route element={<ProtectedRoute unauthenticatedElement={<Navigate to="/login" replace />} />}>
        <Route path="/onboarding" element={<Onboarding />} />
      </Route>

      {/* Authenticated + workspace → application */}
      <Route element={<WorkspaceRoute unauthenticatedElement={<Navigate to="/login" replace />} noWorkspaceElement={<Navigate to="/onboarding" replace />} />}>
        <Route element={<AppLayout />}>
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/events" element={<Events />} />
          <Route path="/events/:id" element={<EventDetails />} />
          <Route path="/clients" element={<Clients />} />
          <Route path="/clients/:id" element={<ClientDetails />} />
          <Route path="/team" element={<Team />} />
          <Route path="/team/:id" element={<TeamMemberDetails />} />
          <Route path="/financial" element={<Financial />} />
          <Route path="/rate-estimator" element={<RateEstimator />} />
          <Route path="/quotation" element={<Quotation />} />
          <Route path="/quotation/new" element={<QuotationEditor />} />
          <Route path="/quotation/:id" element={<QuotationEditor />} />
          <Route path="/sign-pdf" element={<SignPdf />} />
          <Route path="/preferences" element={<Preferences />} />
          <Route path="/settings/:section?" element={<Settings />} />
          <Route path="/app-updates" element={<AppUpdates />} />
          <Route path="/plan" element={<YourPlan />} />
        </Route>
      </Route>

      {/* SaaS Admin — platform-level, separate from workspace app */}
      <Route element={<AdminRoute />}>
        <Route element={<AdminLayout />}>
          <Route path="/admin" element={<AdminDashboard />} />
          <Route path="/admin/workspaces" element={<AdminWorkspaces />} />
          <Route path="/admin/workspaces/:id" element={<AdminWorkspaceDetails />} />
          <Route path="/admin/plans" element={<AdminPlans />} />
        </Route>
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