// Rotation Lab must keep working on deploys that don't have Clerk keys yet.
export const clerkEnabled = Boolean(process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY);
