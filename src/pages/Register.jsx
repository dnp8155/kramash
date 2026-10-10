import React, { useState } from "react";
import { sanitizeEmailInput } from "@/lib/validation";
import { Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Mail, Lock, Loader2, ArrowRight, Eye, EyeOff, Check, Circle, X } from "lucide-react";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import Logo from "@/components/common/Logo";
import GoogleIcon from "@/components/GoogleIcon";
import AuthDesktopPreview from "@/components/landing/previews/AuthDesktopPreview";
import MobilePreview from "@/components/landing/previews/MobilePreview";
import { toast } from "@/components/ui/use-toast";
import { safeReturnTo } from "@/lib/authReturnTo";
import usePageTitle from "@/hooks/usePageTitle";

const PASSWORD_RULES = [
  { id: "length", label: "At least 8 characters", test: (p) => p.length >= 8 },
  { id: "lower", label: "A lowercase letter (a-z)", test: (p) => /[a-z]/.test(p) },
  { id: "upper", label: "An uppercase letter (A-Z)", test: (p) => /[A-Z]/.test(p) },
  { id: "number", label: "A number (0-9)", test: (p) => /[0-9]/.test(p) },
  { id: "symbol", label: "A symbol (e.g. !@#$%)", test: (p) => /[^A-Za-z0-9]/.test(p) },
];

const AGREE_ERROR = "Please agree to the Terms of Service and Privacy Policy to create an account.";

export default function Register() {
  usePageTitle("Sign up");
  const queryParams = new URLSearchParams(window.location.search);
  const initialEmail = queryParams.get("email") || "";
  const autoRedirected = queryParams.get("autoRedirected") === "true";

  const [email, setEmail] = useState(initialEmail);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [infoBanner] = useState(autoRedirected ? "No account found with this email. Create an account below to get started!" : "");
  const [loading, setLoading] = useState(false);
  const [showOtp, setShowOtp] = useState(false);
  const [otpCode, setOtpCode] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [agreed, setAgreed] = useState(false);

  const passwordChecks = PASSWORD_RULES.map((r) => ({ ...r, ok: r.test(password) }));
  const passwordValid = passwordChecks.every((r) => r.ok);
  const passwordsMatch = password === confirmPassword;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    if (!passwordValid) {
      setError("Please meet all the password requirements.");
      return;
    }
    if (!agreed) {
      setError(AGREE_ERROR);
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }
    setLoading(true);
    try {
      const data = await base44.auth.register({ email, password });
      // If user is already confirmed, they should log in instead
      if (data?.user?.email_confirmed_at && !data?.session) {
        throw new Error("An account with this email already exists. Try logging in instead.");
      }
      
      // If Supabase gave us a session immediately (e.g. Email Confirmation is OFF), redirect directly
      if (data?.session) {
        window.location.href = safeReturnTo();
        return;
      }

      setShowOtp(true);
    } catch (err) {
      const msg = typeof err === 'string' ? err : (err?.message || err?.error_description || "Failed to send verification code. Please try again.");
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async () => {
    setError("");
    setLoading(true);
    try {
      await base44.auth.verifyOtp({ email, otpCode });
      window.location.href = safeReturnTo();
    } catch (err) {
      const msg = typeof err === 'string' ? err : (err?.message || err?.error_description || "Invalid verification code. Please try again.");
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    setError("");
    setLoading(true);
    try {
      await base44.auth.resendOtp(email);
      toast({
        title: "Code sent",
        description: "Check your email for the new code.",
      });
    } catch (err) {
      const msg = typeof err === 'string' ? err : (err?.message || err?.error_description || "Failed to resend code. Please try again.");
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogle = () => {
    base44.auth.loginWithProvider("google", safeReturnTo());
  };

  const returnTo = safeReturnTo();
  const loginLink = "/login" + (returnTo !== "/" ? "?returnTo=" + encodeURIComponent(returnTo) : "");

  return (
    <div className="h-screen flex bg-[#FDFBF8] overflow-hidden">
      {/* Left — form area */}
      <div className="flex-1 flex flex-col px-6 sm:px-10 lg:px-16 xl:px-20 py-6 overflow-hidden">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-2.5 self-start">
          <Logo size={40} className="rounded-xl" />
          <span className="text-xl font-bold text-[#1A1D21]">Kramasha</span>
        </Link>

        {/* Form area */}
        <div className="flex-1 flex flex-col justify-center max-w-md w-full mx-auto lg:mx-0 py-8 overflow-y-auto">
          {showOtp ? (
            <>
              <h1 className="text-3xl font-bold tracking-tight text-[#1A1D21]">Verify your email</h1>
              <p className="text-[#8F9296] mt-2 mb-8">We sent a 6-digit code to {email}</p>

              {error && (
                <div className="mb-4 p-3 rounded-lg bg-red-50 text-red-600 text-sm border border-red-100">
                  {error}
                </div>
              )}

              <div className="flex justify-center mb-6">
                <InputOTP
                  maxLength={6}
                  value={otpCode}
                  onChange={setOtpCode}
                  autoFocus
                  autoComplete="one-time-code"
                >
                  <InputOTPGroup>
                    <InputOTPSlot index={0} />
                    <InputOTPSlot index={1} />
                    <InputOTPSlot index={2} />
                    <InputOTPSlot index={3} />
                    <InputOTPSlot index={4} />
                    <InputOTPSlot index={5} />
                  </InputOTPGroup>
                </InputOTP>
              </div>

              <Button
                className="w-full h-12 bg-[#2D4899] hover:bg-[#243A7A] text-white font-medium rounded-xl gap-2 group"
                onClick={handleVerify}
                disabled={loading || otpCode.length < 6}
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Verifying...
                  </>
                ) : (
                  <>
                    Verify
                    <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
                  </>
                )}
              </Button>

              <p className="text-center text-sm text-[#8F9296] mt-4">
                Didn't receive the code?{" "}
                <button onClick={handleResend} className="text-[#2D4899] font-medium hover:underline">
                  Resend
                </button>
              </p>
            </>
          ) : (
            <>
              <h1 className="text-3xl font-bold tracking-tight text-[#1A1D21]">Create your account</h1>
              <p className="text-[#8F9296] mt-2 mb-8">Sign up to get started with Kramasha.</p>

              {infoBanner && !error && (
                <div className="mb-4 p-3 rounded-lg bg-blue-50 text-blue-700 text-sm border border-blue-100">
                  {infoBanner}
                </div>
              )}

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
                      placeholder="Email address"
                      value={email}
                      onChange={(e) => setEmail(sanitizeEmailInput(e.target.value))} inputMode="email" autoCapitalize="none" autoCorrect="off" spellCheck={false}
                      className="pl-11 h-12 bg-white border-[#E5E3DF] rounded-xl text-[#1A1D21] placeholder:text-[#B5B7BB]"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password" className="text-sm font-medium text-[#1A1D21]">Password</Label>
                  <div className="relative">
                    <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#8F9296]" aria-hidden="true" />
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      autoComplete="new-password"
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
                  {password.length > 0 && !passwordValid && (
                    <ul className="space-y-1 pt-1" aria-live="polite">
                      {passwordChecks.map((r) => (
                        <li key={r.id} className={`flex items-center gap-2 text-xs ${r.ok ? "text-green-600" : "text-[#8F9296]"}`}>
                          {r.ok ? <Check className="w-3.5 h-3.5" aria-hidden="true" /> : <Circle className="w-3.5 h-3.5" aria-hidden="true" />}
                          {r.label}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="confirm" className="text-sm font-medium text-[#1A1D21]">Confirm password</Label>
                  <div className="relative">
                    <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#8F9296]" aria-hidden="true" />
                    <Input
                      id="confirm"
                      type={showConfirm ? "text" : "password"}
                      autoComplete="new-password"
                      placeholder="••••••••"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="pl-11 pr-11 h-12 bg-white border-[#E5E3DF] rounded-xl text-[#1A1D21] placeholder:text-[#B5B7BB]"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirm(!showConfirm)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#8F9296] hover:text-[#1A1D21] transition-colors"
                      tabIndex={-1}
                    >
                      {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  {confirmPassword.length > 0 && (
                    <p
                      className={`flex items-center gap-2 text-xs pt-1 ${passwordsMatch ? "text-green-600" : "text-red-600"}`}
                      aria-live="polite"
                    >
                      {passwordsMatch ? <Check className="w-3.5 h-3.5" aria-hidden="true" /> : <X className="w-3.5 h-3.5" aria-hidden="true" />}
                      {passwordsMatch ? "Passwords match" : "Passwords do not match"}
                    </p>
                  )}
                </div>

                <label className="flex items-start gap-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={agreed}
                    onChange={(e) => { setAgreed(e.target.checked); if (e.target.checked) setError((prev) => (prev === AGREE_ERROR ? "" : prev)); }}
                    className="block mt-[2px]"
                    required
                  />
                  <span className="text-sm leading-5 text-[#8F9296]">
                    I agree to the{" "}
                    <Link to="/terms" target="_blank" rel="noopener noreferrer" className="text-[#2D4899] font-medium hover:underline">Terms of Service</Link>
                    {" "}and{" "}
                    <Link to="/privacy" target="_blank" rel="noopener noreferrer" className="text-[#2D4899] font-medium hover:underline">Privacy Policy</Link>.
                  </span>
                </label>

                <Button
                  type="submit"
                  disabled={loading}
                  className="w-full h-12 bg-[#2D4899] hover:bg-[#243A7A] text-white font-medium rounded-xl gap-2 group"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Sending code...
                    </>
                  ) : (
                    <>
                      Create account
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
                className="w-full h-12 bg-white border-[#E5E3DF] hover:bg-gray-50 text-[#1A1D21] hover:text-[#1A1D21] font-medium rounded-xl"
                onClick={handleGoogle}
              >
                <GoogleIcon className="w-5 h-5 mr-2" />
                Continue with Google
              </Button>

              {/* Footer link */}
              <p className="text-center text-sm text-[#8F9296] mt-6">
                Already have an account?{" "}
                <Link to={loginLink} className="text-[#2D4899] font-medium hover:underline">
                  Log in
                </Link>
              </p>
            </>
          )}
        </div>

        {/* Copyright */}
        <p className="text-xs text-[#B5B7BB]">© 2026 Kramasha</p>
      </div>

      {/* Right — dashboard preview */}
      <div className="hidden lg:flex flex-1 max-w-[760px] border-l border-[#E5E3DF] bg-[#F5F3EF] items-center justify-center p-10 overflow-hidden relative">
        <div className="absolute -inset-4 bg-[#C8A95E]/5 rounded-3xl blur-3xl" />
        <div className="relative w-full max-w-[640px]">
          <AuthDesktopPreview />
          <div className="hidden lg:block absolute -bottom-6 -right-6 z-20">
            <MobilePreview />
          </div>
        </div>
      </div>
    </div>
  );
}