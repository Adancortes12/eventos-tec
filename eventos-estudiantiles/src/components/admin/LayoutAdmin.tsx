import { useState } from "react";
import { NavLink, Outlet, useNavigate } from "react-router";

import { supabase } from "../../lib/supabase";

import ModalNuevoEvento from "./ModalNuevoEvento";
import ModalEventoCreado from "./ModalEventoCreado";

import type { EventoCreado } from "./ModalNuevoEvento";

export type ContextoAdmin = {
  abrirModalNuevoEvento: () => void;
};

export default function LayoutAdmin() {
  const navigate = useNavigate();

  const [menuAbierto, setMenuAbierto] = useState(false);

  const [modalNuevoEventoAbierto, setModalNuevoEventoAbierto] =
    useState(false);

  const [eventoCreado, setEventoCreado] =
    useState<EventoCreado | null>(null);

  const cerrarSesion = async () => {
    await supabase.auth.signOut();

    navigate("/admin/login");
  };

  const alCrearEvento = (evento: EventoCreado) => {
    setModalNuevoEventoAbierto(false);

    setEventoCreado(evento);
  };

  const verEventoCreado = () => {
    if (!eventoCreado) return;

    const id = eventoCreado.id;

    setEventoCreado(null);

    navigate(`/admin/eventos/${id}`);
  };

  const enlaceClase = ({
    isActive,
  }: {
    isActive: boolean;
  }) =>
    `block rounded-lg px-4 py-3 text-sm font-medium transition ${
      isActive
        ? "bg-blue-600 text-white"
        : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
    }`;

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Barra móvil */}
      <header className="flex items-center justify-between border-b border-gray-200 bg-white px-4 py-4 lg:hidden">
        <div>
          <p className="text-lg font-bold text-gray-900">
            Eventos Estudiantiles
          </p>

          <p className="text-xs text-gray-500">
            Administración
          </p>
        </div>

        <button
          type="button"
          onClick={() =>
            setMenuAbierto(!menuAbierto)
          }
          className="rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700"
        >
          {menuAbierto ? "Cerrar" : "Menú"}
        </button>
      </header>

      {/* Fondo móvil */}
      {menuAbierto && (
        <button
          type="button"
          onClick={() => setMenuAbierto(false)}
          className="fixed inset-0 z-40 bg-black/30 lg:hidden"
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed left-0 top-0 z-50 h-screen w-72 border-r border-gray-200 bg-white transition-transform lg:translate-x-0 ${
          menuAbierto
            ? "translate-x-0"
            : "-translate-x-full"
        }`}
      >
        <div className="flex h-full flex-col">
          <div className="border-b border-gray-200 p-6">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-600 font-bold text-white">
                EA
              </div>

              <div>
                <h1 className="font-bold text-gray-900">
                  Eventos
                </h1>

                <p className="text-sm text-gray-500">
                  Panel administrativo
                </p>
              </div>
            </div>
          </div>

          <nav className="flex-1 space-y-2 p-4">
            <p className="mb-3 px-4 text-xs font-semibold uppercase tracking-wider text-gray-400">
              Principal
            </p>

            <NavLink
              to="/admin"
              end
              className={enlaceClase}
              onClick={() => setMenuAbierto(false)}
            >
              Dashboard
            </NavLink>

            <NavLink
              to="/admin/eventos"
              className={enlaceClase}
              onClick={() => setMenuAbierto(false)}
            >
              Eventos
            </NavLink>

            <button
              type="button"
              onClick={() => {
                setModalNuevoEventoAbierto(true);
                setMenuAbierto(false);
              }}
              className="w-full rounded-lg px-4 py-3 text-left text-sm font-medium text-gray-600 transition hover:bg-gray-100 hover:text-gray-900"
            >
              Nuevo evento
            </button>
          </nav>

          <div className="border-t border-gray-200 p-4">
            <button
              type="button"
              onClick={cerrarSesion}
              className="w-full rounded-lg border border-red-200 px-4 py-3 text-left text-sm font-medium text-red-600 transition hover:bg-red-50"
            >
              Cerrar sesión
            </button>
          </div>
        </div>
      </aside>

      {/* Contenido */}
      <div className="lg:pl-72">
        <main className="min-h-screen p-4 sm:p-6 lg:p-8">
          <div className="mx-auto max-w-7xl">
            <Outlet
              context={{
                abrirModalNuevoEvento: () =>
                  setModalNuevoEventoAbierto(true),
              }}
            />
          </div>
        </main>
      </div>

      {/* Modal crear evento */}
      <ModalNuevoEvento
        abierto={modalNuevoEventoAbierto}
        cerrar={() =>
          setModalNuevoEventoAbierto(false)
        }
        alCrear={alCrearEvento}
      />

      {/* Modal evento creado */}
      {eventoCreado && (
        <ModalEventoCreado
          evento={eventoCreado}
          cerrar={() => setEventoCreado(null)}
          verEvento={verEventoCreado}
        />
      )}
    </div>
  );
}