import { redirect } from "next/navigation";
import { AppHeader } from "@/components/app-header";
import { ConnectionsView } from "@/features/connections/connections-view";

export default async function ConnectionsPage() {
  const { getSession } = await import("@/lib/session");
  const session = await getSession();
  if (!session) redirect("/login");

  return (
    <>
      <AppHeader />
      <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-6">
        <section className="mb-6">
          <h1 className="text-3xl font-semibold tracking-tight">Conexiones</h1>
          <p className="text-sm text-muted-foreground">
            Vincula tus cuentas para la sincronización automática
          </p>
        </section>
        <ConnectionsView />
      </main>
    </>
  );
}