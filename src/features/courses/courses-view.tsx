"use client";

import { useState } from "react";
import { BookOpen, ChevronDown, ExternalLink, FileText, FolderOpen, Link2, ListOrdered } from "lucide-react";
import { cn } from "@/lib/utils";

type CourseItem = {
  id: string;
  title: string;
  type: string;
  url: string | null;
  published: boolean;
};

type CourseModule = {
  id: string;
  name: string;
  state: string | null;
  items: CourseItem[];
};

type Course = {
  id: string;
  externalId: string;
  name: string;
  code: string | null;
  modules: CourseModule[];
};

function itemIcon(type: string) {
  switch (type) {
    case "File":
      return <FileText className="h-4 w-4 shrink-0" />;
    case "ExternalUrl":
      return <Link2 className="h-4 w-4 shrink-0" />;
    case "Page":
      return <FileText className="h-4 w-4 shrink-0" />;
    default:
      return <ListOrdered className="h-4 w-4 shrink-0" />;
  }
}

export function CoursesView({ courses, empty }: { courses: Course[]; empty: boolean }) {
  const [openCourse, setOpenCourse] = useState<string | null>(courses[0]?.id ?? null);
  const [openModule, setOpenModule] = useState<string | null>(null);

  if (empty) {
    return (
      <section className="rounded-2xl border border-dashed border-border px-6 py-12 text-center">
        <BookOpen className="mx-auto mb-3 h-8 w-8 text-muted-foreground" />
        <p className="font-medium">Aún no hay contenido de cursos</p>
        <p className="mt-1 text-sm text-muted-foreground">
          Dispara el workflow “Sincronizar contenido” desde GitHub Actions para traer
          los módulos y material de tus cursos.
        </p>
      </section>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {courses.map((course) => {
        const isOpen = openCourse === course.id;
        return (
          <section key={course.id} className="overflow-hidden rounded-2xl border border-border bg-card">
            <button
              onClick={() => setOpenCourse(isOpen ? null : course.id)}
              className="flex w-full items-center justify-between gap-3 px-4 py-4 text-left"
            >
              <div className="flex items-center gap-3">
                <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <BookOpen className="h-4 w-4" />
                </span>
                <div>
                  <p className="font-semibold">{course.name}</p>
                  {course.code && <p className="text-xs text-muted-foreground">{course.code}</p>}
                </div>
              </div>
              <ChevronDown className={cn("h-4 w-4 text-muted-foreground transition-transform", isOpen && "rotate-180")} />
            </button>

            {isOpen && (
              <div className="border-t border-border/60">
                {course.modules.length === 0 ? (
                  <p className="px-4 py-4 text-sm text-muted-foreground">Este curso no tiene módulos sincronizados.</p>
                ) : (
                  course.modules.map((mod) => {
                    const modOpen = openModule === mod.id;
                    return (
                      <div key={mod.id} className="border-b border-border/40 last:border-b-0">
                        <button
                          onClick={() => setOpenModule(modOpen ? null : mod.id)}
                          className="flex w-full items-center gap-2 px-4 py-3 text-left text-sm hover:bg-muted/40"
                        >
                          <FolderOpen className="h-4 w-4 shrink-0 text-muted-foreground" />
                          <span className="flex-1 font-medium">{mod.name}</span>
                          <span className="text-xs text-muted-foreground">{mod.items.length} ítems</span>
                          <ChevronDown className={cn("h-3.5 w-3.5 text-muted-foreground transition-transform", modOpen && "rotate-180")} />
                        </button>

                        {modOpen && (
                          <ul className="space-y-0.5 bg-muted/20 px-4 py-2">
                            {mod.items.length === 0 ? (
                              <li className="py-1 text-xs text-muted-foreground">Sin ítems</li>
                            ) : (
                              mod.items.map((item) => (
                                <li key={item.id}>
                                  <a
                                    href={item.url ?? "#"}
                                    target={item.url ? "_blank" : undefined}
                                    rel="noopener noreferrer"
                                    className={cn(
                                      "flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm text-muted-foreground hover:bg-muted hover:text-foreground",
                                      !item.published && "opacity-50"
                                    )}
                                  >
                                    {itemIcon(item.type)}
                                    <span className="flex-1 truncate">{item.title}</span>
                                    <ExternalLink className="h-3 w-3 shrink-0 opacity-50" />
                                  </a>
                                </li>
                              ))
                            )}
                          </ul>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            )}
          </section>
        );
      })}
    </div>
  );
}