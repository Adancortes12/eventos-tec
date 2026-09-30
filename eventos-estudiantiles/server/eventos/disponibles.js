import { db } from "../lib/db.js";

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({
      error: "Método no permitido.",
    });
  }

  try {
    /*
     * EVENTOS DISPONIBLES
     *
     * Las fechas se convierten explícitamente
     * a texto para mantener el formato que
     * espera el frontend.
     */
    const resultado = await db.query(`
      SELECT
        id,
        codigo_evento,
        nombre,
        descripcion,

        TO_CHAR(
          fecha_evento,
          'YYYY-MM-DD'
        ) AS fecha_evento,

        hora_evento,

        estado,

        TO_CHAR(
          fecha_activacion,
          'YYYY-MM-DD"T"HH24:MI:SS'
        ) AS fecha_activacion,

        TO_CHAR(
          cierre_inscripcion,
          'YYYY-MM-DD"T"HH24:MI:SS'
        ) AS cierre_inscripcion

      FROM eventos

      WHERE estado = 'activo'
        AND fecha_activacion <= LOCALTIMESTAMP
        AND cierre_inscripcion >= LOCALTIMESTAMP

      ORDER BY
        fecha_evento ASC,
        hora_evento ASC
    `);

    return res.status(200).json({
      eventos: resultado.rows,
    });
  } catch (error) {
    console.error(
      "Error cargando eventos disponibles:",
      error
    );

    return res.status(500).json({
      error:
        "No se pudieron cargar los eventos.",
    });
  }
}