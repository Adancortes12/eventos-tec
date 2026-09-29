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
    const tokenSesion = obtenerCookie(
      req,
      "eventos_session"
    );

    const sesion = verificarSesion(
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
     * 3. ESTADÍSTICAS GENERALES
     */
    const [
      resultadoEstadisticas,
      resultadoRecientes,
    ] = await Promise.all([
      db.query(`
        SELECT
          (
            SELECT COUNT(*)::int
            FROM eventos
          ) AS total_eventos,

          (
            SELECT COUNT(*)::int
            FROM eventos
            WHERE estado = 'activo'
          ) AS eventos_activos,

          (
            SELECT COUNT(*)::int
            FROM inscripciones
          ) AS total_registrados,

          (
            SELECT COUNT(*)::int
            FROM inscripciones
            WHERE asistio = TRUE
          ) AS total_asistencias
      `),

      db.query(`
        SELECT
          id,
          codigo_evento,
          nombre,
          fecha_evento,
          hora_evento,
          estado
        FROM eventos
        ORDER BY creado_en DESC
        LIMIT 5
      `),
    ]);

    const estadisticas =
      resultadoEstadisticas.rows[0];

    return res.status(200).json({
      estadisticas: {
        totalEventos:
          estadisticas.total_eventos,
        eventosActivos:
          estadisticas.eventos_activos,
        totalRegistrados:
          estadisticas.total_registrados,
        totalAsistencias:
          estadisticas.total_asistencias,
      },

      eventosRecientes:
        resultadoRecientes.rows,
    });
  } catch (error) {
    console.error(
      "Error cargando dashboard:",
      error
    );

    return res.status(500).json({
      error:
        "No se pudo cargar la información del dashboard.",
    });
  }
}