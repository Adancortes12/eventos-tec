import { useState, type FormEvent } from "react";

export type EventoCreado = {
  id: string;
  codigo_evento: string;
  nombre: string;
  descripcion: string | null;
  fecha_evento: string;
  hora_evento: string;
  estado: string;

  fecha_activacion?: string;
  duracion_minutos?: number;
  cierre_inscripcion?: string;
};

type Props = {
  abierto: boolean;
  cerrar: () => void;
  alCrear: (evento: EventoCreado) => void;
};

type RespuestaCrearEvento = {
  creado?: boolean;
  evento?: EventoCreado;
  error?: string;
};

export default function ModalNuevoEvento({ abierto, cerrar, alCrear }: Props) {
  const [nombre, setNombre] = useState("");

  const [descripcion, setDescripcion] = useState("");

  const [fechaEvento, setFechaEvento] = useState("");

  const [horaEvento, setHoraEvento] = useState("");

  const [fechaActivacion, setFechaActivacion] = useState("");

  const [duracionMinutos, setDuracionMinutos] = useState(60);

  const [creando, setCreando] = useState(false);

  const [error, setError] = useState("");

  /*
   * FECHA ACTUAL
   * YYYY-MM-DD
   */
  function obtenerFechaActual() {
    const hoy = new Date();

    const anio = hoy.getFullYear();

    const mes = String(hoy.getMonth() + 1).padStart(2, "0");

    const dia = String(hoy.getDate()).padStart(2, "0");

    return `${anio}-${mes}-${dia}`;
  }

  /*
   * FECHA Y HORA ACTUAL
   * YYYY-MM-DDTHH:mm
   */
  function obtenerFechaHoraActual() {
    const ahora = new Date();

    const anio = ahora.getFullYear();

    const mes = String(ahora.getMonth() + 1).padStart(2, "0");

    const dia = String(ahora.getDate()).padStart(2, "0");

    const horas = String(ahora.getHours()).padStart(2, "0");

    const minutos = String(ahora.getMinutes()).padStart(2, "0");

    return `${anio}-${mes}-${dia}` + `T${horas}:${minutos}`;
  }

  const fechaActual = obtenerFechaActual();

  const fechaHoraActual = obtenerFechaHoraActual();

  /*
   * LIMPIAR FORMULARIO
   */
  function limpiarFormulario() {
    setNombre("");
    setDescripcion("");
    setFechaEvento("");
    setHoraEvento("");
    setFechaActivacion("");
    setDuracionMinutos(60);
    setError("");
  }

  /*
   * CERRAR MODAL
   */
  function cerrarModal() {
    if (creando) {
      return;
    }

    limpiarFormulario();
    cerrar();
  }

  /*
   * CREAR EVENTO
   */
  async function crearEvento(e: FormEvent) {
    e.preventDefault();

    setCreando(true);
    setError("");

    /*
     * VALIDACIONES FRONTEND
     */
    if (!nombre.trim()) {
      setError("Escribe el nombre del evento.");

      setCreando(false);
      return;
    }

    if (!fechaEvento) {
      setError("Selecciona una fecha para el evento.");

      setCreando(false);
      return;
    }

    if (!horaEvento) {
      setError("Selecciona una hora para el evento.");

      setCreando(false);
      return;
    }

    if (!fechaActivacion) {
      setError("Selecciona la fecha de activación.");

      setCreando(false);
      return;
    }

    if (fechaEvento < fechaActual) {
      setError("No puedes crear un evento con una fecha anterior a hoy.");

      setCreando(false);
      return;
    }

    const inicioEvento = `${fechaEvento}T${horaEvento}`;

    if (fechaActivacion > inicioEvento) {
      setError(
        "La fecha de activación no puede ser posterior al inicio del evento.",
      );

      setCreando(false);
      return;
    }

    if (!Number.isInteger(duracionMinutos) || duracionMinutos <= 0) {
      setError("La duración del evento no es válida.");

      setCreando(false);
      return;
    }

    try {
      /*
       * YA NO INSERTAMOS DIRECTAMENTE
       * EN SUPABASE.
       *
       * TODO PASA POR EL BACKEND.
       */
      const respuesta = await fetch("/api/eventos/crear", {
        method: "POST",

        credentials: "include",

        headers: {
          "Content-Type": "application/json",
        },

        body: JSON.stringify({
          nombre: nombre.trim(),

          descripcion: descripcion.trim(),

          fechaEvento,

          horaEvento,

          fechaActivacion,

          duracionMinutos,
        }),
      });

      const datos: RespuestaCrearEvento = await respuesta.json();

      if (!respuesta.ok) {
        setError(datos.error ?? "No se pudo crear el evento.");

        setCreando(false);
        return;
      }

      if (!datos.evento) {
        setError("El servidor no devolvió el evento creado.");

        setCreando(false);
        return;
      }

      const evento = datos.evento;

      limpiarFormulario();

      setCreando(false);

      alCrear(evento);

      cerrar();
    } catch (error) {
      console.error("Error creando evento:", error);

      setError("Ocurrió un error al crear el evento.");

      setCreando(false);
    }
  }

  if (!abierto) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="max-h-[95vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white shadow-xl">
        {/*
         * ENCABEZADO
         */}
        <div className="flex items-center justify-between border-b border-gray-200 p-5 sm:p-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Nuevo evento</h2>

            <p className="mt-1 text-sm text-gray-500">
              Registra un nuevo evento estudiantil.
            </p>
          </div>

          <button
            type="button"
            onClick={cerrarModal}
            disabled={creando}
            className="rounded-lg px-3 py-2 text-gray-500 transition hover:bg-gray-100 disabled:opacity-50"
          >
            ✕
          </button>
        </div>

        {/*
         * FORMULARIO
         */}
        <form onSubmit={crearEvento} className="space-y-5 p-5 sm:p-6">
          {/*
           * CÓDIGO AUTOMÁTICO
           */}
          <div className="rounded-lg bg-blue-50 p-4">
            <p className="text-sm font-medium text-blue-700">
              Código automático
            </p>

            <p className="mt-1 text-sm text-blue-600">
              El sistema generará automáticamente el código del evento.
            </p>

            <p className="mt-1 text-xs text-blue-500">Ejemplo: EVT-2026-0001</p>
          </div>

          {/*
           * NOMBRE
           */}
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700">
              Nombre del evento
            </label>

            <input
              type="text"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              required
              maxLength={150}
              placeholder="Ej. Conferencia de tecnología"
              className="w-full rounded-lg border border-gray-300 px-4 py-3 text-gray-900 outline-none transition focus:border-blue-500"
            />
          </div>

          {/*
           * DESCRIPCIÓN
           */}
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700">
              Descripción
            </label>

            <textarea
              value={descripcion}
              onChange={(e) => setDescripcion(e.target.value)}
              rows={4}
              placeholder="Describe brevemente el evento"
              className="w-full resize-none rounded-lg border border-gray-300 px-4 py-3 text-gray-900 outline-none transition focus:border-blue-500"
            />
          </div>

          {/*
           * FECHA Y HORA
           */}
          <div className="grid gap-5 sm:grid-cols-2">
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">
                Fecha del evento
              </label>

              <input
                type="date"
                value={fechaEvento}
                min={fechaActual}
                onChange={(e) => setFechaEvento(e.target.value)}
                onClick={(e) => e.currentTarget.showPicker?.()}
                required
                className="w-full cursor-pointer rounded-lg border border-gray-300 px-4 py-3 text-gray-900 outline-none transition focus:border-blue-500"
              />

              <p className="mt-2 text-xs text-gray-500">
                Selecciona hoy o una fecha futura.
              </p>
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">
                Hora del evento
              </label>

              <input
                type="time"
                value={horaEvento}
                onChange={(e) => setHoraEvento(e.target.value)}
                onClick={(e) => e.currentTarget.showPicker?.()}
                required
                className="w-full cursor-pointer rounded-lg border border-gray-300 px-4 py-3 text-gray-900 outline-none transition focus:border-blue-500"
              />

              <p className="mt-2 text-xs text-gray-500">
                Hora de inicio del evento.
              </p>
            </div>
          </div>

          {/*
           * ACTIVACIÓN
           */}
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700">
              Activar registro desde
            </label>

            <input
              type="datetime-local"
              value={fechaActivacion}
              min={fechaHoraActual}
              onChange={(e) => setFechaActivacion(e.target.value)}
              onClick={(e) => e.currentTarget.showPicker?.()}
              required
              className="w-full cursor-pointer rounded-lg border border-gray-300 px-4 py-3 text-gray-900 outline-none transition focus:border-blue-500"
            />

            <p className="mt-2 text-xs text-gray-500">
              A partir de esta fecha y hora el evento será visible para los
              estudiantes.
            </p>
          </div>

          {/*
           * DURACIÓN
           */}
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700">
              Duración del evento
            </label>

            <select
              value={duracionMinutos}
              onChange={(e) => setDuracionMinutos(Number(e.target.value))}
              className="w-full cursor-pointer rounded-lg border border-gray-300 bg-white px-4 py-3 text-gray-900 outline-none transition focus:border-blue-500"
            >
              <option value={30}>30 minutos</option>

              <option value={60}>1 hora</option>

              <option value={90}>1 hora 30 minutos</option>

              <option value={120}>2 horas</option>

              <option value={180}>3 horas</option>

              <option value={240}>4 horas</option>

              <option value={360}>6 horas</option>

              <option value={480}>8 horas</option>
            </select>

            <p className="mt-2 text-xs text-gray-500">
              El cierre de inscripción se calculará automáticamente con la hora
              de inicio y la duración.
            </p>
          </div>

          {/*
           * RESUMEN DE CIERRE
           */}
          {fechaEvento && horaEvento && (
            <div className="rounded-lg bg-slate-50 p-4">
              <p className="text-sm font-medium text-slate-700">
                Cierre automático
              </p>

              <p className="mt-1 text-sm text-slate-500">
                Las inscripciones cerrarán automáticamente cuando termine el
                evento.
              </p>
            </div>
          )}

          {/*
           * ERROR
           */}
          {error && (
            <div className="rounded-lg bg-red-50 p-4 text-sm text-red-600">
              {error}
            </div>
          )}

          {/*
           * BOTONES
           */}
          <div className="flex flex-col-reverse gap-3 border-t border-gray-200 pt-5 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={cerrarModal}
              disabled={creando}
              className="rounded-lg border border-gray-300 px-5 py-3 font-medium text-gray-700 transition hover:bg-gray-50 disabled:opacity-50"
            >
              Cancelar
            </button>

            <button
              type="submit"
              disabled={creando}
              className="rounded-lg bg-blue-600 px-5 py-3 font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {creando ? "Creando..." : "Crear evento"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
