import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('legal.content');
  return {
    title: t('title'),
    description: t('description'),
  };
}

export default async function ContentPolicyPage() {
  const t = await getTranslations('legal.content');

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
            <h2 className="text-2xl font-semibold">1. Purpose</h2>
            <p className="text-muted-foreground">
              This Content Policy establishes guidelines for acceptable use of Pet Movie AI. These rules help ensure a safe, respectful, and legal environment for all users while protecting the rights of content creators and third parties.
            </p>
            <p className="text-muted-foreground">
              By using Pet Movie AI, you agree to comply with this Content Policy. Violations may result in content removal, account suspension, or permanent termination.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-semibold">2. Prohibited Content</h2>
            <p className="text-muted-foreground">
              You may NOT upload or generate content that contains:
            </p>

            <h3 className="text-xl font-medium">2.1 Animal Abuse or Cruelty</h3>
            <ul className="list-disc list-inside space-y-1 text-muted-foreground">
              <li>Violence, abuse, or harm to animals</li>
              <li>Animal fighting or baiting</li>
              <li>Neglect or mistreatment of animals</li>
              <li>Content promoting animal cruelty</li>
            </ul>

            <h3 className="text-xl font-medium">2.2 Illegal Content</h3>
            <ul className="list-disc list-inside space-y-1 text-muted-foreground">
              <li>Content that violates local, state, national, or international law</li>
              <li>Content depicting or promoting illegal activities</li>
              <li>Stolen or illegally obtained photos/videos</li>
              <li>Content that violates export control laws</li>
            </ul>

            <h3 className="text-xl font-medium">2.3 Intellectual Property Violations</h3>
            <ul className="list-disc list-inside space-y-1 text-muted-foreground">
              <li>Copyrighted material you don't own or have rights to use</li>
              <li>Trademarked content without authorization</li>
              <li>Content that infringes on patents or trade secrets</li>
              <li>Unauthorized use of celebrity images or brand logos</li>
            </ul>
            <div className="bg-blue-500/10 border border-blue-500/20 p-4 rounded-lg text-sm">
              <p className="text-muted-foreground">
                💡 <strong>Tip:</strong> Only upload photos and videos that you personally took or have explicit permission to use. Pet Movie AI is designed for YOUR pet photos, not downloaded images from the internet.
              </p>
            </div>

            <h3 className="text-xl font-medium">2.4 Privacy Violations</h3>
            <ul className="list-disc list-inside space-y-1 text-muted-foreground">
              <li>Photos or videos of people without their consent (except incidental background)</li>
              <li>Content revealing personal information of others (addresses, phone numbers, etc.)</li>
              <li>Private or confidential information</li>
              <li>Content obtained through illegal surveillance</li>
            </ul>

            <h3 className="text-xl font-medium">2.5 Harmful or Dangerous Content</h3>
            <ul className="list-disc list-inside space-y-1 text-muted-foreground">
              <li>Content promoting self-harm or suicide</li>
              <li>Dangerous challenges or activities that could cause harm</li>
              <li>Instructions for creating weapons or harmful substances</li>
              <li>Content glorifying violence or terrorism</li>
            </ul>

            <h3 className="text-xl font-medium">2.6 Hateful or Discriminatory Content</h3>
            <ul className="list-disc list-inside space-y-1 text-muted-foreground">
              <li>Content promoting hatred or discrimination based on race, ethnicity, religion, gender, sexual orientation, disability, or other protected characteristics</li>
              <li>Harassment or bullying</li>
              <li>Threats or incitement to violence</li>
            </ul>

            <h3 className="text-xl font-medium">2.7 Sexual or Inappropriate Content</h3>
            <ul className="list-disc list-inside space-y-1 text-muted-foreground">
              <li>Sexually explicit material involving humans</li>
              <li>Content sexualizing minors (strictly prohibited and will be reported to authorities)</li>
              <li>Content depicting animal breeding in explicit manner (veterinary/educational content may be acceptable)</li>
            </ul>

            <h3 className="text-xl font-medium">2.8 Spam and Misleading Content</h3>
            <ul className="list-disc list-inside space-y-1 text-muted-foreground">
              <li>Repetitive or bulk uploads for spam purposes</li>
              <li>Misleading or deceptive content</li>
              <li>Phishing attempts or scams</li>
              <li>Malware or malicious code</li>
            </ul>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-semibold">3. Acceptable Use</h2>

            <h3 className="text-xl font-medium">3.1 What You CAN Upload</h3>
            <div className="bg-green-500/10 border border-green-500/20 p-4 rounded-lg">
              <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                <li>✅ Your own pet photos and videos</li>
                <li>✅ Content you have explicit permission to use</li>
                <li>✅ Content you created or commissioned</li>
                <li>✅ Photos with people who have given consent (family members, friends)</li>
                <li>✅ Educational or veterinary content (within appropriate context)</li>
                <li>✅ Memorial tributes to pets who have passed</li>
              </ul>
            </div>

            <h3 className="text-xl font-medium">3.2 Commercial Use Guidelines</h3>
            <p className="text-muted-foreground">
              If you plan to use generated videos for commercial purposes:
            </p>
            <ul className="list-disc list-inside space-y-1 text-muted-foreground">
              <li>Ensure you have all necessary rights to uploaded content</li>
              <li>Verify music licensing covers commercial use (may require upgrade)</li>
              <li>Obtain releases from any identifiable people in the content</li>
              <li>Comply with advertising standards and disclosures</li>
            </ul>

            <h3 className="text-xl font-medium">3.3 Sharing Generated Content</h3>
            <p className="text-muted-foreground">
              You are free to share your generated pet movies on:
            </p>
            <ul className="list-disc list-inside space-y-1 text-muted-foreground">
              <li>Social media platforms (YouTube, Instagram, TikTok, Facebook, etc.)</li>
              <li>Personal websites and blogs</li>
              <li>Messaging apps and email</li>
              <li>Cloud storage services</li>
            </ul>
            <p className="text-sm text-muted-foreground mt-2">
              However, you are responsible for ensuring your use complies with the terms of service of those platforms and applicable copyright laws.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-semibold">4. Copyright and DMCA</h2>

            <h3 className="text-xl font-medium">4.1 Copyright Infringement</h3>
            <p className="text-muted-foreground">
              Pet Movie AI respects intellectual property rights. If you believe content on our platform infringes your copyright, please submit a DMCA takedown notice.
            </p>

            <h3 className="text-xl font-medium">4.2 DMCA Takedown Process</h3>
            <p className="text-muted-foreground">
              To file a copyright infringement claim, email <strong>dmca@petmovie.ai</strong> with:
            </p>
            <ul className="list-disc list-inside space-y-1 text-muted-foreground">
              <li>Your contact information (name, address, phone, email)</li>
              <li>Description of copyrighted work claimed to be infringed</li>
              <li>URL or description of infringing content on our platform</li>
              <li>Statement of good faith belief that use is not authorized</li>
              <li>Statement that information is accurate and you are rights owner or authorized agent</li>
              <li>Physical or electronic signature</li>
            </ul>

            <h3 className="text-xl font-medium">4.3 Counter-Notification</h3>
            <p className="text-muted-foreground">
              If you believe your content was wrongly removed due to a copyright claim, you may submit a counter-notification to <strong>dmca@petmovie.ai</strong>.
            </p>

            <h3 className="text-xl font-medium">4.4 Repeat Infringer Policy</h3>
            <p className="text-muted-foreground">
              Accounts with multiple validated copyright infringement claims will be permanently terminated.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-semibold">5. Reporting Violations</h2>

            <h3 className="text-xl font-medium">5.1 How to Report</h3>
            <p className="text-muted-foreground">
              If you encounter content that violates this policy:
            </p>
            <ol className="list-decimal list-inside space-y-1 text-muted-foreground">
              <li>Email <strong>abuse@petmovie.ai</strong> with "Content Violation Report" in subject</li>
              <li>Include:
                <ul className="list-disc list-inside ml-6 mt-1 space-y-1 text-sm">
                  <li>Your contact information</li>
                  <li>Description of the violation</li>
                  <li>Content URL or identifier (if known)</li>
                  <li>Evidence or screenshots</li>
                  <li>Which policy section is violated</li>
                </ul>
              </li>
              <li>Our team will review within 48 hours</li>
            </ol>

            <h3 className="text-xl font-medium">5.2 What Happens After Reporting</h3>
            <ul className="list-disc list-inside space-y-1 text-muted-foreground">
              <li><strong>Review:</strong> Our moderation team investigates (typically within 48 hours)</li>
              <li><strong>Action:</strong> Violating content may be removed immediately or flagged for further review</li>
              <li><strong>User Notification:</strong> Content owner is notified of violation and enforcement action</li>
              <li><strong>Reporter Update:</strong> You receive confirmation that report was received and outcome (if appropriate)</li>
            </ul>

            <h3 className="text-xl font-medium">5.3 Anonymous Reporting</h3>
            <p className="text-muted-foreground">
              You may report violations anonymously, but providing contact information helps us follow up if needed.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-semibold">6. Enforcement and Penalties</h2>

            <h3 className="text-xl font-medium">6.1 Violation Consequences</h3>
            <p className="text-muted-foreground">
              Depending on severity, violations may result in:
            </p>
            <ul className="list-disc list-inside space-y-2 text-muted-foreground">
              <li><strong>Warning:</strong> First-time minor violations receive a warning</li>
              <li><strong>Content Removal:</strong> Violating content is deleted</li>
              <li><strong>Temporary Suspension:</strong> Account suspended for 7-30 days</li>
              <li><strong>Permanent Ban:</strong> Account permanently terminated</li>
              <li><strong>Legal Action:</strong> Serious violations (illegal content, child exploitation) are reported to authorities</li>
            </ul>

            <h3 className="text-xl font-medium">6.2 Zero Tolerance Violations</h3>
            <div className="bg-red-500/10 border border-red-500/20 p-4 rounded-lg">
              <p className="font-medium text-red-700 dark:text-red-400">🚨 Immediate Permanent Ban:</p>
              <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                <li>Child sexual abuse material (CSAM) - reported to NCMEC and law enforcement</li>
                <li>Serious animal cruelty or abuse</li>
                <li>Terrorist content or credible threats of violence</li>
                <li>Content facilitating human trafficking or exploitation</li>
              </ul>
            </div>

            <h3 className="text-xl font-medium">6.3 Appeals Process</h3>
            <p className="text-muted-foreground">
              If you believe enforcement action was taken in error:
            </p>
            <ol className="list-decimal list-inside space-y-1 text-muted-foreground">
              <li>Email <strong>appeals@petmovie.ai</strong> within 14 days</li>
              <li>Provide case number (from enforcement notification)</li>
              <li>Explain why decision should be reconsidered</li>
              <li>Include any supporting evidence</li>
              <li>Appeals are reviewed by different moderator within 7 days</li>
            </ol>
            <p className="text-sm text-muted-foreground mt-2">
              Note: Zero tolerance violations are not eligible for appeal.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-semibold">7. Content Moderation</h2>

            <h3 className="text-xl font-medium">7.1 Automated Systems</h3>
            <p className="text-muted-foreground">
              We use automated systems to detect potential violations:
            </p>
            <ul className="list-disc list-inside space-y-1 text-muted-foreground">
              <li>Image and video content analysis</li>
              <li>Pattern recognition for prohibited content</li>
              <li>Metadata and filename scanning</li>
            </ul>

            <h3 className="text-xl font-medium">7.2 Human Review</h3>
            <p className="text-muted-foreground">
              All automated flags are reviewed by human moderators before enforcement action is taken (except in cases of clearly illegal content).
            </p>

            <h3 className="text-xl font-medium">7.3 Privacy During Review</h3>
            <p className="text-muted-foreground">
              Moderators only access content necessary to investigate violations. Access is logged and audited. Personal information is protected according to our Privacy Policy.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-semibold">8. Third-Party Platforms</h2>
            <p className="text-muted-foreground">
              When sharing generated content on third-party platforms:
            </p>
            <ul className="list-disc list-inside space-y-1 text-muted-foreground">
              <li>YouTube™, Instagram™, TikTok™, Facebook™ and other platform names are trademarks of their respective owners</li>
              <li>Pet Movie AI is not affiliated with, endorsed by, or sponsored by these platforms</li>
              <li>You are responsible for complying with each platform's terms of service</li>
              <li>Music licensing may have additional restrictions for commercial/monetized content on these platforms</li>
            </ul>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-semibold">9. Updates to This Policy</h2>
            <p className="text-muted-foreground">
              We may update this Content Policy to reflect changes in law, technology, or community standards. Material changes will be communicated via:
            </p>
            <ul className="list-disc list-inside space-y-1 text-muted-foreground">
              <li>Email notification to active users</li>
              <li>Prominent notice on website</li>
              <li>In-app notification</li>
            </ul>
            <p className="text-muted-foreground">
              Continued use after changes constitutes acceptance of the updated policy.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-semibold">10. Contact Information</h2>
            <div className="bg-muted/50 p-4 rounded-lg space-y-2">
              <p className="font-medium">Pet Movie AI - Trust & Safety Team</p>
              <p className="text-sm text-muted-foreground"><strong>General Violations:</strong> abuse@petmovie.ai</p>
              <p className="text-sm text-muted-foreground"><strong>Copyright/DMCA:</strong> dmca@petmovie.ai</p>
              <p className="text-sm text-muted-foreground"><strong>Appeals:</strong> appeals@petmovie.ai</p>
              <p className="text-sm text-muted-foreground"><strong>Response Time:</strong> 48 hours for urgent violations, 7 days for standard review</p>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
