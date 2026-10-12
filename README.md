# CRM de ventas

CRM web simple para gestionar leads de ventas y planificar objetivos mensuales. Incluye además un anotador de torneos de truco.

Hecho con **Next.js 16** (App Router), **TypeScript**, **Tailwind CSS 4** y **Prisma + SQLite**. La base de datos es un archivo local, así que no hace falta configurar nada.

## Requisitos

- Node.js 20.9 o superior (probado con Node 22)
- npm

## Instalación y uso

```bash
# 1. Instalar dependencias (también genera el cliente de Prisma)
npm install

# 2. Crear la base de datos SQLite y cargar los 15 leads de ejemplo
npm run db:setup

# 3. Levantar la app en modo desarrollo
npm run dev
```

Abrí http://localhost:3000. Para usarla desde el celular en la misma red Wi‑Fi, entrá a `http://<IP-de-tu-compu>:3000`.

### Otros comandos

| Comando | Qué hace |
| --- | --- |
| `npm test` | Corre los tests unitarios (Vitest) |
| `npm run test:watch` | Tests en modo watch |
| `npm run typecheck` | Chequeo de tipos de TypeScript |
| `npm run lint` | ESLint |
| `npm run build` y `npm start` | Build de producción y servidor |
| `npm run db:seed` | Vuelve a cargar los leads de ejemplo (borra los leads existentes) |
| `npm run db:reset` | Borra la base de datos, la recrea y carga el seed |
| `npx prisma studio` | Explorador visual de la base de datos |

La base de datos se guarda en `prisma/dev.db` y está en `.gitignore`.

## Funcionalidades

### Leads (`/leads`)
- Crear, editar y eliminar leads. Eliminar pide confirmación.
- **Kanban** con una columna por etapa: *No vendido*, *Seguimiento*, *Posible compra* y *Vendido*.
  - En computadora, arrastrá la tarjeta con el mouse. También se puede usar el teclado: tab hasta la tarjeta, espacio para tomarla, flechas para moverla y espacio para soltarla.
  - En el celular, mantené presionada la tarjeta para arrastrarla o usá el selector **Mover a…** de cada tarjeta.
- **Tabla** con búsqueda por nombre o teléfono y filtro por etapa. En el celular se muestra como lista de tarjetas.
- Botón de **WhatsApp** en cada lead, que abre `wa.me` con el número.
- Contador de leads por etapa. Al tocar un contador se abre la tabla filtrada por esa etapa.
- **Teléfonos de Argentina:** se aceptan con o sin +54, con 9, con 0 y con 15 (por ejemplo `11 2345-6789`, `+54 9 11 2345-6789`, `011 15 2345-6789`, `0351 15 123-4567`). Se guardan normalizados como `+549XXXXXXXXXX`.
- **Fecha de venta:** se completa sola cuando el lead pasa a *Vendido* y se borra si sale de esa etapa.

### Objetivos (`/objetivos`)
- Objetivo de ventas por mes. Si no se define, es 10.
- Navegación entre meses (`/objetivos?mes=2026-10`).
- Plan semanal con fechas, días hábiles, plan original, plan ajustado, ventas reales y estado de cada semana: *cumplida*, *en curso*, *atrasada* o *pendiente*.
- Barra de progreso del mes con el porcentaje.

### Torneos de truco (`/truco`)
- Crear torneos con nombre, formato, puntos por partido (15, o 30 con malas y buenas) y la lista de equipos (uno por renglón). Opcionalmente se sortea el orden.
- **Liga (todos contra todos):** el fixture se arma solo por fechas. Con equipos impares, en cada fecha uno queda libre. Tabla de posiciones ordenada por partidos ganados, diferencia de tantos y tantos a favor.
- **Eliminación directa:** cuadro con cuartos, semis y final. Si los equipos no son 4, 8, 16…, los primeros pasan directo a la segunda ronda. El ganador de cada partido avanza solo.
- **Anotador** de cada partido con fósforos (cuadrados de a 5), botones grandes de +1 y atajos −1, +2 y +3. Cada toque se guarda al instante.
- Al llegar a los puntos, el partido termina. Para corregir, restale puntos al ganador; en eliminación se puede solo si el partido siguiente todavía no empezó.
- La lógica (fixture, cuadro, tabla) está en [`src/lib/truco.ts`](src/lib/truco.ts) con tests en [`tests/truco.test.ts`](tests/truco.test.ts).

### Inicio (`/`)
- Progreso del mes actual.
- Ventas necesarias esta semana (según el plan ajustado) y cuántas llevás.
- Leads por etapa.
- Lista de leads para contactar: primero *Posible compra* y después *Seguimiento*. Dentro de cada etapa aparecen primero los que llevan más tiempo sin cambios.

## Cómo se calcula el plan

La lógica está en [`src/lib/planning.ts`](src/lib/planning.ts). Son funciones puras, sin acceso a la base de datos, y están cubiertas por los tests en [`tests/planning.test.ts`](tests/planning.test.ts).

1. **Semanas:** van de lunes a domingo e incluyen todas las que tocan el mes. Cada semana pesa según sus días hábiles (lunes a viernes) *dentro del mes*. Por ejemplo, si el mes empieza un jueves, la primera semana pesa 2.
2. **Plan original:** a cada semana le toca `⌊objetivo × peso / total de pesos⌋`. Lo que sobra se suma de a 1 a las primeras semanas con peso mayor a cero, así los números son enteros y suman exactamente el objetivo.
3. **Plan ajustado (replanificación):** en las semanas cerradas cuenta lo vendido. Lo que falta para el objetivo (nunca menos de 0) se reparte con el mismo criterio entre la semana en curso y las siguientes. Si ya superaste el objetivo, las semanas que quedan piden 0.
4. **Estado de cada semana:**
   - **Cumplida:** ya terminó y alcanzó su plan original.
   - **Atrasada:** ya terminó y no lo alcanzó.
   - **En curso:** es la semana actual. Si ya alcanzó su plan ajustado, se marca como *cumplida*.
   - **Pendiente:** es una semana futura.
5. **Ventas del mes:** se cuentan las ventas cuya fecha cae dentro del mes, aunque la semana esté partida con otro mes.

Todas las fechas se calculan con la hora de Argentina (`America/Argentina/Buenos_Aires`).

## Estructura

```
prisma/
  schema.prisma          Modelos Lead, MonthlyGoal, Tournament, Team y Match
  migrations/            Migraciones (inicial y torneos de truco)
  seed.ts                15 leads de ejemplo y objetivo del mes actual
src/
  app/
    page.tsx             Inicio
    leads/               Kanban y tabla, alta, edición y server actions
    objetivos/           Plan mensual y server action del objetivo
    truco/               Torneos, anotador y server actions
  components/            Componentes de interfaz
  lib/
    planning.ts          Semanas, reparto y replanificación
    phone.ts             Validación y formato de teléfonos argentinos
    stages.ts            Etapas y regla de la fecha de venta
    dates.ts             Fechas en hora de Argentina
    truco.ts             Fixture, cuadro de eliminación y tabla de posiciones
    goals.ts, leads.ts, tournaments.ts   Consultas a la base de datos
    db.ts                Cliente de Prisma
tests/                   Tests unitarios (Vitest)
```
