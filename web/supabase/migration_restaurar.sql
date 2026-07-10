-- ============================================================
-- DICOR · Restaurar remitos anulados (des-anular)
--
-- La contracara de anular_remito: vuelve a descontar el stock de
-- los ítems (con auditoría en movimientos_stock) y devuelve el
-- remito al estado 'Completado'. Con esto la anulación pasa a ser
-- totalmente reversible.
--
-- Ejecutar UNA VEZ en: Supabase Dashboard → SQL Editor → New query.
-- Es seguro: NO borra datos y se puede volver a ejecutar.
-- (Este cambio ya está reflejado en setup-completo.sql)
-- ============================================================

create or replace function restaurar_remito(p_remito_id bigint)
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
        raise exception 'El remito % no está anulado', v_numero;
    end if;

    -- Vuelve a descontar el stock (solo de los códigos que sigan
    -- existiendo en el catálogo, igual que al crear el remito).
    for it in
        select codigo, sum(cantidad) as cantidad
        from remito_items
        where remito_id = p_remito_id and coalesce(codigo, '') <> '' and cantidad > 0
        group by codigo
    loop
        update productos
        set stock = stock - it.cantidad
        where codigo = it.codigo
        returning id, codigo, descripcion, stock + it.cantidad, stock
        into v_prod_id, v_codigo, v_desc, v_anterior, v_nuevo;
        if found then
            insert into movimientos_stock (producto_id, producto_codigo, producto_descripcion,
                                           tipo, cantidad, stock_anterior, stock_nuevo, motivo, remito_id)
            values (v_prod_id, v_codigo, v_desc,
                    'egreso', it.cantidad, v_anterior, v_nuevo,
                    'Restauración · remito ' || v_numero, p_remito_id);
        end if;
    end loop;

    update remitos set estado = 'Completado' where id = p_remito_id;
end;
$$;
