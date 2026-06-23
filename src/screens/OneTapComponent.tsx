'use client';

import { getGoogleOneTapConfig } from '@/config/env';
import { supabase } from '@/lib/supabase/client';
import type { accounts, CredentialResponse } from 'google-one-tap';
import { useSyncExternalStore } from 'react';
import { useRouter } from 'next/navigation';
import Script from 'next/script';

declare global {
  interface Window {
    google: { accounts: accounts };
  }
}

const LOCAL_HOSTNAMES = new Set(['localhost', '127.0.0.1', '0.0.0.0', '::1']);
const subscribeToBrowserEnvironment = () => () => {};
const getServerBrowserEligibility = () => false;
const getBrowserEligibility = () => !LOCAL_HOSTNAMES.has(window.location.hostname);

// generate nonce to use for google id token sign-in
const generateNonce = async (): Promise<string[]> => {
  const nonce = btoa(String.fromCharCode(...crypto.getRandomValues(new Uint8Array(32))));
  const encoder = new TextEncoder();
  const encodedNonce = encoder.encode(nonce);
  const hashBuffer = await crypto.subtle.digest('SHA-256', encodedNonce);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashedNonce = hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');

  return [nonce, hashedNonce];
};

const GoogleOneTap = () => {
  const router = useRouter();
  const { clientId } = getGoogleOneTapConfig();
  const isBrowserEligible = useSyncExternalStore(
    subscribeToBrowserEnvironment,
    getBrowserEligibility,
    getServerBrowserEligibility,
  );

  const initializeGoogleOneTap = async () => {
    if (!clientId) {
      return;
    }

    if (!window.isSecureContext || typeof crypto?.subtle?.digest !== 'function') {
      console.warn('Skipping Google One Tap because the current origin is not secure.');
      return;
    }

    const [nonce, hashedNonce] = await generateNonce();

    // check if there's already an existing session before initializing the one-tap UI
    const { data, error } = await supabase.auth.getClaims();
    if (error) {
      console.error('Error getting claims', error);
    }
    if (data?.claims) {
      router.push('/');
      return;
    }

    window.google.accounts.id.initialize({
      client_id: clientId,
      callback: async (response: CredentialResponse) => {
        try {
          // send id token returned in response.credential to supabase
          const { error } = await supabase.auth.signInWithIdToken({
            provider: 'google',
            token: response.credential,
            nonce,
          });

          if (error) throw error;

          // redirect to protected page
          router.push('/');
        } catch (error) {
          console.error('Error logging in with Google One Tap', error);
        }
      },
      nonce: hashedNonce,
      // with chrome's removal of third-party cookies, we need to use FedCM instead (https://developers.google.com/identity/gsi/web/guides/fedcm-migration)
      use_fedcm_for_prompt: true,
    });
    window.google.accounts.id.prompt(); // Display the One Tap UI
  };

  if (!clientId || !isBrowserEligible) {
    return null;
  }

  return (
    <Script
      onReady={() => {
        void initializeGoogleOneTap().catch((error) => {
          console.error('Error initializing Google One Tap', error);
        });
      }}
      src="https://accounts.google.com/gsi/client"
    />
  );
};

export default GoogleOneTap;
