import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  // Routes publiques (sans protection)
  const publicRoutes = ['/login', '/api'];
  
  const { pathname } = request.nextUrl;
  
  // Laisser passer les routes publiques et les fichiers statiques
  if (
    publicRoutes.some(route => pathname.startsWith(route)) ||
    pathname.startsWith('/_next/') ||
    pathname.includes('.') // fichiers statiques (css, js, images, etc.)
  ) {
    return NextResponse.next();
  }
  
  // Vérifier l'authentification via un cookie ou header
  const isAuthenticated = request.cookies.get('klb_authenticated')?.value === 'true';
  
  // Si pas authentifié, rediriger vers login
  if (!isAuthenticated) {
    const loginUrl = new URL('/login', request.url);
    return NextResponse.redirect(loginUrl);
  }
  
  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
}