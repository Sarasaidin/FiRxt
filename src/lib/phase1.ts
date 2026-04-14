export const PHASE1_PARTNER_TYPES = ["PHARMACY", "CLINIC"] as const;

export const PHASE1_TYPE_LABELS = {
  PHARMACY: "Pharmacy",
  CLINIC: "Clinic",
} as const;

export const PHASE1_ORDER_STATUSES = [
  "PENDING_PAYMENT",
  "PAID",
  "READY_FOR_COLLECTION",
  "BOOKING_CONFIRMED",
  "COMPLETED",
  "CANCELLED",
  "REFUNDED",
] as const;