import { NextRequest, NextResponse } from "next/server";

/**
 * varfooty.vercel.app  → serves the /landing route (marketing/carousel page)
 * varfoot.vercel.app   → serves / as-is (the app)
 * localhost dev        → default is app; add ?_landing=1 to preview the landing
 */
export function middleware(req: NextRequest) {
  const host = req.headers.get("host") ?? "";
  const url  = req.nextUrl;

  const isLandingHost = host === "varfooty.vercel.app";
  const isLandingParam = url.searchParams.get("_landing") === "1";

  if ((isLandingHost || isLandingParam) && url.pathname === "/") {
    return NextResponse.rewrite(new URL("/landing", req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/"],
};
