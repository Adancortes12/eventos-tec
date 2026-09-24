import { useEffect, useState } from "react";
import { Link, useNavigate, useOutletContext, useParams } from "react-router";

import ModalEditarEvento from "../../components/admin/ModalEditarEvento";
import ModalQrEvento from "../../components/admin/ModalQrEvento";
import { supabase } from "../../lib/supabase";

type Evento = {
  id: string;
  codigo_evento: string;
  nombre: string;
  descripcion: string | null;
  fecha_evento: string;
  hora_evento: string;
  estado: string;
  fecha_activacion: string;
  duracion_minutos: number;
  cierre_inscripcion: string | null;
};

type ContextoAdmin = {
  puedeCrearEventos: boolean;

  rol: "maestro" | "admin" | "superadmin";
};

type Inscripcion = {
  id: string;
  numero_estudiante: string;
  nombre_completo: string;
  registrado_en: string;
  asistio: boolean;
  asistio_en: string | null;
};

type DatosDetalle = {
  evento: Evento;
  inscripciones: Inscripcion[];
};

async function obtenerDatosEvento(id: string): Promise<DatosDetalle> {
  const { data: eventoData, error: eventoError } = await supabase
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
  duracion_minutos,
  cierre_inscripcion
`,
    )
    .eq("id", id)
    .single();

  if (eventoError || !eventoData) {
    console.error(eventoError);

    throw new Error("No se pudo cargar el evento.");
  }

  const { data: inscripcionesData, error: inscripcionesError } = await supabase
    .from("inscripciones")
    .select(
      `
      id,
      numero_estudiante,
      nombre_completo,
      registrado_en,
      asistio,
      asistio_en
    `,
    )
    .eq("evento_id", id)
    .order("registrado_en", {
      ascending: false,
    });

  if (inscripcionesError) {
    console.error(inscripcionesError);

    throw new Error("No se pudieron cargar las inscripciones.");
  }

  return {
    evento: eventoData,
    inscripciones: inscripcionesData ?? [],
  };
}

export default function DetalleEvento() {
  const { id } = useParams();
  const navigate = useNavigate();

  const { puedeCrearEventos } = useOutletContext<ContextoAdmin>();

  const [evento, setEvento] = useState<Evento | null>(null);

  const [inscripciones, setInscripciones] = useState<Inscripcion[]>([]);

  const [cargando, setCargando] = useState(true);

  const [error, setError] = useState("");

  const [modalEditarAbierto, setModalEditarAbierto] = useState(false);

  const [modalQrAbierto, setModalQrAbierto] = useState(false);

  useEffect(() => {
    if (!id) {
      return;
    }

    let activo = true;

    obtenerDatosEvento(id)
      .then((datos) => {
        if (!activo) {
          return;
        }

        setEvento(datos.evento);
        setInscripciones(datos.inscripciones);
        setError("");
      })
      .catch((errorConsulta: unknown) => {
        if (!activo) {
          return;
        }

        if (errorConsulta instanceof Error) {
          setError(errorConsulta.message);
        } else {
          setError("Ocurrió un error al cargar el evento.");
        }
      })
      .finally(() => {
        if (activo) {
          setCargando(false);
        }
      });

    return () => {
      activo = false;
    };
  }, [id]);

  const refrescarDatos = async () => {
    if (!id) {
      return;
    }

    try {
      const datos = await obtenerDatosEvento(id);

      setEvento(datos.evento);
      setInscripciones(datos.inscripciones);
      setError("");
    } catch (errorConsulta) {
      console.error(errorConsulta);

      setError("No se pudo actualizar la información del evento.");
    }
  };

  const actualizarEvento = async () => {
    setModalEditarAbierto(false);

    await refrescarDatos();
  };

 const finalizarEvento = async () => {
  if (!evento) {
    return;
  }

  const confirmar = window.confirm(
    "¿Seguro que quieres finalizar este evento?"
  );

  if (!confirmar) {
    return;
  }

  try {
    const respuesta = await fetch(
      "/api/eventos/finalizar",
      {
        method: "PATCH",
        credentials: "include",

        headers: {
          "Content-Type":
            "application/json",
        },

        body: JSON.stringify({
          eventoId: evento.id,
        }),
      }
    );

    const datos =
      await respuesta.json();

    if (!respuesta.ok) {
      window.alert(
        datos.error ??
          "No se pudo finalizar el evento."
      );

      return;
    }

    await refrescarDatos();
  } catch (error) {
    console.error(error);

    window.alert(
      "No se pudo conectar con el servidor."
    );
  }
};

 const eliminarEvento = async () => {
  if (!evento) {
    return;
  }

  const confirmar = window.confirm(
    "¿Seguro que quieres eliminar este evento? Esta acción no se puede deshacer."
  );

  if (!confirmar) {
    return;
  }

  try {
    const respuesta = await fetch(
      "/api/eventos/eliminar",
      {
        method: "DELETE",
        credentials: "include",

        headers: {
          "Content-Type":
            "application/json",
        },

        body: JSON.stringify({
          eventoId: evento.id,
        }),
      }
    );

    const datos =
      await respuesta.json();

    if (!respuesta.ok) {
      window.alert(
        datos.error ??
          "No se pudo eliminar el evento."
      );

      return;
    }

    navigate("/admin/eventos");
  } catch (error) {
    console.error(error);

    window.alert(
      "No se pudo conectar con el servidor."
    );
  }
};

  if (!id) {
    return (
      <div className="rounded-xl bg-white p-6 shadow">
        <p className="text-red-600">Evento no válido.</p>
      </div>
    );
  }

  if (cargando) {
    return (
      <div className="py-10">
        <p className="text-gray-600">Cargando evento...</p>
      </div>
    );
  }

  if (error || !evento) {
    return (
      <div className="rounded-xl bg-white p-6 shadow">
        <p className="text-red-600">{error || "Evento no encontrado."}</p>
      </div>
    );
  }

  const totalRegistrados = inscripciones.length;

  const totalAsistieron = inscripciones.filter(
    (inscripcion) => inscripcion.asistio,
  ).length;

  const totalPendientes = totalRegistrados - totalAsistieron;

  const porcentajeAsistencia =
    totalRegistrados > 0
      ? ((totalAsistieron / totalRegistrados) * 100).toFixed(1)
      : "0.0";

  return (
    <div>
      <Link
        to="/admin/eventos"
        className="text-sm font-medium text-blue-600 transition hover:text-blue-700"
      >
        ← Volver a eventos
      </Link>

      <section className="mt-6 rounded-2xl bg-white p-5 shadow sm:p-7">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-3">
              <span className="text-sm font-semibold text-blue-600">
                {evento.codigo_evento}
              </span>

              <span
                className={`rounded-full px-3 py-1 text-xs font-semibold ${
                  evento.estado === "activo"
                    ? "bg-green-100 text-green-700"
                    : "bg-gray-200 text-gray-700"
                }`}
              >
                {evento.estado === "activo" ? "Activo" : "Finalizado"}
              </span>
            </div>

            <h1 className="mt-3 text-3xl font-bold text-gray-900">
              {evento.nombre}
            </h1>

            {evento.descripcion && (
              <p className="mt-3 max-w-3xl text-gray-600">
                {evento.descripcion}
              </p>
            )}

            <div className="mt-5 flex flex-wrap gap-x-8 gap-y-3 text-sm text-gray-500">
              <p>
                <span className="font-medium text-gray-700">Fecha:</span>{" "}
                {evento.fecha_evento}
              </p>

              <p>
                <span className="font-medium text-gray-700">Hora:</span>{" "}
                {evento.hora_evento}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-2 lg:max-w-md lg:justify-end">
            {evento.estado === "activo" && (
              <Link
                to={`/admin/eventos/${evento.id}/escanear`}
                className="rounded-lg bg-green-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-green-700"
              >
                Pasar asistencia
              </Link>
            )}

            <button
              type="button"
              onClick={() => setModalQrAbierto(true)}
              className="rounded-lg border border-blue-300 px-4 py-2 text-sm font-semibold text-blue-600 transition hover:bg-blue-50"
            >
              Ver enlace y QR
            </button>

            {puedeCrearEventos && evento.estado === "activo" && (
              <button
                type="button"
                onClick={() => setModalEditarAbierto(true)}
                className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 transition hover:bg-gray-50"
              >
                Editar evento
              </button>
            )}

            {puedeCrearEventos && evento.estado === "activo" && (
              <button
                type="button"
                onClick={finalizarEvento}
                className="rounded-lg bg-gray-800 px-4 py-2 text-sm font-semibold text-white transition hover:bg-gray-900"
              >
                Finalizar evento
              </button>
            )}

            {puedeCrearEventos && inscripciones.length === 0 && (
              <button
                type="button"
                onClick={eliminarEvento}
                className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-red-700"
              >
                Eliminar evento
              </button>
            )}
          </div>
        </div>
      </section>

      <section className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-xl bg-white p-5 shadow">
          <p className="text-sm font-medium text-gray-500">Registrados</p>

          <p className="mt-2 text-3xl font-bold text-gray-900">
            {totalRegistrados}
          </p>
        </div>

        <div className="rounded-xl bg-white p-5 shadow">
          <p className="text-sm font-medium text-gray-500">Asistieron</p>

          <p className="mt-2 text-3xl font-bold text-green-600">
            {totalAsistieron}
          </p>
        </div>

        <div className="rounded-xl bg-white p-5 shadow">
          <p className="text-sm font-medium text-gray-500">Pendientes</p>

          <p className="mt-2 text-3xl font-bold text-yellow-600">
            {totalPendientes}
          </p>
        </div>

        <div className="rounded-xl bg-white p-5 shadow">
          <p className="text-sm font-medium text-gray-500">
            Porcentaje de asistencia
          </p>

          <p className="mt-2 text-3xl font-bold text-blue-600">
            {porcentajeAsistencia}%
          </p>
        </div>
      </section>

      <section className="mt-6 overflow-hidden rounded-xl bg-white shadow">
        <div className="border-b border-gray-200 p-5 sm:p-6">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-xl font-bold text-gray-900">
                Estudiantes registrados
              </h2>

              <p className="mt-1 text-sm text-gray-500">
                Consulta el registro y estado de asistencia de los estudiantes.
              </p>
            </div>

            <p className="text-sm font-medium text-gray-500">
              Total: {totalRegistrados}
            </p>
          </div>
        </div>

        {inscripciones.length === 0 ? (
          <div className="p-8 text-center">
            <p className="font-medium text-gray-700">
              Aún no hay estudiantes registrados.
            </p>

            <p className="mt-1 text-sm text-gray-500">
              Los estudiantes aparecerán aquí cuando se registren al evento.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[800px] text-left">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-5 py-3 text-sm font-semibold text-gray-600">
                    Número
                  </th>

                  <th className="px-5 py-3 text-sm font-semibold text-gray-600">
                    Nombre
                  </th>

                  <th className="px-5 py-3 text-sm font-semibold text-gray-600">
                    Registro
                  </th>

                  <th className="px-5 py-3 text-sm font-semibold text-gray-600">
                    Estado
                  </th>

                  <th className="px-5 py-3 text-sm font-semibold text-gray-600">
                    Hora de asistencia
                  </th>
                </tr>
              </thead>

              <tbody>
                {inscripciones.map((inscripcion) => (
                  <tr key={inscripcion.id} className="border-t border-gray-100">
                    <td className="px-5 py-4 text-sm text-gray-700">
                      {inscripcion.numero_estudiante}
                    </td>

                    <td className="px-5 py-4 text-sm font-medium text-gray-900">
                      {inscripcion.nombre_completo}
                    </td>

                    <td className="px-5 py-4 text-sm text-gray-600">
                      {new Date(inscripcion.registrado_en).toLocaleString(
                        "es-MX",
                      )}
                    </td>

                    <td className="px-5 py-4">
                      {inscripcion.asistio ? (
                        <span className="rounded-full bg-green-100 px-3 py-1 text-xs font-semibold text-green-700">
                          Asistió
                        </span>
                      ) : (
                        <span className="rounded-full bg-yellow-100 px-3 py-1 text-xs font-semibold text-yellow-700">
                          Pendiente
                        </span>
                      )}
                    </td>

                    <td className="px-5 py-4 text-sm text-gray-600">
                      {inscripcion.asistio_en
                        ? new Date(inscripcion.asistio_en).toLocaleString(
                            "es-MX",
                          )
                        : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {modalEditarAbierto && (
        <ModalEditarEvento
          evento={evento}
          cerrar={() => setModalEditarAbierto(false)}
          alActualizar={actualizarEvento}
        />
      )}

      {modalQrAbierto && (
        <ModalQrEvento
          codigoEvento={evento.codigo_evento}
          nombreEvento={evento.nombre}
          cerrar={() => setModalQrAbierto(false)}
        />
      )}
    </div>
  );
}
