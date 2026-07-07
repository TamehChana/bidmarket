import { BrowsePageClient } from "@/components/browse/browse-page-client";

export const dynamic = "force-dynamic";

export default async function BrowsePage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  return <BrowsePageClient initialQuery={q ?? ""} />;
}
