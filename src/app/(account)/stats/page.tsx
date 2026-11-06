import { auth } from "@clerk/nextjs/server";
import type { Metadata } from "next";
import { StatsHome } from "@/components/stats/stats-home";

export const metadata: Metadata = {
  title: "Hub · Rotation Lab",
};

export default async function StatsPage({ searchParams }: { searchParams: Promise<{ epic?: string | string[] }> }) {
  await auth.protect();
  const params = await searchParams;
  const epicStatus = Array.isArray(params.epic) ? params.epic[0] : params.epic;
  return <StatsHome epicLinkingEnabled={Boolean(process.env.EPIC_CLIENT_ID)} epicStatus={epicStatus} />;
}
