import { supabaseAdmin } from "../lib/supabaseAdmin.js";

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

    // 2. Verificar maestro activo
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

    // Cualquier maestro activo puede ver asistentes
    const eventoId =
      typeof req.query?.eventoId === "string"
        ? req.query.eventoId
        : "";

    if (!eventoId) {
      return res.status(400).json({
        error:
          "No se recibió un evento válido.",
      });
    }

    // 3. Obtener evento
    const {
      data: evento,
      error: errorEvento,
    } = await supabaseAdmin
      .from("eventos")
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
        cierre_inscripcion
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
          "No se pudo cargar el evento.",
      });
    }

    if (!evento) {
      return res.status(404).json({
        error:
          "El evento no existe.",
      });
    }

    // 4. Obtener inscritos
    const {
      data: inscripciones,
      error: errorInscripciones,
    } = await supabaseAdmin
      .from("inscripciones")
      .select(`
        id,
        numero_estudiante,
        nombre_completo,
        registrado_en,
        asistio,
        asistio_en
      `)
      .eq("evento_id", eventoId)
      .order("registrado_en", {
        ascending: false,
      });

    if (errorInscripciones) {
      console.error(
        "Error consultando inscripciones:",
        errorInscripciones
      );

      return res.status(500).json({
        error:
          "No se pudieron cargar las inscripciones.",
      });
    }

    return res.status(200).json({
      evento,
      inscripciones:
        inscripciones ?? [],
    });
  } catch (error) {
    console.error(
      "Error cargando detalle:",
      error
    );

    return res.status(500).json({
      error:
        "Ocurrió un error al cargar el evento.",
    });
  }
}