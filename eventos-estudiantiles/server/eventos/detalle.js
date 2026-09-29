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

    // 2. Verificar maestro activo
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

    // Cualquier maestro activo puede ver asistentes
    const eventoId =
      typeof req.query?.eventoId === "string"
        ? req.query.eventoId
        : "";

    if (!eventoId) {
      return res.status(400).json({
        error:
          "No se recibió un evento válido.",
      });
    }

    // 3. Obtener evento
    const resultadoEvento =
      await db.query(
        `
          SELECT
            id,
            codigo_evento,
            nombre,
            descripcion,
            fecha_evento,
            hora_evento,
            estado,
            fecha_activacion,
            duracion_minutos,
            cierre_inscripcion
          FROM eventos
          WHERE id = $1
          LIMIT 1
        `,
        [eventoId]
      );

    const evento =
      resultadoEvento.rows[0];

    if (!evento) {
      return res.status(404).json({
        error:
          "El evento no existe.",
      });
    }

    // 4. Obtener inscritos
    const resultadoInscripciones =
      await db.query(
        `
          SELECT
            id,
            numero_estudiante,
            nombre_completo,
            registrado_en,
            asistio,
            asistio_en
          FROM inscripciones
          WHERE evento_id = $1
          ORDER BY registrado_en DESC
        `,
        [eventoId]
      );

    const inscripciones =
      resultadoInscripciones.rows;

    return res.status(200).json({
      evento,
      inscripciones,
    });
  } catch (error) {
    console.error(
      "Error cargando detalle:",
      error
    );

    return res.status(500).json({
      error:
        "Ocurrió un error al cargar el evento.",
    });
  }
}