import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('legal.terms');
  return {
    title: t('title'),
    description: t('description'),
  };
}

export default async function TermsOfServicePage() {
  const t = await getTranslations('legal.terms');

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
            <h2 className="text-2xl font-semibold">1. Acceptance of Terms</h2>
            <p className="text-muted-foreground">
              By accessing and using Pet Movie AI ("Service"), you accept and agree to be bound by the terms and provision of this agreement. If you do not agree to these Terms of Service, please do not use our Service.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-semibold">2. Description of Service</h2>
            <p className="text-muted-foreground">
              Pet Movie AI is an AI-powered video generation platform that creates cinematic pet movies from user-uploaded photos and videos. The Service is currently in beta testing phase.
            </p>
            <div className="bg-muted/50 p-4 rounded-lg space-y-2">
              <p className="font-medium">Beta Testing Limitations:</p>
              <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                <li>Generation time may vary based on queue load, content complexity, and system resources (typically 5-15 minutes)</li>
                <li>Output quality depends on input material quality, resolution, and format</li>
                <li>Service availability is not guaranteed during beta phase</li>
                <li>Features and pricing are subject to change</li>
              </ul>
            </div>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-semibold">3. User Content and Ownership</h2>
            <h3 className="text-xl font-medium">3.1 Your Content</h3>
            <p className="text-muted-foreground">
              You retain all ownership rights to the photos and videos you upload ("User Content"). By uploading User Content, you grant Pet Movie AI a non-exclusive, worldwide, royalty-free license to use, process, and store your content solely for the purpose of providing the Service.
            </p>
            <h3 className="text-xl font-medium">3.2 Generated Content</h3>
            <p className="text-muted-foreground">
              The AI-generated videos created from your User Content ("Generated Content") are owned by you. However, Generated Content incorporates:
            </p>
            <ul className="list-disc list-inside space-y-1 text-muted-foreground">
              <li>Your original User Content</li>
              <li>AI-generated visual effects and transitions</li>
              <li>Background music (see Music Licensing section)</li>
            </ul>
            <h3 className="text-xl font-medium">3.3 Content Responsibilities</h3>
            <p className="text-muted-foreground">
              You represent and warrant that:
            </p>
            <ul className="list-disc list-inside space-y-1 text-muted-foreground">
              <li>You own or have necessary rights to all User Content you upload</li>
              <li>Your User Content does not violate any third-party rights (copyright, trademark, privacy, publicity, or other personal or proprietary rights)</li>
              <li>Your User Content does not contain illegal, harmful, threatening, abusive, harassing, defamatory, or otherwise objectionable material</li>
            </ul>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-semibold">4. Music Licensing and Copyright</h2>
            <p className="text-muted-foreground">
              Background music used in Generated Content is sourced from royalty-free music libraries and is licensed for use within our platform.
            </p>
            <div className="bg-amber-500/10 border border-amber-500/20 p-4 rounded-lg space-y-2">
              <p className="font-medium text-amber-700 dark:text-amber-400">⚠️ Important Copyright Notice:</p>
              <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                <li>The music license covers personal, non-commercial use of Generated Content on social media and personal websites</li>
                <li>Commercial use (advertising, promotional materials, monetized content) may require additional licensing</li>
                <li>You are responsible for ensuring compliance with music licensing terms when sharing Generated Content</li>
                <li>Music tracks and their licenses are subject to change; we will notify users of any material changes</li>
              </ul>
            </div>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-semibold">5. Acceptable Use Policy</h2>
            <p className="text-muted-foreground">You agree not to:</p>
            <ul className="list-disc list-inside space-y-1 text-muted-foreground">
              <li>Upload content depicting violence, abuse, or harm to animals</li>
              <li>Upload content that infringes on third-party intellectual property rights</li>
              <li>Upload content containing personally identifiable information of others without consent</li>
              <li>Use the Service for any illegal or unauthorized purpose</li>
              <li>Attempt to reverse engineer, decompile, or extract the AI models</li>
              <li>Abuse, harass, or harm other users</li>
              <li>Circumvent any usage limitations or access controls</li>
            </ul>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-semibold">6. Beta Testing Terms</h2>
            <p className="text-muted-foreground">
              During the beta testing phase:
            </p>
            <ul className="list-disc list-inside space-y-1 text-muted-foreground">
              <li>New users receive 5 free credits (1 video generation) upon registration</li>
              <li>Beta credits are one-time only and non-transferable</li>
              <li>Generated videos during beta may contain watermarks (subject to plan)</li>
              <li>Service performance, features, and availability may change without notice</li>
              <li>We reserve the right to modify or terminate the beta program at any time</li>
            </ul>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-semibold">7. Privacy and Data Protection</h2>
            <p className="text-muted-foreground">
              Your use of the Service is also governed by our Privacy Policy. We process your personal data in accordance with applicable data protection laws, including GDPR and CCPA where applicable.
            </p>
            <p className="text-muted-foreground">
              Key privacy points:
            </p>
            <ul className="list-disc list-inside space-y-1 text-muted-foreground">
              <li>Uploaded content is stored securely and used only for Service provision</li>
              <li>You can request deletion of your content at any time</li>
              <li>We do not sell or share your personal data with third parties for marketing</li>
              <li>See our Privacy Policy for complete details</li>
            </ul>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-semibold">8. Disclaimers and Limitations of Liability</h2>
            <h3 className="text-xl font-medium">8.1 Service "As Is"</h3>
            <p className="text-muted-foreground">
              THE SERVICE IS PROVIDED "AS IS" AND "AS AVAILABLE" WITHOUT WARRANTIES OF ANY KIND, EITHER EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, OR NON-INFRINGEMENT.
            </p>
            <h3 className="text-xl font-medium">8.2 No Guarantees</h3>
            <p className="text-muted-foreground">
              We do not guarantee:
            </p>
            <ul className="list-disc list-inside space-y-1 text-muted-foreground">
              <li>Specific quality, resolution, or style of generated content</li>
              <li>Exact generation times or processing speed</li>
              <li>Uninterrupted or error-free service operation</li>
              <li>That generated content will meet your specific requirements</li>
            </ul>
            <h3 className="text-xl font-medium">8.3 Limitation of Liability</h3>
            <p className="text-muted-foreground">
              TO THE MAXIMUM EXTENT PERMITTED BY LAW, PET MOVIE AI SHALL NOT BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, OR ANY LOSS OF PROFITS OR REVENUES, WHETHER INCURRED DIRECTLY OR INDIRECTLY, OR ANY LOSS OF DATA, USE, GOODWILL, OR OTHER INTANGIBLE LOSSES.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-semibold">9. Termination</h2>
            <p className="text-muted-foreground">
              We reserve the right to suspend or terminate your access to the Service at any time, with or without cause, with or without notice. Upon termination:
            </p>
            <ul className="list-disc list-inside space-y-1 text-muted-foreground">
              <li>Your right to use the Service will immediately cease</li>
              <li>We may delete your User Content and Generated Content after a 30-day grace period</li>
              <li>Unused credits are non-refundable (see Refund Policy for exceptions)</li>
            </ul>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-semibold">10. Changes to Terms</h2>
            <p className="text-muted-foreground">
              We reserve the right to modify these Terms at any time. Material changes will be notified via email or prominent notice on the website at least 30 days before taking effect. Continued use of the Service after changes constitute acceptance of the new Terms.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-semibold">11. Governing Law</h2>
            <p className="text-muted-foreground">
              These Terms shall be governed by and construed in accordance with the laws of the United States and the State of Delaware, without regard to its conflict of law provisions.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-semibold">12. Contact Information</h2>
            <p className="text-muted-foreground">
              For questions about these Terms, please contact us:
            </p>
            <div className="bg-muted/50 p-4 rounded-lg space-y-1">
              <p className="font-medium">Pet Movie AI</p>
              <p className="text-sm text-muted-foreground">Email: support@petmovie.ai</p>
              <p className="text-sm text-muted-foreground">Support: Available via in-app chat and email</p>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
