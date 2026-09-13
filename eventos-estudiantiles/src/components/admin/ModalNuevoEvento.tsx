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
  const [codigoEvento, setCodigoEvento] = useState("");
  const [nombre, setNombre] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [fechaEvento, setFechaEvento] = useState("");
  const [horaEvento, setHoraEvento] = useState("");

  const [creando, setCreando] = useState(false);
  const [error, setError] = useState("");

  const limpiarFormulario = () => {
    setCodigoEvento("");
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

  const crearEvento = async (e: FormEvent) => {
    e.preventDefault();

    setCreando(true);
    setError("");

    const { data, error } = await supabase
      .from("eventos")
      .insert({
        codigo_evento: codigoEvento.trim().toUpperCase(),
        nombre: nombre.trim(),
        descripcion: descripcion.trim() || null,
        fecha_evento: fechaEvento,
        hora_evento: horaEvento,
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
        setError("Ya existe un evento con ese código.");
      } else {
        setError("No se pudo crear el evento.");
      }

      setCreando(false);
      return;
    }

    setCreando(false);

    limpiarFormulario();
    alCrear(data);
    cerrar();
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
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700">
              Código del evento
            </label>

            <input
              type="text"
              value={codigoEvento}
              onChange={(e) => setCodigoEvento(e.target.value)}
              required
              placeholder="EVT-2026-0004"
              className="w-full rounded-lg border border-gray-300 px-4 py-3 outline-none focus:border-blue-500"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700">
              Nombre del evento
            </label>

            <input
              type="text"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              required
              placeholder="Ej. Conferencia de tecnología"
              className="w-full rounded-lg border border-gray-300 px-4 py-3 outline-none focus:border-blue-500"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700">
              Descripción
            </label>

            <textarea
              value={descripcion}
              onChange={(e) => setDescripcion(e.target.value)}
              rows={4}
              placeholder="Describe brevemente el evento"
              className="w-full resize-none rounded-lg border border-gray-300 px-4 py-3 outline-none focus:border-blue-500"
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
                onChange={(e) => setFechaEvento(e.target.value)}
                required
                className="w-full rounded-lg border border-gray-300 px-4 py-3 outline-none focus:border-blue-500"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">
                Hora
              </label>

              <input
                type="time"
                value={horaEvento}
                onChange={(e) => setHoraEvento(e.target.value)}
                required
                className="w-full rounded-lg border border-gray-300 px-4 py-3 outline-none focus:border-blue-500"
              />
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
              {creando ? "Creando..." : "Crear evento"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}