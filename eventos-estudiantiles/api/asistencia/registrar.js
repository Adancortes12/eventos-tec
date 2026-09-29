import { db } from "../../server/lib/db.js";

import {
  obtenerCookie,
  verificarSesion,
} from "../../server/lib/session.js";

export default async function handler(req, res) {
  if (req.method !== "POST") {
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
     * 2. COMPROBAR MAESTRO
     *
     * Cualquier maestro activo puede
     * pasar asistencia.
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
     * 3. DATOS DEL QR
     */
    const {
      eventoId,
      tokenQr,
    } = req.body ?? {};

    if (
      typeof eventoId !== "string" ||
      !eventoId
    ) {
      return res.status(400).json({
        error:
          "No se recibió un evento válido.",
      });
    }

    if (
      typeof tokenQr !== "string" ||
      !tokenQr.trim()
    ) {
      return res.status(400).json({
        error:
          "No se recibió un código QR válido.",
      });
    }

    /*
     * 4. COMPROBAR EVENTO
     */
    const resultadoEvento =
      await db.query(
        `
          SELECT
            id,
            estado
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
        tipo: "error",
        error:
          "El evento no existe.",
      });
    }

    if (
      evento.estado !== "activo"
    ) {
      return res.status(409).json({
        tipo: "evento_finalizado",
        error:
          "Este evento ya está finalizado.",
      });
    }

    /*
     * 5. BUSCAR INSCRIPCIÓN POR QR
     */
    const resultadoInscripcion =
      await db.query(
        `
          SELECT
            id,
            evento_id,
            numero_estudiante,
            nombre_completo,
            asistio,
            asistio_en
          FROM inscripciones
          WHERE token_qr = $1
          LIMIT 1
        `,
        [tokenQr.trim()]
      );

    const inscripcion =
      resultadoInscripcion.rows[0];

    /*
     * QR inexistente
     */
    if (!inscripcion) {
      return res.status(404).json({
        tipo: "invalido",
        error:
          "QR no válido.",
      });
    }

    /*
     * QR de otro evento
     */
    if (
      inscripcion.evento_id !==
      eventoId
    ) {
      return res.status(409).json({
        tipo: "otro_evento",
        error:
          "Este QR no pertenece a este evento.",
      });
    }

    /*
     * ASISTENCIA YA REGISTRADA
     */
    if (inscripcion.asistio) {
      return res.status(200).json({
        tipo: "repetido",

        nombre:
          inscripcion.nombre_completo,

        numero:
          inscripcion.numero_estudiante,

        asistioEn:
          inscripcion.asistio_en,
      });
    }

    /*
     * 6. REGISTRAR ASISTENCIA
     *
     * La condición asistio = FALSE evita
     * registrar dos veces si llegan dos
     * escaneos al mismo tiempo.
     */
    const resultadoActualizacion =
      await db.query(
        `
          UPDATE inscripciones
          SET
            asistio = TRUE,
            asistio_en = NOW()
          WHERE id = $1
            AND asistio = FALSE
          RETURNING
            id,
            numero_estudiante,
            nombre_completo,
            asistio,
            asistio_en
        `,
        [inscripcion.id]
      );

    const actualizada =
      resultadoActualizacion.rows[0];

    /*
     * Si no actualizó ninguna fila,
     * otro escaneo pudo registrarla
     * justo antes.
     */
    if (!actualizada) {
      const resultadoActual =
        await db.query(
          `
            SELECT
              numero_estudiante,
              nombre_completo,
              asistio_en
            FROM inscripciones
            WHERE id = $1
            LIMIT 1
          `,
          [inscripcion.id]
        );

      const actual =
        resultadoActual.rows[0];

      return res.status(200).json({
        tipo: "repetido",

        nombre:
          actual?.nombre_completo ??
          inscripcion.nombre_completo,

        numero:
          actual?.numero_estudiante ??
          inscripcion.numero_estudiante,

        asistioEn:
          actual?.asistio_en ?? null,
      });
    }

    /*
     * 7. RESPUESTA
     */
    return res.status(200).json({
      tipo: "exito",

      nombre:
        actualizada.nombre_completo,

      numero:
        actualizada.numero_estudiante,

      asistioEn:
        actualizada.asistio_en,
    });
  } catch (error) {
    console.error(
      "Error registrando asistencia:",
      error
    );

    return res.status(500).json({
      tipo: "error",
      error:
        "Ocurrió un error al registrar la asistencia.",
    });
  }
}