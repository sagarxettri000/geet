import { auth } from "@/auth";
import { NextResponse } from "next/server";

const publicPaths = ["/login", "/signup", "/forgot-password", "/"];
const isPublicStaticAsset = (pathname: string) =>
  /^\/(api|_next|favicon\.ico|.*\.(png|jpg|jpeg|svg|webp|ico|woff2?|css|js|txt))($|\/)/.test(
    pathname
  );

export const proxy = auth((req) => {
  const { nextUrl } = req;
  const { pathname } = nextUrl;
  const session = req.auth;

  // Never intercept API handlers, static assets or auth internals.
  if (isPublicStaticAsset(pathname) || pathname.startsWith("/api")) {
    return NextResponse.next();
  }

  const isAuthed = Boolean(session?.user);

  // Landing page: authed users go straight into the app.
  if (pathname === "/") {
    if (isAuthed) {
      return NextResponse.redirect(new URL("/app", nextUrl));
    }
    return NextResponse.next();
  }

  // Public auth pages: only for signed-out users.
  if (publicPaths.includes(pathname)) {
    if (isAuthed) {
      return NextResponse.redirect(new URL("/app", nextUrl));
    }
    return NextResponse.next();
  }

  // App area requires a session.
  if (pathname.startsWith("/app") || pathname.startsWith("/admin")) {
    if (!isAuthed) {
      const url = new URL("/login", nextUrl);
      url.searchParams.set("callbackUrl", pathname);
      return NextResponse.redirect(url);
    }
  }

  // Admin area requires the admin role — enforced again server-side per page.
  if (pathname.startsWith("/admin")) {
    if (session?.user?.role !== "admin") {
      return NextResponse.redirect(new URL("/app", nextUrl));
    }
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon\\.ico|.*\\.(?:png|jpg|jpeg|svg|webp|ico|woff2?|css|js|txt)$).*)"],
};