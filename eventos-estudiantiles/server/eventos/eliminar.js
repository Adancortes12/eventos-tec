import { db } from "../lib/db.js";

import {
  obtenerCookie,
  verificarSesion,
} from "../lib/session.js";

export default async function handler(req, res) {
  if (req.method !== "DELETE") {
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

    // 2. Consultar rol actual
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
    const puedeEliminar =
      maestro.rol_sistema === "admin" ||
      maestro.rol_sistema === "superadmin";

    if (!puedeEliminar) {
      return res.status(403).json({
        error:
          "No tienes permisos para eliminar eventos.",
      });
    }

    // 4. Obtener ID
    const { eventoId } =
      req.body ?? {};

    if (
      typeof eventoId !== "string" ||
      !eventoId
    ) {
      return res.status(400).json({
        error:
          "No se recibió un evento válido.",
      });
    }

    // 5. Comprobar que exista
    const resultadoEvento =
      await db.query(
        `
          SELECT
            id,
            codigo_evento,
            nombre
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

    // 6. Revisar inscripciones
    const resultadoInscripciones =
      await db.query(
        `
          SELECT COUNT(*)::int AS total
          FROM inscripciones
          WHERE evento_id = $1
        `,
        [eventoId]
      );

    const totalInscripciones =
      resultadoInscripciones.rows[0]?.total ?? 0;

    if (totalInscripciones > 0) {
      return res.status(409).json({
        error:
          "No puedes eliminar un evento que ya tiene estudiantes registrados.",
      });
    }

    // 7. Eliminar evento
    const resultadoEliminar =
      await db.query(
        `
          DELETE FROM eventos
          WHERE id = $1
          RETURNING id
        `,
        [eventoId]
      );

    if (resultadoEliminar.rowCount === 0) {
      return res.status(404).json({
        error:
          "El evento no existe.",
      });
    }

    return res.status(200).json({
      eliminado: true,
    });
  } catch (error) {
    console.error(
      "Error eliminando evento:",
      error
    );

    return res.status(500).json({
      error:
        "Ocurrió un error al eliminar el evento.",
    });
  }
}