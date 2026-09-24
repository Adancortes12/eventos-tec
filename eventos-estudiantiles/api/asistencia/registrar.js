import { supabaseAdmin } from "../../server/lib/supabaseAdmin.js";

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
      .eq("id", sesion.id)
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
    const {
      data: evento,
      error: errorEvento,
    } = await supabaseAdmin
      .from("eventos")
      .select(`
        id,
        estado
      `)
      .eq("id", eventoId)
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
     * 5. BUSCAR INSCRIPCIÓN
     */
    const {
      data: inscripcion,
      error: errorInscripcion,
    } = await supabaseAdmin
      .from("inscripciones")
      .select(`
        id,
        evento_id,
        numero_estudiante,
        nombre_completo,
        asistio,
        asistio_en
      `)
      .eq(
        "token_qr",
        tokenQr.trim()
      )
      .maybeSingle();

    if (errorInscripcion) {
      console.error(
        "Error consultando QR:",
        errorInscripcion
      );

      return res.status(500).json({
        tipo: "error",
        error:
          "No se pudo consultar el QR.",
      });
    }

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
     * La hora la genera el servidor.
     */
    const ahora =
      new Date().toISOString();

    const {
      data: actualizada,
      error: errorActualizar,
    } = await supabaseAdmin
      .from("inscripciones")
      .update({
        asistio: true,
        asistio_en: ahora,
      })
      .eq(
        "id",
        inscripcion.id
      )
      .select(`
        id,
        numero_estudiante,
        nombre_completo,
        asistio,
        asistio_en
      `)
      .single();

    if (errorActualizar) {
      console.error(
        "Error registrando asistencia:",
        errorActualizar
      );

      return res.status(500).json({
        tipo: "error",
        error:
          "No se pudo registrar la asistencia.",
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
