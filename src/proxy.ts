/**
 * Proxy (ex-middleware, Next 16): barreira leve de autenticação.
 * A checagem real acontece em requireProfessional() em cada página/ação —
 * aqui só redirecionamos cedo quem não tem cookie de sessão.
 */
import { NextResponse, type NextRequest } from "next/server";

const PUBLIC_PATHS = [
  "/login",
  "/api/auth",
  "/api/cron",
  "/api/health",
  "/manifest.webmanifest",
  "/sw.js",
  "/icons",
  "/icon.png",
  "/agendar", // link público de agendamento (/agendar/[slug])
];

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`))) {
    return NextResponse.next();
  }

  const hasSession =
    request.cookies.has("authjs.session-token") ||
    request.cookies.has("__Secure-authjs.session-token");

  if (!hasSession) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.search = "";
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next|favicon.ico|.*\\.(?:png|jpg|jpeg|svg|webp|ico|woff2?)$).*)"],
};
