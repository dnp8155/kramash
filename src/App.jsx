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
import Events from "@/pages/Events";
import Team from "@/pages/Team";
import Financial from "@/pages/Financial";
import RateEstimator from "@/pages/RateEstimator";
import Quotation from "@/pages/Quotation";
import Preferences from "@/pages/Preferences";
import AppUpdates from "@/pages/AppUpdates";
import Plan from "@/pages/Plan";
import Login from "@/pages/Login";
import Register from "@/pages/Register";
import ForgotPassword from "@/pages/ForgotPassword";
import ResetPassword from "@/pages/ResetPassword";
import Onboarding from "@/pages/Onboarding";

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
        <Outlet />
      </WorkspaceGate>
    </WorkspaceProvider>
  </AuthReady>
);

// Route for onboarding: auth required, but NO workspace (chicken-and-egg).
const OnboardingGate = () => {
  const { loading, needsOnboarding } = useWorkspace();
  if (loading) return <FullScreenSpinner label="Loading your workspace..." />;
  if (!needsOnboarding) return <Navigate to="/" replace />;
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

              {/* Onboarding (authenticated, no app shell) */}
              <Route path="/onboarding" element={<OnboardingRoute />} />

              {/* Protected application */}
              <Route element={<AuthenticatedApp />}>
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