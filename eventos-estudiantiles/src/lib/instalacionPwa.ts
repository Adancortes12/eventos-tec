interface EventoInstalacionPwa extends Event {
  prompt: () => Promise<void>;

  userChoice: Promise<{
    outcome: "accepted" | "dismissed";
    platform: string;
  }>;
}

let eventoInstalacion:
  | EventoInstalacionPwa
  | null = null;

const EVENTO_DISPONIBLE =
  "pwa-instalacion-disponible";

const EVENTO_INSTALADA =
  "pwa-instalada";

if (typeof window !== "undefined") {
  window.addEventListener(
    "beforeinstallprompt",
    (evento) => {
      evento.preventDefault();

      eventoInstalacion =
        evento as EventoInstalacionPwa;

      window.dispatchEvent(
        new Event(EVENTO_DISPONIBLE)
      );
    }
  );

  window.addEventListener(
    "appinstalled",
    () => {
      eventoInstalacion = null;

      window.dispatchEvent(
        new Event(EVENTO_INSTALADA)
      );
    }
  );
}

export function puedeInstalarPwa() {
  return eventoInstalacion !== null;
}

export function pwaEstaInstalada() {
  return (
    window.matchMedia(
      "(display-mode: standalone)"
    ).matches ||
    (
      window.navigator as Navigator & {
        standalone?: boolean;
      }
    ).standalone === true
  );
}

export async function instalarPwa() {
  if (!eventoInstalacion) {
    return false;
  }

  await eventoInstalacion.prompt();

  const resultado =
    await eventoInstalacion.userChoice;

  eventoInstalacion = null;

  return (
    resultado.outcome === "accepted"
  );
}

export function escucharInstalacionDisponible(
  callback: () => void
) {
  window.addEventListener(
    EVENTO_DISPONIBLE,
    callback
  );

  return () => {
    window.removeEventListener(
      EVENTO_DISPONIBLE,
      callback
    );
  };
}

export function escucharPwaInstalada(
  callback: () => void
) {
  window.addEventListener(
    EVENTO_INSTALADA,
    callback
  );

  return () => {
    window.removeEventListener(
      EVENTO_INSTALADA,
      callback
    );
  };
}