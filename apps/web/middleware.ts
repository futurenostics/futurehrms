import { NextResponse, type NextRequest } from 'next/server';

/**
 * Middleware-level redirect: if the visitor isn't carrying a refresh
 * cookie and is hitting an authenticated route, bounce them to /login.
 *
 * The actual permission resolution and access-token refresh happen on
 * the client (see app/(app)/layout.tsx + lib/api-client). This is just
 * a fast-path so unauth users never get the SSR shell HTML.
 */
const REFRESH_COOKIE = 'fn_refresh';

const PROTECTED_PATHS = [
  '/dashboard',
  '/employees',
  '/org-chart',
  '/projects',
  '/commission-rules',
  '/commissions',
  '/monthly-processing',
  '/payroll',
  '/hr',
  '/reports',
  '/settings',
];

const AUTH_PATHS = ['/login'];

export function middleware(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const hasRefreshCookie = request.cookies.has(REFRESH_COOKIE);

  if (
    !hasRefreshCookie &&
    PROTECTED_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`))
  ) {
    const loginUrl = new URL('/login', request.url);
    // Preserve the original destination (path + query) so the login form
    // can redirect there after a successful sign-in. Don't preserve hashes;
    // the browser strips those before sending the request anyway.
    loginUrl.searchParams.set('from', `${pathname}${search}`);
    return NextResponse.redirect(loginUrl);
  }

  if (hasRefreshCookie && AUTH_PATHS.includes(pathname)) {
    const dashboardUrl = new URL('/dashboard', request.url);
    return NextResponse.redirect(dashboardUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|fonts/).*)'],
};
