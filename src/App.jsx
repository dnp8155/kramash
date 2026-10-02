import { Suspense, lazy, useEffect } from 'react';
import { Toaster } from "@/components/ui/toaster"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import { BrowserRouter as Router, Route, Routes, Navigate } from 'react-router-dom';
import PageNotFound from './lib/PageNotFound';
import { useToast } from "@/components/ui/use-toast";
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import UserNotRegisteredError from '@/components/UserNotRegisteredError';
import ScrollToTop from './components/ScrollToTop';
import AppLayout from '@/components/layout/AppLayout';
import ProtectedRoute from '@/components/ProtectedRoute';
import WorkspaceRoute from '@/components/auth/WorkspaceRoute';
import AppLoadingScreen from '@/components/common/AppLoadingScreen';
import LoadingState from '@/components/common/LoadingState';
import AdminRoute from '@/components/admin/AdminRoute';
import AdminLayout from '@/components/admin/AdminLayout';
import ClientRoute from '@/components/auth/ClientRoute';
import TeamMemberRoute from '@/components/auth/TeamMemberRoute';

const Dashboard = lazy(() => import('@/pages/Dashboard'));
const Events = lazy(() => import('@/pages/Events'));
const Clients = lazy(() => import('@/pages/Clients'));
const Team = lazy(() => import('@/pages/Team'));
const Financial = lazy(() => import('@/pages/Financial'));
const Leads = lazy(() => import('@/pages/Leads'));
const Quotation = lazy(() => import('@/pages/Quotation'));
const Invoices = lazy(() => import('@/pages/Invoices'));

// Route-level pages that remain lazy-loaded for less frequent screens
const Login = lazy(() => import('@/pages/Login'));
const Register = lazy(() => import('@/pages/Register'));
const ForgotPassword = lazy(() => import('@/pages/ForgotPassword'));
const ResetPassword = lazy(() => import('@/pages/ResetPassword'));
const OAuthConsent = lazy(() => import('@/pages/OAuthConsent'));
const PhoneLogin = lazy(() => import('@/pages/PhoneLogin'));
const Onboarding = lazy(() => import('@/pages/Onboarding'));
const Landing = lazy(() => import('@/pages/Landing'));

const EventDetails = lazy(() => import('@/pages/EventDetails'));
const EventEditor = lazy(() => import('@/pages/EventEditor'));
const ClientDetails = lazy(() => import('@/pages/ClientDetails'));
const TeamMemberDetails = lazy(() => import('@/pages/TeamMemberDetails'));
const RateEstimator = lazy(() => import('@/pages/RateEstimator'));
const QuotationEditor = lazy(() => import('@/pages/QuotationEditor'));
const InvoiceEditor = lazy(() => import('@/pages/InvoiceEditor'));
const SignPdf = lazy(() => import('@/pages/SignPdf'));
const Preferences = lazy(() => import('@/pages/Preferences'));
const AppUpdates = lazy(() => import('@/pages/AppUpdates'));
const YourPlan = lazy(() => import('@/pages/YourPlan'));
const Help = lazy(() => import('@/pages/Help'));
const More = lazy(() => import('@/pages/More'));
const DataTools = lazy(() => import('@/pages/DataTools'));
const Calendar = lazy(() => import('@/pages/Calendar'));
const TermsOfService = lazy(() => import('@/pages/TermsOfService'));
const PrivacyPolicy = lazy(() => import('@/pages/PrivacyPolicy'));
const FAQ = lazy(() => import('@/pages/FAQ'));
const About = lazy(() => import('@/pages/About'));
const AdminDashboard = lazy(() => import('@/pages/admin/AdminDashboard'));
const AdminWorkspaces = lazy(() => import('@/pages/admin/AdminWorkspaces'));
const AdminWorkspaceDetails = lazy(() => import('@/pages/admin/AdminWorkspaceDetails'));
const AdminPlans = lazy(() => import('@/pages/admin/AdminPlans'));
const ClientQuotationView = lazy(() => import('@/pages/ClientQuotationView'));
const ClientProjectPortal = lazy(() => import('@/pages/ClientProjectPortal'));
const EventTracking = lazy(() => import('@/pages/EventTracking'));
const JobSheet = lazy(() => import('@/pages/JobSheet'));
const PublicJobSheet = lazy(() => import('@/pages/PublicJobSheet'));
const PublicInvoice = lazy(() => import('@/pages/PublicInvoice'));
const ClientPasswordLogin = lazy(() => import('@/pages/ClientPasswordLogin'));
const ClientPortal = lazy(() => import('@/pages/ClientPortal'));
const PublicProfile = lazy(() => import('@/pages/PublicProfile'));
const TeamMemberPasswordLogin = lazy(() => import('@/pages/TeamMemberPasswordLogin'));
const TeamMemberPortal = lazy(() => import('@/pages/TeamMemberPortal'));
const Unauthorized = lazy(() => import('@/pages/Unauthorized'));

// Lightweight fallback for in-app route transitions (navigating to a page whose
// lazy chunk hasn't loaded yet) — the full branded AppLoadingScreen is reserved
// for actual first-load moments (auth check, workspace fetch) so it doesn't
// flash on every ordinary navigation.
const RouteLoadingFallback = () => (
  <div className="min-h-screen flex items-center justify-center">
    <LoadingState label="Loading" />
  </div>
);

const AuthenticatedApp = () => {
  const { isLoadingAuth, isLoadingPublicSettings, authError, navigateToLogin } = useAuth();

  // Show loading spinner while checking app public settings or auth
  if (isLoadingPublicSettings || isLoadingAuth) {
    return <AppLoadingScreen />;
  }

  // Handle authentication errors
  if (authError) {
    if (authError.type === 'user_not_registered') {
      return <UserNotRegisteredError />;
    }
    // For 'auth_required' — don't auto-redirect; let public routes (landing, login, etc.)
    // render normally. ProtectedRoute/WorkspaceRoute will redirect to /login when needed.
  }

  // Render the main app
  return (
    <Suspense fallback={<RouteLoadingFallback />}>
    <Routes>
      {/* Public auth routes */}
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/reset-password" element={<ResetPassword />} />
      <Route path="/oauth-consent" element={<OAuthConsent />} />
      <Route path="/phone-login" element={<PhoneLogin />} />

      {/* Public landing page */}
      <Route path="/" element={<Landing />} />

      {/* Public client-facing quotation view + online signing (URL 2) */}
      <Route path="/q/:token" element={<ClientQuotationView />} />

      {/* Public client-facing project portal (URL 1) */}
      <Route path="/portal/:token" element={<ClientProjectPortal />} />

      {/* Public client-facing event tracking page */}
      <Route path="/track/:token" element={<EventTracking />} />

      {/* Public crew-facing job sheet */}
      <Route path="/job-sheet/:token" element={<PublicJobSheet />} />

      {/* Public client-facing invoice */}
      <Route path="/invoice/:token" element={<PublicInvoice />} />

      {/* Client Portal — password-only login + authenticated dashboard for client-role users */}
      <Route path="/client-login" element={<ClientPasswordLogin />} />
      <Route path="/client-login/:token" element={<ClientPasswordLogin />} />
      <Route element={<ClientRoute />}>
        <Route path="/client-portal" element={<ClientPortal />} />
      </Route>

      {/* Team Member Portal — password-only login + authenticated dashboard for team_member-role users */}
      <Route path="/team-login/:token" element={<TeamMemberPasswordLogin />} />
      <Route element={<TeamMemberRoute />}>
        <Route path="/team-portal" element={<TeamMemberPortal />} />
      </Route>

      {/* Public business profile page */}
      <Route path="/p/:slug" element={<PublicProfile />} />

      {/* Public legal pages */}
      <Route path="/terms" element={<TermsOfService />} />
      <Route path="/privacy" element={<PrivacyPolicy />} />
      <Route path="/faq" element={<FAQ />} />
      <Route path="/about" element={<About />} />
      <Route path="/unauthorized" element={<Unauthorized />} />

      {/* Authenticated but no workspace yet → onboarding */}
      <Route element={<ProtectedRoute unauthenticatedElement={<Navigate to="/login" replace />} />}>
        <Route path="/onboarding" element={<Onboarding />} />
      </Route>

      {/* Authenticated + workspace → application */}
      <Route element={<WorkspaceRoute unauthenticatedElement={<Navigate to="/login" replace />} noWorkspaceElement={<Navigate to="/onboarding" replace />} />}>
        <Route element={<AppLayout />}>
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/events" element={<Events />} />
          <Route path="/events/new" element={<EventEditor />} />
          <Route path="/events/:id" element={<EventDetails />} />
          <Route path="/events/:id/edit" element={<EventEditor />} />
          <Route path="/events/:id/job-sheet" element={<JobSheet />} />
          <Route path="/calendar" element={<Calendar />} />
          <Route path="/clients" element={<Clients />} />
          <Route path="/clients/:id" element={<ClientDetails />} />
          <Route path="/leads" element={<Leads />} />
          <Route path="/team" element={<Team />} />
          <Route path="/team/:id" element={<TeamMemberDetails />} />
          <Route path="/financial" element={<Financial />} />
          <Route path="/rate-estimator" element={<RateEstimator />} />
          <Route path="/quotation" element={<Quotation />} />
          <Route path="/quotation/new" element={<QuotationEditor />} />
          <Route path="/quotation/:id" element={<QuotationEditor />} />
          <Route path="/invoices" element={<Invoices />} />
          <Route path="/invoices/new" element={<InvoiceEditor />} />
          <Route path="/invoices/:id" element={<InvoiceEditor />} />
          <Route path="/sign-pdf" element={<SignPdf />} />
          <Route path="/preferences" element={<Preferences />} />
          <Route path="/app-updates" element={<AppUpdates />} />
          <Route path="/plan" element={<YourPlan />} />
          <Route path="/help" element={<Help />} />
          <Route path="/more" element={<More />} />
          <Route path="/data-tools" element={<DataTools />} />
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
    </Suspense>
  );
};


function App() {
  const { toast } = useToast();

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