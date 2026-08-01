"use client";

import { useActionState } from "react";
import Link from "next/link";
import { register, type AuthState } from "@/server/actions/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function RegisterPage() {
  const [state, action, pending] = useActionState<AuthState, FormData>(register, undefined);

  return (
    <main className="flex flex-1 items-center justify-center px-6 py-16">
      <div className="w-full max-w-sm">
        <h1 className="text-3xl font-semibold tracking-tight">Crea tu cuenta</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Necesitamos tu acceso del Aula Virtual para sincronizar tus tareas.
        </p>

        <form action={action} className="mt-8 flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="email">Correo</Label>
            <Input id="email" name="email" type="email" placeholder="tu@correo.com" autoComplete="email" required />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="password">Contraseña (de la app)</Label>
            <Input id="password" name="password" type="password" autoComplete="new-password" required />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="espolUsername">Usuario ESPOL</Label>
            <Input id="espolUsername" name="espolUsername" placeholder="usuario" required />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="espolToken">Token de Canvas (Personal Access Token)</Label>
            <Input
              id="espolToken"
              name="espolToken"
              type="password"
              placeholder="token del Aula Virtual"
              required
            />
            <p className="text-xs text-muted-foreground">
              Se crea en el Aula Virtual: Cuenta → Configuración → Integraciones aprobadas →
              Nueva clave de acceso. Se guarda cifrado (AES-256-GCM).
            </p>
          </div>

          {state?.error && (
            <p className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {state.error}
            </p>
          )}

          <Button type="submit" className="mt-2" disabled={pending}>
            {pending ? "Creando…" : "Crear cuenta"}
          </Button>
        </form>

        <p className="mt-6 text-center text-sm text-muted-foreground">
          ¿Ya tienes cuenta?{" "}
          <Link href="/login" className="font-medium text-primary hover:underline">
            Inicia sesión
          </Link>
        </p>
      </div>
    </main>
  );
}
