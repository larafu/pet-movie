import { Suspense } from 'react';
import { setRequestLocale } from 'next-intl/server';
import { PetVideoGeneration } from '@/shared/components/ui/pet-video-gen';
import { Loader2 } from 'lucide-react';

export const metadata = {
  title: 'Create Pet Movie | AI Pet Video Generator - Turn Your Pet into a Movie Star',
  description: 'Create stunning AI-generated pet movies in minutes. Transform your dog or cat into the hero of personalized Christmas rescue stories. Choose from multiple templates and aspect ratios.',
  keywords: 'pet video generator, AI pet movie, create pet movie, dog video maker, cat video generator, pet movie creator, AI video generator',
  openGraph: {
    title: 'Create Your Pet Movie - AI-Powered Pet Video Generator',
    description: 'Turn your pet into a movie star with AI-generated personalized videos. Christmas rescue stories featuring your dog or cat.',
    type: 'website',
  },
};

export default async function CreatePetMoviePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  return (
    <main className="flex min-h-screen flex-col items-center p-4 pt-[80px] pb-16">
      <div className="w-full max-w-7xl mx-auto space-y-8">
        <div className="text-center space-y-4">
          <h1 className="text-4xl md:text-5xl font-bold">
            Create Your Pet Movie
          </h1>
          <p className="text-lg text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
            Transform your pet into an AI-generated movie star. Choose a Christmas rescue story template and watch your pet become the hero!
          </p>
        </div>
        <Suspense fallback={
          <div className="flex items-center justify-center min-h-[400px]">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        }>
          <PetVideoGeneration />
        </Suspense>
      </div>
    </main>
  );
}
