import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { useParams } from "react-router";
import { QRCodeSVG } from "qrcode.react";
import { supabase } from "../../lib/supabase";

type Evento = {
  id: string;
  codigo_evento: string;
  nombre: string;
  descripcion: string | null;
  fecha_evento: string;
  hora_evento: string;
  estado: string;
};

export default function RegistroEvento() {
  const { codigoEvento } = useParams();

  const [evento, setEvento] = useState<Evento | null>(null);

  const [numeroEstudiante, setNumeroEstudiante] = useState("");
  const [nombreCompleto, setNombreCompleto] = useState("");

  const [cargando, setCargando] = useState(true);
  const [registrando, setRegistrando] = useState(false);

  const [error, setError] = useState("");
  const [registroExitoso, setRegistroExitoso] = useState(false);

  const [tokenQr, setTokenQr] = useState("");

  useEffect(() => {
    const cargarEvento = async () => {
      if (!codigoEvento) {
        setError("Evento no válido.");
        setCargando(false);
        return;
      }

      const { data, error } = await supabase
        .from("eventos")
        .select("*")
        .eq("codigo_evento", codigoEvento)
        .single();

      if (error || !data) {
        console.error(error);
        setError("El evento no existe o ya no está disponible.");
        setCargando(false);
        return;
      }

      setEvento(data);
      setCargando(false);
    };

    cargarEvento();
  }, [codigoEvento]);

  const registrarEstudiante = async (e: FormEvent) => {
    e.preventDefault();

    if (!evento) return;

    setRegistrando(true);
    setError("");

    const numeroLimpio = numeroEstudiante.trim();
    const nombreLimpio = nombreCompleto.trim();

    if (!numeroLimpio || !nombreLimpio) {
      setError("Completa todos los campos.");
      setRegistrando(false);
      return;
    }

    const nuevoTokenQr = crypto.randomUUID();

    const { error } = await supabase
      .from("inscripciones")
      .insert({
        evento_id: evento.id,
        numero_estudiante: numeroLimpio,
        nombre_completo: nombreLimpio,
        token_qr: nuevoTokenQr,
      });

    if (error) {
      console.error(error);

      if (error.code === "23505") {
        setError(
          "Este número de estudiante ya está registrado en este evento."
        );
      } else {
        setError(
          "No se pudo realizar el registro. Intenta nuevamente."
        );
      }

      setRegistrando(false);
      return;
    }

    setNumeroEstudiante(numeroLimpio);
    setNombreCompleto(nombreLimpio);
    setTokenQr(nuevoTokenQr);
    setRegistroExitoso(true);
    setRegistrando(false);
  };

  if (cargando) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-gray-100">
        <p className="text-gray-600">
          Cargando evento...
        </p>
      </main>
    );
  }

  if (error && !evento) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-gray-100 p-4">
        <div className="w-full max-w-md rounded-xl bg-white p-6 text-center shadow">
          <h1 className="text-2xl font-bold text-gray-900">
            Evento no disponible
          </h1>

          <p className="mt-3 text-gray-600">
            {error}
          </p>
        </div>
      </main>
    );
  }

  if (!evento) {
    return null;
  }

  return (
    <main className="min-h-screen bg-gray-100 p-4 sm:p-6">
      <div className="mx-auto max-w-xl">
        <div className="rounded-2xl bg-white p-6 shadow">
          <p className="text-sm font-medium text-blue-600">
            {evento.codigo_evento}
          </p>

          <h1 className="mt-2 text-3xl font-bold text-gray-900">
            {evento.nombre}
          </h1>

          {evento.descripcion && (
            <p className="mt-3 text-gray-600">
              {evento.descripcion}
            </p>
          )}

          <div className="mt-6 rounded-xl bg-gray-50 p-4 text-sm text-gray-700">
            <p>
              Fecha: {evento.fecha_evento}
            </p>

            <p className="mt-1">
              Hora: {evento.hora_evento}
            </p>
          </div>

          {!registroExitoso ? (
            <div className="mt-6 border-t border-gray-200 pt-6">
              <h2 className="text-xl font-bold text-gray-900">
                Registro
              </h2>

              <p className="mt-1 text-sm text-gray-500">
                Ingresa tus datos para registrarte al evento.
              </p>

              <form
                onSubmit={registrarEstudiante}
                className="mt-5 space-y-5"
              >
                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-700">
                    Número de estudiante
                  </label>

                  <input
                    type="text"
                    value={numeroEstudiante}
                    onChange={(e) =>
                      setNumeroEstudiante(e.target.value)
                    }
                    required
                    placeholder="Ej. 202312345"
                    className="w-full rounded-lg border border-gray-300 px-4 py-3 text-gray-900 outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-700">
                    Nombre completo
                  </label>

                  <input
                    type="text"
                    value={nombreCompleto}
                    onChange={(e) =>
                      setNombreCompleto(e.target.value)
                    }
                    required
                    placeholder="Juan Pérez López"
                    className="w-full rounded-lg border border-gray-300 px-4 py-3 text-gray-900 outline-none focus:border-blue-500"
                  />
                </div>

                {error && (
                  <p className="rounded-lg bg-red-50 p-3 text-sm text-red-600">
                    {error}
                  </p>
                )}

                <button
                  type="submit"
                  disabled={registrando}
                  className="w-full rounded-lg bg-blue-600 px-5 py-3 font-semibold text-white disabled:opacity-50"
                >
                  {registrando
                    ? "Registrando..."
                    : "Registrarme"}
                </button>
              </form>
            </div>
          ) : (
            <div className="mt-6 border-t border-gray-200 pt-6">
              <div className="rounded-xl bg-green-50 p-6 text-center">
                <h2 className="text-2xl font-bold text-green-700">
                  Registro exitoso
                </h2>

                <p className="mt-4 font-semibold text-gray-900">
                  {nombreCompleto}
                </p>

                <p className="mt-1 text-gray-600">
                  {numeroEstudiante}
                </p>

                <div className="mt-6 flex justify-center">
                  <div className="rounded-xl bg-white p-4 shadow-sm">
                    <QRCodeSVG
                      value={tokenQr}
                      size={220}
                      level="H"
                    />
                  </div>
                </div>

                <p className="mt-5 font-medium text-gray-900">
                  Presenta este código QR al ingresar al evento.
                </p>

                <p className="mt-2 text-sm text-gray-500">
                  No compartas tu código con otras personas.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}