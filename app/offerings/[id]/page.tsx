// app/offerings/[id]/page.tsx
import { notFound } from "next/navigation";
import OfferingDetailPage from "@/features/offerings/components/detail/OfferingDetailPage";

export default async function OfferingDetailRoute({
  params,
}: {
  params: { id: string };
}) {
  const id = Number(params.id);
  if (!Number.isFinite(id)) notFound();

  return <OfferingDetailPage id={id} />;
}