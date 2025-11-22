'use client';

import { useEffect, useState } from 'react';

interface ThirdPartyScriptsProps {
  analyticsScripts?: React.ReactNode;
  customerServiceScripts?: React.ReactNode;
  adsScripts?: React.ReactNode;
  affiliateScripts?: React.ReactNode;
}

export function ThirdPartyScripts({
  analyticsScripts,
  customerServiceScripts,
  adsScripts,
  affiliateScripts,
}: ThirdPartyScriptsProps) {
  const [shouldLoad, setShouldLoad] = useState(false);

  useEffect(() => {
    // Delay loading third-party scripts until after initial render
    // This prevents them from blocking the main thread
    const timer = setTimeout(() => {
      setShouldLoad(true);
    }, 1000); // Load after 1 second

    // Or load on user interaction
    const onInteraction = () => {
      setShouldLoad(true);
      cleanup();
    };

    const cleanup = () => {
      document.removeEventListener('mousemove', onInteraction);
      document.removeEventListener('scroll', onInteraction);
      document.removeEventListener('touchstart', onInteraction);
      document.removeEventListener('keydown', onInteraction);
    };

    // Load immediately on any interaction
    document.addEventListener('mousemove', onInteraction, { once: true });
    document.addEventListener('scroll', onInteraction, { once: true });
    document.addEventListener('touchstart', onInteraction, { once: true });
    document.addEventListener('keydown', onInteraction, { once: true });

    return () => {
      clearTimeout(timer);
      cleanup();
    };
  }, []);

  if (!shouldLoad) {
    return null;
  }

  return (
    <>
      {analyticsScripts}
      {customerServiceScripts}
      {adsScripts}
      {affiliateScripts}
    </>
  );
}
