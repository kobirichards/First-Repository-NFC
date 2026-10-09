import type { Metadata } from "next";
import { Suspense } from "react";
import { RefreshUntilReady } from "@/components/shop/refresh-until-ready";
import { ButtonLink } from "@/components/ui/button";
import { Container } from "@/components/ui/container";
import { Notice } from "@/components/ui/notice";
import { readCartId } from "@/server/cart-cookie";
import { getCheckoutOutcome } from "@/server/orders";
import { getSessionUser } from "@/server/session";

export const metadata: Metadata = { title: "Order confirmation", robots: { index: false } };

async function Outcome({ searchParams }: { searchParams: PageProps<"/checkout/success">["searchParams"] }) {
  const params = await searchParams;
  const sessionId = typeof params.session_id === "string" ? params.session_id : "";
  const attempt = Number(params.attempt ?? 0) || 0;
  const [user, cartId] = await Promise.all([getSessionUser(), readCartId()]);
  // This page only reports what the verified webhook recorded; arriving here never creates an order.
  const outcome = await getCheckoutOutcome(sessionId, { userId: user?.id ?? null, cartId });

  if (outcome?.order) {
    return (
      <div className="flex flex-col gap-6">
        <h1 className="text-3xl font-bold tracking-tight">Thank you. Your order is confirmed.</h1>
        <p className="text-lg">
          Order reference <strong className="font-semibold">{outcome.order.reference}</strong>
        </p>
        <p className="measure leading-relaxed text-moss">
          We&apos;ve emailed a receipt to {outcome.order.email}.{" "}
          {outcome.order.status === "AWAITING_PROOF"
            ? "Next, we'll send a proof of your printed design for you to approve."
            : "We'll email you again when your cards are on their way."}{" "}
          Once they arrive, tap a card with your phone to activate it.
        </p>
        <div className="flex flex-wrap gap-3">
          {outcome.signedIn ? <ButtonLink href={`/dashboard/orders/${outcome.order.reference}`}>View order</ButtonLink> : null}
          <ButtonLink href={outcome.signedIn ? "/dashboard/profile" : "/sign-up"} variant="secondary">
            {outcome.signedIn ? "Set up your profile" : "Create an account for your cards"}
          </ButtonLink>
        </div>
      </div>
    );
  }

  if (outcome && (outcome.status === "open" || outcome.status === "awaiting_payment")) {
    return (
      <div className="flex flex-col gap-4">
        <h1 className="text-3xl font-bold tracking-tight">Confirming your payment…</h1>
        <p className="text-moss" role="status">
          {outcome.status === "awaiting_payment"
            ? "Your bank is processing the payment. We'll email you as soon as it's confirmed."
            : "This usually takes a few seconds. This page updates by itself."}
        </p>
        {outcome.status === "open" && attempt < 20 ? <RefreshUntilReady attempt={attempt} /> : null}
        {attempt >= 20 ? (
          <Notice>It&apos;s taking longer than usual. You&apos;ll get an email when your order is confirmed.</Notice>
        ) : null}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-3xl font-bold tracking-tight">Order status</h1>
      <p className="measure leading-relaxed text-moss">
        We can&apos;t show this order here. If you completed a payment, you&apos;ll receive a confirmation email shortly.
      </p>
      <ButtonLink href="/shop" variant="secondary" className="self-start">
        Back to the shop
      </ButtonLink>
    </div>
  );
}

export default function SuccessPage(props: PageProps<"/checkout/success">) {
  return (
    <Container className="py-16">
      <Suspense fallback={<p className="text-moss">Checking your order…</p>}>
        <Outcome searchParams={props.searchParams} />
      </Suspense>
    </Container>
  );
}
