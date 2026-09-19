import { redirect } from 'next/navigation';

/** Legacy gym claim detail — unified under Expenses. */
export default async function GymClaimRedirectPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  redirect(`/expenses/claims/${id}`);
}
