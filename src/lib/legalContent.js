export const aboutContent = `# About Us

## Kramasha: Creative Business Management Platform

* **Meaning:** Kramasha (क्रमशः) means "in sequence, one step at a time."

That's how a service business should actually run: not scattered across five WhatsApp chats and three Excel sheets, but in order, in one place.

---

### Why We Built This

**The real work isn't the event. It's everything around it.**

If you run an event, a photography studio, an architecture practice, or any business built around jobs and a team, you already know this. The shoot is the easy part. The hard part is who's confirmed for which day, who still owes what, whether the quotation went out, whether the advance came in, whether two team members got double-booked on the same wedding.

Most small and growing businesses in this space run on Excel sheets and memory. It works, until it doesn't. A missed follow-up, a forgotten payment, a team member booked twice by accident. The cost isn't just money; it's the mental load of holding it all in your head.

Kramasha exists to take that load off your plate. One workspace. Every event, every payment, every team member, in order.

> *We're not building software to replace how you run your business. We're building it so you can finally stop running it from your memory.*

**The Kramasha Team** (Built with real studios and event businesses, in the loop.)

---

### What We Believe

Principles we build against:

* **Private by default:** Every workspace is isolated at the database level. Nobody else can see your events, clients, or payments, not other businesses, not us browsing for fun.
* **Simple by default:** Setup in minutes with sensible presets for your industry. You're never starting from a blank screen, and you never need an accountant to use it.
* **Works where you work:** Installable as a PWA on phone or desktop. Core flows keep working on a poor or lost connection and sync the moment you're back online.
* **Built with real businesses:** We're building this in the loop with real studios and event teams. If something feels off or missing, we want to hear about it, because it shapes what we build next.

---

### Who It's For

If your business runs on events, a team, and money moving, it's built for you.

* **Event managers:** Juggling vendors, coordinators, and a dozen moving parts per event.
* **Photographers & videographers:** Running crews across shoots, edits, and deliverables.
* **Architects & interior teams:** Managing projects, consultants, and contractors.
* **Freelancers & small studios:** Makeup artists, decorators, editors, drone operators, tracking jobs and payments without an accountant.
`;

export const faqContent = [
  {
    q: "What is Kramasha?",
    a: "Kramasha is a workspace app for event managers, photographers, videographers, architects, and similar service businesses. It brings your events, team, payments, and quotations into one place instead of spreadsheets and scattered chats.",
  },
  {
    q: "Who is Kramasha built for?",
    a: "Anyone running jobs with a team — event planners, photography and videography studios, production houses, architects, and freelancers like decorators, makeup artists, editors, and drone operators. If you coordinate people, dates, and payments around events or projects, it's built for you.",
  },
  {
    q: "Is Kramasha free right now?",
    a: "Yes. During our beta period — until [DD Month YYYY] — the full app, including everything currently marked as a \"Pro\" feature, is free to use for everyone. We're doing this because we're still actively building and want real feedback before we finalize pricing. After [DD Month YYYY], the Free and Pro plans described in Your Plan apply.",
  },
  {
    q: "Will I lose my data when the beta free-access period ends?",
    a: "No. Any data you've entered stays fully intact. If you're on the Free plan after the beta period and have more data than the Free limits allow (e.g., more events or team members than Free permits), that data remains visible — you just won't be able to add new records beyond the limit until you upgrade. We never delete your data for being over a plan limit.",
  },
  {
    q: "What's the difference between Free and Pro?",
    a: "Pro raises your limits (events, team members, services, financial years, devices) and unlocks features like push reminders, App Lock (Face ID/fingerprint), extra themes, showing services/address on event cards, exporting all financial years, and removing the \"Made via Kramasha\" line from your PDFs. The exact current limits are always visible in Your Plan inside the app.",
  },
  {
    q: "How much does Pro cost after the beta period?",
    a: "Pro will be available on Monthly, 6-Month, and Yearly billing — pricing is shown in the app under Your Plan. [Insert final pricing once confirmed for public display.]",
  },
  {
    q: "Is my data safe?",
    a: "Yes. Every business gets its own private, isolated workspace — nobody else can see your events, clients, team, or payments. Data is encrypted in transit and at rest. See our Privacy Policy for full detail.",
  },
  {
    q: "Is my data encrypted?",
    a: "Yes, in two ways: In transit — every connection between your device and our servers is encrypted (HTTPS/TLS), the same standard used by banking and payment websites. At rest — your data is encrypted while stored on our servers, using industry-standard encryption provided by our database infrastructure.",
  },
  {
    q: "Can Kramasha (your company) see my financial data?",
    a: "We do not sell your data, use it for marketing, or show it to any other user or business. Other workspaces can never see your events, clients, or payments — that isolation is enforced at the database level, not just hidden in the app. Your data is not \"zero-knowledge\" or end-to-end encrypted; like most business software, Kramasha needs to read your data on the server to calculate totals, generate PDFs, run search, send reminders, and provide support. Access is restricted to a small number of authorized team members and only when necessary — to resolve a support ticket, investigate a technical/security issue, or where required by law. We do not browse or use your data for any other purpose.",
  },
  {
    q: "Can I use Kramasha for my type of business specifically?",
    a: "Yes. When you set up your workspace, you choose a business type — Photography, Event Management, or Architecture — and Kramasha pre-fills matching team roles, services, and event types for you. You can still add your own custom roles and services anytime.",
  },
  {
    q: "Can I change my business type later?",
    a: "Business type can be set once (either during first-time setup or once afterward in Preferences), since it shapes your default roles, services, and event types. Choose carefully — switching later replaces your existing preset data with the new business type's set.",
  },
  {
    q: "Does Kramasha support GST?",
    a: "GST support is optional and off by default. If your business is GST-registered, you can enable it in Preferences to capture your GSTIN and show GST on your quotations. If you're not GST-registered, you'll never see any tax fields.",
  },
  {
    q: "Can I generate quotations and job sheets?",
    a: "Yes. The Quotation & Agreement tool builds a client-ready quotation and a separate team job sheet from the same form — client details, event dates, deliverables, and pricing, exported as a branded PDF using your business name, logo, and contact details from Preferences.",
  },
  {
    q: "Does Kramasha work offline?",
    a: "Kramasha is a Progressive Web App (PWA) and can be installed on your phone or desktop like a native app. Core functionality is designed to keep working with a poor or temporarily lost connection; changes sync once you're back online.",
  },
  {
    q: "How many devices can I use Kramasha on?",
    a: "This depends on your plan — Free allows one active device at a time; Pro allows more. Exact numbers are shown under Your Plan in the app.",
  },
  {
    q: "Can I export my data?",
    a: "Yes, from Preferences or the Financial tab you can export your events and transactions to Excel. Free exports the current financial year; Pro exports all years.",
  },
  {
    q: "What happens if I forget my password / need to change account details?",
    a: "You can reset your password from the login screen using the \"Forgot password\" link, which sends a reset link to your registered email. For other account changes, contact support.",
  },
  {
    q: "I'm not tech-savvy — is this hard to set up?",
    a: "No. First-time setup walks you through your business profile, currency, and business type in a few steps, and pre-fills sensible defaults so you're not starting from a blank screen.",
  },
  {
    q: "How do I give feedback or report a problem?",
    a: "We'd love that — see our Contact page. During beta especially, your feedback directly shapes what we build next.",
  },
  {
    q: "Who do I contact for support?",
    a: "[support@kramash.app] — see the full Contact page for more ways to reach us.",
  },
];

export const privacyPolicyContent = `# Privacy Policy

## Kramasha — Creative Business Management Platform

* **Trial Period Effective Date:** 19 September 2026
* **Public Launch Date:** 11 October 2026
* **Last Updated:** 17 September 2026

---

### 1. Introduction

This Privacy Policy explains how Kramasha ("we", "us") collects, uses, stores, and protects information when you use our application ("Service").

This Policy applies to (a) information about you as a registered user of Kramasha, and (b) information about your clients and team members that you choose to enter into your Workspace. Section 8 explains how these two categories are treated differently.

---

### 2. Information We Collect

#### 2.1. Account & workspace information (collected directly from you)

* Name, email address, phone number
* Business/company name, business address, business phone number
* Profile photo / business logo, if uploaded
* Currency, timezone, and workspace preferences
* Login credentials (passwords are stored in encrypted/hashed form)

#### 2.2. Business data you create in your Workspace

* Events/projects, dates, venues, and notes
* Team member records (names, roles, rates)
* Payment and financial records you enter
* Quotations, agreements, and related documents
* GST/business registration details, if you enable GST features

#### 2.3. Your clients' information (entered by you)

* Client names, phone numbers, emails, and addresses that you add to events or quotations. See Section 8 for important detail on this category.

#### 2.4. Payment information

* Subscription payments are processed by our payment gateway, **Razorpay**. We receive confirmation of payment and a transaction reference; we do not receive or store your full card number, CVV, or UPI PIN.

#### 2.5. Automatically collected / device information

* Device type, browser, operating system
* App version, session/login timestamps
* Basic usage data (e.g., feature usage) for reliability and improvement purposes
* Local device storage used by the app (e.g., for offline functionality and preferences)

#### 2.6. Notification data

* If you enable push notifications (a Pro feature), we store a device token to deliver reminders. This token is used only for sending notifications you've opted into.

---

### 3. How We Use Information

We use the information described above to:

* Provide, operate, and maintain the Service, including your Workspace and all features within your plan;
* Authenticate your account and enforce plan limits (Free/Pro);
* Process subscription payments and send billing-related communication;
* Send you service-related notifications (e.g., reminders, if enabled) and, where you've consented, product updates;
* Respond to support requests;
* Maintain the security and integrity of the Service, including detecting misuse;
* Comply with applicable legal obligations.

> **We never sell your personal information or your clients' information to third parties.**

---

### 4. Where & How Data Is Stored

* **4.1.** Application data is stored using secure cloud database infrastructure hosted in India. Data is encrypted in transit (TLS/HTTPS) and at rest, in line with standard industry security practices.
* **4.2.** Access to your Workspace data is restricted to your authenticated account through database-level access controls, so that other Workspaces cannot access your data.

#### 4.3. Can Kramasha see my data?

Your data is encrypted safely while moving and sitting on our servers, but it is **not end-to-end encrypted**.

Why? Because core features like search, automatic calculations, PDFs, and customer support need our system to be able to read the data to work properly.

While our team technically *can* access data if absolutely necessary (like helping you fix a bug or answering a support ticket), we strictly limit this. We **never** view, use, or sell your business or client data for marketing or any other unrelated purpose.

---

### 5. Third-Party Tools We Use

To keep Kramasha running smoothly, we rely on a few trusted partners:

* **Cloud Database & Hosting:** Safely stores your workspace data on secure servers in India.
* **Razorpay:** Securely processes your Pro subscription payments (we never see your full card details!).
* **Notification Providers:** Helps us deliver reminders and updates.

*These partners are strictly bound by agreements to use your data **only** to help us run Kramasha, nothing else.*

---

### 6. Data Retention

* **6.1.** We retain your account and Workspace data for as long as your account remains active.
* **6.2.** Downgrade/expiry does not result in data deletion. If a Pro subscription lapses, your data remains stored; only the ability to create new records or use certain features beyond Free-plan limits is restricted (see Terms of Service, Section 5.6).
* **6.3.** If you request account deletion, we will delete or anonymize your account and Workspace data within **30 days**, except where we are required to retain certain records (e.g., billing/transaction records) for legal or accounting purposes.

---

### 7. Your Rights

Subject to applicable law (including India's Digital Personal Data Protection Act, 2023), you have the right to:

* Access the personal data we hold about you;
* Request correction of inaccurate data;
* Request deletion of your account and associated data, subject to Section 6.3;
* Withdraw consent for optional features (e.g., notifications) at any time;
* Lodge a grievance with the applicable data protection authority.

To exercise these rights, contact us at **kramashaofficial[at]gmail[dot]com**.

---

### 8. Your Clients' Data

You might store your own clients' details (like names, phone numbers, and payment history) in Kramasha as part of managing your events.

* **You are in charge:** You control your clients' data, and you're responsible for getting their permission to store it, keeping it accurate, and following local privacy laws (like India's DPDP Act, 2023).
* **Our role:** We simply store and process this data on your behalf to make the app work. We will never use your clients' info for marketing or contact them directly unless required by law.

---

### 9. Cookies & Local Storage

The Service uses browser local storage and, where applicable, cookies to keep you signed in, remember preferences (such as theme), and support offline functionality as a Progressive Web App. We do not use third-party advertising cookies.

---

### 10. Children's Privacy

The Service is intended for business use by individuals aged 18 and above. We do not knowingly collect personal information from children. If you believe a child's information has been provided to us, contact us so we can remove it.

---

### 11. Data Security

We implement reasonable technical and organizational measures to protect your data, including encryption in transit and at rest, access controls scoped to your Workspace, and secure authentication. No method of transmission or storage is 100% secure, and we cannot guarantee absolute security.

In the event of a data breach affecting your personal information, we will notify you and/or the appropriate authority as required by applicable law.

---

### 12. Changes to This Policy

We may update this Privacy Policy from time to time. Material changes will be notified through the App or via email before they take effect.

---

### 13. Contact

For questions about your privacy or this policy, contact us at:

* **Support Email:** kramashaofficial[at]gmail[dot]com
* **Registered Business Address:** Lad Apartment, Vadodara, Gujarat
`;

export const termsOfServiceContent = `# Terms of Service

Kramasha — Event & Production Management Platform
Effective Date: [DD Month YYYY]
Last Updated: [DD Month YYYY]

---

## 1. Acceptance of Terms

These Terms of Service ("Terms") govern access to and use of Kramasha (the "Service", "App", "we", "us"), operated by Kramasha, having its registered office at [registered address] ("Company").

By creating an account, accessing, or using the Service, you ("User", "you") agree to be bound by these Terms and by our Privacy Policy and Disclaimer, which are incorporated by reference. If you do not agree, do not use the Service.

If you are using the Service on behalf of a business, you confirm you have the authority to bind that business to these Terms, and "you" refers to that business as well as you individually.

---

## 2. Description of the Service

Kramasha is a workspace-based software-as-a-service application that helps event managers, photographers, videographers, architects, and similar service businesses manage events/projects, team assignments, payments, quotations, and related business records ("Workspace").

Each account operates within its own isolated Workspace. The Service is provided on an "as available" basis and features may be added, changed, or removed at our discretion, including differences between Free and Pro plans (see Section 5).

---

## 3. Eligibility & Account Registration

3.1. You must be at least 18 years old and legally capable of entering into a binding contract to use the Service.

3.2. You are responsible for providing accurate registration information (name, business name, phone, email) and for keeping your login credentials confidential. You are responsible for all activity that occurs under your account.

3.3. You must notify us promptly at [support email] if you become aware of unauthorized access to your account.

---

## 4. Your Data & Content

4.1. **Ownership.** You retain all ownership rights to the data you enter into your Workspace — events, clients, team records, payments, quotations, and uploaded files ("Your Data"). We do not claim ownership of Your Data.

4.2. **License to us.** You grant us a limited license to host, store, process, and display Your Data solely for the purpose of operating and improving the Service. Your Data is encrypted in transit and at rest, but is not end-to-end encrypted; see our Privacy Policy, Section 4.3, for a clear explanation of what this means and how our access to your data is restricted in practice.

4.3. **Responsibility for third-party (client) data.** The Service allows you to store personal information about your own clients (names, phone numbers, addresses, payment history, etc.). You are solely responsible for:

- having a lawful basis and, where required, the consent of those individuals to store and process their data through the Service;
- the accuracy of information you enter; and
- complying with applicable data protection law (including India's Digital Personal Data Protection Act, 2023) in respect of the personal data of your own clients that you choose to store in your Workspace.

We act as a processor/service provider for this data; you act as the controller in relation to your own clients' information.

4.4. You will not upload content that is unlawful, infringing, defamatory, or that you do not have the right to store.

---

## 5. Subscription Plans, Billing & Renewal

5.1. **Plans.** The Service is offered on a Free plan and a paid Pro plan. Current Free/Pro feature and usage limits (events, team members, services, financial years, devices, exports, reminders, themes, and other features) are described within the App and may be updated from time to time; material reductions in Free-plan limits will be notified in advance where practicable.

5.2. **Pro plan durations & pricing.** Pro is available on Monthly, 6-Month, and Yearly billing cycles at the prices displayed in the App at the time of purchase. Prices are in INR and inclusive/exclusive of applicable taxes as shown at checkout.

5.3. **Payment.** Payments are processed through our third-party payment gateway, [Razorpay]. We do not store your full card or payment credentials. By subscribing, you authorize the applicable charge for your selected plan.

5.4. **Renewal.**

- If prepaid/non-auto-renewing: Pro access is granted for the purchased period only. It does not auto-renew. You will need to manually renew before or after expiry to continue Pro access.
- If auto-renewing: Pro subscriptions renew automatically at the end of each billing cycle unless cancelled at least [X days] before the renewal date. You may cancel auto-renewal at any time from Your Plan in the App; cancellation takes effect at the end of the current billing period.

5.5. **Refunds.** Fees are non-refundable except where required by law, or a short cooling-off period (e.g., 7 days) for first-time subscribers who have not materially used Pro features.

5.6. **Downgrade & data retention.** If your Pro subscription lapses or is not renewed, your Workspace automatically reverts to the Free plan. Your Data already stored will not be deleted as a result of downgrade. Where your existing data exceeds Free-plan limits (e.g., more events, team members, or financial years than Free allows), that data remains stored and viewable but you may be restricted from creating new records or exporting beyond Free-plan limits until you upgrade again.

5.7. **Price changes.** We may change subscription pricing for future billing cycles with reasonable prior notice. Changes will not apply retroactively to an already-paid period.

---

## 6. Optional GST Features

Where you enable GST-related settings in your Workspace, the Service will display GST fields and perform tax calculations based on the rates and details you configure. You are responsible for verifying that the GST information, rates, and calculations you configure and issue to your clients are accurate and compliant with applicable tax law. See the Disclaimer for further detail — the Service is not a substitute for advice from a qualified chartered accountant or tax professional.

---

## 7. Acceptable Use

You agree not to:

- use the Service for any unlawful purpose or in violation of these Terms;
- attempt to gain unauthorized access to another Workspace or any part of the Service's infrastructure;
- reverse-engineer, decompile, or attempt to extract source code from the Service, except where permitted by law;
- use the Service to store or transmit malware or to interfere with the Service's operation;
- resell or white-label the Service without our prior written authorization.

---

## 8. Devices & Sessions

Access to the Service on multiple simultaneous devices/sessions is governed by your subscription plan's limits, as displayed in the App. We may sign out a session to enforce these limits.

---

## 9. Intellectual Property

The Service, including its software, design, branding, and underlying technology (excluding Your Data), is owned by Kramasha and protected by applicable intellectual property laws. Nothing in these Terms grants you any right to our trademarks, logos, or brand assets except as necessary to use the Service as intended.

---

## 10. Third-Party Services

The Service relies on third-party infrastructure providers, including cloud database hosting located in India, application hosting, and [Razorpay] for payment processing, and may use other providers for notifications, email, or messaging. Your use of the Service is also subject to the applicable terms of these providers where relevant. We are not responsible for outages or issues caused by third-party providers, though we will make reasonable efforts to maintain service continuity.

---

## 11. Termination

11.1. You may stop using the Service and/or request account deletion at any time by contacting [support email].

11.2. We may suspend or terminate your access if you materially breach these Terms, engage in unlawful activity, or if required by law, with notice where practicable.

11.3. On termination, provisions relating to intellectual property, disclaimers, limitation of liability, and governing law survive.

---

## 12. Disclaimer of Warranties

The Service is provided "as is" and "as available" without warranties of any kind, whether express or implied, including implied warranties of merchantability, fitness for a particular purpose, or non-infringement. We do not warrant that the Service will be uninterrupted, error-free, or completely secure. See the full Disclaimer for additional detail, including in relation to financial and tax-related features.

---

## 13. Limitation of Liability

To the maximum extent permitted by applicable law, Kramasha shall not be liable for any indirect, incidental, special, consequential, or punitive damages, or any loss of profits, revenue, data, or business opportunity, arising out of or related to your use of the Service. Our total aggregate liability for any claim arising from these Terms or the Service shall not exceed the amount you paid us for the Service in the [12 months] preceding the claim, or [₹1,000], whichever is greater.

---

## 14. Indemnification

You agree to indemnify and hold Kramasha harmless from any claims, damages, or expenses (including reasonable legal fees) arising from your breach of these Terms, your misuse of the Service, or Your Data, including any claim brought by a third party (e.g., your own client) relating to data you stored about them.

---

## 15. Governing Law & Dispute Resolution

These Terms are governed by the laws of India. Subject to applicable consumer protection law, any dispute arising out of or relating to these Terms shall be subject to the exclusive jurisdiction of the courts at [Vadodara, Gujarat].

---

## 16. Changes to These Terms

We may update these Terms from time to time. Material changes will be notified through the App or via email before they take effect. Continued use of the Service after changes take effect constitutes acceptance of the revised Terms.

---

## 17. Contact

For questions about these Terms, contact us at:

[Support email]
[Registered business address, once available]
`;