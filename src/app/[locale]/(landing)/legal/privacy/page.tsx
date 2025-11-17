import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('legal.privacy');
  return {
    title: t('title'),
    description: t('description'),
  };
}

export default async function PrivacyPolicyPage() {
  const t = await getTranslations('legal.privacy');

  return (
    <div className="container max-w-4xl py-12 md:py-24">
      <div className="space-y-8">
        <div className="space-y-4">
          <h1 className="text-4xl font-bold tracking-tight">{t('title')}</h1>
          <p className="text-muted-foreground text-lg">
            {t('lastUpdated', { date: 'November 17, 2025' })}
          </p>
        </div>

        <div className="prose dark:prose-invert max-w-none space-y-8">
          <section className="space-y-4">
            <h2 className="text-2xl font-semibold">1. Introduction</h2>
            <p className="text-muted-foreground">
              Pet Movie AI ("we", "our", or "us") is committed to protecting your privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our AI-powered pet video generation service.
            </p>
            <p className="text-muted-foreground">
              This policy applies to information we collect through our website and service. By using Pet Movie AI, you consent to the data practices described in this policy.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-semibold">2. Information We Collect</h2>
            <h3 className="text-xl font-medium">2.1 Information You Provide</h3>
            <ul className="list-disc list-inside space-y-2 text-muted-foreground">
              <li><strong>Account Information:</strong> Email address, name, password (encrypted)</li>
              <li><strong>User Content:</strong> Photos and videos you upload for movie generation</li>
              <li><strong>Payment Information:</strong> Processed securely through third-party payment processors (we do not store full credit card numbers)</li>
              <li><strong>Communication Data:</strong> Messages you send through our support system</li>
            </ul>

            <h3 className="text-xl font-medium">2.2 Automatically Collected Information</h3>
            <ul className="list-disc list-inside space-y-2 text-muted-foreground">
              <li><strong>Usage Data:</strong> Features used, generation history, time spent on platform</li>
              <li><strong>Device Information:</strong> IP address, browser type, operating system, device type</li>
              <li><strong>Cookies and Tracking:</strong> Session cookies, authentication tokens, analytics cookies</li>
              <li><strong>Log Data:</strong> Access times, pages viewed, errors encountered</li>
            </ul>

            <h3 className="text-xl font-medium">2.3 Third-Party Information</h3>
            <p className="text-muted-foreground">
              If you sign in using social login (Google, etc.), we receive basic profile information as permitted by those services and your privacy settings.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-semibold">3. How We Use Your Information</h2>
            <p className="text-muted-foreground">We use collected information to:</p>
            <ul className="list-disc list-inside space-y-2 text-muted-foreground">
              <li>Provide and maintain the Service (process uploads, generate videos, deliver results)</li>
              <li>Improve and optimize our AI models and Service quality</li>
              <li>Process payments and manage subscriptions</li>
              <li>Communicate with you (service updates, support responses, security alerts)</li>
              <li>Detect and prevent fraud, abuse, and security threats</li>
              <li>Comply with legal obligations</li>
              <li>Send marketing communications (only with your consent; you can opt-out anytime)</li>
            </ul>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-semibold">4. How We Store and Protect Your Data</h2>
            <h3 className="text-xl font-medium">4.1 Data Storage</h3>
            <p className="text-muted-foreground">
              Your data is stored on secure cloud infrastructure provided by reputable third-party service providers:
            </p>
            <ul className="list-disc list-inside space-y-1 text-muted-foreground">
              <li>User Content and Generated Videos: Stored in encrypted cloud storage (AWS S3 / Cloudflare R2)</li>
              <li>Account Data: Stored in secure databases with encryption at rest</li>
              <li>Data centers located in the United States and EU regions</li>
            </ul>

            <h3 className="text-xl font-medium">4.2 Data Retention</h3>
            <ul className="list-disc list-inside space-y-1 text-muted-foreground">
              <li>User Content: Retained while your account is active, deleted 30 days after account deletion</li>
              <li>Generated Videos: Stored for 90 days, or until you delete them</li>
              <li>Account Information: Retained until account deletion, then anonymized for analytics</li>
              <li>Backup copies: Deleted within 90 days of primary deletion</li>
            </ul>

            <h3 className="text-xl font-medium">4.3 Security Measures</h3>
            <ul className="list-disc list-inside space-y-1 text-muted-foreground">
              <li>Encryption in transit (TLS/SSL) and at rest</li>
              <li>Regular security audits and vulnerability assessments</li>
              <li>Access controls and authentication requirements</li>
              <li>Secure payment processing via certified third-party processors</li>
            </ul>
            <div className="bg-amber-500/10 border border-amber-500/20 p-4 rounded-lg">
              <p className="text-sm text-muted-foreground">
                ⚠️ No method of transmission over the internet is 100% secure. While we strive to use commercially acceptable means to protect your data, we cannot guarantee absolute security.
              </p>
            </div>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-semibold">5. Data Sharing and Disclosure</h2>
            <p className="text-muted-foreground">We may share your information with:</p>

            <h3 className="text-xl font-medium">5.1 Service Providers</h3>
            <ul className="list-disc list-inside space-y-1 text-muted-foreground">
              <li>Cloud hosting and storage providers (AWS, Cloudflare)</li>
              <li>Payment processors (Stripe, PayPal, Creem)</li>
              <li>Email service providers (Resend)</li>
              <li>Analytics providers (only anonymized data)</li>
              <li>Customer support tools (Crisp)</li>
            </ul>
            <p className="text-sm text-muted-foreground mt-2">
              These providers are contractually obligated to protect your data and use it only for the services they provide to us.
            </p>

            <h3 className="text-xl font-medium">5.2 Legal Requirements</h3>
            <p className="text-muted-foreground">
              We may disclose your information if required to do so by law or in response to valid requests by public authorities (court orders, government requests).
            </p>

            <h3 className="text-xl font-medium">5.3 Business Transfers</h3>
            <p className="text-muted-foreground">
              In the event of a merger, acquisition, or sale of assets, your information may be transferred. We will notify you before your information is transferred and becomes subject to a different privacy policy.
            </p>

            <h3 className="text-xl font-medium">5.4 What We Don't Do</h3>
            <div className="bg-green-500/10 border border-green-500/20 p-4 rounded-lg">
              <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                <li>✅ We do NOT sell your personal data to third parties</li>
                <li>✅ We do NOT use your uploaded photos/videos for purposes other than providing the Service</li>
                <li>✅ We do NOT share your content publicly without your explicit consent</li>
                <li>✅ We do NOT train our AI on your personal photos (only general improvement analytics)</li>
              </ul>
            </div>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-semibold">6. Your Privacy Rights</h2>
            <p className="text-muted-foreground">
              Depending on your location, you may have the following rights:
            </p>

            <h3 className="text-xl font-medium">6.1 General Rights (All Users)</h3>
            <ul className="list-disc list-inside space-y-1 text-muted-foreground">
              <li><strong>Access:</strong> Request a copy of your personal data</li>
              <li><strong>Correction:</strong> Update or correct your information</li>
              <li><strong>Deletion:</strong> Request deletion of your account and data</li>
              <li><strong>Export:</strong> Download your generated videos and content</li>
              <li><strong>Opt-out:</strong> Unsubscribe from marketing emails</li>
            </ul>

            <h3 className="text-xl font-medium">6.2 GDPR Rights (EU/EEA Users)</h3>
            <ul className="list-disc list-inside space-y-1 text-muted-foreground">
              <li>Right to data portability</li>
              <li>Right to restrict processing</li>
              <li>Right to object to processing</li>
              <li>Right to withdraw consent</li>
              <li>Right to lodge a complaint with supervisory authority</li>
            </ul>

            <h3 className="text-xl font-medium">6.3 CCPA Rights (California Users)</h3>
            <ul className="list-disc list-inside space-y-1 text-muted-foreground">
              <li>Right to know what personal information is collected</li>
              <li>Right to know if personal information is sold or disclosed</li>
              <li>Right to opt-out of sale of personal information (we don't sell data)</li>
              <li>Right to non-discrimination for exercising CCPA rights</li>
            </ul>

            <h3 className="text-xl font-medium">6.4 How to Exercise Your Rights</h3>
            <p className="text-muted-foreground">
              To exercise any of these rights, contact us at <strong>privacy@petmovie.ai</strong> or use the data management tools in your account settings. We will respond within 30 days.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-semibold">7. Cookies and Tracking Technologies</h2>
            <p className="text-muted-foreground">We use the following types of cookies:</p>
            <ul className="list-disc list-inside space-y-2 text-muted-foreground">
              <li><strong>Essential Cookies:</strong> Required for authentication and core functionality (cannot be disabled)</li>
              <li><strong>Analytics Cookies:</strong> Help us understand usage patterns (anonymized data)</li>
              <li><strong>Preference Cookies:</strong> Remember your settings (theme, language)</li>
            </ul>
            <p className="text-muted-foreground">
              You can control cookies through your browser settings. Disabling essential cookies may affect Service functionality.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-semibold">8. Children's Privacy</h2>
            <p className="text-muted-foreground">
              Our Service is not intended for children under 13 years of age. We do not knowingly collect personal information from children under 13. If you are a parent or guardian and believe your child has provided us with personal information, please contact us at <strong>privacy@petmovie.ai</strong>, and we will delete such information.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-semibold">9. International Data Transfers</h2>
            <p className="text-muted-foreground">
              Your information may be transferred to and processed in countries other than your own. We ensure appropriate safeguards are in place:
            </p>
            <ul className="list-disc list-inside space-y-1 text-muted-foreground">
              <li>EU-US Data Privacy Framework compliance (where applicable)</li>
              <li>Standard Contractual Clauses with service providers</li>
              <li>Encryption and security measures during transfer</li>
            </ul>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-semibold">10. Changes to This Privacy Policy</h2>
            <p className="text-muted-foreground">
              We may update this Privacy Policy from time to time. Material changes will be notified via:
            </p>
            <ul className="list-disc list-inside space-y-1 text-muted-foreground">
              <li>Email notification to registered users</li>
              <li>Prominent notice on our website</li>
              <li>In-app notification</li>
            </ul>
            <p className="text-muted-foreground">
              Continued use of the Service after changes constitutes acceptance of the updated policy.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-semibold">11. Contact Us</h2>
            <p className="text-muted-foreground">
              For questions or concerns about this Privacy Policy or our data practices:
            </p>
            <div className="bg-muted/50 p-4 rounded-lg space-y-1">
              <p className="font-medium">Pet Movie AI - Privacy Team</p>
              <p className="text-sm text-muted-foreground">Email: privacy@petmovie.ai</p>
              <p className="text-sm text-muted-foreground">General Support: support@petmovie.ai</p>
              <p className="text-sm text-muted-foreground">Response Time: Within 48 hours for privacy requests</p>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
