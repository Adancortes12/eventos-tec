import { randomUUID } from "node:crypto";

import { supabaseAdmin } from "../lib/supabaseAdmin.js";

import { obtenerCookie, verificarSesion } from "../lib/session.js";

/*
 * Convierte la hora actual a la hora local
 * de Colima para compararla con los campos
 * timestamp de eventos.
 */
function obtenerAhoraLocal() {
  const partes = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Mexico_City",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  }).formatToParts(new Date());

  const valores = {};

  for (const parte of partes) {
    valores[parte.type] = parte.value;
  }

  return (
    `${valores.year}-` +
    `${valores.month}-` +
    `${valores.day}T` +
    `${valores.hour}:` +
    `${valores.minute}:` +
    `${valores.second}`
  );
}

function normalizarFecha(valor) {
  if (!valor) {
    return null;
  }

  return String(valor).replace(" ", "T").slice(0, 19);
}

/*
 * Obtener token de SITEc para
 * consultas servidor-servidor.
 */
async function obtenerTokenSitec() {
  const { SIITEC_CLIENT_ID, SIITEC_CLIENT_SECRET, SIITEC_TOKEN_ENDPOINT } =
    process.env;

  if (!SIITEC_CLIENT_ID || !SIITEC_CLIENT_SECRET || !SIITEC_TOKEN_ENDPOINT) {
    throw new Error("Faltan variables de SITEc.");
  }

  const credenciales = Buffer.from(
    `${SIITEC_CLIENT_ID}:${SIITEC_CLIENT_SECRET}`,
  ).toString("base64");

  const body = new URLSearchParams({
    grant_type: "client_credentials",
  });

  const respuesta = await fetch(SIITEC_TOKEN_ENDPOINT, {
    method: "POST",

    headers: {
      Authorization: `Basic ${credenciales}`,

      "Content-Type": "application/x-www-form-urlencoded",
    },

    body: body.toString(),
  });

  const datos = await respuesta.json();

  if (!respuesta.ok || !datos.access_token) {
    throw new Error("No se pudo obtener el token de SITEc.");
  }

  return datos.access_token;
}

/*
 * Obtener los datos actuales
 * del estudiante desde SITEc.
 */
async function obtenerEstudianteSitec(numeroEstudiante, sitecUsuarioId) {
  const endpoint = process.env.SIITEC_USUARIOS_ENDPOINT;

  if (!endpoint) {
    throw new Error("Falta SIITEC_USUARIOS_ENDPOINT.");
  }

  const token = await obtenerTokenSitec();

  const parametros = new URLSearchParams({
    matricula: numeroEstudiante,
    activo: "1",
  });

  const respuesta = await fetch(`${endpoint}?${parametros.toString()}`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  const datos = await respuesta.json();

  if (!respuesta.ok || !Array.isArray(datos)) {
    throw new Error("No se pudo consultar al estudiante en SITEc.");
  }

  return (
    datos.find(
      (usuario) => String(usuario.usuario_id) === String(sitecUsuarioId),
    ) ?? null
  );
}

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
    const tokenSesion = obtenerCookie(req, "eventos_session");

    const sesion = verificarSesion(tokenSesion);

    if (!sesion || sesion.tipo !== "estudiante") {
      return res.status(401).json({
        error: "Debes iniciar sesión como estudiante.",
      });
    }

    /*
     * 2. OBTENER CÓDIGO DEL EVENTO
     */
    const { codigoEvento } = req.body ?? {};

    if (!codigoEvento || typeof codigoEvento !== "string") {
      return res.status(400).json({
        error: "No se recibió un evento válido.",
      });
    }

    /*
     * 3. OBTENER ESTUDIANTE INTERNO
     */
    const { data: estudiante, error: errorEstudiante } = await supabaseAdmin
      .from("estudiantes")
      .select(
        `
        id,
        sitec_usuario_id,
        numero_estudiante
      `,
      )
      .eq("id", sesion.id)
      .maybeSingle();

    if (errorEstudiante) {
      console.error("Error estudiante:", errorEstudiante);

      return res.status(500).json({
        error: "No se pudo consultar al estudiante.",
      });
    }

    if (!estudiante) {
      return res.status(401).json({
        error: "El estudiante ya no existe en el sistema.",
      });
    }

    /*
     * 4. OBTENER EVENTO
     */
    const { data: evento, error: errorEvento } = await supabaseAdmin
      .from("eventos")
      .select(
        `
        id,
        codigo_evento,
        nombre,
        fecha_evento,
        hora_evento,
        estado,
        fecha_activacion,
        cierre_inscripcion
      `,
      )
      .eq("codigo_evento", codigoEvento)
      .maybeSingle();

    if (errorEvento) {
      console.error("Error evento:", errorEvento);

      return res.status(500).json({
        error: "No se pudo consultar el evento.",
      });
    }

    if (!evento) {
      return res.status(404).json({
        error: "El evento no existe.",
      });
    }

    /*
     * 5. VERIFICAR DISPONIBILIDAD
     */
    if (evento.estado !== "activo") {
      return res.status(400).json({
        error: "Este evento ya no está activo.",
      });
    }

    const ahora = obtenerAhoraLocal();

    const activacion = normalizarFecha(evento.fecha_activacion);

    const cierre = normalizarFecha(evento.cierre_inscripcion);

    if (activacion && ahora < activacion) {
      return res.status(400).json({
        error:
          "Las inscripciones para este evento todavía no están disponibles.",
      });
    }

    if (cierre && ahora > cierre) {
      return res.status(400).json({
        error: "Las inscripciones para este evento ya cerraron.",
      });
    }

    /*
     * 6. COMPROBAR SI YA ESTÁ INSCRITO
     */
    const { data: inscripcionExistente, error: errorInscripcionExistente } =
      await supabaseAdmin
        .from("inscripciones")
        .select(
          `
        id,
        estudiante_id,
        token_qr,
        registrado_en,
        asistio
      `,
        )
        .eq("evento_id", evento.id)
        .eq("numero_estudiante", estudiante.numero_estudiante)
        .maybeSingle();

    if (errorInscripcionExistente) {
      console.error("Error buscando inscripción:", errorInscripcionExistente);

      return res.status(500).json({
        error: "No se pudo consultar la inscripción.",
      });
    }

    /*
     * Si ya estaba inscrito, devolvemos
     * el mismo QR.
     */
    if (inscripcionExistente) {
      /*
       * Para registros viejos que todavía
       * no tenían estudiante_id.
       */
      if (!inscripcionExistente.estudiante_id) {
        await supabaseAdmin
          .from("inscripciones")
          .update({
            estudiante_id: estudiante.id,
          })
          .eq("id", inscripcionExistente.id);
      }

      return res.status(200).json({
        inscrito: true,
        yaExistia: true,

        inscripcion: {
          id: inscripcionExistente.id,

          tokenQr: inscripcionExistente.token_qr,

          registradoEn: inscripcionExistente.registrado_en,

          asistio: inscripcionExistente.asistio,
        },

        evento: {
          codigo: evento.codigo_evento,

          nombre: evento.nombre,

          fecha: evento.fecha_evento,

          hora: evento.hora_evento,
        },
      });
    }

    /*
     * 7. CONSULTAR DATOS ACTUALES EN SITEc
     */
    const perfilSitec = await obtenerEstudianteSitec(
      estudiante.numero_estudiante,
      estudiante.sitec_usuario_id,
    );

    if (!perfilSitec) {
      return res.status(404).json({
        error: "No se pudo encontrar el perfil del estudiante en SITEc.",
      });
    }

    const nombreCompleto = [
      perfilSitec.nombres,
      perfilSitec.apellido1,
      perfilSitec.apellido2,
    ]
      .filter(Boolean)
      .join(" ")
      .trim();

    /*
     * 8. CREAR TOKEN ÚNICO PARA EL QR
     */
    const tokenQr = randomUUID();

    /*
     * 9. GUARDAR INSCRIPCIÓN
     */
    const { data: inscripcion, error: errorCreacion } = await supabaseAdmin
      .from("inscripciones")
      .insert({
        evento_id: evento.id,

        estudiante_id: estudiante.id,

        numero_estudiante: estudiante.numero_estudiante,

        nombre_completo: nombreCompleto,

        genero: perfilSitec.sexo ?? null,

        carrera: perfilSitec.carrera ?? null,

        token_qr: tokenQr,

        asistio: false,
      })
      .select(
        `
        id,
        token_qr,
        registrado_en,
        asistio
      `,
      )
      .single();

    if (errorCreacion) {
      console.error("Error creando inscripción:", errorCreacion);

      return res.status(500).json({
        error: "No se pudo registrar al estudiante en el evento.",
      });
    }

    /*
     * 10. RESPUESTA
     */
    return res.status(201).json({
      inscrito: true,
      yaExistia: false,

      inscripcion: {
        id: inscripcion.id,

        tokenQr: inscripcion.token_qr,

        registradoEn: inscripcion.registrado_en,

        asistio: inscripcion.asistio,
      },

      evento: {
        codigo: evento.codigo_evento,

        nombre: evento.nombre,

        fecha: evento.fecha_evento,

        hora: evento.hora_evento,
      },
    });
  } catch (error) {
    console.error("Error registrando estudiante:", error);

    return res.status(500).json({
      error: "Ocurrió un error al realizar la inscripción.",
    });
  }
}


