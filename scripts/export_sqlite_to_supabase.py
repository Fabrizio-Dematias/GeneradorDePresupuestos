#!/usr/bin/env python3
"""
Exporta los datos de la base SQLite de la app de escritorio (dicor.db)
a un archivo seed.sql listo para ejecutar en Supabase (Postgres).

Uso:
    python3 scripts/export_sqlite_to_supabase.py [ruta/a/dicor.db] [salida.sql]

Por defecto lee ./dicor.db y escribe web/supabase/seed.sql.
Si en tu computadora tenés una base más nueva que la del repositorio,
ejecutá este script contra esa base y volvé a correr el seed en Supabase.
"""
import sqlite3
import sys
from pathlib import Path


def sql_str(value):
    if value is None:
        return "NULL"
    return "'" + str(value).replace("'", "''") + "'"


def sql_num(value, default="NULL"):
    if value is None:
        return default
    return repr(float(value)) if isinstance(value, float) else str(value)


def main():
    db_path = sys.argv[1] if len(sys.argv) > 1 else "dicor.db"
    out_path = sys.argv[2] if len(sys.argv) > 2 else "web/supabase/seed.sql"

    if not Path(db_path).exists():
        sys.exit(f"No se encontró la base de datos: {db_path}")

    conn = sqlite3.connect(db_path)
    conn.row_factory = sqlite3.Row
    cur = conn.cursor()

    lines = [
        "-- Datos exportados desde la base SQLite de la app de escritorio (dicor.db).",
        "-- Ejecutar en el SQL Editor de Supabase DESPUÉS de migration.sql.",
        "-- Generado por scripts/export_sqlite_to_supabase.py",
        "begin;",
        "",
        "-- Limpia datos previos para que el seed sea re-ejecutable",
        "truncate table remito_items, remitos, historial_precios, productos, clientes restart identity cascade;",
        "",
    ]

    # ---- clientes -------------------------------------------------------
    rows = cur.execute("SELECT * FROM clientes ORDER BY id").fetchall()
    for r in rows:
        lines.append(
            "insert into clientes (id, nombre, domicilio, cuit, condicion_iva, condicion_venta, fecha_creacion) "
            f"values ({r['id']}, {sql_str(r['nombre'])}, {sql_str(r['domicilio'])}, {sql_str(r['cuit'])}, "
            f"{sql_str(r['condicion_iva'])}, {sql_str(r['condicion_venta'])}, {sql_str(r['fecha_creacion'])});"
        )
    lines.append(f"-- clientes: {len(rows)} filas")
    lines.append("")

    # ---- productos ------------------------------------------------------
    rows = cur.execute("SELECT * FROM productos ORDER BY id").fetchall()
    for r in rows:
        lines.append(
            "insert into productos (id, codigo, descripcion, precio_unitario, categoria, fecha_actualizacion) "
            f"values ({r['id']}, {sql_str(r['codigo'])}, {sql_str(r['descripcion'])}, "
            f"{sql_num(r['precio_unitario'])}, {sql_str(r['categoria'])}, {sql_str(r['fecha_actualizacion'])});"
        )
    lines.append(f"-- productos: {len(rows)} filas")
    lines.append("")

    # ---- remitos --------------------------------------------------------
    rows = cur.execute("SELECT * FROM remitos ORDER BY id").fetchall()
    remito_ids = {r["id"] for r in rows}
    for r in rows:
        lines.append(
            "insert into remitos (id, numero, fecha, cliente_id, cliente_nombre, cliente_domicilio, cliente_cuit, "
            "total, estado, ruta_pdf, fecha_creacion) "
            f"values ({r['id']}, {sql_str(r['numero'])}, {sql_str(r['fecha'])}, {sql_num(r['cliente_id'])}, "
            f"{sql_str(r['cliente_nombre'])}, {sql_str(r['cliente_domicilio'])}, {sql_str(r['cliente_cuit'])}, "
            f"{sql_num(r['total'])}, {sql_str(r['estado'])}, {sql_str(r['ruta_pdf'])}, {sql_str(r['fecha_creacion'])});"
        )
    lines.append(f"-- remitos: {len(rows)} filas")
    lines.append("")

    # ---- remito_items (solo los que pertenecen a remitos existentes) ----
    rows = cur.execute("SELECT * FROM remito_items ORDER BY id").fetchall()
    huerfanos = 0
    insertados = 0
    for r in rows:
        if r["remito_id"] not in remito_ids:
            huerfanos += 1  # items de remitos borrados (SQLite no aplicaba el ON DELETE CASCADE)
            continue
        insertados += 1
        lines.append(
            "insert into remito_items (id, remito_id, codigo, cantidad, descripcion, precio_unitario, bonificacion, subtotal) "
            f"values ({r['id']}, {r['remito_id']}, {sql_str(r['codigo'])}, {r['cantidad']}, {sql_str(r['descripcion'])}, "
            f"{sql_num(r['precio_unitario'])}, {sql_num(r['bonificacion'], '0')}, {sql_num(r['subtotal'])});"
        )
    lines.append(f"-- remito_items: {insertados} filas ({huerfanos} huérfanas descartadas)")
    lines.append("")

    # ---- historial_precios (si la tabla existe en la base) --------------
    has_hist = cur.execute(
        "SELECT 1 FROM sqlite_master WHERE type='table' AND name='historial_precios'"
    ).fetchone()
    n_hist = 0
    if has_hist:
        rows = cur.execute("SELECT * FROM historial_precios ORDER BY id").fetchall()
        n_hist = len(rows)
        for r in rows:
            lines.append(
                "insert into historial_precios (id, producto_codigo, producto_descripcion, precio_anterior, "
                "precio_nuevo, porcentaje_cambio, categoria, fecha_cambio) "
                f"values ({r['id']}, {sql_str(r['producto_codigo'])}, {sql_str(r['producto_descripcion'])}, "
                f"{sql_num(r['precio_anterior'])}, {sql_num(r['precio_nuevo'])}, {sql_num(r['porcentaje_cambio'])}, "
                f"{sql_str(r['categoria'])}, {sql_str(r['fecha_cambio'])});"
            )
    lines.append(f"-- historial_precios: {n_hist} filas")
    lines.append("")

    # ---- reajustar las secuencias de identidad ---------------------------
    lines += [
        "-- Ajusta las secuencias para que los próximos IDs no colisionen",
        "select setval(pg_get_serial_sequence('clientes', 'id'), coalesce((select max(id) from clientes), 1));",
        "select setval(pg_get_serial_sequence('productos', 'id'), coalesce((select max(id) from productos), 1));",
        "select setval(pg_get_serial_sequence('remitos', 'id'), coalesce((select max(id) from remitos), 1));",
        "select setval(pg_get_serial_sequence('remito_items', 'id'), coalesce((select max(id) from remito_items), 1));",
        "select setval(pg_get_serial_sequence('historial_precios', 'id'), coalesce((select max(id) from historial_precios), 1));",
        "",
        "commit;",
        "",
    ]

    Path(out_path).parent.mkdir(parents=True, exist_ok=True)
    Path(out_path).write_text("\n".join(lines), encoding="utf-8")
    print(f"✅ Seed generado en {out_path}")

    # Regenera también el archivo combinado (migración + datos en un solo paso)
    migration = Path(out_path).parent / "migration.sql"
    combinado = Path(out_path).parent / "setup-completo.sql"
    if migration.exists():
        combinado.write_text(
            migration.read_text(encoding="utf-8")
            + "\n\n-- ============================================================\n"
            + "-- DATOS\n"
            + "-- ============================================================\n\n"
            + "\n".join(lines),
            encoding="utf-8",
        )
        print(f"✅ Setup combinado regenerado en {combinado}")


if __name__ == "__main__":
    main()
