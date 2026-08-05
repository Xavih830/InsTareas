import { prisma } from "../db.js";
import { getCourseModules, getCourses } from "../scraper/canvas.js";

// Sincroniza la estructura de contenido de todos los cursos activos del
// usuario: Course + Module + ModuleItem. Reutiliza el mismo credencial de
// Canvas que las tareas (PAT o sesión headless), según lo que provea `auth`.
export async function syncCourseContent(userId, auth) {
  const courses = await getCourses(auth);

  if (courses.size === 0) {
    return { courses: 0, modules: 0, items: 0 };
  }

  // Persistir cursos y vincular tareas al curso resuelto.
  let modulesCount = 0;
  let itemsCount = 0;

  for (const [courseId, courseName] of courses) {
    const course = await prisma.course.upsert({
      where: { userId_externalId: { userId, externalId: courseId } },
      update: { name: courseName, isActive: true },
      create: { userId, externalId: courseId, name: courseName, isActive: true },
    });

    await prisma.task.updateMany({
      where: { userId, course: courseName },
      data: { courseId: course.id },
    });

    const modules = await getCourseModules(courseId, auth);
    for (const mod of modules) {
      const saved = await prisma.module.upsert({
        where: { courseId_externalId: { courseId: course.id, externalId: mod.externalId } },
        update: {
          position: mod.position,
          name: mod.name,
          state: mod.state,
          unlockAt: mod.unlockAt,
          prereqIds: mod.prereqIds,
        },
        create: {
          courseId: course.id,
          externalId: mod.externalId,
          position: mod.position,
          name: mod.name,
          state: mod.state,
          unlockAt: mod.unlockAt,
          prereqIds: mod.prereqIds,
        },
      });
      modulesCount++;

      for (const it of mod.items) {
        await prisma.moduleItem.upsert({
          where: { moduleId_externalId: { moduleId: saved.id, externalId: it.externalId } },
          update: {
            position: it.position,
            title: it.title,
            type: it.type,
            contentId: it.contentId,
            url: it.url,
            published: it.published,
          },
          create: {
            moduleId: saved.id,
            externalId: it.externalId,
            position: it.position,
            title: it.title,
            type: it.type,
            contentId: it.contentId,
            url: it.url,
            published: it.published,
          },
        });
        itemsCount++;
      }
    }
  }

  await prisma.course.updateMany({
    where: { userId, externalId: { notIn: [...courses.keys()] } },
    data: { isActive: false },
  });

  return { courses: courses.size, modules: modulesCount, items: itemsCount };
}