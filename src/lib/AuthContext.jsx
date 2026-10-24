import React, { createContext, useState, useContext, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { appParams } from '@/lib/app-params';
import { ensureFreshSession } from '@/lib/supabaseClient';
import { startSessionKeeper, SESSION_RECOVERED_EVENT, SESSION_EXPIRED_KEY } from '@/lib/sessionKeeper';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);
  const [isLoadingPublicSettings, setIsLoadingPublicSettings] = useState(true);
  const [authError, setAuthError] = useState(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [appPublicSettings, setAppPublicSettings] = useState(null); // Contains only { id, public_settings }

  useEffect(() => {
    checkAppState();
    
    // Listen for auth events (like clicking a magic link or token refresh)
    const { data: authListener } = base44.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN') {
        checkAppState(false);
      } else if (event === 'PASSWORD_RECOVERY') {
        // User clicked a reset password link!
        if (typeof window !== 'undefined') {
          window.location.href = '/reset-password';
        }
      } else if (event === 'SIGNED_OUT') {
        if (typeof window !== 'undefined' && window.__isExplicitLogout) {
          // The user pressed Log out.
          setUser(null);
          setIsAuthenticated(false);
        } else {
          // The session ended on its own (refresh failed, token revoked, another tab…). Do NOT just carry on:
          // requests would go out anonymous and every list would come back empty. Try to rebuild the session
          // from the stored refresh token; only if that is really impossible, sign out cleanly.
          ensureFreshSession({ force: true }).then((result) => {
            if (result.ok) {
              window.dispatchEvent(new Event(SESSION_RECOVERED_EVENT));
            } else if (result.reason !== 'network') {
              console.warn('[Kramasha] Session ended (signed out by Supabase and could not be rebuilt):', result.reason, result.error?.message || result.error?.code || '');
              expireSession();
            }
          });
        }
      }
    });

    return () => {
      authListener?.subscription?.unsubscribe();
    };
  }, []);

  // The login really is gone (not just a network hiccup): show the signed-out state so the route guards
  // send the user to the login page (which explains what happened) instead of leaving an empty app.
  const expireSession = () => {
    try { sessionStorage.setItem(SESSION_EXPIRED_KEY, '1'); } catch { /* noop */ }
    setUser(null);
    setIsAuthenticated(false);
  };

  // While signed in, keep the access token fresh (see sessionKeeper.js).
  useEffect(() => {
    if (!isAuthenticated) return undefined;
    return startSessionKeeper({ onLost: expireSession });
  }, [isAuthenticated]);

  const checkAppState = async (showLoading = true) => {
    try {
      if (showLoading) setIsLoadingPublicSettings(true);
      setAuthError(null);
      
      try {
        let publicSettings = null;
        try {
          publicSettings = await base44.app.getPublicSettings();
        } catch { /* non-fatal — app may not have public settings */ }
        setAppPublicSettings(publicSettings);

        // Check Supabase session (not Base44 token)
        const isAuthed = await base44.auth.isAuthenticated();
        if (isAuthed) {
          await checkUserAuth(showLoading);
        } else {
          setIsLoadingAuth(false);
          setIsAuthenticated(false);
          setAuthChecked(true);
        }
        setIsLoadingPublicSettings(false);
      } catch (appError) {
        console.error('App state check failed:', appError);
        
        // Handle app-level errors
        if (appError.status === 403 && appError.data?.extra_data?.reason) {
          const reason = appError.data.extra_data.reason;
          if (reason === 'auth_required') {
            setAuthError({
              type: 'auth_required',
              message: 'Authentication required'
            });
          } else if (reason === 'user_not_registered') {
            setAuthError({
              type: 'user_not_registered',
              message: 'User not registered for this app'
            });
          } else {
            setAuthError({
              type: reason,
              message: appError.message
            });
          }
        } else {
          setAuthError({
            type: 'unknown',
            message: appError.message || 'Failed to load app'
          });
        }
        setIsLoadingPublicSettings(false);
        setIsLoadingAuth(false);
      }
    } catch (error) {
      console.error('Unexpected error:', error);
      setAuthError({
        type: 'unknown',
        message: error.message || 'An unexpected error occurred'
      });
      setIsLoadingPublicSettings(false);
      setIsLoadingAuth(false);
    }
  };

  const checkUserAuth = async (showLoading = true) => {
    try {
      if (showLoading) setIsLoadingAuth(true);
      const currentUser = await base44.auth.me();
      setUser(currentUser);
      setIsAuthenticated(true);
      setIsLoadingAuth(false);
      setAuthChecked(true);
    } catch (error) {
      console.error('User auth check failed:', error);
      setIsLoadingAuth(false);
      setIsAuthenticated(false);
      setAuthChecked(true);
      
      // If user auth fails, it might be an expired token
      if (error.status === 401 || error.status === 403) {
        setAuthError({
          type: 'auth_required',
          message: 'Authentication required'
        });
      }
    }
  };

  const logout = (shouldRedirect = true) => {
    if (shouldRedirect) {
      // Sign out first, then go to the login page ONCE (a full load, so no data from this session is left
      // behind). Auth state is deliberately left alone until then: flipping it first made the router show
      // /login immediately, and the redirect that followed reloaded the old page and showed /login a second time.
      // Returns the promise so callers can keep their "logging out…" state until the page changes.
      return base44.auth.logout(`${window.location.origin}/login`);
    }
    setUser(null);
    setIsAuthenticated(false);
    // Just remove the token without redirect
    return base44.auth.logout();
  };

  const navigateToLogin = () => {
    // Use the SDK's redirectToLogin method
    base44.auth.redirectToLogin(window.location.href);
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      isAuthenticated, 
      isLoadingAuth,
      isLoadingPublicSettings,
      authError,
      appPublicSettings,
      authChecked,
      logout,
      navigateToLogin,
      checkUserAuth,
      checkAppState
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};