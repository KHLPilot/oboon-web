import OfferingCard from "@/features/offerings/OfferingCard";

const mockOfferings = [
  { id: 1, name: "더 센트레움 청담", location: "서울 강남구 청담동" },
  { id: 2, name: "한빛 더샵 2차", location: "경기 수원시 영통구" },
];

export default function OfferingsPage() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <h1 className="mb-4 text-2xl font-bold text-(--oboon-text-title)">
        분양 리스트
      </h1>

      <div className="grid gap-4 md:grid-cols-2">
        {mockOfferings.map((offering) => (
          <OfferingCard key={offering.id} offering={offering} />
        ))}
      </div>
    </div>
  );
}
