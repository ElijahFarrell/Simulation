import { ClerkProvider } from "@clerk/nextjs";
import { shadcn } from "@clerk/ui/themes";
import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { TooltipProvider } from "@/components/ui/tooltip";
import { clerkEnabled } from "@/lib/clerk-enabled";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Rotation Lab",
  description: "Practice Fortnite trios IGL calls: dead side, zone pulls, surge, and storm.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} dark h-full antialiased`}
    >
      <body className="min-h-dvh bg-background text-foreground">
        {clerkEnabled ? (
          <ClerkProvider
            appearance={{ theme: shadcn }}
            signInUrl="/sign-in"
            signUpUrl="/sign-up"
            signInFallbackRedirectUrl="/stats"
            signUpFallbackRedirectUrl="/stats"
            afterSignOutUrl="/"
          >
            <TooltipProvider>{children}</TooltipProvider>
          </ClerkProvider>
        ) : (
          <TooltipProvider>{children}</TooltipProvider>
        )}
      </body>
    </html>
  );
}
