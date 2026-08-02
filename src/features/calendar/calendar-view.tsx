"use client";

import { useMemo, useState } from "react";
import {
  addDays,
  addMonths,
  format,
  isSameDay,
  isSameMonth,
  startOfMonth,
  startOfWeek,
  subMonths,
} from "date-fns";
import { es } from "date-fns/locale";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { TaskDTO } from "@/features/tasks/types";

const importanceColor: Record<string, string> = {
  ALTA: "bg-[#FF9500]",
  MEDIA: "bg-[#0071E3]",
  BAJA: "bg-[#86868B]",
};

export function CalendarView({ tasks }: { tasks: TaskDTO[] }) {
  const [month, setMonth] = useState(() => startOfMonth(new Date()));

  const byDay = useMemo(() => {
    const map = new Map<string, TaskDTO[]>();
    for (const t of tasks) {
      if (t.status === "COMPLETADA") continue;
      const key = format(new Date(t.dueDate), "yyyy-MM-dd");
      map.set(key, [...(map.get(key) ?? []), t]);
    }
    return map;
  }, [tasks]);

  const days = useMemo(() => {
    const first = startOfWeek(startOfMonth(month), { weekStartsOn: 1 });
    return Array.from({ length: 42 }, (_, i) => addDays(first, i));
  }, [month]);

  return (
    <div className="overflow-hidden rounded-2xl border border-border/60 bg-card">
      <div className="flex items-center justify-between border-b border-border/60 px-4 py-3">
        <h2 className="text-base font-semibold capitalize">
          {format(month, "MMMM yyyy", { locale: es })}
        </h2>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setMonth(subMonths(month, 1))}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setMonth(addMonths(month, 1))}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-7 border-b border-border/60 text-center text-xs font-medium text-muted-foreground">
        {["Lu", "Ma", "Mi", "Ju", "Vi", "Sá", "Do"].map((d) => (
          <div key={d} className="py-2">
            {d}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7">
        {days.map((day) => {
          const key = format(day, "yyyy-MM-dd");
          const dayTasks = byDay.get(key) ?? [];
          const today = isSameDay(day, new Date());
          return (
            <div
              key={key}
              className={cn(
                "min-h-14 border-b border-r border-border/40 p-1 last:border-r-0",
                !isSameMonth(day, month) && "bg-muted/30 text-muted-foreground/50"
              )}
            >
              <span
                className={cn(
                  "flex h-6 w-6 items-center justify-center rounded-full text-xs",
                  today && "bg-primary font-semibold text-primary-foreground"
                )}
              >
                {format(day, "d")}
              </span>
              <div className="mt-1 flex flex-col gap-0.5">
                {dayTasks.slice(0, 3).map((t) => (
                  <div key={t.id} className="flex items-center gap-1">
                    <span className={cn("h-1.5 w-1.5 shrink-0 rounded-full", importanceColor[t.importance])} />
                    <span className="truncate text-[10px] leading-tight">{t.title}</span>
                  </div>
                ))}
                {dayTasks.length > 3 && (
                  <span className="text-[10px] text-muted-foreground">+{dayTasks.length - 3} más</span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
