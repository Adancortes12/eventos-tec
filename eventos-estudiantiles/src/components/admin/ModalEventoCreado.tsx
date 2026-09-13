import { useRef, useState } from "react";
import { QRCodeCanvas } from "qrcode.react";
import type { EventoCreado } from "./ModalNuevoEvento";

type Props = {
  evento: EventoCreado;
  cerrar: () => void;
  verEvento: () => void;
};

export default function ModalEventoCreado({
  evento,
  cerrar,
  verEvento,
}: Props) {
  const qrRef = useRef<HTMLDivElement>(null);
  const [mensaje, setMensaje] = useState("");

  const urlRegistro =
    `${window.location.origin}/evento/${evento.codigo_evento}`;

  const copiarEnlace = async () => {
    try {
      await navigator.clipboard.writeText(urlRegistro);

      setMensaje("Enlace copiado correctamente.");
    } catch (error) {
      console.error(error);
      setMensaje("No se pudo copiar el enlace.");
    }
  };

  const compartirEvento = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: evento.nombre,
          text: `Regístrate al evento ${evento.nombre}`,
          url: urlRegistro,
        });
      } catch (error) {
        console.error(error);
      }

      return;
    }

    await copiarEnlace();

    setMensaje(
      "Tu dispositivo no permite compartir directamente. El enlace fue copiado."
    );
  };

  const guardarQr = () => {
    const canvas = qrRef.current?.querySelector("canvas");

    if (!canvas) {
      setMensaje("No se pudo guardar el código QR.");
      return;
    }

    const imagen = canvas.toDataURL("image/png");

    const enlace = document.createElement("a");

    enlace.href = imagen;
    enlace.download = `QR-${evento.codigo_evento}.png`;

    enlace.click();
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4">
      <div className="max-h-[95vh] w-full max-w-xl overflow-y-auto rounded-2xl bg-white shadow-xl">
        <div className="flex items-start justify-between border-b border-gray-200 p-5 sm:p-6">
          <div>
            <p className="text-sm font-semibold text-green-600">
              Evento creado correctamente
            </p>

            <h2 className="mt-1 text-2xl font-bold text-gray-900">
              {evento.nombre}
            </h2>

            <p className="mt-1 text-sm text-gray-500">
              {evento.codigo_evento}
            </p>
          </div>

          <button
            type="button"
            onClick={cerrar}
            className="rounded-lg px-3 py-2 text-gray-500 hover:bg-gray-100"
          >
            ✕
          </button>
        </div>

        <div className="space-y-6 p-5 sm:p-6">
          <div>
            <h3 className="font-semibold text-gray-900">
              Enlace de registro
            </h3>

            <p className="mt-1 text-sm text-gray-500">
              Comparte este enlace con los estudiantes.
            </p>

            <div className="mt-3 flex flex-col gap-2 sm:flex-row">
              <input
                type="text"
                readOnly
                value={urlRegistro}
                className="min-w-0 flex-1 rounded-lg border border-gray-300 bg-gray-50 px-4 py-3 text-sm text-gray-700"
              />

              <button
                type="button"
                onClick={copiarEnlace}
                className="rounded-lg border border-gray-300 px-4 py-3 text-sm font-semibold text-gray-700 hover:bg-gray-50"
              >
                Copiar enlace
              </button>
            </div>
          </div>

          <div className="border-t border-gray-200 pt-6">
            <div className="text-center">
              <h3 className="font-semibold text-gray-900">
                QR de registro
              </h3>

              <p className="mt-1 text-sm text-gray-500">
                Los estudiantes pueden escanearlo para abrir el formulario.
              </p>
            </div>

            <div
              ref={qrRef}
              className="mt-5 flex justify-center"
            >
              <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-gray-200">
                <QRCodeCanvas
                  value={urlRegistro}
                  size={230}
                  level="H"
                  marginSize={2}
                />
              </div>
            </div>
          </div>

          {mensaje && (
            <div className="rounded-lg bg-blue-50 p-3 text-center text-sm text-blue-700">
              {mensaje}
            </div>
          )}

          <div className="grid gap-3 sm:grid-cols-2">
            <button
              type="button"
              onClick={compartirEvento}
              className="rounded-lg border border-gray-300 px-5 py-3 font-semibold text-gray-700 hover:bg-gray-50"
            >
              Compartir
            </button>

            <button
              type="button"
              onClick={guardarQr}
              className="rounded-lg border border-gray-300 px-5 py-3 font-semibold text-gray-700 hover:bg-gray-50"
            >
              Guardar QR
            </button>
          </div>

          <div className="flex flex-col-reverse gap-3 border-t border-gray-200 pt-5 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={cerrar}
              className="rounded-lg border border-gray-300 px-5 py-3 font-medium text-gray-700 hover:bg-gray-50"
            >
              Cerrar
            </button>

            <button
              type="button"
              onClick={verEvento}
              className="rounded-lg bg-blue-600 px-5 py-3 font-semibold text-white"
            >
              Ver evento
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}