import { redirect } from "next/navigation";
import { currentContext } from "@/server/auth/context";
import { DashboardView } from "@/components/operations-view";
export const metadata = { title: "Mój gabinet" };
export default async function Page() {
  const { principal } = await currentContext();
  if (principal.role === "SUPER_ADMIN") redirect("/platforma");
  return <DashboardView />;
}
