-- ============================================================
-- DICOR — Campos para la lista de precios imprimible
--
-- Agrega tres columnas OPCIONALES a productos: marca, medidas y modelo,
-- que son las que usa la lista de precios en PDF (agrupada por marca, con
-- las columnas MEDIDAS y MOD, igual que la lista impresa).
--
-- Ejecutar en: Supabase Dashboard → SQL Editor → New query → Run.
--
-- Qué NO hace: no borra nada, no vacía tablas, no toca los datos que ya
-- están ni las funciones. Los productos actuales quedan con los tres
-- campos vacíos y siguen funcionando igual (remitos, stock, precios).
-- Es seguro re-ejecutarlo: si las columnas ya existen, no hace nada.
-- ============================================================

alter table productos add column if not exists marca   text;
alter table productos add column if not exists medidas text;
alter table productos add column if not exists modelo  text;

-- Índice para agrupar rápido por marca dentro de cada categoría
create index if not exists idx_productos_categoria_marca on productos (categoria, marca);

-- Control: debería devolver las tres columnas nuevas
select column_name, data_type
from information_schema.columns
where table_name = 'productos'
  and column_name in ('marca', 'medidas', 'modelo')
order by column_name;
