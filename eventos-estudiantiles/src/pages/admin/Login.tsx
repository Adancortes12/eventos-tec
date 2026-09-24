import { useState } from "react";
import type { FormEvent } from "react";
import { supabase } from "../../lib/supabase";
import { useNavigate } from "react-router";

export default function Login() {
const navigate = useNavigate();
  const [correo, setCorreo] = useState("");
  const [contrasena, setContrasena] = useState("");
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState("");

  const iniciarSesion = async (e: FormEvent) => {
    e.preventDefault();

    setCargando(true);
    setError("");

    const { error } = await supabase.auth.signInWithPassword({
      email: correo,
      password: contrasena,
    });

    if (error) {
      setError("Correo o contraseña incorrectos.");
      setCargando(false);
      return;
    }

    setCargando(false);
    navigate("/admin");
    console.log("Sesión iniciada correctamente");
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#F5F5F5] px-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-[#1B396A]">
            Administración
          </h1>

          <p className="mt-2 text-gray-600">
            Sistema de eventos estudiantiles
          </p>
        </div>

        <form
          onSubmit={iniciarSesion}
          className="mt-8 space-y-5"
        >
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-800">
              Correo
            </label>

            <input
              type="email"
              value={correo}
              onChange={(e) => setCorreo(e.target.value)}
              required
              placeholder="admin@escuela.mx"
              className="w-full rounded-lg border border-gray-300 px-4 py-3 text-[#1B396A] outline-none focus:border-[#1B396A]"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-gray-800">
              Contraseña
            </label>

            <input
              type="password"
              value={contrasena}
              onChange={(e) => setContrasena(e.target.value)}
              required
              placeholder="••••••••"
              className="w-full rounded-lg border border-gray-300 px-4 py-3 text-[#1B396A] outline-none focus:border-[#1B396A]"
            />
          </div>

          {error && (
            <p className="text-center text-sm text-red-600">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={cargando}
            className="w-full rounded-lg bg-[#1B396A] px-4 py-3 font-semibold text-white disabled:opacity-50"
          >
            {cargando ? "Iniciando sesión..." : "Iniciar sesión"}
          </button>
        </form>
      </div>
    </main>
  );
}