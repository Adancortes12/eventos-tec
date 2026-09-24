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
    const {
      data: estudiante,
      error: errorEstudiante,
    } = await supabaseAdmin
      .from("estudiantes")
      .select(`
        id,
        numero_estudiante
      `)
      .eq("id", sesion.id)
      .maybeSingle();

    if (errorEstudiante) {
      console.error(
        "Error consultando estudiante:",
        errorEstudiante
      );

      return res.status(500).json({
        error:
          "No se pudo consultar al estudiante.",
      });
    }

    if (!estudiante) {
      return res.status(401).json({
        autenticado: false,
        error:
          "El estudiante ya no existe en el sistema.",
      });
    }

    /*
     * 3. CONSULTAR SUS INSCRIPCIONES
     */
    const {
      data: inscripciones,
      error: errorInscripciones,
    } = await supabaseAdmin
      .from("inscripciones")
      .select(`
        id,
        token_qr,
        registrado_en,
        asistio,
        asistio_en,
        eventos (
          id,
          codigo_evento,
          nombre,
          descripcion,
          fecha_evento,
          hora_evento,
          estado,
          cierre_inscripcion
        )
      `)
      .eq(
        "estudiante_id",
        estudiante.id
      )
      .order(
        "registrado_en",
        {
          ascending: false,
        }
      );

    if (errorInscripciones) {
      console.error(
        "Error consultando inscripciones:",
        errorInscripciones
      );

      return res.status(500).json({
        error:
          "No se pudieron consultar tus eventos.",
      });
    }

    /*
     * 4. RESPUESTA
     */
    const eventos =
      (inscripciones ?? []).map(
        (inscripcion) => ({
          inscripcionId:
            inscripcion.id,

          tokenQr:
            inscripcion.token_qr,

          registradoEn:
            inscripcion.registrado_en,

          asistio:
            inscripcion.asistio,

          asistioEn:
            inscripcion.asistio_en,

          evento:
            inscripcion.eventos,
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

