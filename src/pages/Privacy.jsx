import AuthLogo from "@/components/auth/AuthLogo";

const SECTIONS = [
  {
    title: "1. Information We Collect",
    body: "We collect the information you provide during account registration (name, email), and the business data you enter into your workspace (clients, projects, team members, quotations, and financial records).",
  },
  {
    title: "2. How We Use Information",
    body: "We use your information to provide and improve the Kramashah service, to communicate with you about your account, and to ensure the security of your data.",
  },
  {
    title: "3. Data Sharing",
    body: "We do not sell your data. We share data only with service providers who help us operate the platform, and when required by law. Workspace data is scoped to your workspace and accessible only to your workspace members.",
  },
  {
    title: "4. Data Security",
    body: "We use industry-standard practices to protect your data, including encrypted transmission and access controls. No method of storage is completely secure, but we work to protect your information.",
  },
  {
    title: "5. Your Rights",
    body: "You can access, update, or delete your data through the platform. You can request export of your data or closure of your account at any time.",
  },
  {
    title: "6. Cookies",
    body: "Kramashah uses essential cookies to maintain your authenticated session. We do not use cookies for third-party advertising.",
  },
  {
    title: "7. Data Retention",
    body: "We retain your data for as long as your account is active. When you delete your account, we remove your data within a reasonable period, subject to legal retention requirements.",
  },
  {
    title: "8. Changes to This Policy",
    body: "We may update this privacy policy from time to time. We will notify you of significant changes through the platform or your registered email.",
  },
  {
    title: "9. Contact",
    body: "For questions about this privacy policy or your data, please contact your workspace administrator or reach out to Kramashah support.",
  },
];

export default function Privacy() {
  return (
    <div className="min-h-dvh bg-white">
      <div className="mx-auto max-w-3xl px-6 py-12">
        <AuthLogo />
        <div className="mt-10">
          <h1 className="text-3xl font-bold tracking-tight text-foreground">
            Privacy Policy
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