"use client";

import { useEffect, useMemo, useState } from "react";
import { Command } from "cmdk";
import { CalendarDays, Check, ListTodo } from "lucide-react";
import type { TaskDTO } from "@/features/tasks/types";
import { calendarFeedUrl } from "@/lib/calendar-url";

export function CommandPalette({ tasks, userId }: { tasks: TaskDTO[]; userId: string }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((o) => !o);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return tasks.slice(0, 6);
    return tasks.filter((t) => t.title.toLowerCase().includes(q) || t.course.toLowerCase().includes(q));
  }, [query, tasks]);

  return (
    <Command.Dialog
      open={open}
      onOpenChange={setOpen}
      label="Buscar tareas"
      overlayClassName="fixed inset-0 z-50 bg-black/30 backdrop-blur-sm"
      contentClassName="fixed left-1/2 top-[20%] z-50 w-full max-w-lg -translate-x-1/2 overflow-hidden rounded-2xl border border-border/60 bg-card shadow-2xl"
    >
      <Command.Input
        value={query}
        onValueChange={setQuery}
        placeholder="Buscar tarea…"
        className="w-full border-b border-border/60 bg-transparent px-4 py-3.5 text-[15px] outline-none placeholder:text-muted-foreground"
      />
      <Command.List className="max-h-80 overflow-y-auto p-2">
        <Command.Empty className="px-4 py-6 text-center text-sm text-muted-foreground">
          Sin resultados
        </Command.Empty>

        <Command.Group heading="Tareas">
          {results.map((t) => (
            <Command.Item
              key={t.id}
              onSelect={() => {
                setOpen(false);
                window.location.href = `/dashboard?task=${t.id}`;
              }}
              className="flex cursor-pointer items-center gap-3 rounded-xl px-3 py-2.5 text-sm aria-selected:bg-secondary"
            >
              <ListTodo className="h-4 w-4 text-muted-foreground" />
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium">{t.title}</p>
                <p className="truncate text-xs text-muted-foreground">{t.course}</p>
              </div>
              {t.status === "COMPLETADA" && <Check className="h-4 w-4 text-primary" />}
            </Command.Item>
          ))}
        </Command.Group>

        <Command.Group heading="Acciones">
          <Command.Item
            onSelect={() => {
              setOpen(false);
              window.location.href = "/calendar";
            }}
            className="flex cursor-pointer items-center gap-3 rounded-xl px-3 py-2.5 text-sm aria-selected:bg-secondary"
          >
            <CalendarDays className="h-4 w-4 text-muted-foreground" />
            Ver calendario
          </Command.Item>
          <Command.Item
            onSelect={() => {
              setOpen(false);
              navigator.clipboard?.writeText(calendarFeedUrl(userId));
            }}
            className="flex cursor-pointer items-center gap-3 rounded-xl px-3 py-2.5 text-sm aria-selected:bg-secondary"
          >
            <CalendarDays className="h-4 w-4 text-muted-foreground" />
            Copiar URL de suscripción de calendario
          </Command.Item>
        </Command.Group>
      </Command.List>
    </Command.Dialog>
  );
}
