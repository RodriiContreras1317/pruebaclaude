# CRM de ventas

CRM web simple para gestionar leads de ventas y planificar objetivos mensuales.

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

Si ya tenías la base creada y bajaste cambios con migraciones nuevas, aplicalas sin borrar tus datos con `npx prisma migrate deploy` (no uses `db:setup`, que vuelve a cargar los leads de ejemplo).

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

### Presupuestos (`/presupuestos`)
- **Circular y lista:** al entrar, para cada una elegís *Usar la misma de siempre* (la última que cargaste) o *Adjuntar una nueva*:
  - **Circular FCA (PDF):** lee tasas, aportes CE, coeficientes y máximos a financiar de los productos promo y tradicionales. Antes de continuar muestra lo que leyó para que lo revises. LTV y modelos habilitados de cada producto salen de `src/lib/presupuestos/productos.ts`.
  - **Lista de precios (Excel):** lista las hojas con formato de lista (encabezados *MODELO-VERSION*, *Precio Oficial*, *Precio TARABORELLI*, *Flete…*, *Patentamiento*) y sugiere la primera que dice "VIGENTE". Lee los modelos hasta "Versiones discontinuadas".
  - Al continuar, lo nuevo se guarda en la base de datos y pasa a ser "la misma de siempre". Si nunca se cargó nada, se usan la circular 016.26 y la lista "OCTUBRE VIGENTE 0610", que vienen incluidas en la app.
- Después se elige **Financiada** o **Contado** y el vehículo. Se muestra el **Precio Taraborelli** de la lista como referencia; el precio de la operación se carga a mano.
- **Contado:** checkboxes de *Flete / Formularios* y *Patentamiento*, total y nota al pie según lo elegido.
- **Financiada:** siempre suma flete/formularios y patentamiento (puesto en calle). Con el anticipo del cliente, que incluye la prenda, calcula para cada producto y plazo el monto a financiar, la diferencia, la prenda, el anticipo y la cuota. Primero van los productos promo y después las líneas tradicionales.
  - Monto máximo: el menor entre el tope del producto, el LTV sobre el Precio Oficial y el puesto en calle.
  - Si el anticipo no alcanza, se financia el máximo y se marca el anticipo necesario. Con anticipo $0 se ven los mínimos anticipos.

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
  schema.prisma          Modelos Lead, MonthlyGoal y FuentePresupuesto
  migrations/            Migraciones
  seed.ts                15 leads de ejemplo y objetivo del mes actual
src/
  app/
    page.tsx             Inicio
    leads/               Kanban y tabla, alta, edición y server actions
    objetivos/           Plan mensual y server action del objetivo
    presupuestos/        Presupuestos de contado y financiados
  components/            Componentes de interfaz
  lib/
    planning.ts          Semanas, reparto y replanificación
    phone.ts             Validación y formato de teléfonos argentinos
    stages.ts            Etapas y regla de la fecha de venta
    dates.ts             Fechas en hora de Argentina
    goals.ts, leads.ts   Consultas a la base de datos
    db.ts                Cliente de Prisma
    presupuestos/        Lista y circular base, lectura de PDF/Excel y cálculos
tests/                   Tests unitarios (Vitest)
```
