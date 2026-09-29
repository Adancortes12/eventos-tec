import { db } from "../lib/db.js";

import {
  obtenerCookie,
  verificarSesion,
} from "../lib/session.js";

async function verificarSuperadmin(req) {
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
    return {
      permitido: false,
      status: 401,
      error:
        "Debes iniciar sesión como maestro.",
    };
  }

  const resultado =
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
    resultado.rows[0];

  if (
    !maestro ||
    !maestro.activo
  ) {
    return {
      permitido: false,
      status: 403,
      error:
        "Tu cuenta no tiene acceso activo.",
    };
  }

  if (
    maestro.rol_sistema !==
    "superadmin"
  ) {
    return {
      permitido: false,
      status: 403,
      error:
        "No tienes permisos de superadministrador.",
    };
  }

  return {
    permitido: true,
    maestro,
  };
}

export default async function handler(
  req,
  res
) {
  try {
    const acceso =
      await verificarSuperadmin(
        req
      );

    if (!acceso.permitido) {
      return res
        .status(acceso.status)
        .json({
          error: acceso.error,
        });
    }

    /*
     * LISTAR MAESTROS
     */
    if (req.method === "GET") {
      const resultado =
        await db.query(`
          SELECT
            id,
            sitec_usuario_id,
            sitec_empleado_id,
            usuario_sitec,
            rol_sistema,
            activo,
            creado_en,
            actualizado_en
          FROM maestros
          ORDER BY creado_en DESC
        `);

      return res.status(200).json({
        maestros:
          resultado.rows,
      });
    }

    /*
     * CAMBIAR ROL
     */
    if (req.method === "PATCH") {
      const {
        maestroId,
        rol,
      } = req.body ?? {};

      if (
        typeof maestroId !==
          "string" ||
        !maestroId
      ) {
        return res.status(400).json({
          error:
            "No se recibió un maestro válido.",
        });
      }

      /*
       * Desde el panel solamente
       * se puede asignar maestro/admin.
       */
      if (
        rol !== "maestro" &&
        rol !== "admin"
      ) {
        return res.status(400).json({
          error:
            "El rol solicitado no es válido.",
        });
      }

      /*
       * CONSULTAR MAESTRO OBJETIVO
       */
      const resultadoObjetivo =
        await db.query(
          `
            SELECT
              id,
              usuario_sitec,
              rol_sistema,
              activo
            FROM maestros
            WHERE id = $1
            LIMIT 1
          `,
          [maestroId]
        );

      const objetivo =
        resultadoObjetivo.rows[0];

      if (!objetivo) {
        return res.status(404).json({
          error:
            "El maestro no existe.",
        });
      }

      /*
       * Los superadmin solamente
       * se administran manualmente
       * desde PostgreSQL.
       */
      if (
        objetivo.rol_sistema ===
        "superadmin"
      ) {
        return res.status(403).json({
          error:
            "No se puede modificar un superadministrador desde el panel.",
        });
      }

      /*
       * ACTUALIZAR ROL
       *
       * También comprobamos en el UPDATE
       * que no sea superadmin para proteger
       * contra cambios concurrentes.
       */
      const resultadoActualizacion =
        await db.query(
          `
            UPDATE maestros
            SET
              rol_sistema = $1,
              actualizado_en = NOW()
            WHERE id = $2
              AND rol_sistema <> 'superadmin'
            RETURNING
              id,
              usuario_sitec,
              rol_sistema,
              activo
          `,
          [
            rol,
            maestroId,
          ]
        );

      const actualizado =
        resultadoActualizacion.rows[0];

      if (!actualizado) {
        return res.status(403).json({
          error:
            "No se puede modificar este maestro.",
        });
      }

      return res.status(200).json({
        actualizado: true,
        maestro: actualizado,
      });
    }

    return res.status(405).json({
      error:
        "Método no permitido.",
    });
  } catch (error) {
    console.error(
      "Error administrando maestros:",
      error
    );

    return res.status(500).json({
      error:
        "Ocurrió un error en la administración de maestros.",
    });
  }
}