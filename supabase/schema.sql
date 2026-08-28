-- ============================================================
-- GRUFI SOLUCIONES — Esquema de base de datos (Supabase)
--
-- Ejecuta este script completo en:
--   Supabase Dashboard -> SQL Editor -> New query -> Run
--
-- Crea 3 tablas (empresas, contactos, actividades), sus índices,
-- relaciones, triggers de fecha_actualizacion y políticas RLS para
-- que cada usuario solo vea y modifique SUS propios datos.
-- ============================================================

create extension if not exists "pgcrypto";

-- ------------------------------------------------------------
-- 1) EMPRESAS
-- ------------------------------------------------------------
create table if not exists public.empresas (
  id                        uuid primary key default gen_random_uuid(),
  user_id                   uuid not null default auth.uid() references auth.users (id) on delete cascade,
  nombre                    text        not null check (char_length(trim(nombre)) > 0),
  estado                    text        not null default 'Pendiente'
    check (estado in (
      'Pendiente',
      'En pláticas',
      'En avance',
      'Futura',
      'Cerrada - Ganada',
      'Cerrada - No concretada'
    )),
  monto_resultado           numeric(14,2) check (monto_resultado is null or monto_resultado >= 0),
  notas                     text        not null default '',
  fecha_ultimo_contacto     date,
  fecha_proximo_seguimiento date,
  requiere_seguimiento      boolean     not null default false,
  fecha_creacion            timestamptz not null default now(),
  fecha_actualizacion       timestamptz not null default now()
);

-- ------------------------------------------------------------
-- 2) CONTACTOS (varios por empresa)
-- ------------------------------------------------------------
create table if not exists public.contactos (
  id                  uuid primary key default gen_random_uuid(),
  user_id             uuid not null default auth.uid() references auth.users (id) on delete cascade,
  empresa_id          uuid not null references public.empresas (id) on delete cascade,
  nombre              text        not null default '',
  puesto              text        not null default '',
  telefono            text        not null default '',
  correo              text        not null default '',
  principal           boolean     not null default false,
  fecha_creacion      timestamptz not null default now(),
  fecha_actualizacion timestamptz not null default now()
);

-- Como máximo un contacto principal por empresa.
create unique index if not exists contactos_un_principal_idx
  on public.contactos (empresa_id) where principal;

-- ------------------------------------------------------------
-- 3) ACTIVIDADES (historial, solo se agregan)
-- ------------------------------------------------------------
create table if not exists public.actividades (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null default auth.uid() references auth.users (id) on delete cascade,
  empresa_id     uuid not null references public.empresas (id) on delete cascade,
  tipo           text not null check (tipo in (
    'Llamada', 'Correo', 'Junta', 'Nota', 'Cambio de estado', 'Seguimiento completado'
  )),
  fecha_hora     timestamptz not null default now(),
  descripcion    text not null default '',
  usuario        text not null default '',
  fecha_creacion timestamptz not null default now()
);

-- ------------------------------------------------------------
-- Índices para búsqueda y ordenamiento
-- ------------------------------------------------------------
create index if not exists empresas_user_idx          on public.empresas (user_id);
create index if not exists empresas_estado_idx        on public.empresas (user_id, estado);
create index if not exists empresas_creacion_idx      on public.empresas (user_id, fecha_creacion desc);
create index if not exists empresas_seguimiento_idx   on public.empresas (fecha_proximo_seguimiento);
create index if not exists empresas_nombre_lower_idx  on public.empresas (user_id, lower(nombre));

create index if not exists contactos_empresa_idx      on public.contactos (empresa_id);
create index if not exists contactos_user_idx         on public.contactos (user_id);

create index if not exists actividades_empresa_idx    on public.actividades (empresa_id, fecha_hora desc);
create index if not exists actividades_user_idx       on public.actividades (user_id);

-- ------------------------------------------------------------
-- Trigger: fecha_actualizacion = now() en cada UPDATE
-- ------------------------------------------------------------
create or replace function public.set_fecha_actualizacion()
returns trigger language plpgsql as $$
begin
  new.fecha_actualizacion = now();
  return new;
end;
$$;

drop trigger if exists empresas_set_fecha_actualizacion on public.empresas;
create trigger empresas_set_fecha_actualizacion
  before update on public.empresas
  for each row execute function public.set_fecha_actualizacion();

drop trigger if exists contactos_set_fecha_actualizacion on public.contactos;
create trigger contactos_set_fecha_actualizacion
  before update on public.contactos
  for each row execute function public.set_fecha_actualizacion();

-- ------------------------------------------------------------
-- Row Level Security: cada usuario solo ve/edita lo suyo
-- ------------------------------------------------------------
alter table public.empresas    enable row level security;
alter table public.contactos   enable row level security;
alter table public.actividades enable row level security;

drop policy if exists "empresas_propias" on public.empresas;
create policy "empresas_propias" on public.empresas
  for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

drop policy if exists "contactos_propios" on public.contactos;
create policy "contactos_propios" on public.contactos
  for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

drop policy if exists "actividades_propias" on public.actividades;
create policy "actividades_propias" on public.actividades
  for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- ============================================================
-- Migración desde una versión anterior del esquema (opcional).
-- Ejecuta SOLO si ya tenías una tabla `empresas` de una versión previa.
-- ============================================================
-- alter table public.empresas
--   add column if not exists user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
--   add column if not exists monto_resultado numeric(14,2),
--   add column if not exists requiere_seguimiento boolean not null default false;
-- -- Si existían columnas de contacto único, migrarlas a `contactos`:
-- insert into public.contactos (user_id, empresa_id, nombre, telefono, correo, principal)
--   select user_id, id, coalesce(contacto,''), coalesce(telefono,''), coalesce(correo,''), true
--   from public.empresas
--   where coalesce(contacto,'') <> '' or coalesce(telefono,'') <> '' or coalesce(correo,'') <> '';
-- alter table public.empresas
--   drop column if exists contacto,
--   drop column if exists telefono,
--   drop column if exists correo;
