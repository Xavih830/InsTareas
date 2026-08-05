import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { getSession } from "@/lib/session";
import { AppHeader } from "@/components/app-header";
import { CoursesView } from "@/features/courses/courses-view";

export default async function CoursesPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const courses = await db.course.findMany({
    where: { userId: session.userId, isActive: true },
    orderBy: { name: "asc" },
    include: {
      modules: {
        orderBy: { position: "asc" },
        include: { items: { orderBy: { position: "asc" } } },
      },
    },
  });

  const dto = courses.map((c) => ({
    id: c.id,
    externalId: c.externalId,
    name: c.name,
    code: c.code,
    modules: c.modules.map((m) => ({
      id: m.id,
      name: m.name,
      state: m.state,
      items: m.items.map((i) => ({
        id: i.id,
        title: i.title,
        type: i.type,
        url: i.url,
        published: i.published,
      })),
    })),
  }));

  return (
    <>
      <AppHeader />
      <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-6">
        <section className="mb-6">
          <h1 className="text-3xl font-semibold tracking-tight">Tus cursos</h1>
          <p className="text-sm text-muted-foreground">
            Contenido sincronizado del Aula Virtual (módulos y material)
          </p>
        </section>
        <CoursesView courses={dto} empty={dto.length === 0} />
      </main>
    </>
  );
}