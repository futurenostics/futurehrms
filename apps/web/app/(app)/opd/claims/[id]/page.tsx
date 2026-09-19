import { redirect } from 'next/navigation';

/** Legacy medical claim detail — unified under Expenses. */
export default async function OpdClaimRedirectPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  redirect(`/expenses/claims/${id}`);
}
