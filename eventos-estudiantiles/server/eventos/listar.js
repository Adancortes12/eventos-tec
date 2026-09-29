import { db } from "../lib/db.js";

import {
  obtenerCookie,
  verificarSesion,
} from "../lib/session.js";

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({
      error: "Método no permitido.",
    });
  }

  try {
    /*
     * 1. VERIFICAR SESIÓN
     */
    const tokenSesion =
      obtenerCookie(
        req,
        "eventos_session"
      );

    const sesion =
      verificarSesion(
        tokenSesion
      );

    if (
      !sesion ||
      sesion.tipo !== "maestro"
    ) {
      return res.status(401).json({
        error:
          "Debes iniciar sesión como maestro.",
      });
    }

    /*
     * 2. VERIFICAR MAESTRO ACTIVO
     */
    const resultadoMaestro =
      await db.query(
        `
          SELECT
            id,
            rol_sistema,
            activo
          FROM maestros
          WHERE id = $1
          LIMIT 1
        `,
        [sesion.id]
      );

    const maestro =
      resultadoMaestro.rows[0];

    if (
      !maestro ||
      !maestro.activo
    ) {
      return res.status(403).json({
        error:
          "Tu cuenta no tiene acceso activo al sistema.",
      });
    }

    /*
     * 3. OBTENER EVENTOS
     */
    const resultado =
      await db.query(`
        SELECT
          id,
          codigo_evento,
          nombre,
          descripcion,
          fecha_evento,
          hora_evento,
          estado,
          creado_en
        FROM eventos
        ORDER BY
          fecha_evento ASC,
          hora_evento ASC
      `);

    return res.status(200).json({
      eventos: resultado.rows,
    });
  } catch (error) {
    console.error(
      "Error cargando eventos:",
      error
    );

    return res.status(500).json({
      error:
        "No se pudieron cargar los eventos.",
    });
  }
}