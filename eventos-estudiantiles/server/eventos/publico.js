import { db } from "../lib/db.js";

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({
      error: "Método no permitido.",
    });
  }

  try {
    const codigoEvento =
      typeof req.query?.codigoEvento === "string"
        ? req.query.codigoEvento.trim()
        : "";

    if (!codigoEvento) {
      return res.status(400).json({
        error:
          "No se recibió un código de evento válido.",
      });
    }

    const resultado =
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
            cierre_inscripcion
          FROM eventos
          WHERE codigo_evento = $1
          LIMIT 1
        `,
        [codigoEvento]
      );

    const evento =
      resultado.rows[0];

    if (!evento) {
      return res.status(404).json({
        error:
          "El evento no existe o ya no está disponible.",
      });
    }

    return res.status(200).json({
      evento,
    });
  } catch (error) {
    console.error(
      "Error consultando evento público:",
      error
    );

    return res.status(500).json({
      error:
        "No se pudo consultar el evento.",
    });
  }
}