"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { CalendarDays, CheckCircle2, Smartphone } from "lucide-react";
import { fadeInUp } from "@/lib/motion";
import { Button } from "@/components/ui/button";

export function Landing() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-8 px-6 py-20 text-center">
      <motion.div
        custom={0}
        initial="hidden"
        animate="show"
        variants={fadeInUp}
        className="flex items-center gap-3 text-sm font-medium text-muted-foreground"
      >
        <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground">
          <CheckCircle2 className="h-4 w-4" />
        </span>
        InsTareas
      </motion.div>

      <motion.h1
        custom={1}
        initial="hidden"
        animate="show"
        variants={fadeInUp}
        className="max-w-2xl text-5xl font-semibold tracking-tight text-foreground sm:text-6xl"
      >
        Tus tareas del Aula Virtual,
        <br />
        <span className="text-primary">priorizadas</span> y al día.
      </motion.h1>

      <motion.p
        custom={2}
        initial="hidden"
        animate="show"
        variants={fadeInUp}
        className="max-w-xl text-lg text-muted-foreground"
      >
        InsTareas extrae tus tareas próximas de ESPOL, las ordena por urgencia e
        importancia y las sincroniza con tu calendario en cualquier dispositivo.
      </motion.p>

      <motion.div
        custom={3}
        initial="hidden"
        animate="show"
        variants={fadeInUp}
        className="flex flex-wrap items-center justify-center gap-4"
      >
        <span className="flex items-center gap-2 text-sm text-muted-foreground">
          <Smartphone className="h-4 w-4" /> PWA instalable en Android, Windows, macOS e iOS
        </span>
        <span className="flex items-center gap-2 text-sm text-muted-foreground">
          <CalendarDays className="h-4 w-4" /> Suscripción webcal para tu calendario
        </span>
      </motion.div>

      <motion.div custom={4} initial="hidden" animate="show" variants={fadeInUp} className="mt-2">
        <div className="flex items-center justify-center gap-3">
          <Button asChild size="lg" className="rounded-full px-8">
            <Link href="/register">Comenzar</Link>
          </Button>
          <Button asChild size="lg" variant="secondary" className="rounded-full px-8">
            <Link href="/login">Iniciar sesión</Link>
          </Button>
        </div>
      </motion.div>
    </main>
  );
}
