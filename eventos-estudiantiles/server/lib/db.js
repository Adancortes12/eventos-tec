import pg from "pg";

const { Pool, types } = pg;

/*
 * POSTGRESQL DATE
 *
 * OID 1082 = tipo DATE de PostgreSQL.
 *
 * Por defecto, pg convierte los DATE a objetos
 * Date de JavaScript:
 *
 * 2026-10-03
 *      ↓
 * 2026-10-03T00:00:00.000Z
 *
 * En este sistema queremos conservarlos como:
 *
 * 2026-10-03
 *
 * Esto mantiene el mismo formato que espera
 * el frontend y evita problemas de zona horaria.
 */
types.setTypeParser(
  1082,
  (value) => value
);

/*
 * POOL DE CONEXIONES POSTGRESQL
 */
export const db = new Pool({
  host: process.env.DB_HOST,

  port: Number(
    process.env.DB_PORT || 5432
  ),

  database:
    process.env.POSTGRES_DB,

  user:
    process.env.POSTGRES_USER,

  password:
    process.env.POSTGRES_PASSWORD,

  max: 10,

  idleTimeoutMillis: 30000,

  connectionTimeoutMillis: 5000,
});

/*
 * ERRORES INESPERADOS DEL POOL
 */
db.on("error", (error) => {
  console.error(
    "Error inesperado en PostgreSQL:",
    error
  );
});