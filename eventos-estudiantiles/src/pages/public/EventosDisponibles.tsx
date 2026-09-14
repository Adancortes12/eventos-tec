import { useEffect, useState } from "react";
import { Link } from "react-router";

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

async function obtenerEventosDisponibles(): Promise<Evento[]> {
  const hoy = new Date();

  const anio = hoy.getFullYear();
  const mes = String(hoy.getMonth() + 1).padStart(2, "0");
  const dia = String(hoy.getDate()).padStart(2, "0");

  const fechaActual = `${anio}-${mes}-${dia}`;

  const { data, error } = await supabase
    .from("eventos")
    .select(
      `
      id,
      codigo_evento,
      nombre,
      descripcion,
      fecha_evento,
      hora_evento,
      estado
    `,
    )
    .eq("estado", "activo")
    .gte("fecha_evento", fechaActual)
    .order("fecha_evento", {
      ascending: true,
    })
    .order("hora_evento", {
      ascending: true,
    });

  if (error) {
    console.error(error);

    throw new Error("No se pudieron cargar los eventos.");
  }

  return data ?? [];
}

function formatearFecha(fecha: string) {
  const [anio, mes, dia] = fecha.split("-").map(Number);

  const fechaLocal = new Date(anio, mes - 1, dia);

  return fechaLocal.toLocaleDateString("es-MX", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function formatearHora(hora: string) {
  const [horas, minutos] = hora.split(":");

  const fecha = new Date();

  fecha.setHours(Number(horas), Number(minutos), 0, 0);

  return fecha.toLocaleTimeString("es-MX", {
    hour: "numeric",
    minute: "2-digit",
  });
}

export default function EventosDisponibles() {
  const [eventos, setEventos] = useState<Evento[]>([]);

  const [cargando, setCargando] = useState(true);

  const [error, setError] = useState("");

  useEffect(() => {
    let activo = true;

    obtenerEventosDisponibles()
      .then((eventosDisponibles) => {
        if (!activo) {
          return;
        }

        setEventos(eventosDisponibles);

        setError("");
      })
      .catch((errorConsulta) => {
        console.error(errorConsulta);

        if (!activo) {
          return;
        }

        setError("No se pudieron cargar los eventos disponibles.");
      })
      .finally(() => {
        if (activo) {
          setCargando(false);
        }
      });

    return () => {
      activo = false;
    };
  }, []);

  return (
    <main className="min-h-screen bg-slate-100">
      {/* Navbar */}
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-4 sm:px-6">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-600 font-bold text-white">
              EA
            </div>

            <div>
              <p className="font-bold text-slate-900">Eventos Estudiantiles</p>

              <p className="text-xs text-slate-500">
                Encuentra y registra tus eventos
              </p>
            </div>
          </div>

          <Link
            to="/mis-eventos"
            className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
          >
            Mis eventos
          </Link>
        </div>
      </header>

      {/* Hero */}
      <section className="border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 sm:py-14">
          <p className="text-sm font-semibold text-blue-600">
            Eventos disponibles
          </p>

          <h1 className="mt-2 max-w-2xl text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
            Encuentra los próximos eventos y regístrate fácilmente
          </h1>

          <p className="mt-4 max-w-2xl text-slate-500">
            Selecciona un evento, registra tus datos y obtén tu código QR de
            acceso.
          </p>
        </div>
      </section>

      {/* Eventos */}
      <section className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
        <div className="mb-5 flex items-end justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold text-slate-900">
              Próximos eventos
            </h2>

            {!cargando && !error && (
              <p className="mt-1 text-sm text-slate-500">
                {eventos.length} evento
                {eventos.length !== 1 ? "s" : ""} disponible
                {eventos.length !== 1 ? "s" : ""}
              </p>
            )}
          </div>
        </div>

        {cargando && (
          <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center shadow-sm">
            <p className="text-slate-500">Cargando eventos...</p>
          </div>
        )}

        {error && (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-5 text-red-600">
            {error}
          </div>
        )}

        {!cargando && !error && eventos.length === 0 && (
          <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center shadow-sm">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-slate-100 text-xl">
              📅
            </div>

            <h2 className="mt-4 text-xl font-bold text-slate-900">
              No hay eventos disponibles
            </h2>

            <p className="mt-2 text-sm text-slate-500">
              Cuando se publiquen nuevos eventos aparecerán aquí.
            </p>
          </div>
        )}

        {!cargando && !error && eventos.length > 0 && (
          <div className="grid gap-5 md:grid-cols-2">
            {eventos.map((evento) => (
              <article
                key={evento.id}
                className="flex flex-col rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md sm:p-6"
              >
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <span className="text-xs font-semibold text-blue-600">
                    {evento.codigo_evento}
                  </span>

                  <span className="rounded-full bg-green-100 px-3 py-1 text-xs font-semibold text-green-700">
                    Disponible
                  </span>
                </div>

                <h3 className="mt-4 text-xl font-bold text-slate-900">
                  {evento.nombre}
                </h3>

                {evento.descripcion && (
                  <p className="mt-2 line-clamp-3 text-sm leading-6 text-slate-500">
                    {evento.descripcion}
                  </p>
                )}

                <div className="mt-5 grid gap-3 sm:grid-cols-2">
                  <div className="rounded-xl bg-slate-50 p-3">
                    <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
                      Fecha
                    </p>

                    <p className="mt-1 text-sm font-semibold capitalize text-slate-800">
                      {formatearFecha(evento.fecha_evento)}
                    </p>
                  </div>

                  <div className="rounded-xl bg-slate-50 p-3">
                    <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
                      Hora
                    </p>

                    <p className="mt-1 text-sm font-semibold text-slate-800">
                      {formatearHora(evento.hora_evento)}
                    </p>
                  </div>
                </div>

                <div className="mt-auto pt-6">
                  <Link
                    to={`/evento/${evento.codigo_evento}`}
                    className="block w-full rounded-xl bg-blue-600 px-5 py-3 text-center text-sm font-semibold text-white transition hover:bg-blue-700"
                  >
                    Registrarme
                  </Link>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      <footer className="mt-6 border-t border-slate-200 bg-white">
        <div className="mx-auto max-w-6xl px-4 py-6 text-center text-xs text-slate-400 sm:px-6">
          Sistema de Eventos Estudiantiles
        </div>
      </footer>
    </main>
  );
}
