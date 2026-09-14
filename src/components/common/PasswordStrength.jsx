import React from "react";

export default function PasswordStrength({ password }) {
  if (!password || password.length < 3) return null;
  let score = 0;
  if (password.length >= 6) score++;
  if (password.length >= 10) score++;
  if (/[A-Z]/.test(password) && /[a-z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;

  const level = score <= 2 ? "Weak" : score === 3 ? "Good" : "Strong";
  const color = score <= 2 ? "text-destructive" : score === 3 ? "text-warning" : "text-success";
  const barColor = score <= 2 ? "bg-destructive" : score === 3 ? "bg-warning" : "bg-success";
  const bars = score <= 2 ? 1 : score === 3 ? 2 : 3;

  return (
    <div className="flex items-center gap-2 mt-1.5">
      <div className="flex gap-1">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className={`h-1 w-8 rounded-full transition-colors ${i <= bars ? barColor : "bg-muted"}`}
          />
        ))}
      </div>
      <span className={`text-xs font-medium ${color}`}>{level}</span>
    </div>
  );
}