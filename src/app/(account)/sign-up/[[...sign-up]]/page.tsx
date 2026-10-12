import { SignUp } from "@clerk/nextjs";
import { SiteHeader } from "@/components/site-header";

export default function SignUpPage() {
  return (
    <div className="page-glow flex min-h-dvh flex-col">
      <SiteHeader />
      <main className="flex flex-1 items-center justify-center p-4">
        <SignUp />
      </main>
    </div>
  );
}
