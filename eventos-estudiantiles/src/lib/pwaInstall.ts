export interface BeforeInstallPromptEvent
  extends Event {
  prompt: () => Promise<void>;

  userChoice: Promise<{
    outcome:
      | "accepted"
      | "dismissed";
    platform: string;
  }>;
}

let eventoInstalacion:
  BeforeInstallPromptEvent | null =
  null;

const listeners =
  new Set<() => void>();

function notificar() {
  listeners.forEach(
    (listener) => listener()
  );
}

/*
 * Este archivo debe importarse
 * desde main.tsx para escuchar
 * el evento desde que inicia la app.
 */
if (typeof window !== "undefined") {
  window.addEventListener(
    "beforeinstallprompt",
    (event) => {
      event.preventDefault();

      eventoInstalacion =
        event as BeforeInstallPromptEvent;

      notificar();
    }
  );

  window.addEventListener(
    "appinstalled",
    () => {
      eventoInstalacion = null;
      notificar();
    }
  );
}

export function obtenerEventoInstalacion() {
  return eventoInstalacion;
}

export function limpiarEventoInstalacion() {
  eventoInstalacion = null;
  notificar();
}

export function suscribirseInstalacion(
  listener: () => void
) {
  listeners.add(listener);

  return () => {
    listeners.delete(listener);
  };
}