import { useState } from "react";
import type { FormEvent } from "react";
import { supabase } from "../../lib/supabase";

export type EventoCreado = {
  id: string;
  codigo_evento: string;
  nombre: string;
  descripcion: string | null;
  fecha_evento: string;
  hora_evento: string;
  estado: string;
};

type Props = {
  abierto: boolean;
  cerrar: () => void;
  alCrear: (evento: EventoCreado) => void;
};

export default function ModalNuevoEvento({
  abierto,
  cerrar,
  alCrear,
}: Props) {
  const [nombre, setNombre] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [fechaEvento, setFechaEvento] = useState("");
  const [horaEvento, setHoraEvento] = useState("");

  const [creando, setCreando] = useState(false);
  const [error, setError] = useState("");

  const obtenerFechaActual = () => {
    const hoy = new Date();

    const anio = hoy.getFullYear();
    const mes = String(hoy.getMonth() + 1).padStart(2, "0");
    const dia = String(hoy.getDate()).padStart(2, "0");

    return `${anio}-${mes}-${dia}`;
  };

  const fechaActual = obtenerFechaActual();

  const limpiarFormulario = () => {
    setNombre("");
    setDescripcion("");
    setFechaEvento("");
    setHoraEvento("");
    setError("");
  };

  const cerrarModal = () => {
    limpiarFormulario();
    cerrar();
  };

  const generarCodigoEvento = async () => {
    const anioEvento = new Date(
      `${fechaEvento}T00:00:00`
    ).getFullYear();

    const { data: ultimoEvento, error } = await supabase
      .from("eventos")
      .select("codigo_evento")
      .like(
        "codigo_evento",
        `EVT-${anioEvento}-%`
      )
      .order("codigo_evento", {
        ascending: false,
      })
      .limit(1)
      .maybeSingle();

    if (error) {
      console.error(error);

      throw new Error(
        "No se pudo generar el código del evento."
      );
    }

    let siguienteNumero = 1;

    if (ultimoEvento) {
      const partes =
        ultimoEvento.codigo_evento.split("-");

      const numeroAnterior = Number(
        partes[2]
      );

      if (!Number.isNaN(numeroAnterior)) {
        siguienteNumero =
          numeroAnterior + 1;
      }
    }

    return `EVT-${anioEvento}-${String(
      siguienteNumero
    ).padStart(4, "0")}`;
  };

  const crearEvento = async (
    e: FormEvent
  ) => {
    e.preventDefault();

    setCreando(true);
    setError("");

    if (!fechaEvento) {
      setError("Selecciona una fecha para el evento.");
      setCreando(false);
      return;
    }

    if (!horaEvento) {
      setError("Selecciona una hora para el evento.");
      setCreando(false);
      return;
    }

    if (fechaEvento < fechaActual) {
      setError(
        "No puedes crear un evento con una fecha anterior a hoy."
      );

      setCreando(false);
      return;
    }

    try {
      const codigoGenerado =
        await generarCodigoEvento();

      const { data, error } =
        await supabase
          .from("eventos")
          .insert({
            codigo_evento:
              codigoGenerado,
            nombre: nombre.trim(),
            descripcion:
              descripcion.trim() ||
              null,
            fecha_evento:
              fechaEvento,
            hora_evento:
              horaEvento,
            estado: "activo",
          })
          .select(`
            id,
            codigo_evento,
            nombre,
            descripcion,
            fecha_evento,
            hora_evento,
            estado
          `)
          .single();

      if (error) {
        console.error(error);

        if (error.code === "23505") {
          setError(
            "Se generó un código duplicado. Intenta crear el evento nuevamente."
          );
        } else {
          setError(
            "No se pudo crear el evento."
          );
        }

        setCreando(false);
        return;
      }

      limpiarFormulario();
      setCreando(false);

      alCrear(data);

      cerrar();
    } catch (error) {
      console.error(error);

      setError(
        "No se pudo generar el código del evento."
      );

      setCreando(false);
    }
  };

  if (!abierto) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="max-h-[95vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-gray-200 p-5 sm:p-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">
              Nuevo evento
            </h2>

            <p className="mt-1 text-sm text-gray-500">
              Registra un nuevo evento estudiantil.
            </p>
          </div>

          <button
            type="button"
            onClick={cerrarModal}
            disabled={creando}
            className="rounded-lg px-3 py-2 text-gray-500 hover:bg-gray-100"
          >
            ✕
          </button>
        </div>

        <form
          onSubmit={crearEvento}
          className="space-y-5 p-5 sm:p-6"
        >
          <div className="rounded-lg bg-blue-50 p-4">
            <p className="text-sm font-medium text-blue-700">
              Código automático
            </p>

            <p className="mt-1 text-sm text-blue-600">
              El sistema generará el código del evento automáticamente.
            </p>

            <p className="mt-1 text-xs text-blue-500">
              Ejemplo: EVT-2026-0001
            </p>
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700">
              Nombre del evento
            </label>

            <input
              type="text"
              value={nombre}
              onChange={(e) =>
                setNombre(e.target.value)
              }
              required
              placeholder="Ej. Conferencia de tecnología"
              className="w-full rounded-lg border border-gray-300 px-4 py-3 text-gray-900 outline-none focus:border-blue-500"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700">
              Descripción
            </label>

            <textarea
              value={descripcion}
              onChange={(e) =>
                setDescripcion(e.target.value)
              }
              rows={4}
              placeholder="Describe brevemente el evento"
              className="w-full resize-none rounded-lg border border-gray-300 px-4 py-3 text-gray-900 outline-none focus:border-blue-500"
            />
          </div>

          <div className="grid gap-5 sm:grid-cols-2">
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">
                Fecha
              </label>

              <input
                type="date"
                value={fechaEvento}
                min={fechaActual}
                onChange={(e) =>
                  setFechaEvento(
                    e.target.value
                  )
                }
                onClick={(e) =>
                  e.currentTarget.showPicker()
                }
                required
                className="w-full cursor-pointer rounded-lg border border-gray-300 px-4 py-3 text-gray-900 outline-none focus:border-blue-500"
              />

              <p className="mt-2 text-xs text-gray-500">
                Solo puedes seleccionar hoy o una fecha futura.
              </p>
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">
                Hora
              </label>

              <input
                type="time"
                value={horaEvento}
                onChange={(e) =>
                  setHoraEvento(
                    e.target.value
                  )
                }
                onClick={(e) =>
                  e.currentTarget.showPicker()
                }
                required
                className="w-full cursor-pointer rounded-lg border border-gray-300 px-4 py-3 text-gray-900 outline-none focus:border-blue-500"
              />

              <p className="mt-2 text-xs text-gray-500">
                Selecciona la hora del evento.
              </p>
            </div>
          </div>

          {error && (
            <div className="rounded-lg bg-red-50 p-4 text-sm text-red-600">
              {error}
            </div>
          )}

          <div className="flex flex-col-reverse gap-3 border-t border-gray-200 pt-5 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={cerrarModal}
              disabled={creando}
              className="rounded-lg border border-gray-300 px-5 py-3 font-medium text-gray-700 hover:bg-gray-50"
            >
              Cancelar
            </button>

            <button
              type="submit"
              disabled={creando}
              className="rounded-lg bg-blue-600 px-5 py-3 font-semibold text-white disabled:opacity-50"
            >
              {creando
                ? "Creando..."
                : "Crear evento"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}