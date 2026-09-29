import { db } from "../lib/db.js";

import {
  obtenerCookie,
  verificarSesion,
} from "../lib/session.js";

/*
 * FECHA ACTUAL EN HORARIO LOCAL
 * DEL SISTEMA
 */
function obtenerFechaActualLocal() {
  return new Intl.DateTimeFormat(
    "en-CA",
    {
      timeZone: "America/Mexico_City",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }
  ).format(new Date());
}

/*
 * VALIDAR FORMATO YYYY-MM-DD
 */
function fechaValida(fecha) {
  return /^\d{4}-\d{2}-\d{2}$/.test(
    fecha
  );
}

/*
 * VALIDAR HH:MM
 */
function horaValida(hora) {
  return /^\d{2}:\d{2}$/.test(
    hora
  );
}

/*
 * GENERAR SIGUIENTE CÓDIGO
 *
 * EVT-2026-0001
 * EVT-2026-0002
 * ...
 */
async function generarCodigoEvento(anio) {
  const resultado =
    await db.query(
      `
        SELECT codigo_evento
        FROM eventos
        WHERE codigo_evento LIKE $1
        ORDER BY codigo_evento DESC
        LIMIT 1
      `,
      [`EVT-${anio}-%`]
    );

  const ultimoEvento =
    resultado.rows[0];

  let siguienteNumero = 1;

  if (ultimoEvento) {
    const partes =
      ultimoEvento.codigo_evento.split(
        "-"
      );

    const numeroAnterior =
      Number(partes[2]);

    if (
      !Number.isNaN(
        numeroAnterior
      )
    ) {
      siguienteNumero =
        numeroAnterior + 1;
    }
  }

  return `EVT-${anio}-${String(
    siguienteNumero
  ).padStart(4, "0")}`;
}

export default async function handler(
  req,
  res
) {
  /*
   * SOLO POST
   */
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
      sesion.tipo !== "maestro"
    ) {
      return res.status(401).json({
        error:
          "Debes iniciar sesión como maestro.",
      });
    }

    /*
     * 2. CONSULTAR USUARIO
     * Y SU ROL ACTUAL
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
     * SOLO SUPERADMIN
     */
    if (
      maestro.rol_sistema !==
      "superadmin"
    ) {
      return res.status(403).json({
        error:
          "Solo un superadministrador puede crear eventos.",
      });
    }

    /*
     * 3. DATOS RECIBIDOS
     */
    const {
      nombre,
      descripcion,
      fechaEvento,
      horaEvento,
      fechaActivacion,
      duracionMinutos,
    } = req.body ?? {};

    /*
     * 4. VALIDACIONES
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
     * NO PERMITIR EVENTOS
     * EN DÍAS ANTERIORES
     */
    const hoy =
      obtenerFechaActualLocal();

    if (fechaEvento < hoy) {
      return res.status(400).json({
        error:
          "No puedes crear un evento con una fecha anterior a hoy.",
      });
    }

    /*
     * LA ACTIVACIÓN DEBE OCURRIR
     * ANTES DEL INICIO DEL EVENTO
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
     * 5. GENERAR CÓDIGO
     */
    const anio =
      Number(
        fechaEvento.slice(0, 4)
      );

    /*
     * HACEMOS HASTA 3 INTENTOS
     * POR SI DOS SUPERADMINISTRADORES
     * CREAN AL MISMO TIEMPO.
     */
    for (
      let intento = 0;
      intento < 3;
      intento++
    ) {
      const codigoEvento =
        await generarCodigoEvento(
          anio
        );

      try {
        /*
         * 6. CREAR EVENTO
         */
        const resultadoCreacion =
          await db.query(
            `
              INSERT INTO eventos (
                codigo_evento,
                nombre,
                descripcion,
                fecha_evento,
                hora_evento,
                estado,
                fecha_activacion,
                duracion_minutos,
                creado_por
              )
              VALUES (
                $1,
                $2,
                $3,
                $4,
                $5,
                'activo',
                $6,
                $7,
                $8
              )
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
              codigoEvento,
              nombre.trim(),
              typeof descripcion ===
                "string" &&
              descripcion.trim()
                ? descripcion.trim()
                : null,
              fechaEvento,
              horaEvento,
              fechaActivacion,
              duracion,
              maestro.id,
            ]
          );

        const evento =
          resultadoCreacion.rows[0];

        /*
         * 7. RESPUESTA
         */
        return res.status(201).json({
          creado: true,
          evento,
        });
      } catch (errorCreacion) {
        /*
         * 23505 = UNIQUE VIOLATION
         *
         * Si otro superadministrador
         * generó el mismo código al
         * mismo tiempo, volvemos a
         * intentarlo.
         */
        if (
          errorCreacion.code ===
          "23505"
        ) {
          continue;
        }

        console.error(
          "Error creando evento:",
          errorCreacion
        );

        return res.status(500).json({
          error:
            "No se pudo crear el evento.",
        });
      }
    }

    return res.status(409).json({
      error:
        "No se pudo generar un código único para el evento. Intenta nuevamente.",
    });
  } catch (error) {
    console.error(
      "Error creando evento:",
      error
    );

    return res.status(500).json({
      error:
        "Ocurrió un error al crear el evento.",
    });
  }
}