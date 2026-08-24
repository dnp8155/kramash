import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Smartphone, Loader2, ArrowLeft, Info } from "lucide-react";
import AuthLayout from "@/components/AuthLayout";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { sendPhoneOtp, verifyPhoneOtp, isValidMobileNumber, otpProviderStatus } from "@/lib/phoneOtp";
import { safeReturnTo } from "@/lib/authReturnTo";

export default function PhoneLogin() {
  const [step, setStep] = useState("phone"); // phone | otp
  const [phone, setPhone] = useState("+91");
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [resendIn, setResendIn] = useState(0);
  const returnTo = safeReturnTo();

  useEffect(() => {
    if (resendIn <= 0) return;
    const t = setTimeout(() => setResendIn((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [resendIn]);

  const handleSend = async (e) => {
    e.preventDefault();
    setError("");
    if (!isValidMobileNumber(phone)) {
      setError("Enter a valid mobile number with country code (e.g. +91…).");
      return;
    }
    setLoading(true);
    try {
      await sendPhoneOtp(phone);
      setStep("otp");
      setResendIn(30);
    } catch (err) {
      setError(err.message || "Could not send OTP.");
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async () => {
    setError("");
    setLoading(true);
    try {
      await verifyPhoneOtp(phone, code);
      window.location.href = returnTo;
    } catch (err) {
      setError(err.message || "Invalid or expired code.");
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    setError("");
    setLoading(true);
    try {
      await sendPhoneOtp(phone);
      setResendIn(30);
    } catch (err) {
      setError(err.message || "Could not resend OTP.");
    } finally {
      setLoading(false);
    }
  };

  const pending = otpProviderStatus === "pending";

  return (
    <AuthLayout
      icon={Smartphone}
      title="Phone Login"
      subtitle="Sign in with a one-time code"
      footer={
        <Link to="/login" className="inline-flex items-center gap-1 text-primary font-medium hover:underline">
          <ArrowLeft className="w-3.5 h-3.5" /> Back to login
        </Link>
      }
    >
      {pending && (
        <div className="mb-4 p-3 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 text-sm flex gap-2">
          <Info className="w-4 h-4 shrink-0 mt-0.5" />
          <span>Phone OTP login is ready, but an external SMS/OTP provider must be configured before codes can be delivered.</span>
        </div>
      )}

      {error && (
        <div className="mb-4 p-3 rounded-lg bg-destructive/10 text-destructive text-sm">{error}</div>
      )}

      {step === "phone" && (
        <form onSubmit={handleSend} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="phone">Mobile Number</Label>
            <div className="relative">
              <Smartphone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" aria-hidden="true" />
              <Input
                id="phone"
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+91 98765 43210"
                className="pl-10 h-12"
                autoFocus
              />
            </div>
          </div>
          <Button type="submit" className="w-full h-12 font-medium" disabled={loading}>
            {loading ? (<><Loader2 className="w-4 h-4 mr-2 animate-spin" />Sending…</>) : "Send OTP"}
          </Button>
        </form>
      )}

      {step === "otp" && (
        <>
          <p className="text-sm text-muted-foreground mb-4">We sent a code to {phone}</p>
          <div className="flex justify-center mb-6">
            <InputOTP maxLength={6} value={code} onChange={setCode} autoFocus>
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
          <Button className="w-full h-12 font-medium" onClick={handleVerify} disabled={loading || code.length < 6}>
            {loading ? (<><Loader2 className="w-4 h-4 mr-2 animate-spin" />Verifying…</>) : "Verify & Continue"}
          </Button>
          <p className="text-center text-sm text-muted-foreground mt-4">
            {resendIn > 0 ? (
              `Resend code in ${resendIn}s`
            ) : (
              <>Didn't receive it?{" "}
                <button onClick={handleResend} className="text-primary font-medium hover:underline">Resend</button>
              </>
            )}
          </p>
        </>
      )}
    </AuthLayout>
  );
}