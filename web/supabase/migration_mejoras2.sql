-- ============================================================
-- DICOR · Mejoras (tanda 3)
--   1. Dinero en numeric(12,2) en lugar de double precision
--      (evita errores de redondeo acumulados; redondea una única
--      vez los valores existentes a 2 decimales).
--   2. anular_remito: repone el stock y marca el remito como
--      "Anulado" SIN borrarlo (queda la historia). Los anulados
--      se excluyen de facturación y reportes.
--   3. eliminar_remito / actualizar_remito con guardas de anulado.
--   4. Funciones de agregación en el servidor para Dashboard,
--      Facturación y Más vendidos (ya no se descargan todos los
--      remitos/items al navegador).
--
-- Requiere haber ejecutado antes migration_mejoras.sql y
-- migration_validacion_codigos.sql.
-- Ejecutar UNA VEZ en: Supabase Dashboard → SQL Editor → New query.
-- Es seguro: NO borra datos y se puede volver a ejecutar.
-- ============================================================

-- ---------- 1. Dinero en numeric(12,2) ----------
-- Redondea una única vez a 2 decimales (los precios con 3 decimales
-- heredados de aumentos porcentuales cambian menos de un centavo).
alter table productos
    alter column precio_unitario type numeric(12,2) using round(precio_unitario::numeric, 2);

alter table remitos
    alter column total type numeric(12,2) using round(total::numeric, 2);

alter table remito_items
    alter column precio_unitario type numeric(12,2) using round(precio_unitario::numeric, 2),
    alter column bonificacion    type numeric(5,2)  using round(coalesce(bonificacion, 0)::numeric, 2),
    alter column subtotal        type numeric(12,2) using round(subtotal::numeric, 2);

alter table historial_precios
    alter column precio_anterior   type numeric(12,2) using round(precio_anterior::numeric, 2),
    alter column precio_nuevo      type numeric(12,2) using round(precio_nuevo::numeric, 2),
    alter column porcentaje_cambio type numeric(8,2)  using round(porcentaje_cambio::numeric, 2);

-- ---------- 2. anular_remito ----------
-- Repone el stock descontado (con auditoría) y marca estado = 'Anulado'.
-- El remito queda visible en el listado, excluido de las métricas.
create or replace function anular_remito(p_remito_id bigint)
returns void
language plpgsql
as $$
declare
    v_numero text;
    v_estado text;
    it record;
    v_prod_id bigint;
    v_codigo text;
    v_desc text;
    v_anterior integer;
    v_nuevo integer;
begin
    select numero, coalesce(estado, 'Completado')
    into v_numero, v_estado
    from remitos where id = p_remito_id for update;
    if not found then
        raise exception 'Remito % no encontrado', p_remito_id;
    end if;
    if v_estado = 'Anulado' then
        raise exception 'El remito % ya está anulado', v_numero;
    end if;

    for it in
        select codigo, sum(cantidad) as cantidad
        from remito_items
        where remito_id = p_remito_id and coalesce(codigo, '') <> '' and cantidad > 0
        group by codigo
    loop
        update productos
        set stock = stock + it.cantidad
        where codigo = it.codigo
        returning id, codigo, descripcion, stock - it.cantidad, stock
        into v_prod_id, v_codigo, v_desc, v_anterior, v_nuevo;
        if found then
            insert into movimientos_stock (producto_id, producto_codigo, producto_descripcion,
                                           tipo, cantidad, stock_anterior, stock_nuevo, motivo, remito_id)
            values (v_prod_id, v_codigo, v_desc,
                    'ingreso', it.cantidad, v_anterior, v_nuevo,
                    'Anulación · remito ' || v_numero, p_remito_id);
        end if;
    end loop;

    update remitos set estado = 'Anulado' where id = p_remito_id;
end;
$$;

-- ---------- 3a. eliminar_remito: no repone dos veces ----------
-- Si el remito ya estaba anulado, el stock ya fue repuesto al anularlo:
-- borrar no debe volver a sumarlo.
create or replace function eliminar_remito(p_remito_id bigint)
returns void
language plpgsql
as $$
declare
    v_numero text;
    v_estado text;
    it record;
    v_prod_id bigint;
    v_codigo text;
    v_desc text;
    v_anterior integer;
    v_nuevo integer;
begin
    select numero, coalesce(estado, 'Completado')
    into v_numero, v_estado
    from remitos where id = p_remito_id for update;
    if not found then
        raise exception 'Remito % no encontrado', p_remito_id;
    end if;

    if v_estado <> 'Anulado' then
        for it in
            select codigo, sum(cantidad) as cantidad
            from remito_items
            where remito_id = p_remito_id and coalesce(codigo, '') <> '' and cantidad > 0
            group by codigo
        loop
            update productos
            set stock = stock + it.cantidad
            where codigo = it.codigo
            returning id, codigo, descripcion, stock - it.cantidad, stock
            into v_prod_id, v_codigo, v_desc, v_anterior, v_nuevo;
            if found then
                insert into movimientos_stock (producto_id, producto_codigo, producto_descripcion,
                                               tipo, cantidad, stock_anterior, stock_nuevo, motivo)
                values (v_prod_id, v_codigo, v_desc,
                        'ingreso', it.cantidad, v_anterior, v_nuevo,
                        'Reposición · remito ' || v_numero || ' eliminado');
            end if;
        end loop;
    end if;

    delete from remitos where id = p_remito_id;
end;
$$;

-- ---------- 3b. actualizar_remito: rechaza anulados ----------
create or replace function actualizar_remito(p_remito_id bigint, p_remito jsonb, p_items jsonb)
returns jsonb
language plpgsql
as $$
declare
    v_numero text;
    v_estado text;
    v_codigos_invalidos text;
    it record;
    i jsonb;
    v_cant integer;
    v_prod_id bigint;
    v_codigo text;
    v_desc text;
    v_anterior integer;
    v_nuevo integer;
begin
    select numero, coalesce(estado, 'Completado')
    into v_numero, v_estado
    from remitos where id = p_remito_id for update;
    if not found then
        raise exception 'Remito % no encontrado', p_remito_id;
    end if;
    if v_estado = 'Anulado' then
        raise exception 'El remito % está anulado y no se puede editar', v_numero;
    end if;

    -- Misma validación de códigos que en crear_remito, antes de tocar nada
    select string_agg(distinct elem->>'codigo', ', ')
    into v_codigos_invalidos
    from jsonb_array_elements(p_items) as elem
    where coalesce(elem->>'codigo', '') <> ''
      and not exists (select 1 from productos p where p.codigo = elem->>'codigo');
    if v_codigos_invalidos is not null then
        raise exception 'Estos códigos no existen en el catálogo: %. Corregilos o dejá el código vacío.', v_codigos_invalidos;
    end if;

    -- Revierte el stock de los items actuales
    for it in
        select codigo, sum(cantidad) as cantidad
        from remito_items
        where remito_id = p_remito_id and coalesce(codigo, '') <> '' and cantidad > 0
        group by codigo
    loop
        update productos
        set stock = stock + it.cantidad
        where codigo = it.codigo
        returning id, codigo, descripcion, stock - it.cantidad, stock
        into v_prod_id, v_codigo, v_desc, v_anterior, v_nuevo;
        if found then
            insert into movimientos_stock (producto_id, producto_codigo, producto_descripcion,
                                           tipo, cantidad, stock_anterior, stock_nuevo, motivo, remito_id)
            values (v_prod_id, v_codigo, v_desc,
                    'ingreso', it.cantidad, v_anterior, v_nuevo,
                    'Edición · remito ' || v_numero || ' (reversión)', p_remito_id);
        end if;
    end loop;

    -- Reemplaza items y datos del remito (el número se conserva)
    delete from remito_items where remito_id = p_remito_id;

    update remitos
    set fecha             = (p_remito->>'fecha')::date,
        cliente_id        = nullif(p_remito->>'cliente_id', '')::bigint,
        cliente_nombre    = p_remito->>'cliente_nombre',
        cliente_domicilio = p_remito->>'cliente_domicilio',
        cliente_cuit      = p_remito->>'cliente_cuit',
        condicion_iva     = coalesce(p_remito->>'condicion_iva', 'Consumidor Final'),
        condicion_venta   = coalesce(p_remito->>'condicion_venta', 'Contado'),
        total             = round((p_remito->>'total')::numeric, 2),
        ruta_pdf          = 'remito_' || regexp_replace(coalesce(p_remito->>'cliente_nombre', ''), '[^a-zA-Z0-9]', '_', 'g')
                                || '_' || v_numero || '.pdf'
    where id = p_remito_id;

    insert into remito_items (remito_id, codigo, cantidad, descripcion, precio_unitario, bonificacion, subtotal)
    select
        p_remito_id,
        elem->>'codigo',
        (elem->>'cantidad')::integer,
        elem->>'descripcion',
        round((elem->>'precio_unitario')::numeric, 2),
        round(coalesce((elem->>'bonificacion')::numeric, 0), 2),
        round((elem->>'subtotal')::numeric, 2)
    from jsonb_array_elements(p_items) as elem;

    -- Descuenta el stock de los items nuevos
    for i in select * from jsonb_array_elements(p_items)
    loop
        v_cant := coalesce((i->>'cantidad')::integer, 0);
        if v_cant > 0 and coalesce(i->>'codigo', '') <> '' then
            update productos
            set stock = stock - v_cant
            where codigo = (i->>'codigo')
            returning id, codigo, descripcion, stock + v_cant, stock
            into v_prod_id, v_codigo, v_desc, v_anterior, v_nuevo;
            if found then
                insert into movimientos_stock (producto_id, producto_codigo, producto_descripcion,
                                               tipo, cantidad, stock_anterior, stock_nuevo, motivo, remito_id)
                values (v_prod_id, v_codigo, v_desc,
                        'egreso', v_cant, v_anterior, v_nuevo,
                        'Venta · remito ' || v_numero || ' (editado)', p_remito_id);
            end if;
        end if;
    end loop;

    return jsonb_build_object('id', p_remito_id, 'numero', v_numero);
end;
$$;

-- ---------- 3c. crear_remito: casts a numeric ----------
create or replace function crear_remito(p_remito jsonb, p_items jsonb)
returns jsonb
language plpgsql
as $$
declare
    v_id bigint;
    v_numero text;
    v_codigos_invalidos text;
    i jsonb;
    v_cant integer;
    v_prod_id bigint;
    v_prod_codigo text;
    v_prod_desc text;
    v_anterior integer;
    v_nuevo integer;
begin
    -- Valida que todos los códigos cargados existan en el catálogo
    select string_agg(distinct elem->>'codigo', ', ')
    into v_codigos_invalidos
    from jsonb_array_elements(p_items) as elem
    where coalesce(elem->>'codigo', '') <> ''
      and not exists (select 1 from productos p where p.codigo = elem->>'codigo');
    if v_codigos_invalidos is not null then
        raise exception 'Estos códigos no existen en el catálogo: %. Corregilos o dejá el código vacío.', v_codigos_invalidos;
    end if;

    -- Serializa la asignación del número entre transacciones concurrentes
    perform pg_advisory_xact_lock(hashtext('remitos_numero'));
    v_numero := proximo_numero_remito();

    insert into remitos (numero, fecha, cliente_id, cliente_nombre, cliente_domicilio, cliente_cuit,
                         condicion_iva, condicion_venta, total, ruta_pdf)
    values (
        v_numero,
        (p_remito->>'fecha')::date,
        nullif(p_remito->>'cliente_id', '')::bigint,
        p_remito->>'cliente_nombre',
        p_remito->>'cliente_domicilio',
        p_remito->>'cliente_cuit',
        coalesce(p_remito->>'condicion_iva', 'Consumidor Final'),
        coalesce(p_remito->>'condicion_venta', 'Contado'),
        round((p_remito->>'total')::numeric, 2),
        'remito_' || regexp_replace(coalesce(p_remito->>'cliente_nombre', ''), '[^a-zA-Z0-9]', '_', 'g')
            || '_' || v_numero || '.pdf'
    )
    returning id into v_id;

    insert into remito_items (remito_id, codigo, cantidad, descripcion, precio_unitario, bonificacion, subtotal)
    select
        v_id,
        elem->>'codigo',
        (elem->>'cantidad')::integer,
        elem->>'descripcion',
        round((elem->>'precio_unitario')::numeric, 2),
        round(coalesce((elem->>'bonificacion')::numeric, 0), 2),
        round((elem->>'subtotal')::numeric, 2)
    from jsonb_array_elements(p_items) as elem;

    for i in select * from jsonb_array_elements(p_items)
    loop
        v_cant := coalesce((i->>'cantidad')::integer, 0);
        if v_cant > 0 and coalesce(i->>'codigo', '') <> '' then
            update productos
            set stock = stock - v_cant
            where codigo = (i->>'codigo')
            returning id, codigo, descripcion, stock + v_cant, stock
            into v_prod_id, v_prod_codigo, v_prod_desc, v_anterior, v_nuevo;
            if found then
                insert into movimientos_stock (producto_id, producto_codigo, producto_descripcion,
                                               tipo, cantidad, stock_anterior, stock_nuevo, motivo, remito_id)
                values (v_prod_id, v_prod_codigo, v_prod_desc,
                        'egreso', v_cant, v_anterior, v_nuevo,
                        'Venta · remito ' || v_numero, v_id);
            end if;
        end if;
    end loop;

    return jsonb_build_object('id', v_id, 'numero', v_numero);
end;
$$;

-- ---------- 4. Agregaciones en el servidor ----------
-- Todas excluyen los remitos anulados.

-- Facturación agrupada por mes (para Dashboard y Facturación mensual)
create or replace function facturacion_mensual()
returns table (anio integer, mes integer, cantidad bigint, total numeric)
language sql
stable
as $$
    select extract(year from fecha)::integer,
           extract(month from fecha)::integer,
           count(*),
           coalesce(sum(total), 0)
    from remitos
    where coalesce(estado, '') <> 'Anulado'
    group by 1, 2
    order by 1, 2;
$$;

-- Ranking de productos vendidos desde una fecha (null = todo el tiempo)
create or replace function ranking_productos(p_desde date, p_limite integer, p_orden text default 'cantidad')
returns table (codigo text, descripcion text, categoria text, cantidad bigint, facturado numeric)
language sql
stable
as $$
    select coalesce(ri.codigo, '—'),
           ri.descripcion,
           coalesce(p.categoria, 'SIN CATEGORÍA'),
           sum(ri.cantidad)::bigint,
           coalesce(sum(ri.subtotal), 0)
    from remito_items ri
    join remitos r on r.id = ri.remito_id
    left join productos p on p.codigo = ri.codigo
    where coalesce(r.estado, '') <> 'Anulado'
      and (p_desde is null or r.fecha >= p_desde)
    group by 1, 2, 3
    order by case when p_orden = 'facturado' then coalesce(sum(ri.subtotal), 0)
                  else sum(ri.cantidad)::numeric end desc
    limit p_limite;
$$;

-- Totales del período para las tarjetas de "Más vendidos"
create or replace function resumen_ventas(p_desde date)
returns table (unidades bigint, productos_distintos bigint, facturado numeric)
language sql
stable
as $$
    select coalesce(sum(ri.cantidad), 0)::bigint,
           count(distinct coalesce(ri.codigo, '') || '|' || ri.descripcion),
           coalesce(sum(ri.subtotal), 0)
    from remito_items ri
    join remitos r on r.id = ri.remito_id
    where coalesce(r.estado, '') <> 'Anulado'
      and (p_desde is null or r.fecha >= p_desde);
$$;

-- Productos que necesitan reposición (sin stock o bajo el mínimo)
create or replace function productos_reposicion()
returns table (codigo text, descripcion text, stock integer, stock_minimo integer)
language sql
stable
as $$
    select codigo, descripcion, stock, stock_minimo
    from productos
    where stock <= 0 or (stock_minimo > 0 and stock <= stock_minimo)
    order by stock;
$$;

-- ---------- 5. Seguridad del login ----------
-- Antes cualquiera con la anon key podía listar usernames y emails
-- (policy "login_lookup" con USING (true)). Se reemplaza por una función
-- security definer que solo devuelve el email ante un username exacto.
drop policy if exists "login_lookup" on user_profiles;

create or replace function login_email(p_username text)
returns text
language sql
security definer
set search_path = public
stable
as $$
    select email from user_profiles where username = lower(trim(p_username));
$$;

revoke all on function login_email(text) from public;
grant execute on function login_email(text) to anon, authenticated;
