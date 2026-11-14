import { redirect } from "next/navigation";
import { getAdmin } from "@/lib/server/security";
import Login from "@/components/admin/login";
export default async function Page() {
  if (await getAdmin()) redirect("/admin");
  return <Login />;
}
