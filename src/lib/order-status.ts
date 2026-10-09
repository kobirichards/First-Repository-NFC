export const orderStatusLabel: Record<string, { label: string; detail: string }> = {
  PENDING_PAYMENT: { label: "Awaiting payment", detail: "We haven't received payment yet." },
  PAID: { label: "Paid", detail: "We're preparing your cards." },
  AWAITING_PROOF: { label: "Proof to approve", detail: "We'll email a proof of your printed design. Printing starts once you approve it." },
  IN_PRODUCTION: { label: "In production", detail: "Your cards are being made." },
  SHIPPED: { label: "Shipped", detail: "Your cards are on their way." },
  DELIVERED: { label: "Delivered", detail: "Tap a card with your phone to activate it." },
  CANCELLED: { label: "Cancelled", detail: "This order was cancelled." },
  REFUNDED: { label: "Refunded", detail: "This order was refunded in full." },
  PARTIALLY_REFUNDED: { label: "Partly refunded", detail: "Part of this order was refunded." },
};
