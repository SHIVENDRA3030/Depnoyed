"use client";

import dynamic from "next/dynamic";
import { Loader2 } from "lucide-react";

const MarketplaceApp = dynamic(
  () => import("@/components/marketplace/marketplace-app").then((mod) => mod.MarketplaceApp),
  {
    ssr: false,
    loading: () => (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="size-6 animate-spin text-brand" />
      </div>
    ),
  }
);

export default function Home() {
  return <MarketplaceApp />;
}
