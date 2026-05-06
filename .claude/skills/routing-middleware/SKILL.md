# Routing Middleware

**Alias:** This skill maps to the installed `middleware-protection` skill. Apply that skill's full guidance.

## Next.js middleware pattern (App Router)

```typescript
// middleware.ts — at project root
import { auth } from "@/auth";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export default auth((req) => {
  const isLoggedIn = !!req.auth;
  const isAuthPage = req.nextUrl.pathname.startsWith("/login");
  const isApiRoute = req.nextUrl.pathname.startsWith("/api");

  if (!isLoggedIn && !isAuthPage && !isApiRoute) {
    return NextResponse.redirect(new URL("/login", req.url));
  }
  return NextResponse.next();
});

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
```

## Rules

- Never protect routes in individual page components — use middleware exclusively
- API routes that mutate data need their own auth check in addition to middleware
- Public routes (login, register, public status pages) must be explicitly excluded from matcher
- Middleware runs on the Edge runtime — no Node.js APIs, no Prisma, no heavy imports
