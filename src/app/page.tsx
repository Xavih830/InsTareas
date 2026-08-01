import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { Landing } from "@/features/landing/landing";

export default async function Home() {
  const session = await getSession();
  if (session) redirect("/dashboard");
  return <Landing />;
}
