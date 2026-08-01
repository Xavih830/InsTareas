import type { TaskDTO } from "@/features/tasks/types";

function esc(value: string): string {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\n/g, "\\n");
}

export function formatIcalDate(date: Date): string {
  return date.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
}

export function toIcs(tasks: TaskDTO[], now = new Date()): string {
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//InsTareas//InsTareas//ES",
    "CALSCALE:GREGORIAN",
    "X-WR-CALNAME:InsTareas",
  ];

  for (const task of tasks) {
    if (task.status === "COMPLETADA") continue;
    lines.push(
      "BEGIN:VEVENT",
      `UID:${task.id}@instareas`,
      `DTSTAMP:${formatIcalDate(now)}`,
      `DTSTART:${formatIcalDate(new Date(task.dueDate))}`,
      `SUMMARY:${esc(task.title)}`,
      `DESCRIPTION:${esc(task.course)}`
    );
    if (task.sourceUrl) lines.push(`URL:${esc(task.sourceUrl)}`);
    lines.push("END:VEVENT");
  }

  lines.push("END:VCALENDAR");
  return lines.join("\r\n") + "\r\n";
}
