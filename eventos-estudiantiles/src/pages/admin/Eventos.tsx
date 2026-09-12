import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";
import { Link } from "react-router";

type Evento = {
  id: string;
  codigo_evento: string;
  nombre: string;
  descripcion: string | null;
  fecha_evento: string;
  hora_evento: string;
  estado: string;
  creado_en: string;
};

export default function Eventos() {
  const [eventos, setEventos] = useState<Evento[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const cargarEventos = async () => {
      const { data, error } = await supabase
        .from("eventos")
        .select("*")
        .order("fecha_evento", { ascending: true });

      if (error) {
        console.error(error);
        setError("No se pudieron cargar los eventos.");
      } else {
        setEventos(data ?? []);
      }

      setCargando(false);
    };

    cargarEventos();
  }, []);

  return (
    <main className="min-h-screen bg-gray-100 p-6">
      <div className="mx-auto max-w-6xl">
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Eventos</h1>

            <p className="mt-2 text-gray-600">
              Consulta los eventos registrados en el sistema.
            </p>
          </div>

          <Link
            to="/admin/eventos/nuevo"
            className="w-fit rounded-lg bg-blue-600 px-5 py-3 font-semibold text-white"
          >
            Nuevo evento
          </Link>
        </div>

        {cargando && <p className="text-gray-600">Cargando eventos...</p>}

        {error && <p className="text-red-600">{error}</p>}

        {!cargando && !error && eventos.length === 0 && (
          <div className="rounded-xl bg-white p-6 shadow">
            <p className="text-gray-600">No hay eventos registrados.</p>
          </div>
        )}

        <div className="space-y-4">
          {eventos.map((evento) => (
            <div key={evento.id} className="rounded-xl bg-white p-6 shadow">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm text-gray-500">
                    {evento.codigo_evento}
                  </p>

                  <h2 className="text-xl font-bold text-gray-900">
                    {evento.nombre}
                  </h2>

                  <p className="mt-2 text-gray-600">{evento.descripcion}</p>

                  <div className="mt-3 text-sm text-gray-600">
                    <p>Fecha: {evento.fecha_evento}</p>
                    <p>Hora: {evento.hora_evento}</p>
                  </div>
                </div>

                <div className="flex flex-col items-start gap-3 sm:items-end">
                  <span className="w-fit rounded-full bg-gray-200 px-3 py-1 text-sm font-medium text-gray-700">
                    {evento.estado}
                  </span>

                  <div className="flex flex-wrap gap-2">
                    <Link
                      to={`/admin/eventos/${evento.id}`}
                      className="rounded-lg bg-gray-900 px-4 py-2 text-sm font-semibold text-white"
                    >
                      Ver evento
                    </Link>

                    {evento.estado === "activo" && (
                      <Link
                        to={`/admin/eventos/${evento.id}/escanear`}
                        className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white"
                      >
                        Pasar asistencia
                      </Link>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
