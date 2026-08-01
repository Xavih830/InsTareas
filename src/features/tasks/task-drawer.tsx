"use client";

import { Drawer } from "vaul";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { TaskDTO } from "./types";

export function TaskDrawer({
  task,
  onOpenChange,
  onChangeImportance,
  onToggle,
  pending,
}: {
  task: TaskDTO | null;
  onOpenChange: (open: boolean) => void;
  onChangeImportance: (task: TaskDTO, importance: "BAJA" | "MEDIA" | "ALTA") => void;
  onToggle: (task: TaskDTO) => void;
  pending?: boolean;
}) {
  return (
    <Drawer.Root open={!!task} onOpenChange={onOpenChange}>
      <Drawer.Portal>
        <Drawer.Overlay className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm" />
        <Drawer.Content className="fixed inset-x-0 bottom-0 z-50 mx-auto flex max-h-[85dvh] max-w-lg flex-col rounded-t-3xl bg-card outline-none">
          <div className="sticky top-0 z-10 flex flex-col items-center gap-2 bg-card px-6 pt-3">
            <Drawer.Handle className="h-1.5 w-10 rounded-full bg-border" />
          </div>
          {task && (
            <div className="flex flex-col gap-5 overflow-y-auto px-6 pb-8 pt-4">
              <div>
                <h2 className="text-2xl font-semibold tracking-tight">{task.title}</h2>
                <p className="mt-1 text-sm text-muted-foreground">{task.course}</p>
                <p className="mt-2 text-sm text-muted-foreground">
                  Entrega: {format(new Date(task.dueDate), "d 'de' MMMM 'de' yyyy, HH:mm", { locale: es })}
                </p>
              </div>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="importance">Importancia</Label>
                <Select
                  value={task.importance}
                  onValueChange={(v) => onChangeImportance(task, v as "BAJA" | "MEDIA" | "ALTA")}
                >
                  <SelectTrigger id="importance" className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="BAJA">Baja</SelectItem>
                    <SelectItem value="MEDIA">Media</SelectItem>
                    <SelectItem value="ALTA">Alta</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {task.description && (
                <div>
                  <Label>Descripción</Label>
                  <p className="mt-1.5 whitespace-pre-line text-sm leading-relaxed text-muted-foreground">
                    {task.description}
                  </p>
                </div>
              )}

              <div className="flex gap-3">
                <Button
                  className="flex-1"
                  disabled={pending}
                  onClick={() => onToggle(task)}
                >
                  {task.status === "COMPLETADA" ? "Reabrir" : "Marcar como completada"}
                </Button>
                {task.sourceUrl && (
                  <Button variant="secondary" asChild>
                    <a href={task.sourceUrl} target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="mr-1.5 h-4 w-4" />
                      En el aula
                    </a>
                  </Button>
                )}
              </div>
            </div>
          )}
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  );
}
