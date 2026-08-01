# InsTareas

PWA que extrae las tareas próximas del Aula Virtual de ESPOL (Canvas LMS), las prioriza por urgencia e importancia, y las sincroniza en cualquier dispositivo con una estética inspirada en Apple.

## Stack

- **Frontend:** Next.js 16 (App Router) + React 19 + TypeScript + Tailwind CSS 4 + shadcn/ui (Radix)
- **Animación:** Framer Motion, vaul (sheets), cmdk (command palette)
- **Datos:** PostgreSQL (Neon free) + Prisma 7 (@prisma/adapter-pg)
- **Sync:** worker Node (`worker/`) que consume la **API REST de Canvas** con un Personal Access Token del usuario, programado con **GitHub Actions** (cron cada 30 min + `workflow_dispatch`)
- **Auth:** sesión JWT propia (jose) por cookie httpOnly; credenciales de ESPOL cifradas con AES-256-GCM
- **Calendario:** export `.ics` (RFC 5545) + suscripción `webcal://` para Apple Calendar, Google Calendar y Outlook
- **PWA:** manifest nativo + service worker (`public/sw.js`) + Web Push

## Requisitos para correrlo

1. Crear una base en [Neon](https://neon.tech) (free) y copiar `.env.example` a `.env`, completando `DATABASE_URL`, `NEXTAUTH_SECRET` (`openssl rand -base64 32`) y `ENCRYPTION_KEY` (`openssl rand -hex 32`).
2. Aplicar el schema: `npm run db:migrate` (o `npm run db:deploy` en producción).
3. `npm install && npm run dev` → http://localhost:3000

## Sincronización con el Aula Virtual

El usuario registra en la app su **Personal Access Token de Canvas** (Aula Virtual → Cuenta → Configuración → Integraciones aprobadas → Nueva clave de acceso). El worker (`.github/workflows/sync.yml`) lo descifra en cada corrida y sincroniza vía `GET /api/v1/users/self/upcoming_events`.

Secretos requeridos en GitHub Actions: `DATABASE_URL`, `ENCRYPTION_KEY` (los mismos del `.env`). Para "Sincronizar ahora" desde la app: `GITHUB_OWNER`, `GITHUB_REPO`, `GH_ACTIONS_TOKEN` (PAT con permiso `actions:write`).

## Scripts

| Script | Descripción |
|---|---|
| `npm run dev` | Dev server |
| `npm run build` | Build de producción |
| `npm run lint` | ESLint |
| `npm test` | Tests unitarios (node:test) |
| `npm run db:migrate` / `db:deploy` | Migraciones Prisma |
| `cd worker && npm run sync` | Sincronización manual (con vars de entorno) |
