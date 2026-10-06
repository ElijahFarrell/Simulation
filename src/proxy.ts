import { clerkMiddleware } from "@clerk/nextjs/server";

export default clerkMiddleware();

// Only the account area uses Clerk, so Rotation Lab keeps working without auth keys.
export const config = {
  matcher: ["/stats/:path*", "/sign-in/:path*", "/sign-up/:path*"],
};
