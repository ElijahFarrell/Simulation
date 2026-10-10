"use client";

import { Show, SignInButton, SignUpButton, UserButton } from "@clerk/nextjs";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { clerkEnabled } from "@/lib/clerk-enabled";

export function AccountControls() {
  if (!clerkEnabled) return null;
  return (
    <div className="flex items-center gap-2">
      <Show when="signed-out">
        <SignInButton>
          <Button variant="ghost" size="sm">
            Sign in
          </Button>
        </SignInButton>
        <SignUpButton>
          <Button size="sm">Sign up</Button>
        </SignUpButton>
      </Show>
      <Show when="signed-in">
        <Link href="/stats" className="text-sm font-medium text-muted-foreground hover:text-foreground">
          Hub
        </Link>
        <UserButton />
      </Show>
    </div>
  );
}
