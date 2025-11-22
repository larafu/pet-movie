import { setRequestLocale } from 'next-intl/server';
import { AIMultiModalGeneration } from '@/shared/components/ui/ai-gen';

export const metadata = {
  title: 'AI Multi-Modal Generation Demo',
  description: 'Demo of the AI Multi-Modal Generation component',
};

export default async function AIGenDemoPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-4">
      <AIMultiModalGeneration />
    </main>
  );
}
