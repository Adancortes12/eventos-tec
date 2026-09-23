export type UsuarioSesion =
  | {
      id: string;
      tipo: "estudiante";
      numeroEstudiante: string;
    }
  | {
      id: string;
      tipo: "maestro";
      usuarioSitec: string;
      rol: "maestro" | "admin" | "superadmin";
    };

type RespuestaSesion = {
  autenticado: boolean;
  usuario?: UsuarioSesion;
  error?: string;
};

export async function obtenerSesion(): Promise<UsuarioSesion | null> {
  try {
    const respuesta = await fetch("/api/sitec/me", {
      method: "GET",
      credentials: "include",
    });

    if (respuesta.status === 401) {
      return null;
    }

    if (!respuesta.ok) {
      throw new Error(
        "No se pudo consultar la sesión."
      );
    }

    const datos: RespuestaSesion =
      await respuesta.json();

    if (
      !datos.autenticado ||
      !datos.usuario
    ) {
      return null;
    }

    return datos.usuario;
  } catch (error) {
    console.error(
      "Error obteniendo sesión:",
      error
    );

    return null;
  }
}

export function iniciarSesionSitec() {
  window.location.href =
    "/api/sitec/login";
}

export async function cerrarSesionSitec() {
  try {
    await fetch("/api/sitec/logout", {
      method: "POST",
      credentials: "include",
    });
  } catch (error) {
    console.error(
      "Error cerrando sesión:",
      error
    );
  }

  window.location.href = "/";
}