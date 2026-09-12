import { useState } from "react";
import type { FormEvent } from "react";
import { useNavigate } from "react-router";
import { supabase } from "../../lib/supabase";

export default function NuevoEvento() {
  const navigate = useNavigate();

  const [codigoEvento, setCodigoEvento] = useState("");
  const [nombre, setNombre] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [fechaEvento, setFechaEvento] = useState("");
  const [horaEvento, setHoraEvento] = useState("");

  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState("");

  const crearEvento = async (e: FormEvent) => {
    e.preventDefault();

    setCargando(true);
    setError("");

    const { error } = await supabase
      .from("eventos")
      .insert({
        codigo_evento: codigoEvento.trim().toUpperCase(),
        nombre: nombre.trim(),
        descripcion: descripcion.trim() || null,
        fecha_evento: fechaEvento,
        hora_evento: horaEvento,
        estado: "activo",
      });

    if (error) {
      console.error(error);

      if (error.code === "23505") {
        setError("Ya existe un evento con ese código.");
      } else {
        setError("No se pudo crear el evento.");
      }

      setCargando(false);
      return;
    }

    navigate("/admin/eventos");
  };

  return (
    <main className="min-h-screen bg-gray-100 p-4 sm:p-6">
      <div className="mx-auto max-w-2xl">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900">
            Nuevo evento
          </h1>

          <p className="mt-2 text-gray-600">
            Registra un nuevo evento estudiantil.
          </p>
        </div>

        <form
          onSubmit={crearEvento}
          className="space-y-5 rounded-xl bg-white p-6 shadow"
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
              placeholder="EVT-2026-0002"
              className="w-full rounded-lg border border-gray-300 px-4 py-3 outline-none focus:border-blue-500"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700">
              Nombre
            </label>

            <input
              type="text"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              required
              placeholder="Nombre del evento"
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
              placeholder="Descripción del evento"
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
            <p className="text-sm text-red-600">
              {error}
            </p>
          )}

          <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={() => navigate("/admin/eventos")}
              className="rounded-lg border border-gray-300 px-5 py-3 font-medium text-gray-700"
            >
              Cancelar
            </button>

            <button
              type="submit"
              disabled={cargando}
              className="rounded-lg bg-blue-600 px-5 py-3 font-semibold text-white disabled:opacity-50"
            >
              {cargando ? "Creando..." : "Crear evento"}
            </button>
          </div>
        </form>
      </div>
    </main>
  );
}