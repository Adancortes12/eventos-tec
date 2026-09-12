import { useEffect, useState } from "react";
import { Link, useParams } from "react-router";
import { supabase } from "../../lib/supabase";
import ModalEditarEvento from "../../components/admin/ModalEditarEvento";

type Evento = {
  id: string;
  codigo_evento: string;
  nombre: string;
  descripcion: string | null;
  fecha_evento: string;
  hora_evento: string;
  estado: string;
};

type Inscripcion = {
  id: string;
  numero_estudiante: string;
  nombre_completo: string;
  registrado_en: string;
  asistio: boolean;
  asistio_en: string | null;
};

export default function DetalleEvento() {
  const { id } = useParams();

  const [evento, setEvento] = useState<Evento | null>(null);
  const [inscripciones, setInscripciones] = useState<Inscripcion[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");
  const [modalEditarAbierto, setModalEditarAbierto] = useState(false);

  useEffect(() => {
    const cargarDatos = async () => {
      if (!id) {
        setError("Evento no válido.");
        setCargando(false);
        return;
      }

      const { data: eventoData, error: eventoError } = await supabase
        .from("eventos")
        .select("*")
        .eq("id", id)
        .single();

      if (eventoError) {
        console.error(eventoError);
        setError("No se pudo cargar el evento.");
        setCargando(false);
        return;
      }

      const { data: inscripcionesData, error: inscripcionesError } =
        await supabase
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
          .order("registrado_en", { ascending: false });

      if (inscripcionesError) {
        console.error(inscripcionesError);
        setError("No se pudieron cargar las inscripciones.");
        setCargando(false);
        return;
      }

      setEvento(eventoData);
      setInscripciones(inscripcionesData ?? []);
      setCargando(false);
    };

    cargarDatos();
  }, [id]);

  const actualizarEvento = () => {
    window.location.reload();
  };

  const finalizarEvento = async () => {
    if (!evento) return;

    const confirmar = window.confirm(
      "¿Seguro que quieres finalizar este evento?",
    );

    if (!confirmar) return;

    const { error } = await supabase
      .from("eventos")
      .update({
        estado: "finalizado",
      })
      .eq("id", evento.id);

    if (error) {
      console.error(error);
      alert("No se pudo finalizar el evento.");
      return;
    }

    window.location.reload();
  };
  const eliminarEvento = async () => {
    if (!evento) return;

    const confirmar = window.confirm(
      "¿Seguro que quieres eliminar este evento? Esta acción no se puede deshacer.",
    );

    if (!confirmar) return;

    const { error } = await supabase
      .from("eventos")
      .delete()
      .eq("id", evento.id);

    if (error) {
      console.error(error);
      alert("No se pudo eliminar el evento.");
      return;
    }

    window.location.href = "/admin/eventos";
  };

  if (cargando) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-gray-100">
        <p className="text-gray-600">Cargando evento...</p>
      </main>
    );
  }

  if (error || !evento) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-gray-100 p-6">
        <div className="rounded-xl bg-white p-6 shadow">
          <p className="text-red-600">{error || "Evento no encontrado."}</p>
        </div>
      </main>
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
    <main className="min-h-screen bg-gray-100 p-4 sm:p-6">
      <div className="mx-auto max-w-6xl">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <Link
            to="/admin/eventos"
            className="text-sm font-medium text-blue-600"
          >
            ← Volver a eventos
          </Link>

          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setModalEditarAbierto(true)}
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white"
            >
              Editar evento
            </button>

            {evento.estado === "activo" && (
              <button
                onClick={finalizarEvento}
                className="rounded-lg bg-gray-800 px-4 py-2 text-sm font-semibold text-white"
              >
                Finalizar evento
              </button>
            )}
            {inscripciones.length === 0 && (
              <button
                onClick={eliminarEvento}
                className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white"
              >
                Eliminar evento
              </button>
            )}
          </div>
        </div>

        <div className="mt-4 rounded-xl bg-white p-6 shadow">
          <p className="text-sm text-gray-500">{evento.codigo_evento}</p>

          <h1 className="mt-1 text-3xl font-bold text-gray-900">
            {evento.nombre}
          </h1>

          {evento.descripcion && (
            <p className="mt-3 text-gray-600">{evento.descripcion}</p>
          )}

          <div className="mt-4 text-sm text-gray-600">
            <p>Fecha: {evento.fecha_evento}</p>

            <p>Hora: {evento.hora_evento}</p>

            <p>Estado: {evento.estado}</p>
          </div>
        </div>

        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-xl bg-white p-5 shadow">
            <p className="text-sm text-gray-500">Registrados</p>

            <p className="mt-2 text-3xl font-bold">{totalRegistrados}</p>
          </div>

          <div className="rounded-xl bg-white p-5 shadow">
            <p className="text-sm text-gray-500">Asistieron</p>

            <p className="mt-2 text-3xl font-bold">{totalAsistieron}</p>
          </div>

          <div className="rounded-xl bg-white p-5 shadow">
            <p className="text-sm text-gray-500">Pendientes</p>

            <p className="mt-2 text-3xl font-bold">{totalPendientes}</p>
          </div>

          <div className="rounded-xl bg-white p-5 shadow">
            <p className="text-sm text-gray-500">Porcentaje de asistencia</p>

            <p className="mt-2 text-3xl font-bold">{porcentajeAsistencia}%</p>
          </div>
        </div>

        <div className="mt-6 overflow-hidden rounded-xl bg-white shadow">
          <div className="border-b border-gray-200 p-5">
            <h2 className="text-xl font-bold text-gray-900">
              Estudiantes registrados
            </h2>
          </div>

          {inscripciones.length === 0 ? (
            <p className="p-6 text-gray-600">
              Aún no hay estudiantes registrados.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[800px] text-left">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-5 py-3 text-sm font-semibold">Número</th>

                    <th className="px-5 py-3 text-sm font-semibold">Nombre</th>

                    <th className="px-5 py-3 text-sm font-semibold">
                      Registro
                    </th>

                    <th className="px-5 py-3 text-sm font-semibold">Estado</th>

                    <th className="px-5 py-3 text-sm font-semibold">
                      Hora de asistencia
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {inscripciones.map((inscripcion) => (
                    <tr
                      key={inscripcion.id}
                      className="border-t border-gray-100"
                    >
                      <td className="px-5 py-4">
                        {inscripcion.numero_estudiante}
                      </td>

                      <td className="px-5 py-4">
                        {inscripcion.nombre_completo}
                      </td>

                      <td className="px-5 py-4">
                        {new Date(inscripcion.registrado_en).toLocaleString(
                          "es-MX",
                        )}
                      </td>

                      <td className="px-5 py-4">
                        {inscripcion.asistio ? (
                          <span className="rounded-full bg-green-100 px-3 py-1 text-sm font-medium text-green-700">
                            Asistió
                          </span>
                        ) : (
                          <span className="rounded-full bg-yellow-100 px-3 py-1 text-sm font-medium text-yellow-700">
                            Pendiente
                          </span>
                        )}
                      </td>

                      <td className="px-5 py-4">
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
        </div>

        <ModalEditarEvento
          evento={evento}
          abierto={modalEditarAbierto}
          cerrar={() => setModalEditarAbierto(false)}
          alActualizar={actualizarEvento}
        />
      </div>
    </main>
  );
}
