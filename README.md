# GRUFI SOLUCIONES

Mini CRM para dar seguimiento a empresas y oportunidades comerciales. Permite
registrar empresas, consultar en qué estado se encuentran, actualizar su
información y anotar el resultado final.

Funciona **sin configuración** usando `localStorage` y puede conectarse a
**Supabase** cuando quieras persistir los datos en la nube.

---

## Tecnologías

| Área          | Herramienta                          |
| ------------- | ------------------------------------ |
| Framework     | Next.js 14 (App Router)              |
| Lenguaje      | TypeScript                          |
| Estilos       | Tailwind CSS                        |
| Componentes   | shadcn/ui (Radix UI)                |
| Iconos        | lucide-react                        |
| Notificaciones| sonner                             |
| Base de datos | Supabase (opcional) / localStorage |
| Autenticación | Supabase Auth + `@supabase/ssr`    |
| Despliegue    | Vercel                             |

---

## Requisitos previos

- **Node.js 18.17 o superior** (recomendado 20 LTS)
- npm (incluido con Node)

> En esta máquina no había Node instalado, por eso el proyecto se entregó con
> todos los archivos escritos a mano. Instala Node y ejecuta los pasos de abajo.

---

## Instalación y ejecución local

```bash
# 1. Instalar dependencias
npm install

# 2. (Opcional) copiar variables de entorno
cp .env.example .env.local

# 3. Levantar el servidor de desarrollo
npm run dev
```

Abre <http://localhost:3000>.

Si **no** defines las variables de Supabase, la app arranca en modo
`localStorage` y carga automáticamente 12 empresas de ejemplo la primera vez.
Verás una etiqueta **"Local"** junto al título.

### Scripts disponibles

| Comando            | Descripción                                  |
| ------------------ | -------------------------------------------- |
| `npm run dev`      | Servidor de desarrollo                       |
| `npm run build`    | Compilación de producción                    |
| `npm run start`    | Sirve la compilación de producción           |
| `npm run lint`     | Linter (ESLint / next lint)                  |
| `npm run typecheck`| Verificación de tipos con `tsc --noEmit`     |

---

## Conectar con Supabase

1. **Crea un proyecto** en <https://supabase.com> (plan gratuito suficiente).
   Anota la contraseña de la base de datos y espera a que termine de
   aprovisionarse (~2 min).

2. **Crea las tablas.** En el panel de Supabase abre **SQL Editor → New query**,
   pega el contenido **completo** de [`supabase/schema.sql`](supabase/schema.sql)
   y pulsa **Run**. Esto crea las tablas `empresas`, `contactos` y `actividades`,
   sus índices y relaciones (`ON DELETE CASCADE`), los triggers de
   `fecha_actualizacion` y las **políticas RLS** para que cada usuario solo pueda
   leer y modificar **sus propios** registros (`user_id = auth.uid()`).

3. **Crea el primer usuario.** En **Authentication → Users → Add user →
   Create new user**, escribe un correo y una contraseña y marca **Auto Confirm
   User**. Ese será tu acceso a la app. **No hay registro público**: todos los
   usuarios se crean aquí manualmente.

4. **Copia las credenciales.** En **Project Settings → API** toma:
   - `Project URL`
   - La **clave pública** (`Publishable key`, o `anon` `public` en proyectos
     antiguos) — **solo esa**. Nunca uses ni publiques la `service_role` ni una
     `secret key` en el frontend.

5. **Define las variables de entorno** en `.env.local` (cópialo de
   `.env.example`):

   ```bash
   NEXT_PUBLIC_SUPABASE_URL=https://TU-PROYECTO.supabase.co
   NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
   ```

   > Se acepta también el nombre anterior `NEXT_PUBLIC_SUPABASE_ANON_KEY` como
   > respaldo, pero se recomienda `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`.

6. **Reinicia** `npm run dev`. La app detecta las variables y cambia el backend a
   Supabase (etiqueta **"Nube"** junto al título). Cualquier ruta te lleva a
   **`/login`**: entra con el usuario del paso 3.

7. **Importa tus datos locales.** Si ya tenías empresas en modo local, al entrar
   por primera vez a una base vacía aparece el aviso
   *"Encontramos X empresas guardadas localmente. ¿Deseas importarlas a
   Supabase?"* con dos opciones:
   - **Importar a Supabase** — sube empresas, contactos e historial sin duplicar
     (compara por nombre). **No borra** los datos locales: quedan como respaldo.
   - **Continuar en modo local** — sigue usando `localStorage` en este navegador.

> **No se guardan credenciales, correos ni contraseñas en el código,** ni en
> archivos de configuración, `localStorage` o el repositorio. Todo se lee de
> variables de entorno con prefijo `NEXT_PUBLIC_` y solo se usa la clave pública
> protegida por RLS. Los usuarios se crean manualmente en Supabase.

### Inicio de sesión y protección de rutas

- Ruta **`/login`** con el diseño Grafito y Champagne: correo, contraseña con
  botón de mostrar/ocultar, estado de carga y mensajes de error en español.
- Autenticación con **Supabase Auth** (`signInWithPassword`) usando
  **`@supabase/ssr`**: la sesión vive en cookies, se refresca en cada petición
  desde `middleware.ts` (`updateSession`) y se valida también en el Server
  Component `app/page.tsx` (no basta con ocultar la interfaz).
- **Sin sesión** → cualquier ruta del CRM redirige a `/login`.
  **Con sesión** en `/login` → redirige al dashboard.
- Botón **"Cerrar sesión"** en el encabezado; al cerrar vuelve a `/login`.
- **Sin variables de Supabase** la app sigue en modo local (`localStorage`) y
  **no** pide inicio de sesión.
- Clientes de Supabase: `lib/supabase/client.ts` (navegador),
  `lib/supabase/server.ts` (Server Components / Route Handlers) y
  `lib/supabase/middleware.ts` (refresco de sesión). Nunca se usa `service_role`.

### ¿Cómo funciona el cambio de backend?

`lib/repository/index.ts` expone `getRepository()`, que devuelve
`SupabaseRepository` si hay credenciales o `LocalStorageRepository` en caso
contrario. Ambos implementan la misma interfaz `EmpresaRepository`
(`lib/repository/types.ts`), así que **ningún componente cambia** al migrar.

---

## Despliegue en Vercel

1. Sube el repositorio a GitHub / GitLab / Bitbucket.
2. En <https://vercel.com/new> importa el proyecto. Vercel detecta Next.js solo.
3. En **Settings → Environment Variables** agrega (si usas Supabase):
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
4. **Deploy.** Cada push a la rama principal genera un nuevo despliegue.

> Sin variables de entorno el despliegue también funciona, pero cada navegador
> tendrá sus propios datos en `localStorage` (no se comparten entre usuarios).

Alternativa por CLI:

```bash
npm i -g vercel
vercel            # despliegue de vista previa
vercel --prod     # despliegue a producción
```

---

## Funcionalidades

- Alta, edición y eliminación de empresas (con confirmación previa).
- Cambio rápido de estado desde la tabla.
- **Monto del resultado (MXN):** cantidad numérica ≥ 0, opcional, mostrada como
  `$250,000 MXN`. Se edita desde el formulario ("Monto del resultado (MXN)"),
  desde el detalle o con un clic directo en la columna "Resultado" de la tabla.
- Edición de notas desde el detalle.
- **Próximo seguimiento editable en línea:** clic sobre la fecha (o el guion) en
  la columna "Próximo seguimiento" abre el calendario nativo; al elegir una fecha
  se guarda al instante y se recalcula la etiqueta *Atrasado / Hoy / En N d*.
  También se edita desde el formulario.
- **Completar seguimiento:** cuando hay fecha, aparece un checkmark verde
  ("Marcar seguimiento como completado"). Abre un diálogo — *"Seguimiento
  completado. ¿Deseas agendar otro seguimiento?"* — con un calendario y tres
  opciones: **Agendar nueva fecha** (reemplaza la fecha), **Finalizar sin nueva
  fecha** (deja el campo vacío) y **Cancelar** (conserva la fecha). No altera la
  marca/alerta independiente; el orden de prioridad y el contador de días se
  actualizan solos. Funciona igual en computadora y celular.
- **Marca "Próximo seguimiento"** (`requiereSeguimiento`): bandera booleana
  **independiente de la fecha** de próximo seguimiento. Se activa/desactiva con
  la campana de la columna "Marca" en la tabla, con el botón en la tarjeta de
  celular o con el interruptor del formulario. Al marcarla se muestra una campana
  resaltada con la etiqueta "Próximo seguimiento". El botón/filtro "Próximos
  seguimientos" (sobre la tabla) y la tarjeta de resumen del mismo nombre
  muestran el total de empresas marcadas y, al pulsarlos, filtran solo esas.
- "Marcar seguimiento realizado": fija el último contacto en la fecha de hoy,
  permite programar el próximo y añadir una nota fechada al historial.
- **Varios contactos por empresa.** Cada empresa tiene una lista de contactos
  (nombre, puesto, teléfono, correo, uno **principal**). Se editan en la sección
  "Contactos" del formulario (agregar / editar / eliminar / marcar principal, con
  validación de teléfono y correo). En la tabla, bajo el nombre de la empresa, se
  muestra el contacto principal y `+N contactos` si hay más. En el detalle
  aparecen todos con botones directos de llamada y correo. La migración crea un
  contacto principal a partir de los antiguos campos `contacto/telefono/correo`
  sin dividir nombres separados por `/` y sin duplicar al repetirse.
- **Historial de actividades por empresa.** En el detalle, sección "Historial de
  actividades" con línea de tiempo de la más reciente a la más antigua. Tipos:
  Llamada, Correo, Junta, Nota, Cambio de estado, Seguimiento completado. El
  botón "Registrar actividad" abre un formulario (tipo, fecha y hora,
  descripción). Se registran **automáticamente** al cambiar el estado, al
  completar un seguimiento y al programar una nueva fecha de seguimiento; los
  cambios menores (teléfono, correo, notas, monto) **no** generan actividad.
- Búsqueda por nombre, filtro por estado y ordenamiento
  (**prioridad de seguimiento**, nombre, estado, última actualización, próximo
  seguimiento) ascendente o descendente. La búsqueda y los filtros conservan el
  orden elegido.
- **Orden predeterminado "Prioridad de seguimiento"** (al abrir la app). Grupos
  primarios — la fecha o la alerta manda sobre el estado:
  1. Con fecha en "Próximo seguimiento".
  2. Sin fecha, pero con la marca/alerta "Próximo seguimiento" activada.
  3. El resto de las empresas (sin fecha ni alerta).

  Dentro de cada grupo, orden por estado: **1) En avance · 2) En pláticas ·
  3) Pendiente · 4) Futura · 5) Cerrada - Ganada · 6) Cerrada - No concretada**
  (esta última se trata como "Cerrada - Perdida" en el orden; el nombre del
  estado no se cambia). Y dentro de cada mismo estado, alfabético A–Z sin
  distinguir mayúsculas ni acentos.

  Cada empresa se reubica sola cuando cambia su fecha, su alerta o su estado. La
  fecha y la alerta siguen mandando sobre el estado: una empresa "Pendiente" con
  fecha aparece antes que una "En avance" sin fecha.
- Filtro "Fecha vencida" (empresas con fecha de próximo seguimiento vencida u
  hoy, no cerradas) — distinto de la marca manual.
- Vista de detalle en panel lateral.
- Exportar todo a CSV e importar empresas desde CSV.
- **Tarjetas de resumen que filtran la tabla:** clic en "Total de empresas"
  (quita todos los filtros), "Pendientes" / "En pláticas" / "En avance" /
  "Cerradas con éxito" (filtran por ese estado) o "Próximos seguimientos" (filtra
  por la marca `requiereSeguimiento`). El número de la tarjeta coincide siempre
  con las filas mostradas (misma fuente: `calcularResumen`). La tarjeta activa se
  resalta; volver a pulsarla regresa a "Total". Al seleccionar una tarjeta se
  limpia la búsqueda y los filtros incompatibles; después, el buscador filtra
  dentro de ese grupo. Funciona con clic, teclado y en celular, y conserva el
  orden de "Prioridad de seguimiento".
- Estados de carga, mensajes de vacío y notificaciones.
- Diseño responsive (tabla en escritorio/tablet, tarjetas en celular).

### Paleta "Grafito y Champagne"

Toda la paleta se define como tokens CSS en [`app/globals.css`](app/globals.css)
(cada color aparece una sola vez) y se expone a Tailwind en
[`tailwind.config.ts`](tailwind.config.ts). Los componentes usan solo clases de
token (`bg-estado-avance/12`, `text-champagne`, `text-seguimiento`, `text-exito`,
`text-alerta`, `text-destructive`…), nunca códigos hex.

| Uso | Color |
| --- | --- |
| Fondo perlado de la app | `#FAF8F3` |
| Tarjetas y tabla | `#FFFFFF` |
| Grafito (título, texto, botón "Agregar empresa", encabezados) | `#2D3138` |
| Champagne (borde/icono de tarjeta seleccionada, focus rings, acentos) | `#B89B5E` |
| Bordes suaves | `#E8E2D8` · Fondo hover `#F4EFE5` |

### Estados y colores semánticos

| Estado / uso | Color |
| --- | --- |
| Pendiente | Gris cálido `#77736B` |
| En pláticas · fechas próximas · alertas | Ámbar dorado `#C58C36` |
| En avance · etiquetas/iconos de próximo seguimiento | Azul acero `#5C7C8A` |
| Futura | Champagne suave `#B89B5E` |
| Cerrada - Ganada · checkmarks completados · confirmaciones | Verde bosque `#3F7D62` |
| Cerrada - No concretada · fechas vencidas · errores | Rojo apagado `#9B4F55` |

### Formato del CSV

Encabezados aceptados al importar (no distingue mayúsculas/acentos):
`Empresa` (obligatorio), `Estado`, `Monto del resultado (MXN)`, `Notas`,
`Contacto`, `Teléfono`, `Correo`, `Último contacto`, `Próximo seguimiento`,
`Requiere seguimiento`.
El monto acepta valores como `250000`, `$250,000` o `250000 MXN`; vacío o no
numérico se guarda como sin monto. `Requiere seguimiento` acepta
`Sí` / `No` / `true` / `1` / `x` (cualquier otro valor = `No`); al exportar se
escribe `Sí` o `No`. Fechas admitidas: `YYYY-MM-DD` o `DD/MM/YYYY`. Filas sin
`Empresa` se omiten. Un estado no reconocido se guarda como `Pendiente`. Al
exportar, el monto se escribe como número plano.

---

## Estructura del proyecto

```
middleware.ts             Refresca la sesión y protege las rutas del CRM

app/
  layout.tsx              Layout raíz, fuente Inter, <Toaster/>
  page.tsx                Dashboard (valida la sesión en el servidor)
  login/page.tsx          Ruta /login (redirige al dashboard si ya hay sesión)
  globals.css             Tokens de color (paleta "Grafito y Champagne")

components/
  ui/                     Primitivas shadcn/ui (button, sheet, dialog, select...)
  empresas/
    dashboard.tsx         Orquestador: estado de filtros, sheets y diálogos
    app-header.tsx        Título, subtítulo y botón "Agregar empresa"
    summary-cards.tsx     Tarjetas de resumen
    toolbar.tsx           Búsqueda, filtros, orden, importar/exportar
    empresa-table.tsx     Tabla (escritorio) + lista de tarjetas (celular)
    empresa-actions-menu.tsx
    estado-badge.tsx      Etiqueta de estado con color
    estado-quick-select.tsx  Cambio rápido de estado
    monto-resultado-cell.tsx Celda "Resultado" con edición rápida del monto
    requiere-seguimiento-toggle.tsx  Campana para la marca "Próximo seguimiento"
    proximo-seguimiento-cell.tsx
    empresa-form-sheet.tsx   Formulario alta/edición (panel lateral)
    empresa-detail-sheet.tsx Vista de detalle (panel lateral)
    contactos-editor.tsx     Sección "Contactos" del formulario
    historial-actividades.tsx  Línea de tiempo del historial
    registrar-actividad-dialog.tsx  Alta manual de una actividad
    migrar-supabase-dialog.tsx  Aviso de importación de datos locales
    delete-empresa-dialog.tsx
    seguimiento-dialog.tsx
    empty-state.tsx
    field.tsx
  auth/
    login-form.tsx         Formulario de /login (correo, contraseña, ver/ocultar)

lib/
  types.ts               Tipos: Empresa, Contacto, Actividad, ESTADOS...
  constants.ts           Config de estados/colores, claves, tablas, actividades
  date.ts                Formateo de fechas y lógica de "seguimiento pendiente"
  filtros.ts             filtrarYOrdenar() y calcularResumen()
  validation.ts          Validación de empresa y de contactos (correo, teléfono)
  money.ts               Formato y parseo del monto en MXN ($250,000 MXN)
  csv.ts                 Exportar / importar / parsear CSV
  seed.ts                Datos de ejemplo (solo modo localStorage)
  utils.ts               cn() y generarId()
  supabase/
    config.ts            URL + clave pública (publishable / anon) e isSupabaseConfigured()
    client.ts            Cliente para el navegador (createBrowserClient de @supabase/ssr)
    server.ts            Cliente para Server Components / Route Handlers
    middleware.ts        updateSession(): refresca la sesión y redirige
  repository/
    types.ts             Interfaz EmpresaRepository (empresas + contactos + actividades)
    local-storage-repository.ts   Incluye migración idempotente de la estructura
    supabase-repository.ts
    index.ts             getRepository() — elige backend / preferencia de modo
  hooks/
    use-empresas.tsx     Estado global + CRUD + usuario/cerrar sesión + migración

supabase/
  schema.sql             DDL de empresas, contactos, actividades + índices + RLS

.env.example             Plantilla de variables de entorno
```

### Archivos principales

- `lib/repository/*` — capa de datos intercambiable (localStorage ↔ Supabase).
- `lib/hooks/use-empresas.tsx` — única fuente de verdad del estado en la UI.
- `components/empresas/dashboard.tsx` — arma toda la pantalla principal.
- `supabase/schema.sql` — estructura de la base de datos.
