import { NextRequest, NextResponse } from 'next/server';

const STUDENT_LOGIN_VERSION = 'login-20260519';

export function proxy(request: NextRequest) {
  if (request.nextUrl.pathname !== '/student') {
    return NextResponse.next();
  }

  if (request.nextUrl.searchParams.size > 0) {
    return NextResponse.next();
  }

  const url = request.nextUrl.clone();
  url.searchParams.set('v', STUDENT_LOGIN_VERSION);
  return NextResponse.redirect(url, 307);
}

export const config = {
  matcher: ['/student'],
};
