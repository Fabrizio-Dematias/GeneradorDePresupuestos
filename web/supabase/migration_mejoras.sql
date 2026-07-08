-- ============================================================
-- DICOR · Mejoras de remitos
--   1. Numeración de remitos asignada en el servidor (sin colisiones
--      entre dos pestañas o dos usuarios al mismo tiempo).
--   2. eliminar_remito: al borrar un remito se repone el stock
--      descontado y queda registrado el movimiento.
--   3. actualizar_remito: permite editar un remito existente
--      ajustando el stock (revierte los items viejos y aplica los nuevos).
--
-- Ejecutar UNA VEZ en: Supabase Dashboard → SQL Editor → New query.
-- Es seguro: NO borra datos y se puede volver a ejecutar.
-- ============================================================

-- ---------- 1. Próximo número de remito (server-side) ----------
-- Calcula el próximo número con el formato existente '0001-NNN' a partir
-- del mayor sufijo ya usado. La web lo usa solo para mostrarlo en pantalla;
-- la asignación definitiva la hace crear_remito bajo lock (ver abajo).
create or replace function proximo_numero_remito()
returns text
language sql
stable
as $$
    select '0001-' || lpad(
        (coalesce(max((split_part(numero, '-', 2))::integer), 0) + 1)::text, 3, '0')
    from remitos
    where split_part(numero, '-', 2) ~ '^[0-9]+$';
$$;

-- ---------- 2. crear_remito: numera en el servidor ----------
-- Antes el número lo calculaba el navegador leyendo todos los remitos, lo
-- que podía chocar en uso concurrente. Ahora se asigna acá, dentro de la
-- misma transacción y serializado con un advisory lock.
-- Cambia el tipo de retorno (bigint → jsonb con {id, numero}), por eso
-- primero se elimina la versión anterior.
drop function if exists crear_remito(jsonb, jsonb);

create or replace function crear_remito(p_remito jsonb, p_items jsonb)
returns jsonb
language plpgsql
as $$
declare
    v_id bigint;
    v_numero text;
    i jsonb;
    v_cant integer;
    v_prod_id bigint;
    v_prod_codigo text;
    v_prod_desc text;
    v_anterior integer;
    v_nuevo integer;
begin
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
        (p_remito->>'total')::double precision,
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
        (elem->>'precio_unitario')::double precision,
        coalesce((elem->>'bonificacion')::double precision, 0),
        (elem->>'subtotal')::double precision
    from jsonb_array_elements(p_items) as elem;

    -- Descuento de stock por cada ítem con código existente.
    -- El UPDATE es relativo (stock = stock - v_cant) y atómico: evita el
    -- "lost update" si se generan dos remitos del mismo producto a la vez.
    -- Se permite stock negativo a propósito: refleja una venta real aunque
    -- el stock cargado no alcance (queda en rojo como aviso de reposición).
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

-- ---------- 3. eliminar_remito: repone el stock ----------
-- Revierte el descuento de stock de cada ítem (dejando el movimiento
-- de reposición registrado) y recién después borra el remito.
-- Los items se borran en cascada por la FK.
create or replace function eliminar_remito(p_remito_id bigint)
returns void
language plpgsql
as $$
declare
    v_numero text;
    it record;
    v_prod_id bigint;
    v_codigo text;
    v_desc text;
    v_anterior integer;
    v_nuevo integer;
begin
    select numero into v_numero from remitos where id = p_remito_id for update;
    if not found then
        raise exception 'Remito % no encontrado', p_remito_id;
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
                                           tipo, cantidad, stock_anterior, stock_nuevo, motivo)
            values (v_prod_id, v_codigo, v_desc,
                    'ingreso', it.cantidad, v_anterior, v_nuevo,
                    'Reposición · remito ' || v_numero || ' eliminado');
        end if;
    end loop;

    delete from remitos where id = p_remito_id;
end;
$$;

-- ---------- 4. actualizar_remito: edición con ajuste de stock ----------
-- Repone el stock de los items originales, reemplaza los items y los datos
-- del remito (el número no cambia) y vuelve a descontar el stock nuevo.
-- Todo en una sola transacción y con auditoría en movimientos_stock.
create or replace function actualizar_remito(p_remito_id bigint, p_remito jsonb, p_items jsonb)
returns jsonb
language plpgsql
as $$
declare
    v_numero text;
    it record;
    i jsonb;
    v_cant integer;
    v_prod_id bigint;
    v_codigo text;
    v_desc text;
    v_anterior integer;
    v_nuevo integer;
begin
    select numero into v_numero from remitos where id = p_remito_id for update;
    if not found then
        raise exception 'Remito % no encontrado', p_remito_id;
    end if;

    -- 4.1 Revierte el stock de los items actuales
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

    -- 4.2 Reemplaza items y datos del remito (el número se conserva)
    delete from remito_items where remito_id = p_remito_id;

    update remitos
    set fecha             = (p_remito->>'fecha')::date,
        cliente_id        = nullif(p_remito->>'cliente_id', '')::bigint,
        cliente_nombre    = p_remito->>'cliente_nombre',
        cliente_domicilio = p_remito->>'cliente_domicilio',
        cliente_cuit      = p_remito->>'cliente_cuit',
        condicion_iva     = coalesce(p_remito->>'condicion_iva', 'Consumidor Final'),
        condicion_venta   = coalesce(p_remito->>'condicion_venta', 'Contado'),
        total             = (p_remito->>'total')::double precision,
        ruta_pdf          = 'remito_' || regexp_replace(coalesce(p_remito->>'cliente_nombre', ''), '[^a-zA-Z0-9]', '_', 'g')
                                || '_' || v_numero || '.pdf'
    where id = p_remito_id;

    insert into remito_items (remito_id, codigo, cantidad, descripcion, precio_unitario, bonificacion, subtotal)
    select
        p_remito_id,
        elem->>'codigo',
        (elem->>'cantidad')::integer,
        elem->>'descripcion',
        (elem->>'precio_unitario')::double precision,
        coalesce((elem->>'bonificacion')::double precision, 0),
        (elem->>'subtotal')::double precision
    from jsonb_array_elements(p_items) as elem;

    -- 4.3 Descuenta el stock de los items nuevos
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
