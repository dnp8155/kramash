import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Phone, ArrowLeft, ShieldCheck } from "lucide-react";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";

const COUNTRY_CODES = [
  { code: "+91", label: "🇮🇳 +91" },
  { code: "+1", label: "🇺🇸 +1" },
  { code: "+44", label: "🇬🇧 +44" },
  { code: "+971", label: "🇦🇪 +971" },
  { code: "+65", label: "🇸🇬 +65" },
];

// Normalizes the backend function response whether the SDK resolves or throws
// on non-2xx status codes.
async function invokeOtp(payload) {
  try {
    const res = await base44.functions.invoke("phoneOtp", payload);
    return { ok: res.status >= 200 && res.status < 300, status: res.status, data: res.data || {} };
  } catch (err) {
    const status = err?.response?.status || 0;
    const data = err?.response?.data || {};
    const message = err?.message || "";
    // A platform-level block because the SMS provider secrets aren't set yet.
    const notConfigured =
      status === 503 ||
      data?.configured === false ||
      /missing required secrets|not configured|TWILIO/i.test(message);
    return { ok: false, status, data, message, notConfigured };
  }
}

export default function PhoneOtpForm() {
  const [step, setStep] = useState("phone"); // phone | otp | done
  const [countryCode, setCountryCode] = useState("+91");
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [loading, setLoading] = useState(false);
  const [resendTimer, setResendTimer] = useState(0);

  const fullPhone = `${countryCode}${phone.replace(/\s/g, "")}`;

  useEffect(() => {
    if (resendTimer <= 0) return;
    const t = setTimeout(() => setResendTimer((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [resendTimer]);

  const handleSend = async () => {
    setError("");
    setInfo("");
    if (!/^\d{10}$/.test(phone.replace(/\s/g, ""))) {
      setError("Enter a valid 10-digit mobile number.");
      return;
    }
    setLoading(true);
    const r = await invokeOtp({ action: "send", phone: fullPhone });
    setLoading(false);
    if (r.notConfigured) {
      setInfo("Phone OTP login is not available yet. It requires an SMS provider to be configured. Please use email or Google to sign in.");
      return;
    }
    if (!r.ok) {
      setError(r.data?.error || r.message || "Failed to send OTP.");
      return;
    }
    setStep("otp");
    setResendTimer(30);
  };

  const handleVerify = async () => {
    setError("");
    setInfo("");
    setLoading(true);
    const r = await invokeOtp({ action: "verify", phone: fullPhone, code: otp });
    setLoading(false);
    if (r.notConfigured) {
      setInfo("Phone OTP login is not available yet. It requires an SMS provider to be configured.");
      setStep("phone");
      return;
    }
    if (!r.ok) {
      setError(r.data?.error || "Invalid or expired OTP.");
      return;
    }
    setStep("done");
    setInfo("Phone number verified. Phone-based session login requires platform phone-auth support (pending). Please use email or Google to complete sign in.");
  };

  const handleResend = async () => {
    setError("");
    setLoading(true);
    const r = await invokeOtp({ action: "send", phone: fullPhone });
    setLoading(false);
    if (r.notConfigured) {
      setInfo("Phone OTP is not available yet.");
      return;
    }
    if (!r.ok) {
      setError(r.data?.error || "Failed to resend OTP.");
      return;
    }
    setResendTimer(30);
  };

  if (step === "done") {
    return (
      <div className="flex flex-col items-center gap-3 py-4 text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-success/15 text-success">
          <ShieldCheck className="h-6 w-6" />
        </div>
        <p className="text-sm text-muted-foreground">{info}</p>
      </div>
    );
  }

  if (step === "otp") {
    return (
      <div className="space-y-4">
        {info && <div className="p-3 rounded-lg bg-info/10 text-info text-sm">{info}</div>}
        {error && <div className="p-3 rounded-lg bg-destructive/10 text-destructive text-sm">{error}</div>}
        <p className="text-sm text-muted-foreground text-center">Enter the code sent to {fullPhone}</p>
        <div className="flex justify-center">
          <InputOTP maxLength={6} value={otp} onChange={setOtp} autoFocus autoComplete="one-time-code">
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
        <Button className="w-full h-12 font-medium" onClick={handleVerify} disabled={loading || otp.length < 6}>
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Verifying...
            </>
          ) : (
            "Verify & Continue"
          )}
        </Button>
        <div className="flex items-center justify-between text-sm">
          <button type="button" onClick={() => setStep("phone")} className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1">
            <ArrowLeft className="w-4 h-4" /> Change number
          </button>
          <button type="button" onClick={handleResend} disabled={resendTimer > 0 || loading} className="text-primary font-medium hover:underline disabled:opacity-50">
            {resendTimer > 0 ? `Resend in ${resendTimer}s` : "Resend OTP"}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {info && <div className="p-3 rounded-lg bg-info/10 text-info text-sm">{info}</div>}
      {error && <div className="p-3 rounded-lg bg-destructive/10 text-destructive text-sm">{error}</div>}
      <div className="space-y-2">
        <Label htmlFor="phone">Mobile Number</Label>
        <div className="flex gap-2">
          <select
            value={countryCode}
            onChange={(e) => setCountryCode(e.target.value)}
            className="h-12 rounded-lg border border-input bg-card px-3 text-sm text-foreground focus:border-primary focus:outline-none"
          >
            {COUNTRY_CODES.map((c) => (
              <option key={c.code} value={c.code}>
                {c.label}
              </option>
            ))}
          </select>
          <div className="relative flex-1">
            <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              id="phone"
              type="tel"
              inputMode="numeric"
              placeholder="9820011223"
              value={phone}
              onChange={(e) => setPhone(e.target.value.replace(/[^\d]/g, ""))}
              className="pl-10 h-12"
              maxLength={10}
            />
          </div>
        </div>
      </div>
      <Button className="w-full h-12 font-medium" onClick={handleSend} disabled={loading}>
        {loading ? (
          <>
            <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Sending OTP...
          </>
        ) : (
          "Send OTP"
        )}
      </Button>
    </div>
  );
}