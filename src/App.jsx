import { Suspense, lazy, useEffect } from 'react';
import { Toaster } from "@/components/ui/toaster"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import { SESSION_RECOVERED_EVENT } from '@/lib/sessionKeeper'
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
// Resilient lazy import wrapper that retries once on network / dev-server bundle changes
const lazyRetry = (importFn) =>
  lazy(async () => {
    try {
      return await importFn();
    } catch {
      return await importFn();
    }
  });

const Dashboard = lazyRetry(() => import('@/pages/Dashboard'));
const Events = lazyRetry(() => import('@/pages/Events'));
const Clients = lazyRetry(() => import('@/pages/Clients'));
const Team = lazyRetry(() => import('@/pages/Team'));
const Financial = lazyRetry(() => import('@/pages/Financial'));
const Leads = lazyRetry(() => import('@/pages/Leads'));
const Quotation = lazyRetry(() => import('@/pages/Quotation'));
const Invoices = lazyRetry(() => import('@/pages/Invoices'));

// Route-level pages that remain lazy-loaded for less frequent screens
const Login = lazyRetry(() => import('@/pages/Login'));
const Register = lazyRetry(() => import('@/pages/Register'));
const ForgotPassword = lazyRetry(() => import('@/pages/ForgotPassword'));
const ResetPassword = lazyRetry(() => import('@/pages/ResetPassword'));
const OAuthConsent = lazyRetry(() => import('@/pages/OAuthConsent'));
const PhoneLogin = lazyRetry(() => import('@/pages/PhoneLogin'));
const Onboarding = lazyRetry(() => import('@/pages/Onboarding'));
const Landing = lazyRetry(() => import('@/pages/Landing'));

const EventDetails = lazyRetry(() => import('@/pages/EventDetails'));
const EventEditor = lazyRetry(() => import('@/pages/EventEditor'));
const ClientDetails = lazyRetry(() => import('@/pages/ClientDetails'));
const TeamMemberDetails = lazyRetry(() => import('@/pages/TeamMemberDetails'));
const RateEstimator = lazyRetry(() => import('@/pages/RateEstimator'));
const QuotationEditor = lazyRetry(() => import('@/pages/QuotationEditor'));
const InvoiceEditor = lazyRetry(() => import('@/pages/InvoiceEditor'));
const SignPdf = lazyRetry(() => import('@/pages/SignPdf'));
const Preferences = lazyRetry(() => import('@/pages/Preferences'));
const AppUpdates = lazyRetry(() => import('@/pages/AppUpdates'));
const YourPlan = lazyRetry(() => import('@/pages/YourPlan'));
const Help = lazyRetry(() => import('@/pages/Help'));
const More = lazyRetry(() => import('@/pages/More'));
const DataTools = lazyRetry(() => import('@/pages/DataTools'));
const Calendar = lazyRetry(() => import('@/pages/Calendar'));
const TermsOfService = lazyRetry(() => import('@/pages/TermsOfService'));
const PrivacyPolicy = lazyRetry(() => import('@/pages/PrivacyPolicy'));
const FAQ = lazyRetry(() => import('@/pages/FAQ'));
const About = lazyRetry(() => import('@/pages/About'));
const AdminDashboard = lazyRetry(() => import('@/pages/admin/AdminDashboard'));
const AdminWorkspaces = lazyRetry(() => import('@/pages/admin/AdminWorkspaces'));
const AdminWorkspaceDetails = lazyRetry(() => import('@/pages/admin/AdminWorkspaceDetails'));
const AdminPlans = lazyRetry(() => import('@/pages/admin/AdminPlans'));
const AdminTickets = lazyRetry(() => import('@/pages/admin/AdminTickets'));
const ClientQuotationView = lazyRetry(() => import('@/pages/ClientQuotationView'));
const ClientProjectPortal = lazyRetry(() => import('@/pages/ClientProjectPortal'));
const EventTracking = lazyRetry(() => import('@/pages/EventTracking'));
const JobSheet = lazyRetry(() => import('@/pages/JobSheet'));
const PublicJobSheet = lazyRetry(() => import('@/pages/PublicJobSheet'));
const PublicInvoice = lazyRetry(() => import('@/pages/PublicInvoice'));
const ClientPasswordLogin = lazyRetry(() => import('@/pages/ClientPasswordLogin'));
const ClientPortal = lazyRetry(() => import('@/pages/ClientPortal'));
const PublicProfile = lazyRetry(() => import('@/pages/PublicProfile'));
const TeamMemberPasswordLogin = lazyRetry(() => import('@/pages/TeamMemberPasswordLogin'));
const TeamMemberPortal = lazyRetry(() => import('@/pages/TeamMemberPortal'));
const Unauthorized = lazyRetry(() => import('@/pages/Unauthorized'));

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
          <Route path="/admin/tickets" element={<AdminTickets />} />
        </Route>
      </Route>

      <Route path="*" element={<PageNotFound />} />
    </Routes>
    </Suspense>
  );
};


// When the session was refreshed after the tab/device was away, anything loaded with the dead token may be
// empty — reload every active query so pages show the real data.
function SessionRecoveryRefetch() {
  useEffect(() => {
    const refetch = () => queryClientInstance.invalidateQueries();
    window.addEventListener(SESSION_RECOVERED_EVENT, refetch);
    return () => window.removeEventListener(SESSION_RECOVERED_EVENT, refetch);
  }, []);
  return null;
}

function App() {
  const { toast } = useToast();

  return (
    <AuthProvider>
      <QueryClientProvider client={queryClientInstance}>
        <SessionRecoveryRefetch />
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