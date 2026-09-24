import { supabaseAdmin } from "../lib/supabaseAdmin.js";

import {
  obtenerCookie,
  verificarSesion,
} from "../lib/session.js";

export default async function handler(req, res) {
  if (req.method !== "PATCH") {
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

    // 2. Consultar rol actual
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

    // 3. Solo admin y superadmin
    const puedeFinalizar =
      maestro.rol_sistema === "admin" ||
      maestro.rol_sistema ===
        "superadmin";

    if (!puedeFinalizar) {
      return res.status(403).json({
        error:
          "No tienes permisos para finalizar eventos.",
      });
    }

    // 4. Obtener evento
    const { eventoId } =
      req.body ?? {};

    if (
      typeof eventoId !== "string" ||
      !eventoId
    ) {
      return res.status(400).json({
        error:
          "No se recibió un evento válido.",
      });
    }

    const {
      data: eventoActual,
      error: errorEvento,
    } = await supabaseAdmin
      .from("eventos")
      .select(`
        id,
        codigo_evento,
        nombre,
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

    if (!eventoActual) {
      return res.status(404).json({
        error:
          "El evento no existe.",
      });
    }

    if (
      eventoActual.estado ===
      "finalizado"
    ) {
      return res.status(400).json({
        error:
          "El evento ya está finalizado.",
      });
    }

    // 5. Finalizar
    const {
      data: evento,
      error: errorActualizacion,
    } = await supabaseAdmin
      .from("eventos")
      .update({
        estado: "finalizado",
      })
      .eq("id", eventoId)
      .select(`
        id,
        codigo_evento,
        nombre,
        estado
      `)
      .single();

    if (errorActualizacion) {
      console.error(
        "Error finalizando evento:",
        errorActualizacion
      );

      return res.status(500).json({
        error:
          "No se pudo finalizar el evento.",
      });
    }

    return res.status(200).json({
      finalizado: true,
      evento,
    });
  } catch (error) {
    console.error(
      "Error finalizando evento:",
      error
    );

    return res.status(500).json({
      error:
        "Ocurrió un error al finalizar el evento.",
    });
  }
}