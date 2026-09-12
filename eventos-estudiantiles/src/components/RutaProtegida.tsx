import { useEffect, useState } from "react";
import { Navigate } from "react-router";
import { supabase } from "../lib/supabase";

type Props = {
  children: React.ReactNode;
};

export default function RutaProtegida({ children }: Props) {
  const [cargando, setCargando] = useState(true);
  const [autenticado, setAutenticado] = useState(false);

  useEffect(() => {
    const verificarSesion = async () => {
      const { data } = await supabase.auth.getSession();

      setAutenticado(!!data.session);
      setCargando(false);
    };

    verificarSesion();
  }, []);

  if (cargando) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-gray-100">
        <p className="text-gray-600">
          Verificando sesión...
        </p>
      </main>
    );
  }

  if (!autenticado) {
    return <Navigate to="/admin/login" replace />;
  }

  return children;
}