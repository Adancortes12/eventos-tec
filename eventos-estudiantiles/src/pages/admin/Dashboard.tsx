import { useEffect, useState } from "react";
import {
  Link,
  useOutletContext,
} from "react-router";

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

  const [totalEventos, setTotalEventos] =
    useState(0);

  const [eventosActivos, setEventosActivos] =
    useState(0);

  const [totalRegistrados, setTotalRegistrados] =
    useState(0);

  const [totalAsistencias, setTotalAsistencias] =
    useState(0);

  const [eventosRecientes, setEventosRecientes] =
    useState<Evento[]>([]);

  const [cargando, setCargando] =
    useState(true);

  const [error, setError] =
    useState("");

  useEffect(() => {
    const cargarDashboard = async () => {
      setCargando(true);
      setError("");

      const [
        eventosRespuesta,
        activosRespuesta,
        registradosRespuesta,
        asistenciasRespuesta,
        recientesRespuesta,
      ] = await Promise.all([
        supabase
          .from("eventos")
          .select("*", {
            count: "exact",
            head: true,
          }),

        supabase
          .from("eventos")
          .select("*", {
            count: "exact",
            head: true,
          })
          .eq("estado", "activo"),

        supabase
          .from("inscripciones")
          .select("*", {
            count: "exact",
            head: true,
          }),

        supabase
          .from("inscripciones")
          .select("*", {
            count: "exact",
            head: true,
          })
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
          .order("creado_en", {
            ascending: false,
          })
          .limit(5),
      ]);

      if (
        eventosRespuesta.error ||
        activosRespuesta.error ||
        registradosRespuesta.error ||
        asistenciasRespuesta.error ||
        recientesRespuesta.error
      ) {
        console.error({
          eventosRespuesta,
          activosRespuesta,
          registradosRespuesta,
          asistenciasRespuesta,
          recientesRespuesta,
        });

        setError(
          "No se pudo cargar la información del dashboard."
        );

        setCargando(false);
        return;
      }

      setTotalEventos(
        eventosRespuesta.count ?? 0
      );

      setEventosActivos(
        activosRespuesta.count ?? 0
      );

      setTotalRegistrados(
        registradosRespuesta.count ?? 0
      );

      setTotalAsistencias(
        asistenciasRespuesta.count ?? 0
      );

      setEventosRecientes(
        recientesRespuesta.data ?? []
      );

      setCargando(false);
    };

    cargarDashboard();
  }, []);

  const porcentajeGeneral =
    totalRegistrados > 0
      ? (
          (totalAsistencias /
            totalRegistrados) *
          100
        ).toFixed(1)
      : "0.0";

  if (cargando) {
    return (
      <div className="py-16 text-center">
        <p className="text-slate-500">
          Cargando dashboard...
        </p>
      </div>
    );
  }

  return (
    <div>
      {/* Encabezado */}
      <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-sm font-semibold text-blue-600">
            Panel administrativo
          </p>

          <h1 className="mt-1 text-3xl font-bold text-slate-900">
            Dashboard
          </h1>

          <p className="mt-2 text-slate-500">
            Consulta rápidamente el estado de tus
            eventos y asistencias.
          </p>
        </div>

        <button
          type="button"
          onClick={abrirModalNuevoEvento}
          className="w-fit rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700"
        >
          + Crear evento
        </button>
      </div>

      {error && (
        <div className="mt-6 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-600">
          {error}
        </div>
      )}

      {/* Estadísticas */}
      <div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-sm font-medium text-slate-500">
            Eventos totales
          </p>

          <p className="mt-3 text-4xl font-bold text-slate-900">
            {totalEventos}
          </p>

          <p className="mt-2 text-xs text-slate-400">
            Eventos creados en el sistema
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-sm font-medium text-slate-500">
            Eventos activos
          </p>

          <p className="mt-3 text-4xl font-bold text-green-600">
            {eventosActivos}
          </p>

          <p className="mt-2 text-xs text-slate-400">
            Disponibles para registro
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-sm font-medium text-slate-500">
            Estudiantes registrados
          </p>

          <p className="mt-3 text-4xl font-bold text-blue-600">
            {totalRegistrados}
          </p>

          <p className="mt-2 text-xs text-slate-400">
            Registros acumulados
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-sm font-medium text-slate-500">
            Asistencias
          </p>

          <p className="mt-3 text-4xl font-bold text-violet-600">
            {totalAsistencias}
          </p>

          <p className="mt-2 text-xs text-slate-400">
            {porcentajeGeneral}% de asistencia general
          </p>
        </div>
      </div>

      {/* Acciones rápidas */}
      <div className="mt-8">
        <h2 className="text-lg font-bold text-slate-900">
          Acciones rápidas
        </h2>

        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <button
            type="button"
            onClick={abrirModalNuevoEvento}
            className="rounded-2xl border border-slate-200 bg-white p-5 text-left shadow-sm transition hover:border-blue-300 hover:shadow"
          >
            <p className="font-semibold text-slate-900">
              Crear nuevo evento
            </p>

            <p className="mt-1 text-sm text-slate-500">
              Registra un evento y genera su enlace y QR.
            </p>
          </button>

          <Link
            to="/admin/eventos"
            className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-blue-300 hover:shadow"
          >
            <p className="font-semibold text-slate-900">
              Administrar eventos
            </p>

            <p className="mt-1 text-sm text-slate-500">
              Consulta registros, asistencias y eventos.
            </p>
          </Link>
        </div>
      </div>

      {/* Eventos recientes */}
      <div className="mt-8 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-col gap-3 border-b border-slate-200 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
          <div>
            <h2 className="text-xl font-bold text-slate-900">
              Eventos recientes
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              Últimos eventos registrados.
            </p>
          </div>

          <Link
            to="/admin/eventos"
            className="w-fit text-sm font-semibold text-blue-600 hover:text-blue-700"
          >
            Ver todos →
          </Link>
        </div>

        {eventosRecientes.length === 0 ? (
          <div className="p-8 text-center">
            <p className="font-medium text-slate-700">
              Todavía no hay eventos.
            </p>

            <p className="mt-1 text-sm text-slate-500">
              Crea uno para comenzar.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {eventosRecientes.map((evento) => (
              <div
                key={evento.id}
                className="flex flex-col gap-4 p-5 transition hover:bg-slate-50 sm:flex-row sm:items-center sm:justify-between"
              >
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs font-semibold text-blue-600">
                      {evento.codigo_evento}
                    </span>

                    <span
                      className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                        evento.estado === "activo"
                          ? "bg-green-100 text-green-700"
                          : "bg-slate-200 text-slate-600"
                      }`}
                    >
                      {evento.estado === "activo"
                        ? "Activo"
                        : "Finalizado"}
                    </span>
                  </div>

                  <h3 className="mt-2 font-semibold text-slate-900">
                    {evento.nombre}
                  </h3>

                  <p className="mt-1 text-sm text-slate-500">
                    {evento.fecha_evento} ·{" "}
                    {evento.hora_evento}
                  </p>
                </div>

                <div className="flex flex-wrap gap-2">
                  <Link
                    to={`/admin/eventos/${evento.id}`}
                    className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
                  >
                    Ver evento
                  </Link>

                  {evento.estado === "activo" && (
                    <Link
                      to={`/admin/eventos/${evento.id}/escanear`}
                      className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-700"
                    >
                      Pasar asistencia
                    </Link>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}