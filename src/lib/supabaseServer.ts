import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import type { CookieOptions } from "@supabase/ssr";
import { NextRequest, NextResponse } from "next/server";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error("Supabase URL or Anon Key is missing in environment variables.");
}

export async function createSupabaseServerClient() {
  const cookieStore = await cookies();

  return createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(
        cookiesToSet: { name: string; value: string; options: CookieOptions }[]
      ) {
        cookiesToSet.forEach(({ name, value, options }) => {
          cookieStore.set({ name, value, ...options });
        });
      },
    },
  });
}

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  });

  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) => {
          supabaseResponse.cookies.set(name, value, options);
        });
      },
    },
  });

  // refreshSession() önceden oturum açmış kullanıcılar için yapılır
  // Bu, refresh token'ı geçerliliğini kontrol eder ve gerekirse yeniler
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (
    !user &&
    !request.nextUrl.pathname.startsWith("/login") &&
    !request.nextUrl.pathname.startsWith("/register") &&
    !request.nextUrl.pathname.startsWith("/forgot-password") &&
    !request.nextUrl.pathname.startsWith("/unauthorized") &&
    !request.nextUrl.pathname.startsWith("/activate-account") &&
    !request.nextUrl.pathname.startsWith("/api/") &&
    !request.nextUrl.pathname.startsWith("/_next/") &&
    request.nextUrl.pathname !== "/"
  ) {
    // Oturum açmamış kullanıcı korunan sayfaya erişmeye çalışırsa
    return NextResponse.redirect(new URL("/login", request.url));
  }

  return supabaseResponse;
}
