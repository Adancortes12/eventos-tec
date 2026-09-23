import { useEffect, useState } from "react";

import { Link, useParams } from "react-router";

import { QRCodeSVG } from "qrcode.react";

import { supabase } from "../../lib/supabase";

import {
  iniciarSesionSitec,
  obtenerSesion,
  type UsuarioSesion,
} from "../../lib/sesion";

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

type ResultadoInscripcion = {
  inscrito: boolean;
  yaExistia: boolean;

  inscripcion: {
    id: string;
    tokenQr: string;
    registradoEn: string;
    asistio: boolean;
  };

  evento: {
    codigo: string;
    nombre: string;
    fecha: string;
    hora: string;
  };
};

export default function RegistroEvento() {
  const { codigoEvento } = useParams();

  const [evento, setEvento] = useState<Evento | null>(null);

  const [usuario, setUsuario] = useState<UsuarioSesion | null>(null);

  const [cargando, setCargando] = useState(true);

  const [registrando, setRegistrando] = useState(false);
  const [yaRegistrado, setYaRegistrado] = useState(false);

  const [resultado, setResultado] = useState<ResultadoInscripcion | null>(null);

  const [error, setError] = useState("");

  useEffect(() => {
    async function cargarPagina() {
      try {
        setCargando(true);
        setError("");

        /*
         * 1. CONSULTAR SESIÓN
         */
        const sesion = await obtenerSesion();

        setUsuario(sesion);
        /*
         * COMPROBAR SI YA ESTÁ INSCRITO
         */
        if (sesion?.tipo === "estudiante" && codigoEvento) {
          try {
            const respuestaInscripciones = await fetch(
              "/api/eventos/mis-eventos",
              {
                method: "GET",
                credentials: "include",
              },
            );

            if (respuestaInscripciones.ok) {
              const datosInscripciones = await respuestaInscripciones.json();

              const existe =
                datosInscripciones.eventos?.some(
                  (inscripcion: {
                    evento: {
                      codigo_evento: string;
                    };
                  }) => inscripcion.evento.codigo_evento === codigoEvento,
                ) ?? false;

              setYaRegistrado(existe);
            }
          } catch (error) {
            console.error("Error comprobando inscripción:", error);
          }
        }
        /*
         * 2. VALIDAR CÓDIGO
         */
        if (!codigoEvento) {
          setError("No se recibió un código de evento válido.");

          return;
        }

        /*
         * 3. CONSULTAR EVENTO
         */
        const { data, error: errorEvento } = await supabase
          .from("eventos")
          .select(
            `
            id,
            codigo_evento,
            nombre,
            descripcion,
            fecha_evento,
            hora_evento,
            estado,
            fecha_activacion,
            cierre_inscripcion
          `,
          )
          .eq("codigo_evento", codigoEvento)
          .maybeSingle();

        if (errorEvento) {
          console.error(errorEvento);

          setError("No se pudo consultar el evento.");

          return;
        }

        if (!data) {
          setError("El evento no existe o ya no está disponible.");

          return;
        }

        setEvento(data);
      } catch (error) {
        console.error("Error cargando evento:", error);

        setError("Ocurrió un error al cargar el evento.");
      } finally {
        setCargando(false);
      }
    }

    cargarPagina();
  }, [codigoEvento]);

  async function inscribirme() {
    if (!codigoEvento) {
      return;
    }

    try {
      setRegistrando(true);
      setError("");

      const respuesta = await fetch("/api/eventos/inscribirse", {
        method: "POST",

        credentials: "include",

        headers: {
          "Content-Type": "application/json",
        },

        body: JSON.stringify({
          codigoEvento,
        }),
      });

      const datos = await respuesta.json();

      if (!respuesta.ok) {
        setError(datos.error ?? "No se pudo realizar la inscripción.");

        return;
      }

      setResultado(datos);
    } catch (error) {
      console.error("Error inscribiendo:", error);

      setError("Ocurrió un error al realizar la inscripción.");
    } finally {
      setRegistrando(false);
    }
  }

  function formatearFecha(fecha: string) {
    const [year, month, day] = fecha.split("-");

    return `${day}/${month}/${year}`;
  }

  function formatearHora(hora: string) {
    return hora.slice(0, 5);
  }

  /*
   * CARGANDO
   */
  if (cargando) {
    return (
      <main className="min-h-screen bg-slate-100 flex items-center justify-center">
        <p className="text-slate-500">Cargando evento...</p>
      </main>
    );
  }

  /*
   * ERROR SIN EVENTO
   */
  if (!evento) {
    return (
      <main className="min-h-screen bg-slate-100 flex items-center justify-center px-4">
        <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-sm text-center">
          <h1 className="text-xl font-bold text-slate-800">
            Evento no disponible
          </h1>

          <p className="mt-3 text-slate-500">{error}</p>

          <Link
            to="/"
            className="mt-6 inline-block rounded-xl bg-blue-600 px-5 py-2.5 font-semibold text-white hover:bg-blue-700"
          >
            Volver al inicio
          </Link>
        </div>
      </main>
    );
  }

  /*
   * INSCRIPCIÓN EXITOSA
   */
  if (resultado) {
    return (
      <main className="min-h-screen bg-slate-100">
        <div className="mx-auto max-w-2xl px-4 py-10">
          <div className="rounded-3xl bg-white p-8 shadow-sm">
            <div className="text-center">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-green-100 text-2xl">
                ✓
              </div>

              <h1 className="mt-4 text-2xl font-bold text-slate-900">
                {resultado.yaExistia
                  ? "Ya estás inscrito"
                  : "Inscripción realizada"}
              </h1>

              <p className="mt-2 text-slate-500">{resultado.evento.nombre}</p>
            </div>

            <div className="mt-8 flex justify-center">
              <div className="rounded-2xl border border-slate-200 bg-white p-5">
                <QRCodeSVG
                  value={resultado.inscripcion.tokenQr}
                  size={230}
                  level="H"
                />
              </div>
            </div>

            <p className="mt-5 text-center text-sm text-slate-500">
              Presenta este código QR al momento de registrar tu asistencia.
            </p>

            {resultado.inscripcion.asistio && (
              <div className="mt-5 rounded-xl bg-green-50 p-4 text-center text-sm font-medium text-green-700">
                Tu asistencia ya fue registrada.
              </div>
            )}

            <div className="mt-8 grid gap-3 sm:grid-cols-2">
              <Link
                to="/mis-eventos"
                className="rounded-xl bg-blue-600 px-5 py-3 text-center font-semibold text-white hover:bg-blue-700"
              >
                Mis eventos
              </Link>

              <Link
                to="/"
                className="rounded-xl border border-slate-300 px-5 py-3 text-center font-semibold text-slate-700 hover:bg-slate-50"
              >
                Ver más eventos
              </Link>
            </div>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-100">
      <div className="mx-auto max-w-2xl px-4 py-10">
        <Link
          to="/"
          className="text-sm font-medium text-blue-600 hover:text-blue-700"
        >
          ← Volver a eventos
        </Link>

        <div className="mt-5 overflow-hidden rounded-3xl bg-white shadow-sm">
          <div className="bg-blue-600 p-8 text-white">
            <p className="text-sm font-medium text-blue-100">
              {evento.codigo_evento}
            </p>

            <h1 className="mt-2 text-3xl font-bold">{evento.nombre}</h1>
          </div>

          <div className="p-8">
            {evento.descripcion && (
              <p className="text-slate-600">{evento.descripcion}</p>
            )}

            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              <div className="rounded-xl bg-slate-50 p-4">
                <p className="text-xs font-semibold uppercase text-slate-400">
                  Fecha
                </p>

                <p className="mt-1 font-semibold text-slate-800">
                  {formatearFecha(evento.fecha_evento)}
                </p>
              </div>

              <div className="rounded-xl bg-slate-50 p-4">
                <p className="text-xs font-semibold uppercase text-slate-400">
                  Hora
                </p>

                <p className="mt-1 font-semibold text-slate-800">
                  {formatearHora(evento.hora_evento)}
                </p>
              </div>
            </div>

            {error && (
              <div className="mt-6 rounded-xl bg-red-50 p-4 text-sm text-red-700">
                {error}
              </div>
            )}

            {/*
              SIN SESIÓN
            */}
            {!usuario && (
              <div className="mt-8 rounded-2xl border border-slate-200 p-6 text-center">
                <h2 className="text-lg font-bold text-slate-800">
                  Inicia sesión para inscribirte
                </h2>

                <p className="mt-2 text-sm text-slate-500">
                  Usaremos tu cuenta institucional de SITEc.
                </p>

                <button
                  type="button"
                  onClick={iniciarSesionSitec}
                  className="mt-5 w-full rounded-xl bg-blue-600 px-5 py-3 font-semibold text-white transition hover:bg-blue-700"
                >
                  Iniciar sesión con SITEc
                </button>
              </div>
            )}

            {/*
              MAESTRO
            */}
            {usuario?.tipo === "maestro" && (
              <div className="mt-8 rounded-2xl bg-amber-50 p-6 text-center">
                <h2 className="font-bold text-amber-900">Sesión de maestro</h2>

                <p className="mt-2 text-sm text-amber-700">
                  Las inscripciones a eventos están disponibles únicamente para
                  estudiantes.
                </p>
              </div>
            )}

            {/*
              ESTUDIANTE
            */}
            {usuario?.tipo === "estudiante" && (
              <div className="mt-8">
                <div className="rounded-xl bg-blue-50 p-4">
                  <p className="text-sm text-blue-800">
                    Estás identificado con tu cuenta de SITEc. Tus datos se
                    obtendrán automáticamente.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={inscribirme}
                  disabled={registrando || yaRegistrado}
                  className={`
    mt-5
    w-full
    rounded-xl
    px-5
    py-3.5
    font-semibold
    text-white
    transition
    ${
      yaRegistrado
        ? "cursor-not-allowed bg-green-600"
        : "bg-blue-600 hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
    }
  `}
                >
                  {yaRegistrado
                    ? "Registrado"
                    : registrando
                      ? "Registrando..."
                      : "Inscribirme al evento"}
                </button>
                {yaRegistrado && (
                  <Link
                    to="/mis-eventos"
                    className="mt-3 block text-center text-sm font-semibold text-blue-600 hover:text-blue-700"
                  >
                    Ver mi código QR
                  </Link>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
