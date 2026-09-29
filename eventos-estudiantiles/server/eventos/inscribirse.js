import { randomUUID } from "node:crypto";

import { db } from "../lib/db.js";

import {
  obtenerCookie,
  verificarSesion,
} from "../lib/session.js";

/*
 * Convierte la hora actual a la hora local
 * de Colima para compararla con los campos
 * timestamp de eventos.
 */
function obtenerAhoraLocal() {
  const partes =
    new Intl.DateTimeFormat(
      "en-CA",
      {
        timeZone:
          "America/Mexico_City",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hourCycle: "h23",
      }
    ).formatToParts(new Date());

  const valores = {};

  for (const parte of partes) {
    valores[parte.type] =
      parte.value;
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

/*
 * Obtener token de SITEc para
 * consultas servidor-servidor.
 */
async function obtenerTokenSitec() {
  const {
    SIITEC_CLIENT_ID,
    SIITEC_CLIENT_SECRET,
    SIITEC_TOKEN_ENDPOINT,
  } = process.env;

  if (
    !SIITEC_CLIENT_ID ||
    !SIITEC_CLIENT_SECRET ||
    !SIITEC_TOKEN_ENDPOINT
  ) {
    throw new Error(
      "Faltan variables de SIITEC."
    );
  }

  const credenciales =
    Buffer.from(
      `${SIITEC_CLIENT_ID}:${SIITEC_CLIENT_SECRET}`
    ).toString("base64");

  const body =
    new URLSearchParams({
      grant_type:
        "client_credentials",
    });

  const respuesta =
    await fetch(
      SIITEC_TOKEN_ENDPOINT,
      {
        method: "POST",

        headers: {
          Authorization:
            `Basic ${credenciales}`,

          "Content-Type":
            "application/x-www-form-urlencoded",
        },

        body: body.toString(),
      }
    );

  const datos =
    await respuesta.json();

  if (
    !respuesta.ok ||
    !datos.access_token
  ) {
    throw new Error(
      "No se pudo obtener el token de SIITEC."
    );
  }

  return datos.access_token;
}

/*
 * Obtener los datos actuales
 * del estudiante desde SITEc.
 */
async function obtenerEstudianteSitec(
  numeroEstudiante,
  sitecUsuarioId
) {
  const endpoint =
    process.env
      .SIITEC_USUARIOS_ENDPOINT;

  if (!endpoint) {
    throw new Error(
      "Falta SIITEC_USUARIOS_ENDPOINT."
    );
  }

  const token =
    await obtenerTokenSitec();

  const parametros =
    new URLSearchParams({
      matricula:
        numeroEstudiante,
      activo: "1",
    });

  const respuesta =
    await fetch(
      `${endpoint}?${parametros.toString()}`,
      {
        headers: {
          Authorization:
            `Bearer ${token}`,
        },
      }
    );

  const datos =
    await respuesta.json();

  if (
    !respuesta.ok ||
    !Array.isArray(datos)
  ) {
    throw new Error(
      "No se pudo consultar al estudiante en SIITEC."
    );
  }

  return (
    datos.find(
      (usuario) =>
        String(
          usuario.usuario_id
        ) ===
        String(sitecUsuarioId)
    ) ?? null
  );
}

export default async function handler(
  req,
  res
) {
  if (req.method !== "POST") {
    return res.status(405).json({
      error:
        "Método no permitido.",
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
      sesion.tipo !== "estudiante"
    ) {
      return res.status(401).json({
        error:
          "Debes iniciar sesión como estudiante.",
      });
    }

    /*
     * 2. OBTENER CÓDIGO DEL EVENTO
     */
    const {
      codigoEvento,
    } = req.body ?? {};

    if (
      !codigoEvento ||
      typeof codigoEvento !==
        "string"
    ) {
      return res.status(400).json({
        error:
          "No se recibió un evento válido.",
      });
    }

    /*
     * 3. OBTENER ESTUDIANTE INTERNO
     */
    const resultadoEstudiante =
      await db.query(
        `
          SELECT
            id,
            sitec_usuario_id,
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
        error:
          "El estudiante ya no existe en el sistema.",
      });
    }

    /*
     * 4. OBTENER EVENTO
     *
     * Convertimos los timestamps a texto
     * local para evitar conversiones de zona
     * horaria hechas por Node/PostgreSQL.
     */
    const resultadoEvento =
      await db.query(
        `
          SELECT
            id,
            codigo_evento,
            nombre,
            fecha_evento,
            hora_evento,
            estado,

            TO_CHAR(
              fecha_activacion,
              'YYYY-MM-DD"T"HH24:MI:SS'
            ) AS fecha_activacion,

            TO_CHAR(
              cierre_inscripcion,
              'YYYY-MM-DD"T"HH24:MI:SS'
            ) AS cierre_inscripcion

          FROM eventos
          WHERE codigo_evento = $1
          LIMIT 1
        `,
        [codigoEvento]
      );

    const evento =
      resultadoEvento.rows[0];

    if (!evento) {
      return res.status(404).json({
        error:
          "El evento no existe.",
      });
    }

    /*
     * 5. VERIFICAR DISPONIBILIDAD
     */
    if (
      evento.estado !== "activo"
    ) {
      return res.status(400).json({
        error:
          "Este evento ya no está activo.",
      });
    }

    const ahora =
      obtenerAhoraLocal();

    const activacion =
      evento.fecha_activacion;

    const cierre =
      evento.cierre_inscripcion;

    if (
      activacion &&
      ahora < activacion
    ) {
      return res.status(400).json({
        error:
          "Las inscripciones para este evento todavía no están disponibles.",
      });
    }

    if (
      cierre &&
      ahora > cierre
    ) {
      return res.status(400).json({
        error:
          "Las inscripciones para este evento ya cerraron.",
      });
    }

    /*
     * 6. COMPROBAR SI YA ESTÁ INSCRITO
     */
    const resultadoExistente =
      await db.query(
        `
          SELECT
            id,
            estudiante_id,
            token_qr,
            registrado_en,
            asistio
          FROM inscripciones
          WHERE evento_id = $1
            AND numero_estudiante = $2
          LIMIT 1
        `,
        [
          evento.id,
          estudiante.numero_estudiante,
        ]
      );

    const inscripcionExistente =
      resultadoExistente.rows[0];

    /*
     * Si ya estaba inscrito,
     * devolvemos el mismo QR.
     */
    if (inscripcionExistente) {
      /*
       * Para registros viejos que
       * todavía no tenían estudiante_id.
       */
      if (
        !inscripcionExistente.estudiante_id
      ) {
        await db.query(
          `
            UPDATE inscripciones
            SET estudiante_id = $1
            WHERE id = $2
              AND estudiante_id IS NULL
          `,
          [
            estudiante.id,
            inscripcionExistente.id,
          ]
        );
      }

      return res.status(200).json({
        inscrito: true,
        yaExistia: true,

        inscripcion: {
          id:
            inscripcionExistente.id,

          tokenQr:
            inscripcionExistente.token_qr,

          registradoEn:
            inscripcionExistente.registrado_en,

          asistio:
            inscripcionExistente.asistio,
        },

        evento: {
          codigo:
            evento.codigo_evento,

          nombre:
            evento.nombre,

          fecha:
            evento.fecha_evento,

          hora:
            evento.hora_evento,
        },
      });
    }

    /*
     * 7. CONSULTAR DATOS ACTUALES
     * DEL ESTUDIANTE EN SITEc
     */
    const perfilSitec =
      await obtenerEstudianteSitec(
        estudiante.numero_estudiante,
        estudiante.sitec_usuario_id
      );

    if (!perfilSitec) {
      return res.status(404).json({
        error:
          "No se pudo encontrar el perfil del estudiante en SIITEC.",
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
    const tokenQr =
      randomUUID();

    /*
     * 9. GUARDAR INSCRIPCIÓN
     */
    try {
      const resultadoCreacion =
        await db.query(
          `
            INSERT INTO inscripciones (
              evento_id,
              estudiante_id,
              numero_estudiante,
              nombre_completo,
              genero,
              carrera,
              token_qr,
              asistio
            )
            VALUES (
              $1,
              $2,
              $3,
              $4,
              $5,
              $6,
              $7,
              FALSE
            )
            RETURNING
              id,
              token_qr,
              registrado_en,
              asistio
          `,
          [
            evento.id,
            estudiante.id,
            estudiante.numero_estudiante,
            nombreCompleto,
            perfilSitec.sexo ?? null,
            perfilSitec.carrera ?? null,
            tokenQr,
          ]
        );

      const inscripcion =
        resultadoCreacion.rows[0];

      return res.status(201).json({
        inscrito: true,
        yaExistia: false,

        inscripcion: {
          id:
            inscripcion.id,

          tokenQr:
            inscripcion.token_qr,

          registradoEn:
            inscripcion.registrado_en,

          asistio:
            inscripcion.asistio,
        },

        evento: {
          codigo:
            evento.codigo_evento,

          nombre:
            evento.nombre,

          fecha:
            evento.fecha_evento,

          hora:
            evento.hora_evento,
        },
      });
    } catch (errorCreacion) {
      /*
       * Si dos solicitudes intentan
       * registrar al mismo alumno
       * prácticamente al mismo tiempo,
       * PostgreSQL protege el duplicado.
       */
      if (
        errorCreacion.code === "23505"
      ) {
        const resultadoDuplicado =
          await db.query(
            `
              SELECT
                id,
                token_qr,
                registrado_en,
                asistio
              FROM inscripciones
              WHERE evento_id = $1
                AND numero_estudiante = $2
              LIMIT 1
            `,
            [
              evento.id,
              estudiante.numero_estudiante,
            ]
          );

        const inscripcion =
          resultadoDuplicado.rows[0];

        if (inscripcion) {
          return res.status(200).json({
            inscrito: true,
            yaExistia: true,

            inscripcion: {
              id:
                inscripcion.id,

              tokenQr:
                inscripcion.token_qr,

              registradoEn:
                inscripcion.registrado_en,

              asistio:
                inscripcion.asistio,
            },

            evento: {
              codigo:
                evento.codigo_evento,

              nombre:
                evento.nombre,

              fecha:
                evento.fecha_evento,

              hora:
                evento.hora_evento,
            },
          });
        }
      }

      console.error(
        "Error creando inscripción:",
        errorCreacion
      );

      return res.status(500).json({
        error:
          "No se pudo registrar al estudiante en el evento.",
      });
    }
  } catch (error) {
    console.error(
      "Error registrando estudiante:",
      error
    );

    return res.status(500).json({
      error:
        "Ocurrió un error al realizar la inscripción.",
    });
  }
}