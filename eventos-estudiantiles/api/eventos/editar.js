import { supabaseAdmin } from "../lib/supabaseAdmin.js";

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
    const {
      data: maestro,
      error: errorMaestro,
    } = await supabaseAdmin
      .from("maestros")
      .select(`
        id,
        rol_sistema,
        activo
      `)
      .eq(
        "id",
        sesion.id
      )
      .maybeSingle();

    if (errorMaestro) {
      console.error(
        "Error consultando maestro:",
        errorMaestro
      );

      return res.status(500).json({
        error:
          "No se pudo verificar el usuario.",
      });
    }

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
      maestro.rol_sistema ===
        "admin" ||
      maestro.rol_sistema ===
        "superadmin";

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
    const {
      data: eventoActual,
      error: errorEvento,
    } = await supabaseAdmin
      .from("eventos")
      .select(`
        id,
        estado
      `)
      .eq(
        "id",
        eventoId
      )
      .maybeSingle();

    if (errorEvento) {
      console.error(
        "Error consultando evento:",
        errorEvento
      );

      return res.status(500).json({
        error:
          "No se pudo consultar el evento.",
      });
    }

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
      typeof fechaEvento !==
        "string" ||
      !fechaValida(fechaEvento)
    ) {
      return res.status(400).json({
        error:
          "La fecha del evento no es válida.",
      });
    }

    if (
      typeof horaEvento !==
        "string" ||
      !horaValida(horaEvento)
    ) {
      return res.status(400).json({
        error:
          "La hora del evento no es válida.",
      });
    }

    if (
      typeof fechaActivacion !==
        "string" ||
      !fechaActivacion
    ) {
      return res.status(400).json({
        error:
          "La fecha de activación es obligatoria.",
      });
    }

    const duracion =
      Number(
        duracionMinutos
      );

    if (
      !Number.isInteger(
        duracion
      ) ||
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
     * No modificamos estado aquí.
     * Finalizar será otra acción segura.
     */
    const {
      data: evento,
      error: errorActualizacion,
    } = await supabaseAdmin
      .from("eventos")
      .update({
        nombre:
          nombre.trim(),

        descripcion:
          typeof descripcion ===
            "string" &&
          descripcion.trim()
            ? descripcion.trim()
            : null,

        fecha_evento:
          fechaEvento,

        hora_evento:
          horaEvento,

        fecha_activacion:
          fechaActivacion,

        duracion_minutos:
          duracion,
      })
      .eq(
        "id",
        eventoId
      )
      .select(`
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
      `)
      .single();

    if (errorActualizacion) {
      console.error(
        "Error actualizando evento:",
        errorActualizacion
      );

      return res.status(500).json({
        error:
          "No se pudieron guardar los cambios.",
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