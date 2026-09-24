import {
  useEffect,
  useState,
  type ReactNode,
} from "react";

import {
  Navigate,
} from "react-router";

import {
  obtenerSesion,
  type UsuarioSesion,
} from "../lib/sesion";

type Props = {
  children: ReactNode;
};

export default function RutaProtegida({
  children,
}: Props) {
  const [
    cargando,
    setCargando,
  ] = useState(true);

  const [
    usuario,
    setUsuario,
  ] =
    useState<UsuarioSesion | null>(
      null
    );

  useEffect(() => {
    async function verificarSesion() {
      const sesion =
        await obtenerSesion();

      setUsuario(sesion);
      setCargando(false);
    }

    verificarSesion();
  }, []);

  /*
   * VERIFICANDO SESIÓN
   */
  if (cargando) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-100">
        <p className="text-sm text-slate-500">
          Verificando sesión...
        </p>
      </main>
    );
  }

  /*
   * SIN SESIÓN
   *
   * Por ahora regresamos al inicio,
   * donde puede iniciar sesión con SITEc.
   */
  if (!usuario) {
    return (
      <Navigate
        to="/"
        replace
      />
    );
  }

  /*
   * ESTUDIANTE
   *
   * Un estudiante nunca debe entrar
   * al panel administrativo.
   */
  if (
    usuario.tipo ===
    "estudiante"
  ) {
    return (
      <Navigate
        to="/"
        replace
      />
    );
  }

  /*
   * MAESTRO
   * ADMIN
   * SUPERADMIN
   *
   * Todos son tipo "maestro".
   * Los permisos específicos los
   * controlaremos después según:
   *
   * maestro
   * admin
   * superadmin
   */
  if (
    usuario.tipo ===
    "maestro"
  ) {
    return children;
  }

  return (
    <Navigate
      to="/"
      replace
    />
  );
}