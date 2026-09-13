import { useEffect, useState } from "react";
import { Link, useOutletContext } from "react-router";
import { supabase } from "../../lib/supabase";

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

type ContextoAdmin = {
  abrirModalNuevoEvento: () => void;
};

export default function Eventos() {
  const { abrirModalNuevoEvento } =
    useOutletContext<ContextoAdmin>();

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
    <div>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            Eventos
          </h1>

          <p className="mt-2 text-gray-600">
            Administra los eventos registrados en el sistema.
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

      {cargando && (
        <div className="mt-8 rounded-xl bg-white p-6 shadow">
          <p className="text-gray-600">
            Cargando eventos...
          </p>
        </div>
      )}

      {error && (
        <div className="mt-8 rounded-xl bg-red-50 p-5 text-red-600">
          {error}
        </div>
      )}

      {!cargando && !error && eventos.length === 0 && (
        <div className="mt-8 rounded-xl bg-white p-8 text-center shadow">
          <h2 className="text-lg font-semibold text-gray-900">
            No hay eventos
          </h2>

          <p className="mt-2 text-gray-500">
            Crea el primer evento para comenzar.
          </p>

          <button
            type="button"
            onClick={abrirModalNuevoEvento}
            className="mt-5 rounded-lg bg-blue-600 px-5 py-3 font-semibold text-white"
          >
            Crear evento
          </button>
        </div>
      )}

      {!cargando && !error && eventos.length > 0 && (
        <div className="mt-8 grid gap-5">
          {eventos.map((evento) => (
            <article
              key={evento.id}
              className="rounded-xl bg-white p-5 shadow sm:p-6"
            >
              <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-3">
                    <p className="text-sm font-medium text-blue-600">
                      {evento.codigo_evento}
                    </p>

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
                  </div>

                  <h2 className="mt-2 text-xl font-bold text-gray-900">
                    {evento.nombre}
                  </h2>

                  {evento.descripcion && (
                    <p className="mt-2 max-w-2xl text-sm text-gray-600">
                      {evento.descripcion}
                    </p>
                  )}

                  <div className="mt-4 flex flex-wrap gap-x-6 gap-y-2 text-sm text-gray-500">
                    <p>
                      Fecha: {evento.fecha_evento}
                    </p>

                    <p>
                      Hora: {evento.hora_evento}
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2 lg:justify-end">
                  <Link
                    to={`/admin/eventos/${evento.id}`}
                    className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 transition hover:bg-gray-50"
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
            </article>
          ))}
        </div>
      )}
    </div>
  );
}