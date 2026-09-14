import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { Link, useParams } from "react-router";
import { QRCodeSVG } from "qrcode.react";

import { supabase } from "../../lib/supabase";
import { guardarInscripcionLocal } from "../../lib/inscripcionesLocales";

import {
  escucharInstalacionDisponible,
  escucharPwaInstalada,
  instalarPwa,
  puedeInstalarPwa,
  pwaEstaInstalada,
} from "../../lib/instalacionPwa";

type Evento = {
  id: string;
  codigo_evento: string;
  nombre: string;
  descripcion: string | null;
  fecha_evento: string;
  hora_evento: string;
  estado: string;
};

export default function RegistroEvento() {
  const { codigoEvento } = useParams();

  const [evento, setEvento] =
    useState<Evento | null>(null);

  const [
    numeroEstudiante,
    setNumeroEstudiante,
  ] = useState("");

  const [
    nombreCompleto,
    setNombreCompleto,
  ] = useState("");

  const [cargando, setCargando] =
    useState(Boolean(codigoEvento));

  const [registrando, setRegistrando] =
    useState(false);

  const [error, setError] =
    useState("");

  const [
    registroExitoso,
    setRegistroExitoso,
  ] = useState(false);

  const [tokenQr, setTokenQr] =
    useState("");

  const [
    instalacionDisponible,
    setInstalacionDisponible,
  ] = useState(() =>
    puedeInstalarPwa()
  );

  const [
    pwaInstalada,
    setPwaInstalada,
  ] = useState(() =>
    pwaEstaInstalada()
  );

  const [
    mensajeInstalacion,
    setMensajeInstalacion,
  ] = useState("");

  useEffect(() => {
    const dejarDeEscucharDisponible =
      escucharInstalacionDisponible(
        () => {
          setInstalacionDisponible(
            true
          );
        }
      );

    const dejarDeEscucharInstalada =
      escucharPwaInstalada(() => {
        setPwaInstalada(true);
        setInstalacionDisponible(
          false
        );

        setMensajeInstalacion(
          "La aplicación se instaló correctamente."
        );
      });

    return () => {
      dejarDeEscucharDisponible();
      dejarDeEscucharInstalada();
    };
  }, []);

  useEffect(() => {
    if (!codigoEvento) {
      return;
    }

    let activo = true;

    const cargarEvento = async () => {
      const { data, error } =
        await supabase
          .from("eventos")
          .select(`
            id,
            codigo_evento,
            nombre,
            descripcion,
            fecha_evento,
            hora_evento,
            estado
          `)
          .eq(
            "codigo_evento",
            codigoEvento
          )
          .single();

      if (!activo) {
        return;
      }

      if (error || !data) {
        console.error(error);

        setEvento(null);

        setError(
          "El evento no existe o ya no está disponible."
        );

        setCargando(false);

        return;
      }

      setEvento(data);
      setError("");
      setCargando(false);
    };

    cargarEvento();

    return () => {
      activo = false;
    };
  }, [codigoEvento]);

  const registrarEstudiante = async (
    e: FormEvent
  ) => {
    e.preventDefault();

    if (!evento) {
      return;
    }

    setRegistrando(true);
    setError("");

    const numeroLimpio =
      numeroEstudiante.trim();

    const nombreLimpio =
      nombreCompleto.trim();

    if (
      !numeroLimpio ||
      !nombreLimpio
    ) {
      setError(
        "Completa todos los campos."
      );

      setRegistrando(false);

      return;
    }

    const nuevoTokenQr =
      crypto.randomUUID();

    const { error } = await supabase
      .from("inscripciones")
      .insert({
        evento_id: evento.id,
        numero_estudiante:
          numeroLimpio,
        nombre_completo:
          nombreLimpio,
        token_qr:
          nuevoTokenQr,
      });

    if (error) {
      console.error(error);

      if (error.code === "23505") {
        setError(
          "Este número de estudiante ya está registrado en este evento."
        );
      } else {
        setError(
          "No se pudo realizar el registro. Intenta nuevamente."
        );
      }

      setRegistrando(false);

      return;
    }

    guardarInscripcionLocal({
      eventoId: evento.id,
      codigoEvento:
        evento.codigo_evento,
      nombreEvento:
        evento.nombre,
      descripcionEvento:
        evento.descripcion,
      fechaEvento:
        evento.fecha_evento,
      horaEvento:
        evento.hora_evento,
      numeroEstudiante:
        numeroLimpio,
      nombreCompleto:
        nombreLimpio,
      tokenQr:
        nuevoTokenQr,
      registradoEn:
        new Date().toISOString(),
    });

    setNumeroEstudiante(
      numeroLimpio
    );

    setNombreCompleto(
      nombreLimpio
    );

    setTokenQr(
      nuevoTokenQr
    );

    setRegistroExitoso(true);
    setRegistrando(false);
  };

  const instalarAplicacion =
    async () => {
      setMensajeInstalacion("");

      if (pwaEstaInstalada()) {
        setPwaInstalada(true);

        setMensajeInstalacion(
          "La aplicación ya está instalada."
        );

        return;
      }

      if (!puedeInstalarPwa()) {
        setMensajeInstalacion(
          "Si no aparece el instalador, abre el menú de tu navegador y selecciona Instalar aplicación o Agregar a pantalla de inicio."
        );

        return;
      }

      const instalada =
        await instalarPwa();

      if (instalada) {
        setPwaInstalada(true);

        setInstalacionDisponible(
          false
        );

        setMensajeInstalacion(
          "La aplicación se instaló correctamente."
        );
      } else {
        setInstalacionDisponible(
          false
        );

        setMensajeInstalacion(
          "La instalación fue cancelada. Puedes instalarla después desde el menú del navegador."
        );
      }
    };

  if (!codigoEvento) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-100 p-4">
        <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-red-100 text-xl font-bold text-red-600">
            !
          </div>

          <h1 className="mt-5 text-2xl font-bold text-slate-900">
            Evento no válido
          </h1>

          <p className="mt-3 text-slate-500">
            No se proporcionó un código de evento.
          </p>
        </div>
      </main>
    );
  }

  if (cargando) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-100 px-4">
        <p className="font-medium text-slate-600">
          Cargando evento...
        </p>
      </main>
    );
  }

  if (error && !evento) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-100 p-4">
        <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-red-100 text-xl font-bold text-red-600">
            !
          </div>

          <h1 className="mt-5 text-2xl font-bold text-slate-900">
            Evento no disponible
          </h1>

          <p className="mt-3 text-slate-500">
            {error}
          </p>
        </div>
      </main>
    );
  }

  if (!evento) {
    return null;
  }

  return (
    <main className="min-h-screen bg-slate-100">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-4 px-4 py-4 sm:px-6">
          <Link
            to="/"
            className="flex items-center gap-3"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600 font-bold text-white">
              EA
            </div>

            <div>
              <p className="font-bold text-slate-900">
                Eventos Estudiantiles
              </p>

              <p className="text-xs text-slate-500">
                Registro de participantes
              </p>
            </div>
          </Link>

          <Link
            to="/mis-eventos"
            className="text-sm font-semibold text-blue-600"
          >
            Mis eventos
          </Link>
        </div>
      </header>

      <div className="mx-auto max-w-3xl px-4 py-6 sm:px-6 sm:py-10">
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-semibold text-blue-600">
              {evento.codigo_evento}
            </span>

            <span className="rounded-full bg-green-100 px-3 py-1 text-xs font-semibold text-green-700">
              Registro abierto
            </span>
          </div>

          <h1 className="mt-4 text-3xl font-bold tracking-tight text-slate-900">
            {evento.nombre}
          </h1>

          {evento.descripcion && (
            <p className="mt-3 leading-7 text-slate-500">
              {evento.descripcion}
            </p>
          )}

          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            <div className="rounded-xl bg-slate-50 p-4">
              <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
                Fecha
              </p>

              <p className="mt-1 font-semibold text-slate-800">
                {evento.fecha_evento}
              </p>
            </div>

            <div className="rounded-xl bg-slate-50 p-4">
              <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
                Hora
              </p>

              <p className="mt-1 font-semibold text-slate-800">
                {evento.hora_evento}
              </p>
            </div>
          </div>
        </section>

        {!registroExitoso ? (
          <section className="mt-5 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
            <p className="text-sm font-semibold text-blue-600">
              Registro
            </p>

            <h2 className="mt-1 text-2xl font-bold text-slate-900">
              Regístrate al evento
            </h2>

            <p className="mt-2 text-sm text-slate-500">
              Ingresa tus datos para generar tu código QR de acceso.
            </p>

            <form
              onSubmit={
                registrarEstudiante
              }
              className="mt-6 space-y-5"
            >
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  Número de estudiante
                </label>

                <input
                  type="text"
                  value={
                    numeroEstudiante
                  }
                  onChange={(e) =>
                    setNumeroEstudiante(
                      e.target.value
                    )
                  }
                  required
                  autoComplete="off"
                  placeholder="Ej. 202312345"
                  className="w-full rounded-xl border border-slate-300 px-4 py-3.5 text-slate-900 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  Nombre completo
                </label>

                <input
                  type="text"
                  value={
                    nombreCompleto
                  }
                  onChange={(e) =>
                    setNombreCompleto(
                      e.target.value
                    )
                  }
                  required
                  autoComplete="name"
                  placeholder="Juan Pérez López"
                  className="w-full rounded-xl border border-slate-300 px-4 py-3.5 text-slate-900 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                />
              </div>

              {error && (
                <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-600">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={registrando}
                className="w-full rounded-xl bg-blue-600 px-5 py-3.5 font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {registrando
                  ? "Registrando..."
                  : "Registrarme"}
              </button>
            </form>
          </section>
        ) : (
          <section className="mt-5 rounded-2xl border border-green-200 bg-white p-5 shadow-sm sm:p-7">
            <div className="text-center">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-green-100 text-2xl font-bold text-green-600">
                ✓
              </div>

              <p className="mt-5 text-sm font-semibold text-green-600">
                Registro completado
              </p>

              <h2 className="mt-1 text-2xl font-bold text-slate-900">
                ¡Ya estás registrado!
              </h2>

              <p className="mt-2 text-sm text-slate-500">
                Este evento fue guardado en este dispositivo.
                Te recomendamos tomar una captura de pantalla de tu QR.
              </p>
            </div>

            <div className="mt-6 rounded-xl bg-slate-50 p-4 text-center">
              <p className="font-semibold text-slate-900">
                {nombreCompleto}
              </p>

              <p className="mt-1 text-sm text-slate-500">
                {numeroEstudiante}
              </p>
            </div>

            <div className="mt-6 flex justify-center">
              <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
                <QRCodeSVG
                  value={tokenQr}
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
                También podrás consultarlo desde Mis eventos.
              </p>
            </div>

            {/* Instalación PWA */}
            {!pwaInstalada && (
              <div className="mt-6 rounded-2xl border border-blue-200 bg-blue-50 p-5">
                <p className="font-bold text-slate-900">
                  Guarda tus QR en tu celular
                </p>

                <p className="mt-2 text-sm leading-6 text-slate-600">
                  Instala Eventos Estudiantiles para acceder fácilmente a tus eventos registrados y códigos QR.
                </p>

                <button
                  type="button"
                  onClick={
                    instalarAplicacion
                  }
                  className="mt-4 w-full rounded-xl bg-blue-600 px-5 py-3 font-semibold text-white transition hover:bg-blue-700"
                >
                  Instalar aplicación
                </button>

                {instalacionDisponible && (
                  <p className="mt-2 text-center text-xs text-green-700">
                    Tu dispositivo permite instalar la aplicación.
                  </p>
                )}
              </div>
            )}

            {pwaInstalada && (
              <div className="mt-6 rounded-xl bg-green-50 p-4 text-center">
                <p className="text-sm font-semibold text-green-700">
                  ✓ Aplicación instalada
                </p>
              </div>
            )}

            {mensajeInstalacion && (
              <div className="mt-4 rounded-xl bg-slate-100 p-4 text-center text-sm text-slate-600">
                {mensajeInstalacion}
              </div>
            )}

            {/* Navegación */}
            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              <Link
                to="/mis-eventos"
                className="rounded-xl bg-slate-900 px-5 py-3 text-center font-semibold text-white transition hover:bg-slate-800"
              >
                Ir a Mis eventos
              </Link>

              <Link
                to="/"
                className="rounded-xl border border-slate-300 px-5 py-3 text-center font-semibold text-slate-700 transition hover:bg-slate-50"
              >
                Ver otros eventos
              </Link>
            </div>
          </section>
        )}

        <p className="py-6 text-center text-xs text-slate-400">
          Sistema de registro de eventos estudiantiles
        </p>
      </div>
    </main>
  );
}