import React, { useState } from "react";
import { Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Mail, Lock, Loader2, ArrowRight, Eye, EyeOff } from "lucide-react";
import Logo from "@/components/common/Logo";
import GoogleIcon from "@/components/GoogleIcon";
import LoginPreview from "@/components/auth/LoginPreview";
import { safeReturnTo } from "@/lib/authReturnTo";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const returnTo = safeReturnTo();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await base44.auth.loginViaEmailPassword(email, password);
      window.location.href = returnTo;
    } catch (err) {
      setError(err.message || "Invalid email or password");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogle = () => {
    base44.auth.loginWithProvider("google", returnTo);
  };

  return (
    <div className="h-screen flex bg-[#FDFBF8] overflow-hidden">
      {/* Left — login form */}
      <div className="flex-1 flex flex-col px-6 sm:px-10 lg:px-16 xl:px-20 py-6 overflow-hidden">
        {/* Logo */}
        <div className="flex items-center gap-2.5">
          <Logo size={40} className="rounded-xl" />
          <span className="text-xl font-bold text-[#1A1D21]">Kramasha</span>
        </div>

        {/* Form area */}
        <div className="flex-1 flex flex-col justify-center max-w-md w-full mx-auto lg:mx-0 py-8">
          <h1 className="text-3xl font-bold tracking-tight text-[#1A1D21]">Welcome back</h1>
          <p className="text-[#8F9296] mt-2 mb-8">Sign in to continue managing your business.</p>

          {error && (
            <div className="mb-4 p-3 rounded-lg bg-red-50 text-red-600 text-sm border border-red-100">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-sm font-medium text-[#1A1D21]">Email address</Label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#8F9296]" aria-hidden="true" />
                <Input
                  id="email"
                  type="email"
                  autoComplete="email"
                  autoFocus
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-11 h-12 bg-white border-[#E5E3DF] rounded-xl text-[#1A1D21] placeholder:text-[#B5B7BB]"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password" className="text-sm font-medium text-[#1A1D21]">Password</Label>
                <Link to="/forgot-password" className="text-xs text-[#2D4899] hover:underline font-medium">
                  Forgot password?
                </Link>
              </div>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#8F9296]" aria-hidden="true" />
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-11 pr-11 h-12 bg-white border-[#E5E3DF] rounded-xl text-[#1A1D21] placeholder:text-[#B5B7BB]"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#8F9296] hover:text-[#1A1D21] transition-colors"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <Button
              type="submit"
              disabled={loading}
              className="w-full h-12 bg-[#2D4899] hover:bg-[#243A7A] text-white font-medium rounded-xl gap-2 group"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Signing in...
                </>
              ) : (
                <>
                  Sign In
                  <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
                </>
              )}
            </Button>
          </form>

          {/* Divider */}
          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-[#E5E3DF]" />
            </div>
            <div className="relative flex justify-center text-xs">
              <span className="bg-[#FDFBF8] px-3 text-[#8F9296]">or</span>
            </div>
          </div>

          {/* Google */}
          <Button
            variant="outline"
            className="w-full h-12 bg-white border-[#E5E3DF] hover:bg-gray-50 text-[#1A1D21] font-medium rounded-xl"
            onClick={handleGoogle}
          >
            <GoogleIcon className="w-5 h-5 mr-2" />
            Continue with Google
          </Button>

          {/* Footer link */}
          <p className="text-center text-sm text-[#8F9296] mt-6">
            New to Kramasha?{" "}
            <Link
              to={"/register" + (returnTo !== "/" ? "?returnTo=" + encodeURIComponent(returnTo) : "")}
              className="text-[#2D4899] font-medium hover:underline"
            >
              Create account
            </Link>
          </p>
        </div>

        {/* Copyright */}
        <p className="text-xs text-[#B5B7BB]">© 2026 Kramasha</p>
      </div>

      {/* Right — dashboard preview */}
      <div className="hidden lg:flex flex-1 max-w-[640px] border-l border-[#E5E3DF] overflow-hidden">
        <LoginPreview />
      </div>
    </div>
  );
}