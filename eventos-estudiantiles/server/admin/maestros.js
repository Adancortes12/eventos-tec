import { supabaseAdmin } from "../lib/supabaseAdmin.js";

import {
  obtenerCookie,
  verificarSesion,
} from "../lib/session.js";

async function verificarSuperadmin(req) {
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
    return {
      permitido: false,
      status: 401,
      error:
        "Debes iniciar sesión como maestro.",
    };
  }

  const {
    data: maestro,
    error,
  } = await supabaseAdmin
    .from("maestros")
    .select(`
      id,
      rol_sistema,
      activo
    `)
    .eq("id", sesion.id)
    .maybeSingle();

  if (error) {
    console.error(
      "Error verificando superadmin:",
      error
    );

    return {
      permitido: false,
      status: 500,
      error:
        "No se pudo verificar el usuario.",
    };
  }

  if (
    !maestro ||
    !maestro.activo
  ) {
    return {
      permitido: false,
      status: 403,
      error:
        "Tu cuenta no tiene acceso activo.",
    };
  }

  if (
    maestro.rol_sistema !==
    "superadmin"
  ) {
    return {
      permitido: false,
      status: 403,
      error:
        "No tienes permisos de superadministrador.",
    };
  }

  return {
    permitido: true,
    maestro,
  };
}

export default async function handler(
  req,
  res
) {
  try {
    const acceso =
      await verificarSuperadmin(
        req
      );

    if (!acceso.permitido) {
      return res
        .status(acceso.status)
        .json({
          error: acceso.error,
        });
    }

    /*
     * LISTAR MAESTROS
     */
    if (req.method === "GET") {
      const {
        data,
        error,
      } = await supabaseAdmin
        .from("maestros")
        .select(`
          id,
          sitec_usuario_id,
          sitec_empleado_id,
          usuario_sitec,
          rol_sistema,
          activo,
          creado_en,
          actualizado_en
        `)
        .order("creado_en", {
          ascending: false,
        });

      if (error) {
        console.error(
          "Error listando maestros:",
          error
        );

        return res.status(500).json({
          error:
            "No se pudieron cargar los maestros.",
        });
      }

      return res.status(200).json({
        maestros: data ?? [],
      });
    }

    /*
     * CAMBIAR ROL
     */
    if (req.method === "PATCH") {
      const {
        maestroId,
        rol,
      } = req.body ?? {};

      if (
        typeof maestroId !==
          "string" ||
        !maestroId
      ) {
        return res.status(400).json({
          error:
            "No se recibió un maestro válido.",
        });
      }

      if (
        rol !== "maestro" &&
        rol !== "admin"
      ) {
        return res.status(400).json({
          error:
            "El rol solicitado no es válido.",
        });
      }

      const {
        data: objetivo,
        error: errorObjetivo,
      } = await supabaseAdmin
        .from("maestros")
        .select(`
          id,
          usuario_sitec,
          rol_sistema,
          activo
        `)
        .eq("id", maestroId)
        .maybeSingle();

      if (errorObjetivo) {
        console.error(
          "Error consultando maestro:",
          errorObjetivo
        );

        return res.status(500).json({
          error:
            "No se pudo consultar el maestro.",
        });
      }

      if (!objetivo) {
        return res.status(404).json({
          error:
            "El maestro no existe.",
        });
      }

      /*
       * Los superadmin solamente
       * se administran manualmente
       * desde la base de datos.
       */
      if (
        objetivo.rol_sistema ===
        "superadmin"
      ) {
        return res.status(403).json({
          error:
            "No se puede modificar un superadministrador desde el panel.",
        });
      }

      const {
        data: actualizado,
        error: errorActualizar,
      } = await supabaseAdmin
        .from("maestros")
        .update({
          rol_sistema: rol,
          actualizado_en:
            new Date().toISOString(),
        })
        .eq("id", maestroId)
        .select(`
          id,
          usuario_sitec,
          rol_sistema,
          activo
        `)
        .single();

      if (errorActualizar) {
        console.error(
          "Error actualizando rol:",
          errorActualizar
        );

        return res.status(500).json({
          error:
            "No se pudo actualizar el rol.",
        });
      }

      return res.status(200).json({
        actualizado: true,
        maestro: actualizado,
      });
    }

    return res.status(405).json({
      error: "Método no permitido.",
    });
  } catch (error) {
    console.error(
      "Error administrando maestros:",
      error
    );

    return res.status(500).json({
      error:
        "Ocurrió un error en la administración de maestros.",
    });
  }
}