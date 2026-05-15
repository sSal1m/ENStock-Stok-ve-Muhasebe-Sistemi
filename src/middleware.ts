
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Protected routes
  const isDashboardRoute = pathname.startsWith('/dashboard') || 
                           pathname.startsWith('/inventory') || 
                           pathname.startsWith('/contacts') || 
                           pathname.startsWith('/invoices') || 
                           pathname.startsWith('/reports') || 
                           pathname.startsWith('/settings');

  if (isDashboardRoute) {
    // In a real app with @supabase/ssr, we'd check session here.
    // For now, we'll let the DashboardLayout client-side check handle it 
    // to avoid complex cookie management without the right libraries.
    return NextResponse.next();
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
};
