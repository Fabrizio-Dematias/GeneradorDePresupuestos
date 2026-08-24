-- ============================================================
-- DICOR — Alta de la categoría «REPUESTOS COMPRESORES»
--
-- 20 productos tomados de LISTA-REPUESTOS-COMPRESORES.xlsx
-- (lista de precios de repuestos para compresores de aire).
--
-- Ejecutar en: Supabase Dashboard → SQL Editor → New query → Run.
-- Es seguro correrlo más de una vez: si el código ya existe, actualiza
-- descripción, precio y categoría en vez de duplicar el producto.
-- El stock arranca en 0 y se carga después desde la pantalla Stock.
--
-- Para usar otro nombre de categoría, reemplazá «REPUESTOS COMPRESORES»
-- en todo el archivo antes de ejecutarlo.
--
-- Qué NO hace: no borra, no vacía tablas, no cambia el esquema y no toca
-- remitos, clientes, stock ni movimientos. Lo único que modifica de un
-- producto que ya exista es su descripción, precio y categoría (el stock
-- queda como está).
--
-- PASO 0 (opcional, recomendado): correr primero esto solo. Si devuelve
-- 0 filas, ninguno de los 20 códigos existe todavía y la carga es 100%
-- de altas nuevas. Si devuelve alguna fila, ese producto tuyo va a quedar
-- pisado con los datos de la lista.
--
--   select codigo, descripcion, precio_unitario, categoria, stock
--   from productos
--   where codigo in ('RC10004','RC10005','RC10006','RC10007','RC10008',
--                    'RC10009','RC10010','RC10011','RC10013','RC10014',
--                    'RC10015','RC10016','RC10018','RC10019','RC10020',
--                    'RC10021','RC10106','RC10108','RC10109','RC10114');
--
-- ============================================================

insert into productos (codigo, descripcion, precio_unitario, categoria, stock, stock_minimo)
values
    ('RC10005', 'MANOMETRO GRANDE 50L', 12003.05, 'REPUESTOS COMPRESORES', 0, 0),
    ('RC10011', 'MANOMETRO CHICO 40L', 11214.99, 'REPUESTOS COMPRESORES', 0, 0),
    ('RC10006', 'PRESOSTATO DE 3 VIAS PARA COMPRESORES DE 24L/50L', 21257.46, 'REPUESTOS COMPRESORES', 0, 0),
    ('RC10007', 'PRESOSTATO DE 1 VIA PARA COMPRESORES DE AIRE DE 24L/50L', 18078.59, 'REPUESTOS COMPRESORES', 0, 0),
    ('RC10008', 'REGULADOR DE PRESION DE AIRE', 16230.05, 'REPUESTOS COMPRESORES', 0, 0),
    ('RC10009', 'CONECTOR CRUZ CON REGULADOR DE PRESION', 27137.69, 'REPUESTOS COMPRESORES', 0, 0),
    ('RC10010', 'CANILLA O VALVULA DE PASO DE AIRE', 10485.92, 'REPUESTOS COMPRESORES', 0, 0),
    ('RC10014', 'VALVULA ANTIRETORNO PARA COMPRESORES DE 24L/50L', 10096.79, 'REPUESTOS COMPRESORES', 0, 0),
    ('RC10013', 'VALVULA DE SEGURIDAD', 7352.84, 'REPUESTOS COMPRESORES', 0, 0),
    ('RC10015', 'VALVULA DE PURGUE', 4727.31, 'REPUESTOS COMPRESORES', 0, 0),
    ('RC10016', 'VIOR DE ACEITE', 6835.06, 'REPUESTOS COMPRESORES', 0, 0),
    ('RC10018', 'PROTECTOR TERMICO PARA COMPRESOR DE AIRE 8A', 6820.15, 'REPUESTOS COMPRESORES', 0, 0),
    ('RC10019', 'PROTECTOR TERMICO PARA COMPRESOR DE AIRE 15A', 9965.16, 'REPUESTOS COMPRESORES', 0, 0),
    ('RC10021', 'TAPON DE ACEITE', 3231.27, 'REPUESTOS COMPRESORES', 0, 0),
    ('RC10109', 'JUEGO DE JUNTAS PARA COMPRESOR DE 24L', 4183.12, 'REPUESTOS COMPRESORES', 0, 0),
    ('RC10108', 'JUEGO DE JUNTAS OARA COMPRESOR DE 50L', 16288.41, 'REPUESTOS COMPRESORES', 0, 0),
    ('RC10106', 'VENTILADOR DE PLASTICO PARA MOTOR DE COMPRESOR', 6206.74, 'REPUESTOS COMPRESORES', 0, 0),
    ('RC10020', 'CONEXION DE DESCARGA CON TUERCA', 10597.74, 'REPUESTOS COMPRESORES', 0, 0),
    ('RC10004', 'FILTRO DE AIRE SIMIL METAL REFORZADO CON FILTRO INTERNO DE PAPEL', 15893.10, 'REPUESTOS COMPRESORES', 0, 0),
    ('RC10114', 'FILTRO DE AIRE PLASTICO GRANDE 3/8', 6632.08, 'REPUESTOS COMPRESORES', 0, 0)
on conflict (codigo) do update set
    descripcion         = excluded.descripcion,
    precio_unitario     = excluded.precio_unitario,
    categoria           = excluded.categoria,
    fecha_actualizacion = now();

-- Control: cuántos quedaron cargados
select count(*) as productos_de_la_categoria
from productos
where categoria = 'REPUESTOS COMPRESORES';
