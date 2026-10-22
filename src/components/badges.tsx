import { BADGES } from "@/lib/constants";

export type ProductBadgeFlags = {
  vegetarian: boolean;
  spicy: boolean;
  halal: boolean;
  isNew: boolean;
};

export function ProductBadges({
  badges,
  limit,
}: {
  badges: ProductBadgeFlags;
  limit?: number;
}) {
  const entries = (Object.keys(BADGES) as (keyof typeof BADGES)[])
    .filter((key) => badges[key])
    .slice(0, limit);
  return (
    <div className="flex flex-wrap gap-1">
      {entries.map((key) => (
        <span key={key} className={`badge ${BADGES[key].className}`}>
          {BADGES[key].short}
        </span>
      ))}
    </div>
  );
}
