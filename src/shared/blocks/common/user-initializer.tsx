'use client';

import { useEffect, useRef } from 'react';
import { useSession } from '@/core/auth/client';

/**
 * UserInitializer Component
 *
 * This component runs on every page load and initializes the user
 * by granting free trial credits if they haven't been granted yet.
 *
 * It's particularly important for social sign-ins (Google, GitHub)
 * where the OAuth flow doesn't allow us to run code after sign-up.
 */
export function UserInitializer() {
  const { data: session } = useSession();
  const hasInitialized = useRef(false);

  useEffect(() => {
    // Only run once per mount and only if user is authenticated
    if (!session?.user || hasInitialized.current) {
      return;
    }

    // Check if we've already initialized this user in this browser session
    const sessionKey = `user_init_${session.user.id}`;
    if (typeof window !== 'undefined' && sessionStorage.getItem(sessionKey)) {
      hasInitialized.current = true;
      return;
    }

    // Mark as initialized before making the call to prevent duplicate requests
    hasInitialized.current = true;

    // Call the user init API to grant free trial credits
    // The API will check if credits were already granted
    fetch('/api/user/init', { method: 'POST' })
      .then(() => {
        // Store in session storage to prevent re-initialization
        if (typeof window !== 'undefined') {
          sessionStorage.setItem(sessionKey, 'true');
        }
      })
      .catch((error) => {
        console.error('Failed to initialize user:', error);
        // Reset on error so it can retry
        hasInitialized.current = false;
      });
  }, [session?.user]);

  // This component doesn't render anything
  return null;
}
