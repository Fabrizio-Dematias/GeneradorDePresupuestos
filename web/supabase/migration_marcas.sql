-- ============================================================
-- DICOR — Logos de las marcas para la lista de precios
--
-- Crea la tabla `marcas`: el nombre de cada marca y su logo, para que la
-- lista de precios en PDF salga con el logo arriba de cada bloque, igual
-- que la lista impresa. Los logos los toma el importador del propio Excel.
--
-- Ejecutar en: Supabase Dashboard → SQL Editor → New query → Run.
--
-- Qué NO hace: no borra nada, no toca `productos`, `remitos`, `clientes`,
-- el stock ni las funciones. Solo agrega una tabla nueva, vacía.
-- Es seguro re-ejecutarlo: si la tabla ya existe, no hace nada.
-- ============================================================

create table if not exists marcas (
    nombre text primary key,
    -- Imagen embebida (data URL). Se guarda achicada desde la web.
    logo text,
    fecha_actualizacion timestamptz default now()
);

alter table marcas enable row level security;

drop policy if exists "acceso total autenticado" on marcas;
create policy "acceso total autenticado" on marcas
    for all to authenticated using (true) with check (true);

-- Control: debería devolver la tabla vacía, sin error
select count(*) as marcas_cargadas from marcas;
