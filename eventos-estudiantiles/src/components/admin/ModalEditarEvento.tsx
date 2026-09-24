import { useState } from "react";
import type { FormEvent } from "react";

type Evento = {
  id: string;
  nombre: string;
  descripcion: string | null;
  fecha_evento: string;
  hora_evento: string;
  estado: string;
  fecha_activacion: string;
  duracion_minutos: number;
};

type Props = {
  evento: Evento;
  cerrar: () => void;
  alActualizar: () => void | Promise<void>;
};

function prepararFechaHora(
  fecha: string
) {
  if (!fecha) {
    return "";
  }

  return fecha.slice(0, 16);
}

export default function ModalEditarEvento({
  evento,
  cerrar,
  alActualizar,
}: Props) {
  const [nombre, setNombre] = useState(
    evento.nombre
  );

  const [descripcion, setDescripcion] =
    useState(
      evento.descripcion ?? ""
    );

  const [fechaEvento, setFechaEvento] =
    useState(
      evento.fecha_evento
    );

  const [horaEvento, setHoraEvento] =
    useState(
      evento.hora_evento.slice(
        0,
        5
      )
    );

  const [
    fechaActivacion,
    setFechaActivacion,
  ] = useState(
    prepararFechaHora(
      evento.fecha_activacion
    )
  );

  const [
    duracionMinutos,
    setDuracionMinutos,
  ] = useState(
    evento.duracion_minutos
  );

  const [guardando, setGuardando] =
    useState(false);

  const [error, setError] =
    useState("");

  const guardarCambios = async (
    e: FormEvent
  ) => {
    e.preventDefault();

    setError("");

    if (!nombre.trim()) {
      setError(
        "Escribe el nombre del evento."
      );
      return;
    }

    if (
      !fechaEvento ||
      !horaEvento
    ) {
      setError(
        "Selecciona la fecha y hora del evento."
      );
      return;
    }

    if (!fechaActivacion) {
      setError(
        "Selecciona cuándo estará disponible el registro."
      );
      return;
    }

    const inicioEvento =
      `${fechaEvento}T${horaEvento}`;

    if (
      fechaActivacion >
      inicioEvento
    ) {
      setError(
        "La fecha de activación no puede ser posterior al inicio del evento."
      );
      return;
    }

    setGuardando(true);

    try {
      const respuesta =
        await fetch(
          "/api/eventos/editar",
          {
            method: "PUT",
            credentials:
              "include",

            headers: {
              "Content-Type":
                "application/json",
            },

            body: JSON.stringify({
              eventoId:
                evento.id,

              nombre:
                nombre.trim(),

              descripcion:
                descripcion.trim(),

              fechaEvento,

              horaEvento,

              fechaActivacion,

              duracionMinutos,
            }),
          }
        );

      const datos =
        await respuesta.json();

      if (!respuesta.ok) {
        setError(
          datos.error ??
            "No se pudieron guardar los cambios."
        );

        return;
      }

      await alActualizar();
    } catch (errorConsulta) {
      console.error(
        errorConsulta
      );

      setError(
        "No se pudo conectar con el servidor."
      );
    } finally {
      setGuardando(false);
    }
  };

  const inicioEvento =
    fechaEvento &&
    horaEvento
      ? `${fechaEvento}T${horaEvento}`
      : undefined;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="max-h-[95vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white shadow-xl">

        <div className="flex items-center justify-between border-b border-gray-200 p-5 sm:p-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">
              Editar evento
            </h2>

            <p className="mt-1 text-sm text-gray-500">
              Modifica la información
              del evento.
            </p>
          </div>

          <button
            type="button"
            onClick={cerrar}
            disabled={guardando}
            className="rounded-lg px-3 py-2 text-gray-500 hover:bg-gray-100"
          >
            ✕
          </button>
        </div>

        <form
          onSubmit={
            guardarCambios
          }
          className="space-y-5 p-5 sm:p-6"
        >
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700">
              Nombre del evento
            </label>

            <input
              type="text"
              value={nombre}
              onChange={(e) =>
                setNombre(
                  e.target.value
                )
              }
              required
              maxLength={150}
              className="w-full rounded-lg border border-gray-300 px-4 py-3 outline-none transition focus:border-blue-500"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700">
              Descripción
            </label>

            <textarea
              value={
                descripcion
              }
              onChange={(e) =>
                setDescripcion(
                  e.target.value
                )
              }
              rows={4}
              className="w-full resize-none rounded-lg border border-gray-300 px-4 py-3 outline-none transition focus:border-blue-500"
            />
          </div>

          <div className="grid gap-5 sm:grid-cols-2">
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">
                Fecha del evento
              </label>

              <input
                type="date"
                value={
                  fechaEvento
                }
                onChange={(e) =>
                  setFechaEvento(
                    e.target.value
                  )
                }
                required
                className="w-full cursor-pointer rounded-lg border border-gray-300 px-4 py-3 outline-none transition focus:border-blue-500"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">
                Hora del evento
              </label>

              <input
                type="time"
                value={
                  horaEvento
                }
                onChange={(e) =>
                  setHoraEvento(
                    e.target.value
                  )
                }
                required
                className="w-full cursor-pointer rounded-lg border border-gray-300 px-4 py-3 outline-none transition focus:border-blue-500"
              />
            </div>
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700">
              Disponible para
              registro desde
            </label>

            <input
              type="datetime-local"
              value={
                fechaActivacion
              }
              max={
                inicioEvento
              }
              onChange={(e) =>
                setFechaActivacion(
                  e.target.value
                )
              }
              required
              className="w-full cursor-pointer rounded-lg border border-gray-300 px-4 py-3 outline-none transition focus:border-blue-500"
            />

            <p className="mt-2 text-xs text-gray-500">
              El evento aparecerá
              para los estudiantes
              a partir de esta fecha
              y hora.
            </p>
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700">
              Duración del evento
            </label>

            <select
              value={
                duracionMinutos
              }
              onChange={(e) =>
                setDuracionMinutos(
                  Number(
                    e.target.value
                  )
                )
              }
              className="w-full cursor-pointer rounded-lg border border-gray-300 px-4 py-3 outline-none transition focus:border-blue-500"
            >
              <option value={30}>
                30 minutos
              </option>

              <option value={60}>
                1 hora
              </option>

              <option value={90}>
                1 hora 30 minutos
              </option>

              <option value={120}>
                2 horas
              </option>

              <option value={180}>
                3 horas
              </option>

              <option value={240}>
                4 horas
              </option>

              <option value={360}>
                6 horas
              </option>

              <option value={480}>
                8 horas
              </option>
            </select>

            <p className="mt-2 text-xs text-gray-500">
              El cierre de
              inscripción se
              recalculará
              automáticamente.
            </p>
          </div>

          {error && (
            <div className="rounded-lg bg-red-50 p-4 text-sm text-red-600">
              {error}
            </div>
          )}

          <div className="flex flex-col-reverse gap-3 border-t border-gray-200 pt-5 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={cerrar}
              disabled={
                guardando
              }
              className="rounded-lg border border-gray-300 px-5 py-3 font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
            >
              Cancelar
            </button>

            <button
              type="submit"
              disabled={
                guardando
              }
              className="rounded-lg bg-[#1B396A] px-5 py-3 font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
            >
              {guardando
                ? "Guardando..."
                : "Guardar cambios"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}