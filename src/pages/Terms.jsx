import AuthLogo from "@/components/auth/AuthLogo";

const SECTIONS = [
  {
    title: "1. Acceptance of Terms",
    body: "By creating an account and using Kramashah, you agree to these Terms of Service. If you do not agree, please do not use the service.",
  },
  {
    title: "2. Description of Service",
    body: "Kramashah is a service business management platform that helps you manage clients, projects, team assignments, quotations, and financial transactions in one connected workspace.",
  },
  {
    title: "3. User Accounts",
    body: "You are responsible for maintaining the security of your account and password. You must provide accurate and complete information during registration and keep your information up to date.",
  },
  {
    title: "4. Acceptable Use",
    body: "You agree not to use Kramashah for any unlawful purpose, to violate any applicable law, or to infringe on the rights of others. You are responsible for all activity under your account.",
  },
  {
    title: "5. Your Data",
    body: "You retain ownership of the business data you enter into Kramashah. You are responsible for ensuring you have the right to store and process any client or team information you add.",
  },
  {
    title: "6. Intellectual Property",
    body: "The Kramashah platform, including its design, features, and functionality, is owned by us and protected by intellectual property laws.",
  },
  {
    title: "7. Limitation of Liability",
    body: "Kramashah is provided on an \"as is\" basis without warranties of any kind. We are not liable for any indirect, incidental, or consequential damages arising from your use of the service.",
  },
  {
    title: "8. Termination",
    body: "We may terminate or suspend your account for violation of these terms. You may stop using the service and delete your data at any time.",
  },
  {
    title: "9. Changes to Terms",
    body: "We may update these terms from time to time. Continued use of Kramashah after changes constitutes acceptance of the updated terms.",
  },
  {
    title: "10. Contact",
    body: "For questions about these terms, please contact your workspace administrator or reach out to Kramashah support.",
  },
];

export default function Terms() {
  return (
    <div className="min-h-screen bg-white">
      <div className="mx-auto max-w-3xl px-6 py-12">
        <AuthLogo />
        <div className="mt-10">
          <h1 className="text-3xl font-bold tracking-tight text-foreground">
            Terms of Service
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">Last updated: September 2026</p>
          <div className="mt-8 space-y-6">
            {SECTIONS.map((s) => (
              <section key={s.title}>
                <h2 className="text-base font-semibold text-foreground">{s.title}</h2>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{s.body}</p>
              </section>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}