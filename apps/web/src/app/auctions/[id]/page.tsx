import { AuctionDetailLoader } from "@/components/auction/auction-detail-loader";

export const dynamic = "force-dynamic";

interface AuctionPageProps {
  params: Promise<{ id: string }>;
}

export default async function AuctionPage({ params }: AuctionPageProps) {
  const { id } = await params;
  return <AuctionDetailLoader auctionId={id} />;
}
