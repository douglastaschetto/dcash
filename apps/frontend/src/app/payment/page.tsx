import { PaymentCheckout } from "../payment-checkout";

type PaymentPageProps = {
  searchParams: Promise<{
    plan?: string;
    billing?: string;
  }>;
};

export default async function PaymentPage({ searchParams }: PaymentPageProps) {
  const { plan, billing } = await searchParams;
  return <PaymentCheckout planKey={plan ?? ""} billing={billing === "yearly" ? "yearly" : "monthly"} />;
}

