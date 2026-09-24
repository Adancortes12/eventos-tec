import { useEffect, useState } from "react";

import {
  cerrarSesionSitec,
  iniciarSesionSitec,
  obtenerSesion,
  type UsuarioSesion,
} from "../lib/sesion";

export default function SesionSitec() {
  const [usuario, setUsuario] =
    useState<UsuarioSesion | null>(null);

  const [cargando, setCargando] =
    useState(true);

  useEffect(() => {
    async function cargarSesion() {
      const sesion =
        await obtenerSesion();

      setUsuario(sesion);
      setCargando(false);
    }

    cargarSesion();
  }, []);

  if (cargando) {
    return (
      <div className="text-sm text-white/70">
        Verificando sesión...
      </div>
    );
  }

  /*
   * SIN SESIÓN
   */
  if (!usuario) {
    return (
      <button
        type="button"
        onClick={iniciarSesionSitec}
        className="
          rounded-xl
          bg-white
          px-5
          py-2.5
          font-semibold
          text-[#1B396A]
          transition
          hover:bg-white/90
        "
      >
        Iniciar sesión con SITEc
      </button>
    );
  }

  /*
   * ESTUDIANTE
   */
  if (usuario.tipo === "estudiante") {
    return (
      <div className="flex items-center gap-4">
        <div className="text-right">
          <p className="font-semibold text-white">
            Estudiante
          </p>

          <p className="text-sm text-white/70">
            {usuario.numeroEstudiante}
          </p>
        </div>

        <button
          type="button"
          onClick={cerrarSesionSitec}
          className="
            rounded-xl
            border
            border-white/60
            px-4
            py-2
            text-sm
            font-medium
            text-white
            transition
            hover:bg-white/10
          "
        >
          Cerrar sesión
        </button>
      </div>
    );
  }

  /*
   * MAESTRO
   */
  const nombreRol =
    usuario.rol === "superadmin"
      ? "Superadministrador"
      : usuario.rol === "admin"
        ? "Administrador"
        : "Maestro";

  return (
    <div className="flex items-center gap-4">
      <div className="text-right">
        <p className="font-semibold text-white">
          {nombreRol}
        </p>

        <p className="text-sm text-white/70">
          {usuario.usuarioSitec}
        </p>
      </div>

      <button
        type="button"
        onClick={cerrarSesionSitec}
        className="
          rounded-xl
          border
          border-white/60
          px-4
          py-2
          text-sm
          font-medium
          text-white
          transition
          hover:bg-white/10
        "
      >
        Cerrar sesión
      </button>
    </div>
  );
}