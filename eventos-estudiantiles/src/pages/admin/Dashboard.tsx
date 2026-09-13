import { useEffect, useState } from "react";
import { Link, useOutletContext } from "react-router";
import { supabase } from "../../lib/supabase";

type Evento = {
  id: string;
  codigo_evento: string;
  nombre: string;
  fecha_evento: string;
  hora_evento: string;
  estado: string;
};

type ContextoAdmin = {
  abrirModalNuevoEvento: () => void;
};

export default function Dashboard() {
  const { abrirModalNuevoEvento } =
    useOutletContext<ContextoAdmin>();

  const [eventosActivos, setEventosActivos] = useState(0);
  const [totalRegistrados, setTotalRegistrados] = useState(0);
  const [totalAsistencias, setTotalAsistencias] = useState(0);
  const [eventosRecientes, setEventosRecientes] = useState<Evento[]>([]);

  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const cargarDashboard = async () => {
      setCargando(true);
      setError("");

      const [
        eventosActivosRespuesta,
        registradosRespuesta,
        asistenciasRespuesta,
        eventosRecientesRespuesta,
      ] = await Promise.all([
        supabase
          .from("eventos")
          .select("*", { count: "exact", head: true })
          .eq("estado", "activo"),

        supabase
          .from("inscripciones")
          .select("*", { count: "exact", head: true }),

        supabase
          .from("inscripciones")
          .select("*", { count: "exact", head: true })
          .eq("asistio", true),

        supabase
          .from("eventos")
          .select(`
            id,
            codigo_evento,
            nombre,
            fecha_evento,
            hora_evento,
            estado
          `)
          .order("creado_en", { ascending: false })
          .limit(5),
      ]);

      if (
        eventosActivosRespuesta.error ||
        registradosRespuesta.error ||
        asistenciasRespuesta.error ||
        eventosRecientesRespuesta.error
      ) {
        console.error({
          eventosActivosRespuesta,
          registradosRespuesta,
          asistenciasRespuesta,
          eventosRecientesRespuesta,
        });

        setError("No se pudo cargar la información del dashboard.");
        setCargando(false);
        return;
      }

      setEventosActivos(eventosActivosRespuesta.count ?? 0);
      setTotalRegistrados(registradosRespuesta.count ?? 0);
      setTotalAsistencias(asistenciasRespuesta.count ?? 0);
      setEventosRecientes(eventosRecientesRespuesta.data ?? []);

      setCargando(false);
    };

    cargarDashboard();
  }, []);

  if (cargando) {
    return (
      <div className="py-10">
        <p className="text-gray-600">
          Cargando dashboard...
        </p>
      </div>
    );
  }

  return (
    <div>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            Dashboard
          </h1>

          <p className="mt-2 text-gray-600">
            Resumen general de los eventos estudiantiles.
          </p>
        </div>

        <button
          type="button"
          onClick={abrirModalNuevoEvento}
          className="w-fit rounded-lg bg-blue-600 px-5 py-3 font-semibold text-white"
        >
          Nuevo evento
        </button>
      </div>

      {error && (
        <div className="mt-6 rounded-xl bg-red-50 p-4 text-red-600">
          {error}
        </div>
      )}

      <div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <div className="rounded-xl bg-white p-6 shadow">
          <p className="text-sm font-medium text-gray-500">
            Eventos activos
          </p>

          <p className="mt-3 text-4xl font-bold text-gray-900">
            {eventosActivos}
          </p>
        </div>

        <div className="rounded-xl bg-white p-6 shadow">
          <p className="text-sm font-medium text-gray-500">
            Total de registrados
          </p>

          <p className="mt-3 text-4xl font-bold text-gray-900">
            {totalRegistrados}
          </p>
        </div>

        <div className="rounded-xl bg-white p-6 shadow">
          <p className="text-sm font-medium text-gray-500">
            Total de asistencias
          </p>

          <p className="mt-3 text-4xl font-bold text-gray-900">
            {totalAsistencias}
          </p>
        </div>
      </div>

      <div className="mt-8 rounded-xl bg-white shadow">
        <div className="flex flex-col gap-3 border-b border-gray-200 p-6 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-xl font-bold text-gray-900">
              Eventos recientes
            </h2>

            <p className="mt-1 text-sm text-gray-500">
              Últimos eventos creados en el sistema.
            </p>
          </div>

          <Link
            to="/admin/eventos"
            className="text-sm font-semibold text-blue-600"
          >
            Ver todos
          </Link>
        </div>

        {eventosRecientes.length === 0 ? (
          <div className="p-6">
            <p className="text-gray-600">
              No hay eventos registrados.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {eventosRecientes.map((evento) => (
              <div
                key={evento.id}
                className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between"
              >
                <div>
                  <p className="text-sm text-gray-500">
                    {evento.codigo_evento}
                  </p>

                  <h3 className="mt-1 font-semibold text-gray-900">
                    {evento.nombre}
                  </h3>

                  <p className="mt-1 text-sm text-gray-500">
                    {evento.fecha_evento} · {evento.hora_evento}
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  <span
                    className={`rounded-full px-3 py-1 text-xs font-semibold ${
                      evento.estado === "activo"
                        ? "bg-green-100 text-green-700"
                        : "bg-gray-200 text-gray-700"
                    }`}
                  >
                    {evento.estado === "activo"
                      ? "Activo"
                      : "Finalizado"}
                  </span>

                  <Link
                    to={`/admin/eventos/${evento.id}`}
                    className="text-sm font-semibold text-blue-600"
                  >
                    Ver evento
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}