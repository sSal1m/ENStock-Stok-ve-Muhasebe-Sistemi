'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();

        // Eğer kullanıcı zaten giriş yapmışsa, dashboard'a yönlendir
        if (user) {
          router.push('/dashboard');
        }
      } catch (error) {
        console.error('Auth check error:', error);
      }
    };

    checkAuth();
  }, [router]);

  return (
    <div className="w-full h-screen flex items-center justify-center bg-gradient-to-br from-surface to-surface-container">
      {/* Auth Content */}
      {children}
    </div>
  );
}
