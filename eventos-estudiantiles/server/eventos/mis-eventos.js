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
      verificarSesion(tokenSesion);

    if (
      !sesion ||
      sesion.tipo !== "estudiante"
    ) {
      return res.status(401).json({
        autenticado: false,
        error:
          "Debes iniciar sesión como estudiante.",
      });
    }

    /*
     * 2. COMPROBAR QUE EL ESTUDIANTE
     * SIGUE EXISTIENDO
     */
    const resultadoEstudiante =
      await db.query(
        `
          SELECT
            id,
            numero_estudiante
          FROM estudiantes
          WHERE id = $1
          LIMIT 1
        `,
        [sesion.id]
      );

    const estudiante =
      resultadoEstudiante.rows[0];

    if (!estudiante) {
      return res.status(401).json({
        autenticado: false,
        error:
          "El estudiante ya no existe en el sistema.",
      });
    }

    /*
     * 3. CONSULTAR SUS INSCRIPCIONES
     * JUNTO CON LOS DATOS DEL EVENTO
     */
    const resultadoInscripciones =
      await db.query(
        `
          SELECT
            i.id AS inscripcion_id,
            i.token_qr,
            i.registrado_en,
            i.asistio,
            i.asistio_en,

            e.id AS evento_id,
            e.codigo_evento,
            e.nombre,
            e.descripcion,
            e.fecha_evento,
            e.hora_evento,
            e.estado,
            e.cierre_inscripcion

          FROM inscripciones AS i

          INNER JOIN eventos AS e
            ON e.id = i.evento_id

          WHERE i.estudiante_id = $1

          ORDER BY i.registrado_en DESC
        `,
        [estudiante.id]
      );

    /*
     * 4. MANTENER LA MISMA
     * ESTRUCTURA DE RESPUESTA
     * QUE TENÍAMOS CON SUPABASE
     */
    const eventos =
      resultadoInscripciones.rows.map(
        (fila) => ({
          inscripcionId:
            fila.inscripcion_id,

          tokenQr:
            fila.token_qr,

          registradoEn:
            fila.registrado_en,

          asistio:
            fila.asistio,

          asistioEn:
            fila.asistio_en,

          evento: {
            id:
              fila.evento_id,

            codigo_evento:
              fila.codigo_evento,

            nombre:
              fila.nombre,

            descripcion:
              fila.descripcion,

            fecha_evento:
              fila.fecha_evento,

            hora_evento:
              fila.hora_evento,

            estado:
              fila.estado,

            cierre_inscripcion:
              fila.cierre_inscripcion,
          },
        })
      );

    return res.status(200).json({
      autenticado: true,
      eventos,
    });
  } catch (error) {
    console.error(
      "Error obteniendo mis eventos:",
      error
    );

    return res.status(500).json({
      error:
        "Ocurrió un error al consultar tus eventos.",
    });
  }
}