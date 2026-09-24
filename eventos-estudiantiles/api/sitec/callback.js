import { supabaseAdmin } from "../../server/lib/supabaseAdmin.js";
import { crearSesion } from "../../server/lib/session.js";

function obtenerCookie(req, nombre) {
  const cookies = req.headers.cookie ?? "";

  const cookie = cookies
    .split(";")
    .map((valor) => valor.trim())
    .find((valor) => valor.startsWith(`${nombre}=`));

  if (!cookie) {
    return null;
  }

  return decodeURIComponent(cookie.substring(nombre.length + 1));
}

async function obtenerJsonSeguro(respuesta) {
  const texto = await respuesta.text();

  try {
    return JSON.parse(texto);
  } catch {
    return {
      respuestaTexto: texto,
    };
  }
}

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({
      error: "Método no permitido",
    });
  }

  try {
    const {
      SIITEC_CLIENT_ID,
      SIITEC_CLIENT_SECRET,
      SIITEC_TOKEN_ENDPOINT,
      SIITEC_USERINFO_ENDPOINT,
      SIITEC_USUARIOS_ENDPOINT,
    } = process.env;

    if (
      !SIITEC_CLIENT_ID ||
      !SIITEC_CLIENT_SECRET ||
      !SIITEC_TOKEN_ENDPOINT ||
      !SIITEC_USERINFO_ENDPOINT ||
      !SIITEC_USUARIOS_ENDPOINT
    ) {
      return res.status(500).json({
        error: "Faltan variables de configuración de SIITEC.",
      });
    }

    const code = Array.isArray(req.query.code)
      ? req.query.code[0]
      : req.query.code;

    const state = Array.isArray(req.query.state)
      ? req.query.state[0]
      : req.query.state;

    const errorOAuth = Array.isArray(req.query.error)
      ? req.query.error[0]
      : req.query.error;

    if (errorOAuth) {
      return res.status(400).json({
        error: "SIITEC rechazó la autenticación.",
        detalle: errorOAuth,
      });
    }

    if (!code) {
      return res.status(400).json({
        error: "SIITEC no devolvió el código de autorización.",
      });
    }

    const stateGuardado = obtenerCookie(req, "sitec_oauth_state");

    if (!state || !stateGuardado || state !== stateGuardado) {
      return res.status(400).json({
        error: "El estado de autenticación no es válido.",
      });
    }

    const appUrl =
  process.env.APP_URL;

if (!appUrl) {
  return res.status(500).json({
    error:
      "APP_URL no está configurada.",
  });
}

const redirectUri =
  `${appUrl}/api/sitec/callback`;
    const credenciales = Buffer.from(
      `${SIITEC_CLIENT_ID}:${SIITEC_CLIENT_SECRET}`,
    ).toString("base64");

    /*
     * 1. TOKEN DEL USUARIO
     * Authorization Code
     */
    const bodyUsuario = new URLSearchParams({
      grant_type: "authorization_code",
      code,
      redirect_uri: redirectUri,
    });

    const respuestaTokenUsuario = await fetch(SIITEC_TOKEN_ENDPOINT, {
      method: "POST",

      headers: {
        Authorization: `Basic ${credenciales}`,

        "Content-Type": "application/x-www-form-urlencoded",
      },

      body: bodyUsuario.toString(),
    });

    const datosTokenUsuario = await obtenerJsonSeguro(respuestaTokenUsuario);

    if (
  !respuestaTokenUsuario.ok ||
  !datosTokenUsuario.access_token
) {
  console.error(
    "Error token usuario SIITEC:",
    {
      status: respuestaTokenUsuario.status,
      respuesta: datosTokenUsuario,
      redirectUri,
    }
  );

  return res.status(401).json({
    error:
      "No se pudo obtener el token del usuario.",
    status:
      respuestaTokenUsuario.status,
    detalle:
      datosTokenUsuario.error ??
      datosTokenUsuario.error_description ??
      datosTokenUsuario.respuestaTexto ??
      "Sin detalle",
    redirectUri,
  });
}

    /*
     * 2. USERINFO
     */
    const respuestaUserinfo = await fetch(SIITEC_USERINFO_ENDPOINT, {
      headers: {
        Authorization: `Bearer ${datosTokenUsuario.access_token}`,
      },
    });

    const userinfo = await obtenerJsonSeguro(respuestaUserinfo);

    if (!respuestaUserinfo.ok) {
      console.error("Error userinfo SIITEC:", userinfo);

      return res.status(401).json({
        error: "No se pudo obtener la información del usuario.",
      });
    }

    if (!userinfo.sub || !userinfo.preferred_username) {
      return res.status(400).json({
        error: "SIITEC no devolvió los datos necesarios del usuario.",
      });
    }

    /*
     * 3. TOKEN DE NUESTRA APLICACIÓN
     * Client Credentials
     *
     * Este token se usa para consultar
     * /app/usuarios.
     */
    const bodyAplicacion = new URLSearchParams({
      grant_type: "client_credentials",
    });

    const respuestaTokenAplicacion = await fetch(SIITEC_TOKEN_ENDPOINT, {
      method: "POST",

      headers: {
        Authorization: `Basic ${credenciales}`,

        "Content-Type": "application/x-www-form-urlencoded",
      },

      body: bodyAplicacion.toString(),
    });

    const datosTokenAplicacion = await obtenerJsonSeguro(
      respuestaTokenAplicacion,
    );

    if (!respuestaTokenAplicacion.ok || !datosTokenAplicacion.access_token) {
      console.error("Error token aplicación SIITEC:", datosTokenAplicacion);

      return res.status(401).json({
        error: "No se pudo autorizar la aplicación con SIITEC.",
      });
    }
    /*
     * 4. CONSULTAR PERFIL COMPLETO
     */

    async function buscarUsuarios(parametros) {
      const respuesta = await fetch(
        `${SIITEC_USUARIOS_ENDPOINT}?${parametros.toString()}`,
        {
          headers: {
            Authorization: `Bearer ${datosTokenAplicacion.access_token}`,
          },
        },
      );

      const datos = await obtenerJsonSeguro(respuesta);

      if (!respuesta.ok) {
        console.error("Error consultando SIITEC:", datos);

        return [];
      }

      return Array.isArray(datos) ? datos : [];
    }

    /*
     * Primer intento:
     * preferred_username
     *
     * En alumnos suele ser el número de control.
     * En maestros puede ser algo como demo.cdc.
     */
    let perfiles = await buscarUsuarios(
      new URLSearchParams({
        q: userinfo.preferred_username,
        activo: "1",
      }),
    );

    /*
     * Segundo intento:
     * nombre del usuario.
     *
     * Algunos empleados no aparecen
     * buscando por usuario institucional.
     */
    if (
      !perfiles.some(
        (usuario) => String(usuario.usuario_id) === String(userinfo.sub),
      )
    ) {
      perfiles = await buscarUsuarios(
        new URLSearchParams({
          q: userinfo.given_name,
          activo: "1",
        }),
      );
    }

    /*
     * Tercer intento:
     * nombre completo.
     */
    if (
      !perfiles.some(
        (usuario) => String(usuario.usuario_id) === String(userinfo.sub),
      )
    ) {
      const nombreCompletoBusqueda = [userinfo.given_name, userinfo.family_name]
        .filter(Boolean)
        .join(" ")
        .trim();

      perfiles = await buscarUsuarios(
        new URLSearchParams({
          nombre: nombreCompletoBusqueda,
          activo: "1",
        }),
      );
    }

    /*
     * 5. Encontrar exactamente al usuario
     */
    const perfil =
      perfiles.find(
        (usuario) => String(usuario.usuario_id) === String(userinfo.sub),
      ) ?? null;

    if (!perfil) {
      return res.status(404).json({
        error:
          "El usuario inició sesión, pero no se encontró su perfil activo en SIITEC.",
      });
    }

    /*
     * 6. Normalizar información
     */
    const nombreCompleto = [perfil.nombres, perfil.apellido1, perfil.apellido2]
      .filter(Boolean)
      .join(" ")
      .trim();

    const usuarioNormalizado = {
      sitecUsuarioId: String(perfil.usuario_id),

      tipoUsuario: perfil.tipo_usuario,

      perfil: perfil.perfil,

      nombreCompleto,

      genero: userinfo.gender ?? null,

      usuarioSitec: perfil.usuario ?? null,

      numeroEstudiante:
        perfil.tipo_usuario === "alumno" ? userinfo.preferred_username : null,

      sitecAlumnoId: perfil.alumno_id ?? null,

      carrera: perfil.carrera ?? null,

      sitecCarreraId: perfil.carrera_id ?? null,

      sitecEmpleadoId: perfil.empleado_id ?? null,

      departamento:
        perfil.departamento_academico ?? perfil.departamento ?? null,
    };

    /*
 * 7. GUARDAR USUARIO EN SUPABASE
 */

let usuarioSistema = null;

/*
 * ESTUDIANTE
 */
if (
  usuarioNormalizado.tipoUsuario ===
  "alumno"
) {
  if (
    !usuarioNormalizado.numeroEstudiante
  ) {
    return res.status(400).json({
      error:
        "No se pudo identificar el número de estudiante.",
    });
  }

  const {
    data: estudianteExistente,
    error: errorBusquedaEstudiante,
  } = await supabaseAdmin
    .from("estudiantes")
    .select(`
      id,
      sitec_usuario_id,
      numero_estudiante
    `)
    .eq(
      "sitec_usuario_id",
      usuarioNormalizado.sitecUsuarioId
    )
    .maybeSingle();

  if (errorBusquedaEstudiante) {
    console.error(
      "Error buscando estudiante:",
      errorBusquedaEstudiante
    );

    return res.status(500).json({
      error:
        "No se pudo consultar al estudiante en el sistema.",
    });
  }

  /*
   * Si ya existe, actualizamos sus
   * identificadores básicos.
   */
  if (estudianteExistente) {
    const {
      data: estudianteActualizado,
      error: errorActualizacion,
    } = await supabaseAdmin
      .from("estudiantes")
      .update({
        numero_estudiante:
          usuarioNormalizado.numeroEstudiante,

        actualizado_en:
          new Date().toISOString(),
      })
      .eq(
        "id",
        estudianteExistente.id
      )
      .select(`
        id,
        sitec_usuario_id,
        numero_estudiante
      `)
      .single();

    if (errorActualizacion) {
      console.error(
        "Error actualizando estudiante:",
        errorActualizacion
      );

      return res.status(500).json({
        error:
          "No se pudo actualizar al estudiante.",
      });
    }

    usuarioSistema = {
      id: estudianteActualizado.id,
      tipo: "estudiante",
    };
  }

  /*
   * Si no existe, lo creamos.
   */
  else {
    const {
      data: estudianteNuevo,
      error: errorCreacion,
    } = await supabaseAdmin
      .from("estudiantes")
      .insert({
        sitec_usuario_id:
          usuarioNormalizado.sitecUsuarioId,

        numero_estudiante:
          usuarioNormalizado.numeroEstudiante,
      })
      .select(`
        id,
        sitec_usuario_id,
        numero_estudiante
      `)
      .single();

    if (errorCreacion) {
      console.error(
        "Error creando estudiante:",
        errorCreacion
      );

      return res.status(500).json({
        error:
          "No se pudo registrar al estudiante en el sistema.",
      });
    }

    usuarioSistema = {
      id: estudianteNuevo.id,
      tipo: "estudiante",
    };
  }
}

/*
 * MAESTRO / EMPLEADO
 */
else if (
  usuarioNormalizado.tipoUsuario ===
  "empleado"
) {
  if (
    !usuarioNormalizado.sitecEmpleadoId ||
    !usuarioNormalizado.usuarioSitec
  ) {
    return res.status(400).json({
      error:
        "No se pudo identificar correctamente al maestro.",
    });
  }

  const {
    data: maestroExistente,
    error: errorBusquedaMaestro,
  } = await supabaseAdmin
    .from("maestros")
    .select(`
      id,
      rol_sistema
    `)
    .eq(
      "sitec_usuario_id",
      usuarioNormalizado.sitecUsuarioId
    )
    .maybeSingle();

  if (errorBusquedaMaestro) {
    console.error(
      "Error buscando maestro:",
      errorBusquedaMaestro
    );

    return res.status(500).json({
      error:
        "No se pudo consultar al maestro en el sistema.",
    });
  }

  /*
   * Si ya existe, actualizamos sus datos,
   * pero NO modificamos rol_sistema.
   */
  if (maestroExistente) {
    const {
      data: maestroActualizado,
      error: errorActualizacion,
    } = await supabaseAdmin
      .from("maestros")
      .update({
        sitec_empleado_id:
          usuarioNormalizado.sitecEmpleadoId,

        usuario_sitec:
          usuarioNormalizado.usuarioSitec,

        activo: true,

        actualizado_en:
          new Date().toISOString(),
      })
      .eq(
        "id",
        maestroExistente.id
      )
      .select(`
        id,
        rol_sistema
      `)
      .single();

    if (errorActualizacion) {
      console.error(
        "Error actualizando maestro:",
        errorActualizacion
      );

      return res.status(500).json({
        error:
          "No se pudo actualizar al maestro.",
      });
    }

    usuarioSistema = {
      id: maestroActualizado.id,
      tipo: "maestro",
      rol:
        maestroActualizado.rol_sistema,
    };
  }

  /*
   * Si es la primera vez que entra,
   * se crea como maestro normal.
   */
  else {
    const {
      data: maestroNuevo,
      error: errorCreacion,
    } = await supabaseAdmin
      .from("maestros")
      .insert({
        sitec_usuario_id:
          usuarioNormalizado.sitecUsuarioId,

        sitec_empleado_id:
          usuarioNormalizado.sitecEmpleadoId,

        usuario_sitec:
          usuarioNormalizado.usuarioSitec,

        rol_sistema: "maestro",

        activo: true,
      })
      .select(`
        id,
        rol_sistema
      `)
      .single();

    if (errorCreacion) {
      console.error(
        "Error creando maestro:",
        errorCreacion
      );

      return res.status(500).json({
        error:
          "No se pudo registrar al maestro en el sistema.",
      });
    }

    usuarioSistema = {
      id: maestroNuevo.id,
      tipo: "maestro",
      rol:
        maestroNuevo.rol_sistema,
    };
  }
}

/*
 * TIPO DE USUARIO NO PERMITIDO
 */
else {
  return res.status(403).json({
    error:
      "Este tipo de usuario de SITEc no tiene acceso al sistema.",
  });
}

/*
 * 8. VERIFICAR QUE EL USUARIO
 * FUE REGISTRADO CORRECTAMENTE
 */

if (!usuarioSistema) {
  console.error(
    "usuarioSistema quedó vacío:",
    usuarioNormalizado.tipoUsuario
  );

  return res.status(500).json({
    error:
      "No se pudo crear la sesión del usuario.",
  });
}

/*
 * 9. CREAR SESIÓN DE NUESTRA APP
 */

const tokenSesion = crearSesion({
  id: usuarioSistema.id,
  tipo: usuarioSistema.tipo,
});

/*
 * En producción la cookie usará Secure.
 * En localhost no, para permitir HTTP.
 */
const secure =
  process.env.NODE_ENV === "production"
    ? "; Secure"
    : "";

const cookieSesion =
  `eventos_session=${tokenSesion}; HttpOnly; Path=/; Max-Age=28800; SameSite=Lax${secure}`;

const borrarState =
  `sitec_oauth_state=; HttpOnly; Path=/; Max-Age=0; SameSite=Lax${secure}`;

/*
 * Eliminamos el state de OAuth
 * y guardamos nuestra sesión.
 */
res.setHeader(
  "Set-Cookie",
  [
    borrarState,
    cookieSesion,
  ]
);

/*
 * 10. REDIRECCIÓN SEGÚN TIPO DE USUARIO
 */
const destino =
  usuarioSistema.tipo === "maestro"
    ? "/admin"
    : "/";

return res.redirect(302, destino);

} catch (error) {
  console.error(
    "Error callback SITEc:",
    error
  );

  return res.status(500).json({
    error:
      "Ocurrió un error durante el inicio de sesión.",
  });
}
}
