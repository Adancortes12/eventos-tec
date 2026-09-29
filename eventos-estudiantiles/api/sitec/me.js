import {
  obtenerCookie,
  verificarSesion,
} from "../../server/lib/session.js";

import { db } from "../../server/lib/db.js";

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({
      error: "Método no permitido",
    });
  }

  try {
    const tokenSesion = obtenerCookie(
      req,
      "eventos_session"
    );

    if (!tokenSesion) {
      return res.status(401).json({
        autenticado: false,
        error:
          "No existe una sesión activa.",
      });
    }

    const sesion =
      verificarSesion(tokenSesion);

    if (!sesion) {
      return res.status(401).json({
        autenticado: false,
        error:
          "La sesión no es válida o ya expiró.",
      });
    }

    /*
     * ESTUDIANTE
     */
    if (
      sesion.tipo === "estudiante"
    ) {
      const resultado =
        await db.query(
          `
            SELECT
              id,
              sitec_usuario_id,
              numero_estudiante
            FROM estudiantes
            WHERE id = $1
            LIMIT 1
          `,
          [sesion.id]
        );

      const estudiante =
        resultado.rows[0];

      if (!estudiante) {
        return res.status(401).json({
          autenticado: false,
          error:
            "El estudiante ya no existe en el sistema.",
        });
      }

      return res.status(200).json({
        autenticado: true,

        usuario: {
          id:
            estudiante.id,

          tipo:
            "estudiante",

          numeroEstudiante:
            estudiante.numero_estudiante,
        },
      });
    }

    /*
     * MAESTRO
     *
     * El rol se consulta directamente
     * desde PostgreSQL en cada petición.
     *
     * Esto permite que un cambio de
     * maestro -> admin se refleje sin
     * crear una nueva sesión.
     */
    if (
      sesion.tipo === "maestro"
    ) {
      const resultado =
        await db.query(
          `
            SELECT
              id,
              sitec_usuario_id,
              sitec_empleado_id,
              usuario_sitec,
              rol_sistema,
              activo
            FROM maestros
            WHERE id = $1
            LIMIT 1
          `,
          [sesion.id]
        );

      const maestro =
        resultado.rows[0];

      if (
        !maestro ||
        !maestro.activo
      ) {
        return res.status(401).json({
          autenticado: false,
          error:
            "El maestro no tiene acceso activo al sistema.",
        });
      }

      return res.status(200).json({
        autenticado: true,

        usuario: {
          id:
            maestro.id,

          tipo:
            "maestro",

          usuarioSitec:
            maestro.usuario_sitec,

          rol:
            maestro.rol_sistema,
        },
      });
    }

    return res.status(401).json({
      autenticado: false,
      error:
        "El tipo de sesión no es válido.",
    });
  } catch (error) {
    console.error(
      "Error obteniendo sesión:",
      error
    );

    return res.status(500).json({
      error:
        "Ocurrió un error al consultar la sesión.",
    });
  }
}