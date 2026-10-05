import { PasswordResetView } from "@/components/admin-view";
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  return <PasswordResetView token={(await searchParams).token} />;
}
