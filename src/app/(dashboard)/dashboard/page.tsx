import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { getSession } from "@/lib/session";
import { sortByPriority } from "@/lib/priority";
import { AppHeader } from "@/components/app-header";
import { CommandPalette } from "@/components/command-palette";
import { TaskList } from "@/features/tasks/task-list";
import { CalendarView } from "@/features/calendar/calendar-view";
import { SyncButton } from "@/features/scraper-status/sync-button";
import type { TaskDTO } from "@/features/tasks/types";

export default async function DashboardPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const [tasks, lastLog] = await Promise.all([
    db.task.findMany({ where: { userId: session.userId } }),
    db.syncLog.findFirst({ where: { userId: session.userId }, orderBy: { runAt: "desc" } }),
  ]);

  const sorted = sortByPriority(tasks);
  const dto: TaskDTO[] = sorted.map((t) => ({
    id: t.id,
    externalId: t.externalId,
    title: t.title,
    course: t.course,
    dueDate: t.dueDate.toISOString(),
    description: t.description,
    sourceUrl: t.sourceUrl,
    importance: t.importance,
    priorityScore: t.priorityScore,
    status: t.status,
  }));

  const pending = dto.filter((t) => t.status !== "COMPLETADA");
  const completed = dto.filter((t) => t.status === "COMPLETADA");

  return (
    <>
      <AppHeader />
      <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-6">
        <section className="mb-6 flex flex-col gap-1">
          <h1 className="text-3xl font-semibold tracking-tight">Tus tareas</h1>
          <p className="text-sm text-muted-foreground">
            {pending.length} pendientes · {completed.length} completadas
          </p>
        </section>

        <div className="mb-6">
          <SyncButton lastRunAt={lastLog?.runAt.toISOString() ?? null} lastSuccess={lastLog?.success} />
        </div>

        {dto.length === 0 ? (
          <section className="rounded-2xl border border-dashed border-border px-6 py-12 text-center">
            <p className="font-medium">Aún no hay tareas</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Configura la base de datos y los secretos, y dispara el workflow de GitHub Actions
              para traer tus tareas del Aula Virtual.
            </p>
          </section>
        ) : (
          <TaskList tasks={dto} />
        )}

        <section className="mt-10">
          <h2 className="mb-3 text-lg font-semibold tracking-tight">Calendario</h2>
          <CalendarView tasks={dto} />
        </section>
      </main>
      <CommandPalette tasks={dto} userId={session.userId} />
    </>
  );
}
