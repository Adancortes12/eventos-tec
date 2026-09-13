import { useState } from "react";
import type { FormEvent } from "react";
import { supabase } from "../../lib/supabase";

type Evento = {
  id: string;
  nombre: string;
  descripcion: string | null;
  fecha_evento: string;
  hora_evento: string;
  estado: string;
};

type Props = {
  evento: Evento;
  cerrar: () => void;
  alActualizar: () => void;
};

export default function ModalEditarEvento({
  evento,
  cerrar,
  alActualizar,
}: Props) {
  const [nombre, setNombre] = useState(evento.nombre);
  const [descripcion, setDescripcion] = useState(
    evento.descripcion ?? ""
  );
  const [fechaEvento, setFechaEvento] = useState(
    evento.fecha_evento
  );
  const [horaEvento, setHoraEvento] = useState(
    evento.hora_evento
  );
  const [estado, setEstado] = useState(evento.estado);

  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState("");

  const guardarCambios = async (e: FormEvent) => {
    e.preventDefault();

    setGuardando(true);
    setError("");

    const { error } = await supabase
      .from("eventos")
      .update({
        nombre: nombre.trim(),
        descripcion: descripcion.trim() || null,
        fecha_evento: fechaEvento,
        hora_evento: horaEvento,
        estado,
      })
      .eq("id", evento.id);

    if (error) {
      console.error(error);
      setError("No se pudieron guardar los cambios.");
      setGuardando(false);
      return;
    }

    setGuardando(false);
    alActualizar();
    cerrar();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="max-h-[95vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-gray-200 p-5 sm:p-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">
              Editar evento
            </h2>

            <p className="mt-1 text-sm text-gray-500">
              Modifica la información del evento.
            </p>
          </div>

          <button
            type="button"
            onClick={cerrar}
            disabled={guardando}
            className="rounded-lg px-3 py-2 text-gray-500 hover:bg-gray-100"
          >
            ✕
          </button>
        </div>

        <form
          onSubmit={guardarCambios}
          className="space-y-5 p-5 sm:p-6"
        >
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700">
              Nombre
            </label>

            <input
              type="text"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              required
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

          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700">
              Estado
            </label>

            <select
              value={estado}
              onChange={(e) => setEstado(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-4 py-3 outline-none focus:border-blue-500"
            >
              <option value="activo">
                Activo
              </option>

              <option value="finalizado">
                Finalizado
              </option>
            </select>
          </div>

          {error && (
            <div className="rounded-lg bg-red-50 p-4 text-sm text-red-600">
              {error}
            </div>
          )}

          <div className="flex flex-col-reverse gap-3 border-t border-gray-200 pt-5 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={cerrar}
              disabled={guardando}
              className="rounded-lg border border-gray-300 px-5 py-3 font-medium text-gray-700 hover:bg-gray-50"
            >
              Cancelar
            </button>

            <button
              type="submit"
              disabled={guardando}
              className="rounded-lg bg-blue-600 px-5 py-3 font-semibold text-white disabled:opacity-50"
            >
              {guardando
                ? "Guardando..."
                : "Guardar cambios"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}