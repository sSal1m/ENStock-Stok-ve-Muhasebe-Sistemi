// Server Component — searchParams'ı await eder, email'i Client Form'a prop olarak geçer.
// Next.js 15/16'da searchParams bir Promise'dir, bu yüzden async page gerekli.
import InviteRegisterForm from './InviteRegisterForm';

interface Props {
  searchParams: Promise<{ email?: string }>;
}

export default async function InviteRegisterPage({ searchParams }: Props) {
  const { email = '' } = await searchParams;
  return <InviteRegisterForm emailFromUrl={email} />;
}
