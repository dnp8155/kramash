import { withCors } from "../_shared/cors.ts";
import { getUserFromRequest } from "../_shared/supabaseClient.ts";
import nodemailer from "npm:nodemailer";

function buildWelcomeHtml(name: string): string {
  const displayName = name ? name.trim() : "there";
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="color-scheme" content="light">
  <title>Welcome to Kramasha</title>
</head>
<body style="margin: 0; padding: 0; background-color: #FDFBF8; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
  <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #FDFBF8; padding: 40px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="max-width: 500px;">

          <!-- Logo -->
          <tr>
            <td align="center" style="padding-bottom: 24px;">
              <img src="https://kramasha.app/kramasha_logo_192x192.png" alt="Kramasha" width="48" height="48" style="display: inline-block; vertical-align: middle; border: 0; border-radius: 12px;" />
              <span style="display: inline-block; vertical-align: middle; margin-left: 10px; font-size: 22px; font-weight: 700; color: #1A1D21;">Kramasha</span>
            </td>
          </tr>

          <!-- Card -->
          <tr>
            <td style="background-color: #FFFFFF; border: 1px solid #E5E3DF; border-radius: 16px; overflow: hidden;">
              <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0">
                <tr><td style="height: 4px; background-color: #C8A95E;"></td></tr>
                <tr>
                  <td style="padding: 36px 32px 32px 32px;">
                    <h1 style="margin: 0 0 12px 0; font-size: 24px; font-weight: 700; letter-spacing: -0.3px; color: #1A1D21;">Welcome to Kramasha, ${displayName}!</h1>
                    <p style="margin: 0 0 24px 0; font-size: 15px; line-height: 1.6; color: #5E6165;">
                      We're glad to have you onboard. Kramasha helps you run your business with less effort: quotations, events, payments and reminders, all in one place.
                    </p>

                    <!-- Features -->
                    <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #F5F3EF; border-radius: 12px; margin-bottom: 28px;">
                      <tr>
                        <td style="padding: 20px;">
                          <p style="margin: 0 0 14px 0; font-size: 12px; font-weight: 700; letter-spacing: 1px; text-transform: uppercase; color: #C8A95E;">What you can do</p>
                          <p style="margin: 0 0 12px 0; font-size: 14px; line-height: 1.5; color: #1A1D21;">
                            <strong>Event &amp; project tracking</strong><br>
                            <span style="color: #5E6165;">Never miss a date with automated timelines.</span>
                          </p>
                          <p style="margin: 0 0 12px 0; font-size: 14px; line-height: 1.5; color: #1A1D21;">
                            <strong>Professional quotations</strong><br>
                            <span style="color: #5E6165;">Create, share and get client signatures online.</span>
                          </p>
                          <p style="margin: 0; font-size: 14px; line-height: 1.5; color: #1A1D21;">
                            <strong>Smart reminders</strong><br>
                            <span style="color: #5E6165;">Push and in-app alerts for payment milestones.</span>
                          </p>
                        </td>
                      </tr>
                    </table>

                    <!-- Button -->
                    <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="margin-bottom: 24px;">
                      <tr>
                        <td align="center">
                          <a href="https://kramasha.app/dashboard" target="_blank" style="display: inline-block; background-color: #2D4899; color: #FFFFFF; font-size: 15px; font-weight: 600; text-decoration: none; padding: 14px 32px; border-radius: 12px;">
                            Open your dashboard &rarr;
                          </a>
                        </td>
                      </tr>
                    </table>

                    <p style="margin: 0; font-size: 13px; line-height: 1.6; color: #8F9296; text-align: center;">
                      Need help getting started? Reply to this email or visit our <a href="https://kramasha.app/help" style="color: #2D4899; text-decoration: none;">Help Center</a>.
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td align="center" style="padding-top: 24px;">
              <p style="margin: 0; font-size: 12px; color: #B5B7BB;">&copy; 2026 Kramasha</p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

Deno.serve(withCors(async (req) => {
  try {
    const user = await getUserFromRequest(req);
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const targetEmail = body?.email || user.email;
    const targetName = body?.name || user.user_metadata?.full_name || "";

    if (!targetEmail) return Response.json({ error: "Email is required" }, { status: 400 });

    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    const smtpHost = Deno.env.get("SMTP_HOST");
    const smtpUser = Deno.env.get("SMTP_USER");
    const smtpPass = Deno.env.get("SMTP_PASS");
    const smtpPort = parseInt(Deno.env.get("SMTP_PORT") || "587", 10);
    const smtpFrom = Deno.env.get("SMTP_FROM") || "Kramasha <noreply@kramasha.app>";

    const htmlContent = buildWelcomeHtml(targetName);
    const subject = `Welcome to Kramasha, ${targetName || "Friend"}!`;

    // 1. Try Resend API if API Key is configured
    if (resendApiKey) {
      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${resendApiKey}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          from: smtpFrom,
          to: [targetEmail],
          subject,
          html: htmlContent
        })
      });
      const data = await res.json();
      return Response.json({ sent: true, provider: "resend", details: data });
    }

    // 2. Try SMTP via Nodemailer if SMTP env vars are configured
    if (smtpHost && smtpUser && smtpPass) {
      const transporter = nodemailer.createTransport({
        host: smtpHost,
        port: smtpPort,
        secure: smtpPort === 465,
        auth: { user: smtpUser, pass: smtpPass }
      });

      await transporter.sendMail({
        from: smtpFrom,
        to: targetEmail,
        subject,
        html: htmlContent
      });

      return Response.json({ sent: true, provider: "smtp" });
    }

    return Response.json({
      sent: false,
      reason: "No email provider configured. Please set RESEND_API_KEY or SMTP_HOST/SMTP_USER/SMTP_PASS in Edge Function Secrets.",
      templateReady: true
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}));
