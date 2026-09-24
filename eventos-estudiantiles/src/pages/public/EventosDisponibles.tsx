import {
  useEffect,
  useState,
} from "react";

import {
  Link,
} from "react-router";

import { supabase } from "../../lib/supabase";

import {
  obtenerSesion,
} from "../../lib/sesion";

import SesionSitec from "../../components/SesionSitec";

type Evento = {
  id: string;
  codigo_evento: string;
  nombre: string;
  descripcion: string | null;
  fecha_evento: string;
  hora_evento: string;
  estado: string;
  fecha_activacion: string;
  cierre_inscripcion: string | null;
};

type InscripcionRespuesta = {
  evento: {
    codigo_evento: string;
  };
};

export default function EventosDisponibles() {
  const [
    eventos,
    setEventos,
  ] = useState<Evento[]>([]);

  const [
    eventosRegistrados,
    setEventosRegistrados,
  ] = useState<Set<string>>(
    new Set()
  );

  const [
    cargando,
    setCargando,
  ] = useState(true);

  const [
    error,
    setError,
  ] = useState("");

  useEffect(() => {
    async function cargarPagina() {
      try {
        setCargando(true);
        setError("");

        /*
         * Hora local del navegador.
         * Se utiliza para comparar
         * fecha_activacion y cierre_inscripcion.
         */
        const ahora = new Date();

        const ahoraLocal = new Date(
          ahora.getTime() -
            ahora.getTimezoneOffset() * 60000
        )
          .toISOString()
          .slice(0, 19);

        /*
         * 1. CARGAR EVENTOS DISPONIBLES
         */
        const {
          data: eventosData,
          error: errorEventos,
        } = await supabase
          .from("eventos")
          .select(`
            id,
            codigo_evento,
            nombre,
            descripcion,
            fecha_evento,
            hora_evento,
            estado,
            fecha_activacion,
            cierre_inscripcion
          `)
          .eq(
            "estado",
            "activo"
          )
          .lte(
            "fecha_activacion",
            ahoraLocal
          )
          .gte(
            "cierre_inscripcion",
            ahoraLocal
          )
          .order(
            "fecha_evento",
            {
              ascending: true,
            }
          )
          .order(
            "hora_evento",
            {
              ascending: true,
            }
          );

        if (errorEventos) {
          console.error(
            "Error cargando eventos:",
            errorEventos
          );

          setError(
            "No se pudieron cargar los eventos."
          );

          return;
        }

        setEventos(
          eventosData ?? []
        );

        /*
         * 2. COMPROBAR SESIÓN
         */
        const sesion =
          await obtenerSesion();

        /*
         * Si no es estudiante,
         * no necesitamos consultar
         * inscripciones.
         */
        if (
          !sesion ||
          sesion.tipo !== "estudiante"
        ) {
          setEventosRegistrados(
            new Set()
          );

          return;
        }

        /*
         * 3. CARGAR INSCRIPCIONES
         * DEL ESTUDIANTE
         */
        const respuesta =
          await fetch(
            "/api/eventos/mis-eventos",
            {
              method: "GET",
              credentials: "include",
            }
          );

        if (!respuesta.ok) {
          console.error(
            "No se pudieron cargar las inscripciones."
          );

          return;
        }

        const datos =
          await respuesta.json();

        const inscripciones: InscripcionRespuesta[] =
          datos.eventos ?? [];

        /*
         * Guardamos únicamente los
         * códigos de los eventos donde
         * ya está registrado.
         */
        const codigosRegistrados =
          new Set<string>(
            inscripciones.map(
              (inscripcion) =>
                inscripcion.evento
                  .codigo_evento
            )
          );

        setEventosRegistrados(
          codigosRegistrados
        );
      } catch (error) {
        console.error(
          "Error cargando página:",
          error
        );

        setError(
          "Ocurrió un error al cargar los eventos."
        );
      } finally {
        setCargando(false);
      }
    }

    cargarPagina();
  }, []);

  function formatearFecha(
    fecha: string
  ) {
    if (!fecha) {
      return "";
    }

    const [
      year,
      month,
      day,
    ] = fecha.split("-");

    const fechaLocal =
      new Date(
        Number(year),
        Number(month) - 1,
        Number(day)
      );

    const texto =
      new Intl.DateTimeFormat(
        "es-MX",
        {
          day: "numeric",
          month: "long",
          year: "numeric",
        }
      ).format(fechaLocal);

    return texto
      .split(" ")
      .map((palabra) => {
        if (
          palabra.toLowerCase() ===
          "de"
        ) {
          return "de";
        }

        return (
          palabra.charAt(0).toUpperCase() +
          palabra.slice(1)
        );
      })
      .join(" ");
  }

  function formatearHora(
    hora: string
  ) {
    if (!hora) {
      return "";
    }

    const [
      horas,
      minutos,
    ] = hora.split(":");

    const fecha =
      new Date();

    fecha.setHours(
      Number(horas),
      Number(minutos),
      0,
      0
    );

    return new Intl.DateTimeFormat(
      "es-MX",
      {
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
      }
    ).format(fecha);
  }

  return (
    <div className="min-h-screen bg-slate-100">

      {/*
       * NAVBAR
       */}
      <header className="border-b border-[#1B396A] bg-[#1B396A]">

        <div className="mx-auto flex min-h-[72px] max-w-7xl items-center justify-between gap-4 px-4 sm:px-6">

          <Link
            to="/"
            className="flex items-center gap-3"
          >

  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white text-sm font-bold text-[#1B396A]">
  EA
</div>

            <div className="hidden sm:block">
<p className="font-bold text-white">
  Eventos Estudiantiles
</p>

<p className="text-xs text-white/70">
  Encuentra y registra tus eventos
</p>
            </div>

          </Link>

          <div className="flex items-center gap-4">

<Link
  to="/mis-eventos"
  className="rounded-xl border border-white/60 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-white/10"
>
  Mis eventos
</Link>

            <SesionSitec />

          </div>

        </div>

      </header>

      {/*
       * HERO
       */}
<section className="border-b border-slate-200 bg-white">

  <div className="mx-auto max-w-5xl px-4 py-14 text-center sm:px-6 sm:py-16">

    <p className="font-semibold !text-[#1B396A]">
      Eventos disponibles
    </p>

    <h1 className="mx-auto mt-6 max-w-4xl text-3xl font-bold tracking-tight !text-[#1F2937] sm:text-4xl">
      Encuentra los próximos eventos y
      regístrate fácilmente
    </h1>

    <p className="mx-auto mt-5 max-w-3xl text-base !text-[#4B5563]">
      Selecciona un evento, inicia sesión con
      SIITEC y obtén tu código QR de acceso.
    </p>

  </div>

</section>

      {/*
       * CONTENIDO
       */}
      <main className="mx-auto max-w-7xl px-4 py-14 sm:px-6">

        {/*
         * CARGANDO
         */}
        {cargando && (
          <div className="py-16 text-center">
            <p className="text-slate-500">
              Cargando eventos...
            </p>
          </div>
        )}

        {/*
         * ERROR
         */}
        {!cargando &&
          error && (
          <div className="rounded-2xl bg-red-50 p-5 text-sm text-red-700">
            {error}
          </div>
        )}

        {/*
         * SIN EVENTOS
         */}
        {!cargando &&
          !error &&
          eventos.length === 0 && (
          <div className="rounded-3xl bg-white p-10 text-center shadow-sm">

            <h2 className="text-xl font-bold text-[#1F2937]">
              No hay eventos disponibles
            </h2>

            <p className="mt-2 text-slate-500">
              Cuando se publique un nuevo evento,
              aparecerá aquí.
            </p>

          </div>
        )}

        {/*
         * EVENTOS
         */}
        {!cargando &&
          !error &&
          eventos.length > 0 && (
          <>
            <p className="mb-6 text-sm text-slate-600">
              {eventos.length}{" "}
              {eventos.length === 1
                ? "evento disponible"
                : "eventos disponibles"}
            </p>

            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">

              {eventos.map(
                (evento) => {
                  const yaRegistrado =
                    eventosRegistrados.has(
                      evento.codigo_evento
                    );

                  return (
                    <article
                      key={evento.id}
                      className="flex flex-col rounded-3xl border border-slate-200 bg-white p-6 shadow-sm"
                    >

                      {/*
                       * CABECERA
                       */}
                      <div className="flex items-center justify-between gap-3">

                        <p className="text-xs font-semibold text-[#1B396A]">
                          {
                            evento.codigo_evento
                          }
                        </p>

                        {yaRegistrado ? (
                          <span className="rounded-full bg-green-100 px-3 py-1 text-xs font-semibold text-green-700">
                            Inscrito
                          </span>
                        ) : (
                          <span className="rounded-full bg-green-100 px-3 py-1 text-xs font-semibold text-green-700">
                            Disponible
                          </span>
                        )}

                      </div>

                      {/*
                       * INFORMACIÓN
                       */}
                      <div className="mt-5 text-center">

                        <h2 className="text-xl font-bold text-[#1F2937]">
                          {evento.nombre}
                        </h2>

                        {evento.descripcion && (
                          <p className="mt-2 line-clamp-3 text-sm leading-6 text-[#4B5563]">
                            {
                              evento.descripcion
                            }
                          </p>
                        )}

                      </div>

                      {/*
                       * FECHA Y HORA
                       */}
                      <div className="mt-6 grid grid-cols-2 gap-3">

                        <div className="rounded-xl bg-slate-50 p-4 text-center">

                          <p className="text-xs font-medium uppercase text-slate-400">
                            Fecha
                          </p>

                          <p className="mt-1 text-sm font-semibold text-slate-900">
                            {formatearFecha(
                              evento.fecha_evento
                            )}
                          </p>

                        </div>

                        <div className="rounded-xl bg-slate-50 p-4 text-center">

                          <p className="text-xs font-medium uppercase text-slate-400">
                            Hora
                          </p>

                          <p className="mt-1 text-sm font-semibold text-slate-900">
                            {formatearHora(
                              evento.hora_evento
                            )}
                          </p>

                        </div>

                      </div>

                      {/*
                       * ACCIONES
                       */}
                      <div className="mt-auto pt-6">

                        {yaRegistrado ? (
                          <>
                            <button
                              type="button"
                              disabled
                              className="w-full cursor-not-allowed rounded-xl bg-green-100 px-5 py-3 font-semibold text-green-700"
                            >
                              Ya estás inscrito a este evento
                            </button>

                            <Link
                              to="/mis-eventos"
                              className="mt-3 block text-center text-sm font-semibold text-[#1B396A] transition hover:opacity-80"
                            >
                              Ver mi código QR
                            </Link>
                          </>
                        ) : (
                          <Link
                            to={`/evento/${evento.codigo_evento}`}
                            className="block w-full rounded-xl bg-[#1B396A] px-5 py-3 text-center font-semibold text-white transition hover:opacity-90"
                          >
                            Registrarme
                          </Link>
                        )}

                      </div>

                    </article>
                  );
                }
              )}

            </div>
          </>
        )}

      </main>

    </div>
  );
}