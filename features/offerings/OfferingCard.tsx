// features/offerings/components/OfferingCard.tsx
import Card from "@/components/ui/Card";

export default function OfferingCard({ offering }: { offering: any }) {
  return (
    <Card>
      <h3 className="text-lg font-semibold text-(--oboon-text-title)">
        {offering.name}
      </h3>
      <p className="text-sm text-(--oboon-text-body)">{offering.location}</p>
    </Card>
  );
}
