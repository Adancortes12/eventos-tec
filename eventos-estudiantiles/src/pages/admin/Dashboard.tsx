import { useNavigate } from "react-router";
import { supabase } from "../../lib/supabase";

export default function Dashboard() {
  const navigate = useNavigate();

  const cerrarSesion = async () => {
    await supabase.auth.signOut();
    navigate("/admin/login");
  };

  return (
    <main className="min-h-screen bg-gray-100 p-6">
      <div className="mx-auto max-w-6xl">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              Panel de administración
            </h1>

            <p className="mt-2 text-gray-600">
              Sistema de eventos estudiantiles
            </p>
          </div>

          <button
            onClick={cerrarSesion}
            className="rounded-lg bg-red-600 px-4 py-2 font-medium text-white"
          >
            Cerrar sesión
          </button>
        </div>

        <div className="mt-8 rounded-xl bg-white p-6 shadow">
          <p className="text-gray-700">
            Sesión iniciada correctamente.
          </p>
        </div>
      </div>
    </main>
  );
}