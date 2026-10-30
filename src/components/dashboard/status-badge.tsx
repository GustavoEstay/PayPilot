import { Badge, type BadgeTone } from "@/components/ui";
import { STATUS_LABELS, type PaymentStatus } from "@/lib/payments/types";

const TONE: Record<PaymentStatus, BadgeTone> = {
  approved: "success",
  rejected: "danger",
  refunded: "info",
  pending: "warning",
};

export function StatusBadge({ status }: { status: PaymentStatus }) {
  return (
    <Badge tone={TONE[status]} dot>
      {STATUS_LABELS[status]}
    </Badge>
  );
}
