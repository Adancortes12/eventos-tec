import {
  useEffect,
  useState,
} from "react";

import {
  Link,
} from "react-router";

import {
  QRCodeSVG,
} from "qrcode.react";

import {
  iniciarSesionSitec,
} from "../../lib/sesion";

type Evento = {
  id: string;
  codigo_evento: string;
  nombre: string;
  descripcion: string | null;
  fecha_evento: string;
  hora_evento: string;
  estado: string;
  cierre_inscripcion: string | null;
};

type InscripcionEvento = {
  inscripcionId: string;
  tokenQr: string;
  registradoEn: string;
  asistio: boolean;
  asistioEn: string | null;
  evento: Evento;
};

type RespuestaMisEventos = {
  autenticado: boolean;
  eventos?: InscripcionEvento[];
  error?: string;
};

export default function MisEventos() {
  const [
    eventos,
    setEventos,
  ] = useState<InscripcionEvento[]>([]);

  const [
    cargando,
    setCargando,
  ] = useState(true);

  const [
    autenticado,
    setAutenticado,
  ] = useState(true);

  const [
    error,
    setError,
  ] = useState("");

  

  const [
    qrAbierto,
    setQrAbierto,
  ] = useState<string | null>(null);

  

  useEffect(() => {
    async function cargarEventos() {
      try {
        setCargando(true);
        setError("");

        const respuesta =
          await fetch(
            "/api/eventos/mis-eventos",
            {
              method: "GET",
              credentials: "include",
            }
          );

        const datos: RespuestaMisEventos =
          await respuesta.json();

        if (
          respuesta.status === 401
        ) {
          setAutenticado(false);
          setEventos([]);

          return;
        }

        if (!respuesta.ok) {
          setError(
            datos.error ??
              "No se pudieron cargar tus eventos."
          );

          return;
        }

        setAutenticado(true);

        setEventos(
          datos.eventos ?? []
        );
      } catch (error) {
        console.error(
          "Error cargando eventos:",
          error
        );

        setError(
          "Ocurrió un error al cargar tus eventos."
        );
      } finally {
        setCargando(false);
      }
    }

    cargarEventos();
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

    if (
      !year ||
      !month ||
      !day
    ) {
      return fecha;
    }

    return `${day}/${month}/${year}`;
  }

  function formatearHora(
    hora: string
  ) {
    if (!hora) {
      return "";
    }

    return hora.slice(0, 5);
  }

  /*
   * CARGANDO
   */
  if (cargando) {
    return (
      <main className="min-h-screen bg-slate-100">
        <div className="mx-auto max-w-5xl px-4 py-10">
          <p className="text-center text-slate-500">
            Cargando tus eventos...
          </p>
        </div>
      </main>
    );
  }

  /*
   * SIN SESIÓN
   */
  if (!autenticado) {
    return (
      <main className="min-h-screen bg-slate-100">
        <div className="mx-auto max-w-lg px-4 py-16">

          <div className="rounded-3xl bg-white p-8 text-center shadow-sm">

            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-blue-100 text-xl">
              🔒
            </div>

            <h1 className="mt-5 text-2xl font-bold text-slate-900">
              Inicia sesión
            </h1>

            <p className="mt-2 text-slate-500">
              Inicia sesión con SIITEC para
              consultar tus eventos y códigos QR.
            </p>

            <button
              type="button"
              onClick={
                iniciarSesionSitec
              }
              className="mt-6 w-full rounded-xl bg-blue-600 px-5 py-3 font-semibold text-white transition hover:bg-blue-700"
            >
              Iniciar sesión con SIITEC
            </button>

            <Link
              to="/"
              className="mt-4 block text-sm font-medium text-slate-500 hover:text-slate-700"
            >
              Volver al inicio
            </Link>

          </div>

        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-100">

      <div className="mx-auto max-w-5xl px-4 py-10">

        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">

          <div>

            <Link
              to="/"
              className="text-sm font-medium text-blue-600 hover:text-blue-700"
            >
              ← Volver a eventos
            </Link>

            <h1 className="mt-3 text-3xl font-bold text-slate-900">
              Mis eventos
            </h1>

            <p className="mt-1 text-slate-500">
              Consulta tus inscripciones y códigos QR.
            </p>

          </div>

        </div>

        {error && (
          <div className="mt-6 rounded-xl bg-red-50 p-4 text-sm text-red-700">
            {error}
          </div>
        )}

        {/*
         * SIN EVENTOS
         */}
        {!error &&
          eventos.length === 0 && (
          <div className="mt-8 rounded-3xl bg-white p-10 text-center shadow-sm">

            <h2 className="text-xl font-bold text-slate-800">
              Aún no tienes eventos
            </h2>

            <p className="mt-2 text-slate-500">
              Cuando te inscribas a un evento,
              aparecerá aquí junto con tu QR.
            </p>

            <Link
              to="/"
              className="mt-6 inline-block rounded-xl bg-blue-600 px-5 py-3 font-semibold text-white hover:bg-blue-700"
            >
              Ver eventos disponibles
            </Link>

          </div>
        )}

        {/*
         * LISTA DE EVENTOS
         */}
        {eventos.length > 0 && (
          <div className="mt-8 grid gap-6 md:grid-cols-2">

            {eventos.map(
              (inscripcion) => {
                const evento =
                  inscripcion.evento;

                return (
                  <article
                    key={
                      inscripcion.inscripcionId
                    }
                    className="overflow-hidden rounded-3xl bg-white shadow-sm"
                  >

                    <div className="p-6">

                      <div className="flex items-start justify-between gap-4">

                        <div>

                          <p className="text-sm font-semibold text-blue-600">
                            {
                              evento.codigo_evento
                            }
                          </p>

                          <h2 className="mt-1 text-xl font-bold text-slate-900">
                            {evento.nombre}
                          </h2>

                        </div>

                        {inscripcion.asistio ? (
                          <span className="rounded-full bg-green-100 px-3 py-1 text-xs font-semibold text-green-700">
                            Asistencia registrada
                          </span>
                        ) : (
                          <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-700">
                            Pendiente
                          </span>
                        )}

                      </div>

                      {evento.descripcion && (
                        <p className="mt-3 text-sm text-slate-500">
                          {
                            evento.descripcion
                          }
                        </p>
                      )}

                      <div className="mt-5 grid grid-cols-2 gap-3">

                        <div className="rounded-xl bg-slate-50 p-3">

                          <p className="text-xs font-semibold uppercase text-slate-400">
                            Fecha
                          </p>

                          <p className="mt-1 font-semibold text-slate-700">
                            {formatearFecha(
                              evento.fecha_evento
                            )}
                          </p>

                        </div>

                        <div className="rounded-xl bg-slate-50 p-3">

                          <p className="text-xs font-semibold uppercase text-slate-400">
                            Hora
                          </p>

                          <p className="mt-1 font-semibold text-slate-700">
                            {formatearHora(
                              evento.hora_evento
                            )}
                          </p>

                        </div>

                      </div>

                      {qrAbierto ===
                      inscripcion.inscripcionId ? (
                        <div className="mt-6">

                          <div className="flex justify-center rounded-2xl border border-slate-200 bg-white p-5">

                            <QRCodeSVG
                              value={
                                inscripcion.tokenQr
                              }
                              size={220}
                              level="H"
                            />

                          </div>

                          <p className="mt-3 text-center text-sm text-slate-500">
                            Presenta este código QR al
                            momento de registrar tu
                            asistencia.
                          </p>

                          <button
                            type="button"
                            onClick={() =>
                              setQrAbierto(
                                null
                              )
                            }
                            className="mt-4 w-full rounded-xl border border-slate-300 px-4 py-2.5 font-semibold text-slate-700 transition hover:bg-slate-50"
                          >
                            Ocultar QR
                          </button>

                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() =>
                            setQrAbierto(
                              inscripcion.inscripcionId
                            )
                          }
                          className="mt-6 w-full rounded-xl bg-blue-600 px-5 py-3 font-semibold text-white transition hover:bg-blue-700"
                        >
                          Mostrar mi QR
                        </button>
                      )}

                      <Link
                        to={`/evento/${evento.codigo_evento}`}
                        className="mt-3 block text-center text-sm font-semibold text-blue-600 hover:text-blue-700"
                      >
                        Ver evento
                      </Link>

                    </div>

                  </article>
                );
              }
            )}

          </div>
        )}

      </div>

    </main>
  );
}