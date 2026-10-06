import { auth } from "@clerk/nextjs/server";
import type { Metadata } from "next";
import { StatsHome } from "@/components/stats/stats-home";

export const metadata: Metadata = {
  title: "My stats · Rotation Lab",
};

export default async function StatsPage() {
  await auth.protect();
  return <StatsHome />;
}
