import {
  useEffect,
  useState,
} from "react";

interface BeforeInstallPromptEvent
  extends Event {
  prompt: () => Promise<void>;

  userChoice: Promise<{
    outcome:
      | "accepted"
      | "dismissed";
    platform: string;
  }>;
}

function comprobarSiEstaInstalada() {
  const modoStandalone =
    window.matchMedia(
      "(display-mode: standalone)"
    ).matches;

  const navegadorIOS =
    window.navigator as Navigator & {
      standalone?: boolean;
    };

  return (
    modoStandalone ||
    navegadorIOS.standalone === true
  );
}

export default function InstalarPWA() {
  const [
    eventoInstalacion,
    setEventoInstalacion,
  ] =
    useState<BeforeInstallPromptEvent | null>(
      null
    );

  const [
    instalada,
    setInstalada,
  ] = useState(
    comprobarSiEstaInstalada
  );

  const [
    mensaje,
    setMensaje,
  ] = useState("");

  useEffect(() => {
    function manejarPrompt(
      event: Event
    ) {
      event.preventDefault();

      setEventoInstalacion(
        event as BeforeInstallPromptEvent
      );
    }

    function manejarInstalacion() {
      setInstalada(true);
      setEventoInstalacion(null);
    }

    window.addEventListener(
      "beforeinstallprompt",
      manejarPrompt
    );

    window.addEventListener(
      "appinstalled",
      manejarInstalacion
    );

    return () => {
      window.removeEventListener(
        "beforeinstallprompt",
        manejarPrompt
      );

      window.removeEventListener(
        "appinstalled",
        manejarInstalacion
      );
    };
  }, []);

  async function instalar() {
    setMensaje("");

    /*
     * Chrome / Android / Edge
     */
    if (eventoInstalacion) {
      await eventoInstalacion.prompt();

      const resultado =
        await eventoInstalacion.userChoice;

      if (
        resultado.outcome ===
        "accepted"
      ) {
        setInstalada(true);
      }

      setEventoInstalacion(null);

      return;
    }

    /*
     * iPhone / iPad
     */
    const esIOS =
      /iphone|ipad|ipod/i.test(
        navigator.userAgent
      );

    if (esIOS) {
      setMensaje(
        "En iPhone toca Compartir y después “Agregar a pantalla de inicio”."
      );

      return;
    }

    /*
     * Otros navegadores
     */
    setMensaje(
      "Puedes instalar la app desde el menú de tu navegador seleccionando “Instalar aplicación”."
    );
  }

  /*
   * Si ya está instalada,
   * no mostramos el botón.
   */
  if (instalada) {
    return null;
  }

  return (
    <div className="relative">

      <button
        type="button"
        onClick={instalar}
        className="
          flex
          items-center
          gap-2
          rounded-xl
          border
          border-blue-200
          bg-blue-50
          px-4
          py-2.5
          text-sm
          font-semibold
          text-blue-700
          transition
          hover:border-blue-300
          hover:bg-blue-100
          active:scale-[0.98]
        "
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          className="h-5 w-5"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M12 3v12m0 0 4-4m-4 4-4-4M5 19h14"
          />
        </svg>

        Instalar app
      </button>

      {mensaje && (
        <div
          className="
            absolute
            right-0
            top-full
            z-50
            mt-2
            w-72
            rounded-xl
            border
            border-slate-200
            bg-white
            p-3
            text-left
            text-xs
            font-normal
            leading-5
            text-slate-600
            shadow-lg
          "
        >
          {mensaje}
        </div>
      )}

    </div>
  );
}