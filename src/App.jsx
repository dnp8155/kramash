import { Toaster } from "@/components/ui/toaster";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClientInstance } from "@/lib/query-client";
import { BrowserRouter as Router, Route, Routes, Navigate, Outlet } from "react-router-dom";
import PageNotFound from "./lib/PageNotFound";
import { AuthProvider, useAuth } from "@/lib/AuthContext";
import UserNotRegisteredError from "@/components/UserNotRegisteredError";
import ScrollToTop from "./components/ScrollToTop";
import { ThemeProvider } from "@/lib/ThemeProvider";
import AppLayout from "@/components/layout/AppLayout";
import ErrorBoundary from "@/components/common/ErrorBoundary";
import FullScreenSpinner from "@/components/FullScreenSpinner";
import { WorkspaceProvider, WorkspaceGate, useWorkspace } from "@/lib/WorkspaceContext";
import Dashboard from "@/pages/Dashboard";
import Landing from "@/pages/Landing";
import Events from "@/pages/Events";
import Team from "@/pages/Team";
import Financial from "@/pages/Financial";
import RateEstimator from "@/pages/RateEstimator";
import Quotation from "@/pages/Quotation";
import QuotationEditor from "@/pages/QuotationEditor";
import QuotationDetail from "@/pages/QuotationDetail";
import Invoices from "@/pages/Invoices";
import InvoiceEditor from "@/pages/InvoiceEditor";
import InvoiceDetail from "@/pages/InvoiceDetail";
import InvoicePublic from "@/pages/InvoicePublic";
import { PlanProvider } from "@/lib/PlanContext";
import { BusinessTerminologyProvider } from "@/lib/BusinessTerminology";
import { FinancialYearProvider } from "@/lib/FinancialYearContext";
import AdminGuard from "@/components/admin/AdminGuard";
import AdminLayout from "@/components/admin/AdminLayout";
import AdminDashboard from "@/pages/admin/AdminDashboard";
import AdminWorkspaces from "@/pages/admin/AdminWorkspaces";
import AdminWorkspaceDetail from "@/pages/admin/AdminWorkspaceDetail";
import AdminPlans from "@/pages/admin/AdminPlans";
import Preferences from "@/pages/Preferences";
import AppUpdates from "@/pages/AppUpdates";
import Plan from "@/pages/Plan";
import HelpSupport from "@/pages/HelpSupport";
import Login from "@/pages/Login";
import Register from "@/pages/Register";
import ForgotPassword from "@/pages/ForgotPassword";
import ResetPassword from "@/pages/ResetPassword";
import Terms from "@/pages/Terms";
import Privacy from "@/pages/Privacy";
import Onboarding from "@/pages/Onboarding";
import EventDetail from "@/pages/EventDetail";
import JobSheet from "@/pages/JobSheet";
import Clients from "@/pages/Clients";
import ClientDetail from "@/pages/ClientDetail";
import TeamMemberDetail from "@/pages/TeamMemberDetail";
import ClientPortal from "@/pages/ClientPortal";
import ClientPortalSign from "@/pages/ClientPortalSign";
import JobSheetPublic from "@/pages/JobSheetPublic";

// Guards an area behind authentication. No app data renders until the auth
// check completes, so there is no flash of sensitive content.
const AuthReady = ({ children }) => {
  const { isLoadingAuth, isLoadingPublicSettings, authError, isAuthenticated } = useAuth();
  if (isLoadingPublicSettings || isLoadingAuth) return <FullScreenSpinner label="Loading Kramashah..." />;
  if (authError?.type === "user_not_registered") return <UserNotRegisteredError />;
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return children;
};

// Layout route for the protected application: auth + active workspace required.
const AuthenticatedApp = () => (
  <AuthReady>
    <WorkspaceProvider>
      <WorkspaceGate>
        <FinancialYearProvider>
          <BusinessTerminologyProvider>
            <PlanProvider>
              <Outlet />
            </PlanProvider>
          </BusinessTerminologyProvider>
        </FinancialYearProvider>
      </WorkspaceGate>
    </WorkspaceProvider>
  </AuthReady>
);

// Route for onboarding: auth required, but NO workspace (chicken-and-egg).
const OnboardingGate = () => {
  const { loading, needsOnboarding } = useWorkspace();
  if (loading) return <FullScreenSpinner label="Loading your workspace..." />;
  if (!needsOnboarding) return <Navigate to="/dashboard" replace />;
  return <Onboarding />;
};

const OnboardingRoute = () => (
  <AuthReady>
    <WorkspaceProvider>
      <OnboardingGate />
    </WorkspaceProvider>
  </AuthReady>
);

function App() {
  return (
    <AuthProvider>
      <ThemeProvider>
        <QueryClientProvider client={queryClientInstance}>
          <Router>
            <ScrollToTop />
            <Routes>
              {/* Public authentication */}
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              <Route path="/forgot-password" element={<ForgotPassword />} />
              <Route path="/reset-password" element={<ResetPassword />} />

              {/* Public landing page */}
              <Route path="/" element={<Landing />} />
              <Route path="/terms" element={<Terms />} />
              <Route path="/privacy" element={<Privacy />} />

              {/* Public client portal (no auth required) */}
              <Route path="/portal/:token" element={<ClientPortal />} />
              <Route path="/portal/:token/sign" element={<ClientPortalSign />} />
              <Route path="/job-sheet/:token" element={<JobSheetPublic />} />
              <Route path="/invoice/:token" element={<InvoicePublic />} />

              {/* Onboarding (authenticated, no app shell) */}
              <Route path="/onboarding" element={<OnboardingRoute />} />

              {/* Protected application */}
              <Route element={<AuthenticatedApp />}>
                <Route element={<AppLayout />}>
                  <Route path="/dashboard" element={<ErrorBoundary><Dashboard /></ErrorBoundary>} />
                  <Route path="/events" element={<ErrorBoundary><Events /></ErrorBoundary>} />
                  <Route path="/events/:id" element={<ErrorBoundary><EventDetail /></ErrorBoundary>} />
                  <Route path="/events/:id/job-sheet" element={<ErrorBoundary><JobSheet /></ErrorBoundary>} />
                  <Route path="/clients" element={<ErrorBoundary><Clients /></ErrorBoundary>} />
                  <Route path="/clients/:id" element={<ErrorBoundary><ClientDetail /></ErrorBoundary>} />
                  <Route path="/team" element={<ErrorBoundary><Team /></ErrorBoundary>} />
                  <Route path="/team/:id" element={<ErrorBoundary><TeamMemberDetail /></ErrorBoundary>} />
                  <Route path="/financial" element={<ErrorBoundary><Financial /></ErrorBoundary>} />
                  <Route path="/rate-estimator" element={<ErrorBoundary><RateEstimator /></ErrorBoundary>} />
                  <Route path="/quotation" element={<ErrorBoundary><Quotation /></ErrorBoundary>} />
                  <Route path="/quotation/new" element={<ErrorBoundary><QuotationEditor /></ErrorBoundary>} />
                  <Route path="/quotation/:id" element={<ErrorBoundary><QuotationDetail /></ErrorBoundary>} />
                  <Route path="/quotation/:id/edit" element={<ErrorBoundary><QuotationEditor /></ErrorBoundary>} />
                  <Route path="/invoices" element={<ErrorBoundary><Invoices /></ErrorBoundary>} />
                  <Route path="/invoices/new" element={<ErrorBoundary><InvoiceEditor /></ErrorBoundary>} />
                  <Route path="/invoices/:id" element={<ErrorBoundary><InvoiceDetail /></ErrorBoundary>} />
                  <Route path="/invoices/:id/edit" element={<ErrorBoundary><InvoiceEditor /></ErrorBoundary>} />
                  <Route path="/preferences" element={<ErrorBoundary><Preferences /></ErrorBoundary>} />
                  <Route path="/app-updates" element={<ErrorBoundary><AppUpdates /></ErrorBoundary>} />
                  <Route path="/plan" element={<ErrorBoundary><Plan /></ErrorBoundary>} />
                  <Route path="/help-support" element={<ErrorBoundary><HelpSupport /></ErrorBoundary>} />
                </Route>
              </Route>

              {/* SaaS Admin area (auth + admin role required, no workspace needed) */}
              <Route element={<AuthReady><AdminGuard /></AuthReady>}>
                <Route element={<AdminLayout />}>
                  <Route path="/admin" element={<AdminDashboard />} />
                  <Route path="/admin/workspaces" element={<AdminWorkspaces />} />
                  <Route path="/admin/workspaces/:id" element={<AdminWorkspaceDetail />} />
                  <Route path="/admin/plans" element={<AdminPlans />} />
                </Route>
              </Route>

              <Route path="*" element={<PageNotFound />} />
            </Routes>
            <Toaster />
          </Router>
        </QueryClientProvider>
      </ThemeProvider>
    </AuthProvider>
  );
}

export default App;