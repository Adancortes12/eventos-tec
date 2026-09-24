import { supabaseAdmin } from "../lib/supabaseAdmin.js";

import {
  obtenerCookie,
  verificarSesion,
} from "../lib/session.js";

export default async function handler(req, res) {
  if (req.method !== "DELETE") {
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
    const puedeEliminar =
      maestro.rol_sistema === "admin" ||
      maestro.rol_sistema ===
        "superadmin";

    if (!puedeEliminar) {
      return res.status(403).json({
        error:
          "No tienes permisos para eliminar eventos.",
      });
    }

    // 4. Obtener ID
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

    // 5. Comprobar que exista
    const {
      data: evento,
      error: errorEvento,
    } = await supabaseAdmin
      .from("eventos")
      .select(`
        id,
        codigo_evento,
        nombre
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
        error:
          "El evento no existe.",
      });
    }

    // 6. Revisar inscripciones
    const {
      count,
      error: errorInscripciones,
    } = await supabaseAdmin
      .from("inscripciones")
      .select("id", {
        count: "exact",
        head: true,
      })
      .eq("evento_id", eventoId);

    if (errorInscripciones) {
      console.error(
        "Error consultando inscripciones:",
        errorInscripciones
      );

      return res.status(500).json({
        error:
          "No se pudo verificar si el evento tiene inscripciones.",
      });
    }

    if ((count ?? 0) > 0) {
      return res.status(409).json({
        error:
          "No puedes eliminar un evento que ya tiene estudiantes registrados.",
      });
    }

    // 7. Eliminar
    const {
      error: errorEliminar,
    } = await supabaseAdmin
      .from("eventos")
      .delete()
      .eq("id", eventoId);

    if (errorEliminar) {
      console.error(
        "Error eliminando evento:",
        errorEliminar
      );

      return res.status(500).json({
        error:
          "No se pudo eliminar el evento.",
      });
    }

    return res.status(200).json({
      eliminado: true,
    });
  } catch (error) {
    console.error(
      "Error eliminando evento:",
      error
    );

    return res.status(500).json({
      error:
        "Ocurrió un error al eliminar el evento.",
    });
  }
}