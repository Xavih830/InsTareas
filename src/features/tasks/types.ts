import type { Importance, TaskStatus } from "@/generated/prisma/enums";

export type TaskDTO = {
  id: string;
  externalId: string;
  title: string;
  course: string;
  dueDate: string;
  description: string | null;
  sourceUrl: string | null;
  importance: Importance;
  priorityScore: number;
  status: TaskStatus;
};
