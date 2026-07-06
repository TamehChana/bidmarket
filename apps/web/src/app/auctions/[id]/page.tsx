import { AuctionDetailClient } from "@/components/auction/auction-detail-client";
import { ApiUnavailable } from "@/components/layout/api-unavailable";
import { api } from "@/lib/api";

export const dynamic = "force-dynamic";

interface AuctionPageProps {
  params: Promise<{ id: string }>;
}

export default async function AuctionPage({ params }: AuctionPageProps) {
  const { id } = await params;

  try {
    const auction = await api.getAuction(id);
    return <AuctionDetailClient initialAuction={auction} />;
  } catch {
    return <ApiUnavailable />;
  }
}
