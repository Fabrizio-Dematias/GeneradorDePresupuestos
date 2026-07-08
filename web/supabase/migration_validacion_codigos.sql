-- ============================================================
-- DICOR · Validación de códigos de producto en los remitos
--
-- remito_items.codigo es texto libre (no una FK), así que hasta ahora
-- se podía guardar un remito con un código inexistente: el stock no se
-- descontaba y el error pasaba desapercibido. Esta migración hace que
-- crear_remito y actualizar_remito RECHACEN cualquier ítem cuyo código
-- (no vacío) no exista en el catálogo. Los ítems sin código siguen
-- permitidos (descripción manual, no descuentan stock).
--
-- Requiere haber ejecutado antes migration_mejoras.sql.
-- Ejecutar UNA VEZ en: Supabase Dashboard → SQL Editor → New query.
-- Es seguro: NO borra datos y se puede volver a ejecutar.
-- ============================================================

-- ---------- crear_remito (con validación de códigos) ----------
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
    -- Valida que todos los códigos cargados existan en el catálogo:
    -- un código inexistente no descontaría stock y ensucia los reportes.
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

-- ---------- actualizar_remito (con validación de códigos) ----------
create or replace function actualizar_remito(p_remito_id bigint, p_remito jsonb, p_items jsonb)
returns jsonb
language plpgsql
as $$
declare
    v_numero text;
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
    select numero into v_numero from remitos where id = p_remito_id for update;
    if not found then
        raise exception 'Remito % no encontrado', p_remito_id;
    end if;

    -- Misma validación que en crear_remito, antes de tocar nada
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
