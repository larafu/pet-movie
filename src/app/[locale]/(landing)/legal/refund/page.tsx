import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('legal.refund');
  return {
    title: t('title'),
    description: t('description'),
  };
}

export default async function RefundPolicyPage() {
  const t = await getTranslations('legal.refund');

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
            <h2 className="text-2xl font-semibold">1. Overview</h2>
            <p className="text-muted-foreground">
              Pet Movie AI is committed to customer satisfaction. This Refund Policy outlines the circumstances under which refunds may be issued for credits purchased or subscription fees paid.
            </p>
            <div className="bg-blue-500/10 border border-blue-500/20 p-4 rounded-lg">
              <p className="text-sm text-muted-foreground">
                💡 <strong>Beta Testing:</strong> During our beta phase, we offer a flexible refund policy to ensure your satisfaction while we improve our service.
              </p>
            </div>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-semibold">2. Refund Eligibility</h2>

            <h3 className="text-xl font-medium">2.1 Eligible Refund Situations</h3>
            <p className="text-muted-foreground">
              You may be eligible for a full or partial refund in the following cases:
            </p>
            <ul className="list-disc list-inside space-y-2 text-muted-foreground">
              <li><strong>Technical Failures:</strong> Video generation fails due to our system errors, not user content issues</li>
              <li><strong>Service Unavailability:</strong> Extended service outages preventing credit usage (&gt;48 hours)</li>
              <li><strong>Billing Errors:</strong> Incorrect charges, duplicate payments, or unauthorized transactions</li>
              <li><strong>Unused Credits:</strong> For one-time credit purchases made within the last 14 days with no credits used</li>
              <li><strong>Subscription Cancellation:</strong> Within 48 hours of initial subscription purchase (see details below)</li>
            </ul>

            <h3 className="text-xl font-medium">2.2 Non-Refundable Situations</h3>
            <p className="text-muted-foreground">
              Refunds will NOT be issued in the following cases:
            </p>
            <ul className="list-disc list-inside space-y-2 text-muted-foreground">
              <li>Credits that have been used to generate videos (successful or failed due to content issues)</li>
              <li>Dissatisfaction with AI-generated results (quality is subjective and depends on input material)</li>
              <li>User error in uploading incompatible content (e.g., corrupted files, unsupported formats)</li>
              <li>Change of mind after credits have been consumed</li>
              <li>Violation of Terms of Service resulting in account termination</li>
              <li>Subscription renewals (must cancel before renewal date)</li>
              <li>Free beta credits (no payment made)</li>
            </ul>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-semibold">3. Credit Purchase Refunds</h2>

            <h3 className="text-xl font-medium">3.1 One-Time Credit Purchases</h3>
            <ul className="list-disc list-inside space-y-2 text-muted-foreground">
              <li><strong>Full Refund:</strong> Available within 14 days if NO credits have been used</li>
              <li><strong>Partial Refund:</strong> Not available once credits are consumed</li>
              <li><strong>Technical Issues:</strong> Full credit refund if generation failed due to system error (credits will be restored or refunded)</li>
            </ul>

            <h3 className="text-xl font-medium">3.2 Credit Packages</h3>
            <p className="text-muted-foreground">
              For bulk credit purchases:
            </p>
            <ul className="list-disc list-inside space-y-1 text-muted-foreground">
              <li>Refund calculated based on unused credits at standard per-credit rate</li>
              <li>Bonus credits from packages are not refundable</li>
              <li>14-day refund window applies from purchase date</li>
            </ul>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-semibold">4. Subscription Refunds</h2>

            <h3 className="text-xl font-medium">4.1 New Subscriptions</h3>
            <ul className="list-disc list-inside space-y-2 text-muted-foreground">
              <li><strong>48-Hour Window:</strong> Full refund available within 48 hours of first subscription payment</li>
              <li><strong>Must Not Exceed:</strong> 50% of monthly credit allowance usage</li>
              <li><strong>One-Time Policy:</strong> Each user eligible for one subscription refund</li>
            </ul>

            <h3 className="text-xl font-medium">4.2 Subscription Renewals</h3>
            <ul className="list-disc list-inside space-y-2 text-muted-foreground">
              <li>Automatic renewals are NOT refundable</li>
              <li>Cancel before renewal date to avoid charges</li>
              <li>Cancellation takes effect at end of current billing period</li>
              <li>Exception: Billing errors or technical issues may qualify for refund</li>
            </ul>

            <h3 className="text-xl font-medium">4.3 Subscription Cancellation</h3>
            <div className="bg-muted/50 p-4 rounded-lg space-y-2">
              <p className="font-medium">How to Cancel:</p>
              <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                <li>Go to Settings → Billing → Manage Subscription</li>
                <li>Click "Cancel Subscription"</li>
                <li>Confirm cancellation</li>
                <li>Access continues until end of billing period</li>
                <li>No prorated refunds for partial months</li>
              </ul>
            </div>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-semibold">5. Refund Request Process</h2>

            <h3 className="text-xl font-medium">5.1 How to Request a Refund</h3>
            <ol className="list-decimal list-inside space-y-2 text-muted-foreground">
              <li>Email <strong>support@petmovie.ai</strong> with subject line "Refund Request"</li>
              <li>Include the following information:
                <ul className="list-disc list-inside ml-6 mt-1 space-y-1 text-sm">
                  <li>Your account email</li>
                  <li>Transaction ID or order number</li>
                  <li>Date of purchase</li>
                  <li>Reason for refund request</li>
                  <li>Supporting documentation (screenshots, error messages, etc.)</li>
                </ul>
              </li>
              <li>Wait for review (typically within 2-3 business days)</li>
              <li>Receive decision via email</li>
            </ol>

            <h3 className="text-xl font-medium">5.2 Refund Processing Time</h3>
            <ul className="list-disc list-inside space-y-2 text-muted-foreground">
              <li><strong>Review Time:</strong> 2-3 business days</li>
              <li><strong>Approval:</strong> Refund processed within 5-7 business days</li>
              <li><strong>Credit Card:</strong> May take 5-10 business days to appear in your account (depends on your bank)</li>
              <li><strong>PayPal:</strong> 3-5 business days</li>
              <li><strong>Other Methods:</strong> Up to 14 business days</li>
            </ul>

            <h3 className="text-xl font-medium">5.3 Refund Method</h3>
            <p className="text-muted-foreground">
              Refunds will be issued to the original payment method used for purchase. We cannot issue refunds to different payment methods or accounts.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-semibold">6. Failed Video Generations</h2>

            <h3 className="text-xl font-medium">6.1 System Failures</h3>
            <p className="text-muted-foreground">
              If video generation fails due to our system error:
            </p>
            <ul className="list-disc list-inside space-y-1 text-muted-foreground">
              <li>Credits will be automatically refunded to your account</li>
              <li>You will receive an email notification</li>
              <li>No action required on your part</li>
            </ul>

            <h3 className="text-xl font-medium">6.2 Content Issues</h3>
            <p className="text-muted-foreground">
              If generation fails due to user content issues (corrupted files, incompatible formats, insufficient quality):
            </p>
            <ul className="list-disc list-inside space-y-1 text-muted-foreground">
              <li>Credits are NOT automatically refunded</li>
              <li>System will provide error message explaining the issue</li>
              <li>You can contact support for assistance</li>
              <li>Credits may be refunded on a case-by-case basis</li>
            </ul>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-semibold">7. Chargebacks and Disputes</h2>
            <div className="bg-amber-500/10 border border-amber-500/20 p-4 rounded-lg space-y-2">
              <p className="font-medium text-amber-700 dark:text-amber-400">⚠️ Important Notice:</p>
              <p className="text-sm text-muted-foreground">
                If you initiate a chargeback or payment dispute without first contacting us:
              </p>
              <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                <li>Your account may be suspended pending investigation</li>
                <li>We may charge a dispute processing fee</li>
                <li>Future purchases may be restricted</li>
              </ul>
              <p className="text-sm text-muted-foreground mt-2">
                Please contact our support team first. We're committed to resolving any issues fairly and promptly.
              </p>
            </div>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-semibold">8. Special Circumstances</h2>

            <h3 className="text-xl font-medium">8.1 Account Termination</h3>
            <p className="text-muted-foreground">
              If we terminate your account due to Terms of Service violations:
            </p>
            <ul className="list-disc list-inside space-y-1 text-muted-foreground">
              <li>No refunds will be issued for remaining credits or subscription time</li>
              <li>All purchases are final upon violation</li>
            </ul>

            <h3 className="text-xl font-medium">8.2 Service Discontinuation</h3>
            <p className="text-muted-foreground">
              If Pet Movie AI discontinues service:
            </p>
            <ul className="list-disc list-inside space-y-1 text-muted-foreground">
              <li>At least 60 days advance notice will be provided</li>
              <li>Prorated refunds for unused subscription time</li>
              <li>Refunds for unused credits purchased within last 90 days</li>
            </ul>

            <h3 className="text-xl font-medium">8.3 Beta Testing Period</h3>
            <p className="text-muted-foreground">
              During beta testing:
            </p>
            <ul className="list-disc list-inside space-y-1 text-muted-foreground">
              <li>More flexible refund policy may apply</li>
              <li>Extended review periods for technical issues</li>
              <li>Case-by-case consideration for edge cases</li>
            </ul>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-semibold">9. Contact Information</h2>
            <p className="text-muted-foreground">
              For refund requests or questions about this policy:
            </p>
            <div className="bg-muted/50 p-4 rounded-lg space-y-1">
              <p className="font-medium">Pet Movie AI - Billing Support</p>
              <p className="text-sm text-muted-foreground">Email: support@petmovie.ai</p>
              <p className="text-sm text-muted-foreground">Subject: "Refund Request"</p>
              <p className="text-sm text-muted-foreground">Response Time: 2-3 business days</p>
            </div>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-semibold">10. Policy Updates</h2>
            <p className="text-muted-foreground">
              We reserve the right to modify this Refund Policy at any time. Changes will be posted on this page with an updated "Last Updated" date. Material changes will be communicated via email to active users.
            </p>
            <p className="text-muted-foreground">
              Purchases made before policy changes are subject to the policy in effect at the time of purchase.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
