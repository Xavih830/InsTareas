"use client";

import { useState } from "react";
import { AnimatePresence, LayoutGroup, motion } from "framer-motion";
import { APPLE_EASE } from "@/lib/motion";
import { setTaskImportance, setTaskStatus } from "./task-actions";
import { TaskCard } from "./task-card";
import { TaskDrawer } from "./task-drawer";
import type { TaskDTO } from "./types";

export function TaskList({ tasks: initial }: { tasks: TaskDTO[] }) {
  const [tasks, setTasks] = useState(initial);
  const [selected, setSelected] = useState<TaskDTO | null>(null);
  const [pending, setPending] = useState<Record<string, boolean>>({});

  async function toggle(task: TaskDTO) {
    setTasks((prev) => {
      const next = prev.map((t) =>
        t.id === task.id
          ? {
              ...t,
              status: (t.status === "COMPLETADA" ? "PENDIENTE" : "COMPLETADA") as TaskDTO["status"],
              priorityScore: 0,
            }
          : t
      );
      return next.sort(
        (a, b) => Number(a.status === "COMPLETADA") - Number(b.status === "COMPLETADA")
      );
    });
    setPending((p) => ({ ...p, [task.id]: true }));
    await setTaskStatus(task.id, task.status === "COMPLETADA" ? "PENDIENTE" : "COMPLETADA");
    setPending((p) => ({ ...p, [task.id]: false }));
  }

  async function changeImportance(task: TaskDTO, importance: "BAJA" | "MEDIA" | "ALTA") {
    const res = await setTaskImportance(task.id, importance);
    if (res?.ok) {
      setTasks((prev) =>
        prev.map((t) => (t.id === task.id ? { ...t, importance } : t))
      );
      setSelected((s) => (s && s.id === task.id ? { ...s, importance } : s));
    }
  }

  return (
    <>
      <LayoutGroup>
        <motion.ul layout className="flex flex-col gap-3">
          <AnimatePresence initial={false}>
            {tasks.map((task) => (
              <motion.li
                key={task.id}
                layout
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.97 }}
                transition={{ duration: 0.25, ease: APPLE_EASE }}
              >
                <TaskCard task={task} onOpen={() => setSelected(task)} onToggle={() => toggle(task)} />
              </motion.li>
            ))}
          </AnimatePresence>
        </motion.ul>
      </LayoutGroup>

      <TaskDrawer
        task={selected}
        onOpenChange={(open) => !open && setSelected(null)}
        onChangeImportance={changeImportance}
        onToggle={toggle}
        pending={pending[selected?.id ?? ""]}
      />
    </>
  );
}
