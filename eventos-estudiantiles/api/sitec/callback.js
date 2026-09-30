import { db } from "../../server/lib/db.js";
import { crearSesion } from "../../server/lib/session.js";

function obtenerCookie(req, nombre) {
  const cookies = req.headers.cookie ?? "";

  const cookie = cookies
    .split(";")
    .map((valor) => valor.trim())
    .find((valor) =>
      valor.startsWith(`${nombre}=`)
    );

  if (!cookie) {
    return null;
  }

  return decodeURIComponent(
    cookie.substring(nombre.length + 1)
  );
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

export default async function handler(
  req,
  res
) {
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
        error:
          "Faltan variables de configuración de SIITEC.",
      });
    }

    const code = Array.isArray(
      req.query.code
    )
      ? req.query.code[0]
      : req.query.code;

    const state = Array.isArray(
      req.query.state
    )
      ? req.query.state[0]
      : req.query.state;

    const errorOAuth = Array.isArray(
      req.query.error
    )
      ? req.query.error[0]
      : req.query.error;

    if (errorOAuth) {
      return res.status(400).json({
        error:
          "SIITEC rechazó la autenticación.",
        detalle: errorOAuth,
      });
    }

    if (!code) {
      return res.status(400).json({
        error:
          "SIITEC no devolvió el código de autorización.",
      });
    }

    /*
     * VALIDAR STATE DE OAUTH
     */
    const stateGuardado =
      obtenerCookie(
        req,
        "sitec_oauth_state"
      );

    if (
      !state ||
      !stateGuardado ||
      state !== stateGuardado
    ) {
      return res.status(400).json({
        error:
          "El estado de autenticación no es válido.",
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

    const credenciales =
      Buffer.from(
        `${SIITEC_CLIENT_ID}:${SIITEC_CLIENT_SECRET}`
      ).toString("base64");

    /*
     * 1. TOKEN DEL USUARIO
     * Authorization Code
     */
    const bodyUsuario =
      new URLSearchParams({
        grant_type:
          "authorization_code",
        code,
        redirect_uri:
          redirectUri,
      });

    const respuestaTokenUsuario =
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

          body:
            bodyUsuario.toString(),
        }
      );

    const datosTokenUsuario =
      await obtenerJsonSeguro(
        respuestaTokenUsuario
      );

    if (
      !respuestaTokenUsuario.ok ||
      !datosTokenUsuario.access_token
    ) {
      console.error(
        "Error token usuario SIITEC:",
        {
          status:
            respuestaTokenUsuario.status,

          respuesta:
            datosTokenUsuario,

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
    const respuestaUserinfo =
      await fetch(
        SIITEC_USERINFO_ENDPOINT,
        {
          headers: {
            Authorization:
              `Bearer ${datosTokenUsuario.access_token}`,
          },
        }
      );

    const userinfo =
      await obtenerJsonSeguro(
        respuestaUserinfo
      );

    if (!respuestaUserinfo.ok) {
      console.error(
        "Error userinfo SIITEC:",
        userinfo
      );

      return res.status(401).json({
        error:
          "No se pudo obtener la información del usuario.",
      });
    }

    if (
      !userinfo.sub ||
      !userinfo.preferred_username
    ) {
      return res.status(400).json({
        error:
          "SIITEC no devolvió los datos necesarios del usuario.",
      });
    }

    /*
     * 3. TOKEN DE NUESTRA APLICACIÓN
     * Client Credentials
     */
    const bodyAplicacion =
      new URLSearchParams({
        grant_type:
          "client_credentials",
      });

    const respuestaTokenAplicacion =
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

          body:
            bodyAplicacion.toString(),
        }
      );

    const datosTokenAplicacion =
      await obtenerJsonSeguro(
        respuestaTokenAplicacion
      );

    if (
      !respuestaTokenAplicacion.ok ||
      !datosTokenAplicacion.access_token
    ) {
      console.error(
        "Error token aplicación SIITEC:",
        datosTokenAplicacion
      );

      return res.status(401).json({
        error:
          "No se pudo autorizar la aplicación con SIITEC.",
      });
    }

    /*
     * 4. CONSULTAR PERFIL COMPLETO
     */
    async function buscarUsuarios(
      parametros
    ) {
      const respuesta =
        await fetch(
          `${SIITEC_USUARIOS_ENDPOINT}?${parametros.toString()}`,
          {
            headers: {
              Authorization:
                `Bearer ${datosTokenAplicacion.access_token}`,
            },
          }
        );

      const datos =
        await obtenerJsonSeguro(
          respuesta
        );

      if (!respuesta.ok) {
        console.error(
          "Error consultando SIITEC:",
          datos
        );

        return [];
      }

      return Array.isArray(datos)
        ? datos
        : [];
    }

    /*
     * Primer intento:
     * usuario institucional.
     */
    let perfiles =
      await buscarUsuarios(
        new URLSearchParams({
          q:
            userinfo.preferred_username,
          activo: "1",
        })
      );

    /*
     * Segundo intento:
     * nombre.
     */
    if (
      !perfiles.some(
        (usuario) =>
          String(
            usuario.usuario_id
          ) ===
          String(userinfo.sub)
      )
    ) {
      perfiles =
        await buscarUsuarios(
          new URLSearchParams({
            q:
              userinfo.given_name,
            activo: "1",
          })
        );
    }

    /*
     * Tercer intento:
     * nombre completo.
     */
    if (
      !perfiles.some(
        (usuario) =>
          String(
            usuario.usuario_id
          ) ===
          String(userinfo.sub)
      )
    ) {
      const nombreCompletoBusqueda = [
        userinfo.given_name,
        userinfo.family_name,
      ]
        .filter(Boolean)
        .join(" ")
        .trim();

      perfiles =
        await buscarUsuarios(
          new URLSearchParams({
            nombre:
              nombreCompletoBusqueda,
            activo: "1",
          })
        );
    }

    /*
     * 5. ENCONTRAR EXACTAMENTE
     * AL USUARIO
     */
    const perfil =
      perfiles.find(
        (usuario) =>
          String(
            usuario.usuario_id
          ) ===
          String(userinfo.sub)
      ) ?? null;

    if (!perfil) {
      return res.status(404).json({
        error:
          "El usuario inició sesión, pero no se encontró su perfil activo en SIITEC.",
      });
    }

    /*
     * 6. NORMALIZAR INFORMACIÓN
     */
    const nombreCompleto = [
      perfil.nombres,
      perfil.apellido1,
      perfil.apellido2,
    ]
      .filter(Boolean)
      .join(" ")
      .trim();

    const usuarioNormalizado = {
      sitecUsuarioId:
        String(perfil.usuario_id),

      tipoUsuario:
        perfil.tipo_usuario,

      perfil:
        perfil.perfil,

      nombreCompleto,

      genero:
        userinfo.gender ?? null,

      usuarioSitec:
        perfil.usuario ?? null,

      numeroEstudiante:
        perfil.tipo_usuario === "alumno"
          ? userinfo.preferred_username
          : null,

      sitecAlumnoId:
        perfil.alumno_id ?? null,

      carrera:
        perfil.carrera ?? null,

      sitecCarreraId:
        perfil.carrera_id ?? null,

      sitecEmpleadoId:
        perfil.empleado_id ?? null,

      departamento:
        perfil.departamento_academico ??
        perfil.departamento ??
        null,
    };

    /*
     * 7. REGISTRAR / ACTUALIZAR
     * USUARIO EN POSTGRESQL
     */
    let usuarioSistema = null;

    /*
     * Primero comprobamos si el usuario
     * ya está autorizado como maestro.
     *
     * Esto también permite autorizar
     * manualmente a un alumno como maestro.
     */
    const resultadoMaestroExistente =
      await db.query(
        `
          SELECT
            id,
            sitec_usuario_id,
            usuario_sitec,
            rol_sistema,
            activo
          FROM maestros
          WHERE sitec_usuario_id = $1
          LIMIT 1
        `,
        [
          usuarioNormalizado
            .sitecUsuarioId,
        ]
      );

    const maestroExistente =
      resultadoMaestroExistente.rows[0];

    /*
     * Si existe como maestro activo,
     * entra directamente al panel.
     */
    if (
      maestroExistente &&
      maestroExistente.activo
    ) {
      usuarioSistema = {
        id:
          maestroExistente.id,

        tipo:
          "maestro",

        rol:
          maestroExistente
            .rol_sistema,

        usuarioSitec:
          maestroExistente
            .usuario_sitec,
      };
    }

    /*
     * SI NO ES MAESTRO:
     * ESTUDIANTE
     */
    else if (
      usuarioNormalizado.tipoUsuario ===
      "alumno"
    ) {
      if (
        !usuarioNormalizado
          .numeroEstudiante
      ) {
        return res.status(400).json({
          error:
            "No se pudo identificar el número de estudiante.",
        });
      }

      /*
       * INSERT + UPDATE
       *
       * Si ya existe el estudiante,
       * actualizamos su número.
       */
      const resultadoEstudiante =
        await db.query(
          `
            INSERT INTO estudiantes (
              sitec_usuario_id,
              numero_estudiante
            )
            VALUES ($1, $2)

            ON CONFLICT (
              sitec_usuario_id
            )
            DO UPDATE SET
              numero_estudiante =
                EXCLUDED.numero_estudiante,

              actualizado_en =
                NOW()

            RETURNING
              id,
              sitec_usuario_id,
              numero_estudiante
          `,
          [
            usuarioNormalizado
              .sitecUsuarioId,

            usuarioNormalizado
              .numeroEstudiante,
          ]
        );

      const estudiante =
        resultadoEstudiante.rows[0];

      usuarioSistema = {
        id:
          estudiante.id,

        tipo:
          "estudiante",
      };
    }

    /*
     * MAESTRO / EMPLEADO
     */
    else if (
      usuarioNormalizado.tipoUsuario ===
      "empleado"
    ) {
      if (
        !usuarioNormalizado
          .sitecEmpleadoId ||
        !usuarioNormalizado
          .usuarioSitec
      ) {
        return res.status(400).json({
          error:
            "No se pudo identificar correctamente al maestro.",
        });
      }

      /*
       * Si no existe:
       * se crea como maestro.
       *
       * Si ya existe:
       * actualizamos sus datos pero
       * CONSERVAMOS rol_sistema.
       */
      const resultadoMaestro =
        await db.query(
          `
            INSERT INTO maestros (
              sitec_usuario_id,
              sitec_empleado_id,
              usuario_sitec,
              rol_sistema,
              activo
            )
            VALUES (
              $1,
              $2,
              $3,
              'maestro',
              TRUE
            )

            ON CONFLICT (
              sitec_usuario_id
            )
            DO UPDATE SET
              sitec_empleado_id =
                EXCLUDED.sitec_empleado_id,

              usuario_sitec =
                EXCLUDED.usuario_sitec,

              activo =
                TRUE,

              actualizado_en =
                NOW()

            RETURNING
              id,
              rol_sistema,
              usuario_sitec,
              activo
          `,
          [
            usuarioNormalizado
              .sitecUsuarioId,

            String(
              usuarioNormalizado
                .sitecEmpleadoId
            ),

            usuarioNormalizado
              .usuarioSitec,
          ]
        );

      const maestro =
        resultadoMaestro.rows[0];

      usuarioSistema = {
        id:
          maestro.id,

        tipo:
          "maestro",

        rol:
          maestro.rol_sistema,
      };
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
     * 8. VERIFICAR RESULTADO
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
     * 9. CREAR SESIÓN
     */
    const tokenSesion =
      crearSesion({
        id:
          usuarioSistema.id,

        tipo:
          usuarioSistema.tipo,
      });

    /*
     * En localhost usamos HTTP.
     * En el servidor final tendremos HTTPS.
     */
    const secure =
      appUrl.startsWith("https://")
        ? "; Secure"
        : "";

    const cookieSesion =
      `eventos_session=${tokenSesion}; HttpOnly; Path=/; Max-Age=28800; SameSite=Lax${secure}`;

    const borrarState =
      `sitec_oauth_state=; HttpOnly; Path=/; Max-Age=0; SameSite=Lax${secure}`;

    res.setHeader(
      "Set-Cookie",
      [
        borrarState,
        cookieSesion,
      ]
    );

    /*
     * 10. REDIRECCIÓN
     */
    const destino =
      usuarioSistema.tipo ===
      "maestro"
        ? "/admin"
        : "/";

    return res.redirect(
      302,
      destino
    );
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