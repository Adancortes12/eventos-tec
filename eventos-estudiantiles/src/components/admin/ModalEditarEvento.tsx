import { useEffect, useState } from "react";
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
  abierto: boolean;
  cerrar: () => void;
  alActualizar: () => void;
};

export default function ModalEditarEvento({
  evento,
  abierto,
  cerrar,
  alActualizar,
}: Props) {
  const [nombre, setNombre] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [fechaEvento, setFechaEvento] = useState("");
  const [horaEvento, setHoraEvento] = useState("");
  const [estado, setEstado] = useState("activo");

  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!abierto) return;

    setNombre(evento.nombre);
    setDescripcion(evento.descripcion ?? "");
    setFechaEvento(evento.fecha_evento);
    setHoraEvento(evento.hora_evento);
    setEstado(evento.estado);
    setError("");
  }, [abierto, evento]);

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

  if (!abierto) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="max-h-[95vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white shadow-xl">
        <div className="border-b border-gray-200 p-6">
          <h2 className="text-2xl font-bold text-gray-900">
            Editar evento
          </h2>

          <p className="mt-1 text-sm text-gray-500">
            Modifica la información del evento.
          </p>
        </div>

        <form
          onSubmit={guardarCambios}
          className="space-y-5 p-6"
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
            <p className="text-sm text-red-600">
              {error}
            </p>
          )}

          <div className="flex flex-col-reverse gap-3 border-t border-gray-200 pt-5 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={cerrar}
              disabled={guardando}
              className="rounded-lg border border-gray-300 px-5 py-3 font-medium text-gray-700"
            >
              Cancelar
            </button>

            <button
              type="submit"
              disabled={guardando}
              className="rounded-lg bg-blue-600 px-5 py-3 font-semibold text-white disabled:opacity-50"
            >
              {guardando ? "Guardando..." : "Guardar cambios"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}