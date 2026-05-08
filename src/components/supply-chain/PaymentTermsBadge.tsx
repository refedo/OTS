'use client';

interface Props {
  netDays: number;
  discountDays?: number | null;
  discountPercentage?: number | null;
  className?: string;
}

export function PaymentTermsBadge({ netDays, discountDays, discountPercentage, className }: Props) {
  return (
    <span className={`inline-flex items-center gap-1.5 text-sm ${className ?? ''}`}>
      <span className="bg-blue-100 text-blue-800 font-medium px-2.5 py-0.5 rounded-full">
        Net {netDays} days
      </span>
      {discountDays && discountPercentage ? (
        <span className="bg-emerald-100 text-emerald-700 font-medium px-2.5 py-0.5 rounded-full">
          {discountPercentage}% if paid in {discountDays}d
        </span>
      ) : null}
    </span>
  );
}
