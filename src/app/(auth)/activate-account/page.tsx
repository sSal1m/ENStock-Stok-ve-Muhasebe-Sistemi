'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect } from 'react';
import { Suspense } from 'react';

function ActivateAccountContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  useEffect(() => {
    const email = searchParams.get('email');
    const code = searchParams.get('code');
    
    // Davet parametreleri varsa invite sayfasına yönlendir
    if (email && code) {
      router.push(`/register/invite?email=${encodeURIComponent(email)}&code=${code}`);
    } else {
      router.push('/login');
    }
  }, [searchParams, router]);

  return (
    <div className="flex justify-center items-center min-h-screen">
      <p>Yönlendiriliyorsunuz...</p>
    </div>
  );
}

export default function ActivateAccountPage() {
  return (
    <Suspense fallback={<div className="flex justify-center items-center min-h-screen">Yükleniyor...</div>}>
      <ActivateAccountContent />
    </Suspense>
  );
}
