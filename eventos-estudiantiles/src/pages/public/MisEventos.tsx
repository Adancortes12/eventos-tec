import { useMemo, useState } from "react";
import { Link } from "react-router";
import { QRCodeSVG } from "qrcode.react";

import {
  obtenerInscripcionesLocales,
  type InscripcionLocal,
} from "../../lib/inscripcionesLocales";

function formatearFecha(fecha: string) {
  const [anio, mes, dia] =
    fecha.split("-").map(Number);

  const fechaLocal = new Date(
    anio,
    mes - 1,
    dia
  );

  return fechaLocal.toLocaleDateString(
    "es-MX",
    {
      day: "numeric",
      month: "long",
      year: "numeric",
    }
  );
}

function formatearHora(hora: string) {
  const [horas, minutos] =
    hora.split(":");

  const fecha = new Date();

  fecha.setHours(
    Number(horas),
    Number(minutos),
    0,
    0
  );

  return fecha.toLocaleTimeString(
    "es-MX",
    {
      hour: "numeric",
      minute: "2-digit",
    }
  );
}

export default function MisEventos() {
  const [eventoSeleccionado, setEventoSeleccionado] =
    useState<InscripcionLocal | null>(null);

  const inscripciones = useMemo(
    () => obtenerInscripcionesLocales(),
    []
  );

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
              <p className="font-bold text-slate-900">
                Eventos Estudiantiles
              </p>

              <p className="text-xs text-slate-500">
                Mis inscripciones
              </p>
            </div>
          </div>

          <Link
            to="/"
            className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
          >
            Ver eventos
          </Link>
        </div>
      </header>

      <section className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
        <div>
          <p className="text-sm font-semibold text-blue-600">
            Mis eventos
          </p>

          <h1 className="mt-1 text-3xl font-bold text-slate-900">
            Tus eventos registrados
          </h1>

          <p className="mt-2 max-w-2xl text-slate-500">
            Aquí puedes consultar los eventos en los que te registraste desde este dispositivo y volver a mostrar tu código QR.
          </p>
        </div>

        {inscripciones.length === 0 ? (
          <div className="mt-8 rounded-2xl border border-slate-200 bg-white p-10 text-center shadow-sm">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-slate-100 text-xl">
              🎟️
            </div>

            <h2 className="mt-4 text-xl font-bold text-slate-900">
              Todavía no tienes eventos
            </h2>

            <p className="mt-2 text-sm text-slate-500">
              Regístrate a un evento y aparecerá aquí automáticamente.
            </p>

            <Link
              to="/"
              className="mt-6 inline-block rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-700"
            >
              Ver eventos disponibles
            </Link>
          </div>
        ) : (
          <div className="mt-8 grid gap-5 md:grid-cols-2">
            {inscripciones.map((inscripcion) => (
              <article
                key={`${inscripcion.eventoId}-${inscripcion.numeroEstudiante}`}
                className="flex flex-col rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-xs font-semibold text-blue-600">
                    {inscripcion.codigoEvento}
                  </span>

                  <span className="rounded-full bg-blue-100 px-3 py-1 text-xs font-semibold text-blue-700">
                    Registrado
                  </span>
                </div>

                <h2 className="mt-4 text-xl font-bold text-slate-900">
                  {inscripcion.nombreEvento}
                </h2>

                {inscripcion.descripcionEvento && (
                  <p className="mt-2 line-clamp-3 text-sm leading-6 text-slate-500">
                    {inscripcion.descripcionEvento}
                  </p>
                )}

                <div className="mt-5 grid gap-3 sm:grid-cols-2">
                  <div className="rounded-xl bg-slate-50 p-3">
                    <p className="text-xs uppercase tracking-wide text-slate-400">
                      Fecha
                    </p>

                    <p className="mt-1 text-sm font-semibold capitalize text-slate-800">
                      {formatearFecha(
                        inscripcion.fechaEvento
                      )}
                    </p>
                  </div>

                  <div className="rounded-xl bg-slate-50 p-3">
                    <p className="text-xs uppercase tracking-wide text-slate-400">
                      Hora
                    </p>

                    <p className="mt-1 text-sm font-semibold text-slate-800">
                      {formatearHora(
                        inscripcion.horaEvento
                      )}
                    </p>
                  </div>
                </div>

                <div className="mt-5 rounded-xl bg-slate-50 p-4">
                  <p className="font-semibold text-slate-900">
                    {inscripcion.nombreCompleto}
                  </p>

                  <p className="mt-1 text-sm text-slate-500">
                    {inscripcion.numeroEstudiante}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() =>
                    setEventoSeleccionado(
                      inscripcion
                    )
                  }
                  className="mt-5 w-full rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-700"
                >
                  Ver mi QR
                </button>
              </article>
            ))}
          </div>
        )}
      </section>

      {/* Modal QR */}
      {eventoSeleccionado && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-5 shadow-xl sm:p-7">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold text-blue-600">
                  {eventoSeleccionado.codigoEvento}
                </p>

                <h2 className="mt-1 text-xl font-bold text-slate-900">
                  {eventoSeleccionado.nombreEvento}
                </h2>
              </div>

              <button
                type="button"
                onClick={() =>
                  setEventoSeleccionado(null)
                }
                className="rounded-lg px-3 py-2 text-slate-500 transition hover:bg-slate-100"
              >
                ✕
              </button>
            </div>

            <div className="mt-6 text-center">
              <p className="font-semibold text-slate-900">
                {eventoSeleccionado.nombreCompleto}
              </p>

              <p className="mt-1 text-sm text-slate-500">
                {eventoSeleccionado.numeroEstudiante}
              </p>
            </div>

            <div className="mt-6 flex justify-center">
              <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
                <QRCodeSVG
                  value={
                    eventoSeleccionado.tokenQr
                  }
                  size={230}
                  level="H"
                />
              </div>
            </div>

            <div className="mt-6 rounded-xl bg-blue-50 p-4 text-center">
              <p className="text-sm font-semibold text-blue-700">
                Presenta este QR al ingresar
              </p>

              <p className="mt-1 text-xs text-blue-600">
                Te recomendamos guardar una captura de pantalla.
              </p>
            </div>

            <button
              type="button"
              onClick={() =>
                setEventoSeleccionado(null)
              }
              className="mt-5 w-full rounded-xl bg-slate-900 px-5 py-3 font-semibold text-white transition hover:bg-slate-800"
            >
              Cerrar
            </button>
          </div>
        </div>
      )}
    </main>
  );
}