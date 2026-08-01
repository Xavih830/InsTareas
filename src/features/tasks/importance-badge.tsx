import { cn } from "@/lib/utils";
import type { Importance } from "@/generated/prisma/enums";

const styles: Record<Importance, string> = {
  BAJA: "bg-secondary text-secondary-foreground",
  MEDIA: "bg-primary/10 text-primary",
  ALTA: "bg-[#FF9500]/15 text-[#C93400] dark:text-[#FF9F0A]",
};

export function ImportanceBadge({ importance }: { importance: Importance }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium",
        styles[importance]
      )}
    >
      {importance === "BAJA" ? "Baja" : importance === "MEDIA" ? "Media" : "Alta"}
    </span>
  );
}
