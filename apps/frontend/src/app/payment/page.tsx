import { PaymentCheckout } from "../payment-checkout";

type PaymentPageProps = {
  searchParams: Promise<{
    plan?: string;
  }>;
};

export default async function PaymentPage({ searchParams }: PaymentPageProps) {
  const { plan } = await searchParams;
  return <PaymentCheckout planKey={plan ?? ""} />;
}

