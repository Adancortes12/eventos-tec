import { db } from "../lib/db.js";

import {
  obtenerCookie,
  verificarSesion,
} from "../lib/session.js";

function fechaValida(fecha) {
  return /^\d{4}-\d{2}-\d{2}$/.test(
    fecha
  );
}

function horaValida(hora) {
  return /^\d{2}:\d{2}$/.test(
    hora
  );
}

export default async function handler(
  req,
  res
) {
  if (req.method !== "PUT") {
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
      verificarSesion(
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
     * 2. CONSULTAR ROL ACTUAL
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
     * SOLO ADMIN Y SUPERADMIN
     */
    const puedeEditar =
      maestro.rol_sistema === "admin" ||
      maestro.rol_sistema === "superadmin";

    if (!puedeEditar) {
      return res.status(403).json({
        error:
          "No tienes permisos para editar eventos.",
      });
    }

    /*
     * 3. DATOS RECIBIDOS
     */
    const {
      eventoId,
      nombre,
      descripcion,
      fechaEvento,
      horaEvento,
      fechaActivacion,
      duracionMinutos,
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

    const eventoActual =
      resultadoEvento.rows[0];

    if (!eventoActual) {
      return res.status(404).json({
        error:
          "El evento no existe.",
      });
    }

    /*
     * LOS FINALIZADOS YA NO SE EDITAN
     */
    if (
      eventoActual.estado ===
      "finalizado"
    ) {
      return res.status(400).json({
        error:
          "Un evento finalizado ya no puede editarse.",
      });
    }

    /*
     * 5. VALIDACIONES
     */
    if (
      typeof nombre !== "string" ||
      !nombre.trim()
    ) {
      return res.status(400).json({
        error:
          "El nombre del evento es obligatorio.",
      });
    }

    if (
      typeof fechaEvento !== "string" ||
      !fechaValida(fechaEvento)
    ) {
      return res.status(400).json({
        error:
          "La fecha del evento no es válida.",
      });
    }

    if (
      typeof horaEvento !== "string" ||
      !horaValida(horaEvento)
    ) {
      return res.status(400).json({
        error:
          "La hora del evento no es válida.",
      });
    }

    if (
      typeof fechaActivacion !== "string" ||
      !fechaActivacion
    ) {
      return res.status(400).json({
        error:
          "La fecha de activación es obligatoria.",
      });
    }

    const duracion =
      Number(duracionMinutos);

    if (
      !Number.isInteger(duracion) ||
      duracion <= 0 ||
      duracion > 1440
    ) {
      return res.status(400).json({
        error:
          "La duración del evento no es válida.",
      });
    }

    /*
     * ACTIVACIÓN NO PUEDE ESTAR
     * DESPUÉS DEL INICIO
     */
    const inicioEvento =
      `${fechaEvento}T${horaEvento}`;

    if (
      fechaActivacion >
      inicioEvento
    ) {
      return res.status(400).json({
        error:
          "La fecha de activación no puede ser posterior al inicio del evento.",
      });
    }

    /*
     * 6. ACTUALIZAR
     *
     * El estado no se modifica aquí.
     */
    const resultadoActualizacion =
      await db.query(
        `
          UPDATE eventos
          SET
            nombre = $1,
            descripcion = $2,
            fecha_evento = $3,
            hora_evento = $4,
            fecha_activacion = $5,
            duracion_minutos = $6
          WHERE id = $7
          RETURNING
            id,
            codigo_evento,
            nombre,
            descripcion,
            fecha_evento,
            hora_evento,
            estado,
            fecha_activacion,
            duracion_minutos,
            cierre_inscripcion,
            creado_por
        `,
        [
          nombre.trim(),

          typeof descripcion === "string" &&
          descripcion.trim()
            ? descripcion.trim()
            : null,

          fechaEvento,
          horaEvento,
          fechaActivacion,
          duracion,
          eventoId,
        ]
      );

    const evento =
      resultadoActualizacion.rows[0];

    if (!evento) {
      return res.status(404).json({
        error:
          "El evento no existe.",
      });
    }

    return res.status(200).json({
      actualizado: true,
      evento,
    });
  } catch (error) {
    console.error(
      "Error editando evento:",
      error
    );

    return res.status(500).json({
      error:
        "Ocurrió un error al editar el evento.",
    });
  }
}