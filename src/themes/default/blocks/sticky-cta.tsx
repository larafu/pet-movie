'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link } from '@/core/i18n/navigation';
import { Button } from '@/shared/components/ui/button';

export function StickyCTA() {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      // Show after scrolling down 500px
      setIsVisible(window.scrollY > 500);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 100, opacity: 0 }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
          className="fixed bottom-0 left-0 right-0 z-50 p-4 pointer-events-none"
        >
          <div className="container max-w-3xl mx-auto pointer-events-auto">
            <div className="bg-black/80 backdrop-blur-xl border border-gold/20 rounded-full p-2 pl-6 shadow-[0_0_30px_rgba(0,0,0,0.5)] flex items-center justify-between gap-4 ring-1 ring-white/5">
              <div className="hidden sm:flex flex-col">
                <span className="text-gold font-cinzel font-bold text-sm tracking-wider uppercase">
                  Turn Your Pet into a Star
                </span>
                <span className="text-muted-foreground text-xs">
                  Join 10,000+ happy pet parents
                </span>
              </div>
              
              <div className="sm:hidden text-gold font-cinzel font-bold text-sm">
                Make Your Pet Movie
              </div>

              <Button
                asChild
                size="lg"
                className="rounded-full bg-gold text-black hover:bg-gold/90 shadow-[0_0_15px_rgba(255,215,0,0.3)] hover:shadow-[0_0_25px_rgba(255,215,0,0.5)] font-bold tracking-wide px-8 transition-all duration-300"
              >
                <Link href="/create-pet-movie">
                  Create Now
                </Link>
              </Button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
