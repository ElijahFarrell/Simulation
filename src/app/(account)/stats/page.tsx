import { auth } from "@clerk/nextjs/server";
import type { Metadata } from "next";
import { StatsHome } from "@/components/stats/stats-home";

export const metadata: Metadata = {
  title: "Hub · Rotation Lab",
};

export default async function StatsPage() {
  await auth.protect();
  return <StatsHome />;
}
