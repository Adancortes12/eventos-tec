import {
  useEffect,
  useState,
} from "react";

import {
  useNavigate,
} from "react-router";

import {
  iniciarSesionSitec,
  obtenerSesion,
} from "../../lib/sesion";

export default function Login() {
  const navigate =
    useNavigate();

  const [
    cargando,
    setCargando,
  ] = useState(true);

  const [
    redirigiendo,
    setRedirigiendo,
  ] = useState(false);

  const [
    error,
    setError,
  ] = useState("");

  /*
   * Si ya existe una sesión válida,
   * no mostramos nuevamente el login.
   */
  useEffect(() => {
    async function comprobarSesion() {
      try {
        const sesion =
          await obtenerSesion();

        if (
          sesion?.tipo === "maestro"
        ) {
          navigate(
            "/admin",
            {
              replace: true,
            }
          );

          return;
        }

        if (
          sesion?.tipo ===
          "estudiante"
        ) {
          navigate(
            "/",
            {
              replace: true,
            }
          );

          return;
        }
      } catch (error) {
        console.error(
          "Error comprobando sesión:",
          error
        );
      } finally {
        setCargando(false);
      }
    }

    comprobarSesion();
  }, [navigate]);

  function iniciarSesion() {
    try {
      setError("");
      setRedirigiendo(true);

      /*
       * SITEc realizará la
       * autenticación.
       *
       * El backend recibirá el
       * callback, comprobará el
       * usuario y creará nuestra
       * cookie de sesión.
       */
      iniciarSesionSitec();
    } catch (error) {
      console.error(
        "Error iniciando sesión con SITEc:",
        error
      );

      setError(
        "No se pudo iniciar sesión con SITEc."
      );

      setRedirigiendo(false);
    }
  }

  if (cargando) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#F5F5F5] px-4">

        <div className="text-center">

          <div className="mx-auto h-8 w-8 animate-spin rounded-full border-4 border-slate-200 border-t-[#1B396A]" />

          <p className="mt-4 text-sm text-gray-600">
            Comprobando sesión...
          </p>

        </div>

      </main>
    );
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#F5F5F5] px-4">

      <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow">

        <div className="text-center">

          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[#1B396A] text-xl font-bold text-white">
            EA
          </div>

          <h1 className="mt-5 text-3xl font-bold text-slate-900">
            Administración
          </h1>

          <p className="mt-2 text-gray-600">
            Sistema de eventos estudiantiles
          </p>

        </div>

        <div className="mt-8">

          <div className="rounded-xl bg-slate-50 p-4">

            <p className="text-center text-sm leading-6 text-gray-600">
              Inicia sesión con tu cuenta institucional de SITEc para acceder al sistema.
            </p>

          </div>

          {error && (
            <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-4">

              <p className="text-center text-sm text-red-600">
                {error}
              </p>

            </div>
          )}

          <button
            type="button"
            onClick={
              iniciarSesion
            }
            disabled={
              redirigiendo
            }
            className="mt-5 w-full rounded-xl bg-[#1B396A] px-4 py-3.5 font-semibold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {redirigiendo
              ? "Redirigiendo a SITEc..."
              : "Iniciar sesión con SITEc"}
          </button>

          <p className="mt-4 text-center text-xs leading-5 text-slate-400">
            El acceso al panel depende de los permisos asignados a tu cuenta.
          </p>

        </div>

      </div>

    </main>
  );
}