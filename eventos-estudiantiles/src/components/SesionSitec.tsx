import {
  useEffect,
  useState,
} from "react";

import {
  cerrarSesionSitec,
  iniciarSesionSitec,
  obtenerSesion,
  type UsuarioSesion,
} from "../lib/sesion";

import InstalarPWA from "./InstalarPWA";

export default function SesionSitec() {
  const [
    usuario,
    setUsuario,
  ] =
    useState<UsuarioSesion | null>(
      null
    );

  const [
    cargando,
    setCargando,
  ] = useState(true);

  useEffect(() => {
    async function cargarSesion() {
      const sesion =
        await obtenerSesion();

      setUsuario(sesion);
      setCargando(false);
    }

    cargarSesion();
  }, []);

  /*
   * CARGANDO SESIÓN
   */
  if (cargando) {
    return (
      <div className="text-sm text-slate-500">
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
        onClick={
          iniciarSesionSitec
        }
        className="
          rounded-xl
          bg-blue-600
          px-5
          py-2.5
          text-sm
          font-semibold
          text-white
          transition
          hover:bg-blue-700
          active:scale-[0.98]
        "
      >
        Iniciar sesión con SITEc
      </button>
    );
  }

  /*
   * ESTUDIANTE
   */
  if (
    usuario.tipo ===
    "estudiante"
  ) {
    return (
      <div
        className="
          flex
          flex-wrap
          items-center
          justify-end
          gap-3
        "
      >
        {/*
         * BOTÓN PARA INSTALAR PWA
         */}
        <InstalarPWA />

        {/*
         * DATOS DEL ESTUDIANTE
         */}
        <div className="hidden text-right sm:block">
          <p className="text-sm font-semibold text-slate-800">
            Estudiante
          </p>

          <p className="text-xs text-slate-500">
            {
              usuario.numeroEstudiante
            }
          </p>
        </div>

        {/*
         * CERRAR SESIÓN
         */}
        <button
          type="button"
          onClick={
            cerrarSesionSitec
          }
          className="
            rounded-xl
            border
            border-slate-300
            bg-white
            px-4
            py-2.5
            text-sm
            font-medium
            text-slate-700
            transition
            hover:bg-slate-100
            active:scale-[0.98]
          "
        >
          Cerrar sesión
        </button>
      </div>
    );
  }

  /*
   * MAESTRO / ADMIN /
   * SUPERADMIN
   */
  const nombreRol =
    usuario.rol ===
    "superadmin"
      ? "Superadministrador"
      : usuario.rol ===
          "admin"
        ? "Administrador"
        : "Maestro";

  return (
    <div
      className="
        flex
        flex-wrap
        items-center
        justify-end
        gap-3
      "
    >
      <div className="hidden text-right sm:block">
        <p className="text-sm font-semibold text-slate-800">
          {nombreRol}
        </p>

        <p className="text-xs text-slate-500">
          {
            usuario.usuarioSitec
          }
        </p>
      </div>

      <button
        type="button"
        onClick={
          cerrarSesionSitec
        }
        className="
          rounded-xl
          border
          border-slate-300
          bg-white
          px-4
          py-2.5
          text-sm
          font-medium
          text-slate-700
          transition
          hover:bg-slate-100
          active:scale-[0.98]
        "
      >
        Cerrar sesión
      </button>
    </div>
  );
}