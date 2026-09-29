import { db } from "../lib/db.js";

import {
  obtenerCookie,
  verificarSesion,
} from "../lib/session.js";

export default async function handler(req, res) {
  if (req.method !== "PATCH") {
    return res.status(405).json({
      error: "Método no permitido.",
    });
  }

  try {
    // 1. Verificar sesión
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

    // 2. Consultar maestro directamente en PostgreSQL
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

    // 3. Solo admin y superadmin
    const puedeFinalizar =
      maestro.rol_sistema === "admin" ||
      maestro.rol_sistema === "superadmin";

    if (!puedeFinalizar) {
      return res.status(403).json({
        error:
          "No tienes permisos para finalizar eventos.",
      });
    }

    // 4. Validar evento
    const { eventoId } = req.body ?? {};

    if (
      typeof eventoId !== "string" ||
      !eventoId
    ) {
      return res.status(400).json({
        error:
          "No se recibió un evento válido.",
      });
    }

    // 5. Consultar evento
    const resultadoEvento =
      await db.query(
        `
          SELECT
            id,
            codigo_evento,
            nombre,
            estado
          FROM eventos
          WHERE id = $1
          LIMIT 1
        `,
        [eventoId]
      );

    const eventoActual =
      resultadoEvento.rows[0];

    if (!eventoActual) {
      return res.status(404).json({
        error:
          "El evento no existe.",
      });
    }

    if (
      eventoActual.estado ===
      "finalizado"
    ) {
      return res.status(400).json({
        error:
          "El evento ya está finalizado.",
      });
    }

    // 6. Finalizar evento
    const resultadoActualizacion =
      await db.query(
        `
          UPDATE eventos
          SET estado = 'finalizado'
          WHERE id = $1
          RETURNING
            id,
            codigo_evento,
            nombre,
            estado
        `,
        [eventoId]
      );

    const evento =
      resultadoActualizacion.rows[0];

    return res.status(200).json({
      finalizado: true,
      evento,
    });
  } catch (error) {
    console.error(
      "Error finalizando evento:",
      error
    );

    return res.status(500).json({
      error:
        "Ocurrió un error al finalizar el evento.",
    });
  }
}