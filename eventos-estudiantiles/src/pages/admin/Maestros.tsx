import {
  useEffect,
  useState,
} from "react";

type RolMaestro = "maestro" | "admin" | "superadmin";

type Maestro = {
  id: string;
  sitec_usuario_id: string;
  sitec_empleado_id: string;
  usuario_sitec: string;
  rol_sistema: RolMaestro;
  activo: boolean;
  creado_en: string;
  actualizado_en: string;
};

export default function Maestros() {
  const [maestros, setMaestros] = useState<Maestro[]>([]);

  const [cargando, setCargando] = useState(true);

  const [error, setError] = useState("");

  const [actualizandoId, setActualizandoId] = useState<string | null>(null);

  useEffect(() => {
  let cancelado = false;

  const cargar = async () => {
    try {
      const respuesta = await fetch(
        "/api/admin/maestros",
        {
          method: "GET",
          credentials: "include",
        }
      );

      const datos =
        await respuesta.json();

      if (!respuesta.ok) {
        throw new Error(
          datos.error ??
            "No se pudieron cargar los maestros."
        );
      }

      if (!cancelado) {
        setMaestros(
          datos.maestros ?? []
        );
      }
    } catch (errorConsulta) {
      console.error(
        errorConsulta
      );

      if (cancelado) {
        return;
      }

      if (
        errorConsulta instanceof Error
      ) {
        setError(
          errorConsulta.message
        );
      } else {
        setError(
          "Ocurrió un error al cargar los maestros."
        );
      }
    } finally {
      if (!cancelado) {
        setCargando(false);
      }
    }
  };

  void cargar();

  return () => {
    cancelado = true;
  };
}, []);

  const cambiarRol = async (maestro: Maestro) => {
    if (maestro.rol_sistema === "superadmin") {
      return;
    }

    const nuevoRol = maestro.rol_sistema === "admin" ? "maestro" : "admin";

    const accion =
      nuevoRol === "admin"
        ? "convertir en administrador"
        : "quitar permisos de administrador";

    const confirmar = window.confirm(
      `¿Seguro que quieres ${accion} a ${maestro.usuario_sitec}?`,
    );

    if (!confirmar) {
      return;
    }

    try {
      setActualizandoId(maestro.id);

      const respuesta = await fetch("/api/admin/maestros", {
        method: "PATCH",
        credentials: "include",

        headers: {
          "Content-Type": "application/json",
        },

        body: JSON.stringify({
          maestroId: maestro.id,
          rol: nuevoRol,
        }),
      });

      const datos = await respuesta.json();

      if (!respuesta.ok) {
        window.alert(datos.error ?? "No se pudo actualizar el rol.");

        return;
      }

      setMaestros((actuales) =>
        actuales.map((item) =>
          item.id === maestro.id
            ? {
                ...item,
                rol_sistema: nuevoRol,
              }
            : item,
        ),
      );
    } catch (errorConsulta) {
      console.error(errorConsulta);

      window.alert("No se pudo conectar con el servidor.");
    } finally {
      setActualizandoId(null);
    }
  };

  const obtenerEtiquetaRol = (rol: RolMaestro) => {
    switch (rol) {
      case "superadmin":
        return "Superadministrador";

      case "admin":
        return "Administrador";

      default:
        return "Maestro";
    }
  };

  if (cargando) {
    return (
      <div className="py-10">
        <p className="text-gray-600">Cargando maestros...</p>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-[#1F2937]">
          Maestros y administradores
        </h1>

        <p className="mt-2 text-gray-600">
          Administra los permisos de los maestros que han iniciado sesión con
          SIITEC.
        </p>
      </div>

      {error && (
        <div className="mb-6 rounded-xl border border-red-200 bg-red-50 p-4 text-red-700">
          {error}
        </div>
      )}

      <div className="overflow-hidden rounded-xl bg-white shadow">
        {maestros.length === 0 ? (
          <div className="p-8 text-center">
            <p className="font-medium text-gray-700">
              No hay maestros registrados.
            </p>

            <p className="mt-1 text-sm text-gray-600">
              Aparecerán aquí después de iniciar sesión con SIITEC.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[750px] text-left">
              <thead className="bg-white">
                <tr>
                  <th className="px-5 py-3 text-sm font-semibold text-gray-600">
                    Usuario SIITEC
                  </th>

                  <th className="px-5 py-3 text-sm font-semibold text-gray-600">
                    No. empleado
                  </th>

                  <th className="px-5 py-3 text-sm font-semibold text-gray-600">
                    Rol
                  </th>

                  <th className="px-5 py-3 text-sm font-semibold text-gray-600">
                    Estado
                  </th>

                  <th className="px-5 py-3 text-right text-sm font-semibold text-gray-600">
                    Acción
                  </th>
                </tr>
              </thead>

              <tbody>
                {maestros.map((maestro) => (
                  <tr key={maestro.id} className="border-t border-gray-100">
                    <td className="px-5 py-4 text-sm font-medium text-[#1F2937]">
                      {maestro.usuario_sitec}
                    </td>

                    <td className="px-5 py-4 text-sm text-gray-600">
                      {maestro.sitec_empleado_id}
                    </td>

                    <td className="px-5 py-4">
                      <span className="rounded-full bg-[#F5F5F5] px-3 py-1 text-xs font-semibold text-gray-700">
                        {obtenerEtiquetaRol(maestro.rol_sistema)}
                      </span>
                    </td>

                    <td className="px-5 py-4">
                      <span
                        className={`rounded-full px-3 py-1 text-xs font-semibold ${
                          maestro.activo
                            ? "bg-green-100 text-green-700"
                            : "bg-red-100 text-red-700"
                        }`}
                      >
                        {maestro.activo ? "Activo" : "Inactivo"}
                      </span>
                    </td>

                    <td className="px-5 py-4 text-right">
                      {maestro.rol_sistema === "superadmin" ? (
                        <span className="text-sm text-gray-500">Protegido</span>
                      ) : (
                        <button
                          type="button"
                          disabled={actualizandoId === maestro.id}
                          onClick={() => cambiarRol(maestro)}
                          className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-700 transition hover:bg-white disabled:opacity-50"
                        >
                          {actualizandoId === maestro.id
                            ? "Guardando..."
                            : maestro.rol_sistema === "admin"
                              ? "Convertir en maestro"
                              : "Convertir en admin"}
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
