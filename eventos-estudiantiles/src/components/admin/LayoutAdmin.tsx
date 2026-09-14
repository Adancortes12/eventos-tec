import { useState } from "react";
import {
  NavLink,
  Outlet,
  useNavigate,
} from "react-router";

import { supabase } from "../../lib/supabase";

import ModalNuevoEvento from "./ModalNuevoEvento";
import ModalEventoCreado from "./ModalEventoCreado";

import type { EventoCreado } from "./ModalNuevoEvento";

export type ContextoAdmin = {
  abrirModalNuevoEvento: () => void;
};

export default function LayoutAdmin() {
  const navigate = useNavigate();

  const [menuAbierto, setMenuAbierto] =
    useState(false);

  const [
    modalNuevoEventoAbierto,
    setModalNuevoEventoAbierto,
  ] = useState(false);

  const [
    eventoCreado,
    setEventoCreado,
  ] = useState<EventoCreado | null>(null);

  const cerrarSesion = async () => {
    await supabase.auth.signOut();

    navigate("/admin/login");
  };

  const alCrearEvento = (
    evento: EventoCreado
  ) => {
    setModalNuevoEventoAbierto(false);
    setEventoCreado(evento);
  };

  const verEventoCreado = () => {
    if (!eventoCreado) {
      return;
    }

    const id = eventoCreado.id;

    setEventoCreado(null);

    navigate(
      `/admin/eventos/${id}`
    );
  };

  const enlaceClase = ({
    isActive,
  }: {
    isActive: boolean;
  }) =>
    `flex items-center rounded-xl px-4 py-3 text-sm font-medium transition ${
      isActive
        ? "bg-blue-600 text-white shadow-sm"
        : "text-slate-300 hover:bg-slate-800 hover:text-white"
    }`;

  return (
    <div className="min-h-screen bg-slate-100">
      {/* HEADER MÓVIL */}
      <header className="sticky top-0 z-30 flex items-center justify-between border-b border-slate-200 bg-white px-4 py-3 lg:hidden">
        <div>
          <p className="font-bold text-slate-900">
            Eventos Estudiantiles
          </p>

          <p className="text-xs text-slate-500">
            Administración
          </p>
        </div>

        <button
          type="button"
          onClick={() =>
            setMenuAbierto(
              !menuAbierto
            )
          }
          className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm"
        >
          {menuAbierto
            ? "Cerrar"
            : "Menú"}
        </button>
      </header>

      {/* FONDO MÓVIL */}
      {menuAbierto && (
        <button
          type="button"
          aria-label="Cerrar menú"
          onClick={() =>
            setMenuAbierto(false)
          }
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
        />
      )}

      {/* SIDEBAR */}
      <aside
        className={`fixed left-0 top-0 z-50 h-screen w-72 transform bg-slate-950 text-white transition-transform duration-200 lg:translate-x-0 ${
          menuAbierto
            ? "translate-x-0"
            : "-translate-x-full"
        }`}
      >
        <div className="flex h-full flex-col">
          {/* LOGO */}
          <div className="border-b border-slate-800 p-6">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-600 text-lg font-bold text-white">
                EA
              </div>

              <div>
                <h1 className="font-bold text-white">
                  Eventos
                </h1>

                <p className="text-sm text-slate-400">
                  Panel administrativo
                </p>
              </div>
            </div>
          </div>

          {/* BOTÓN PRINCIPAL */}
          <div className="p-4 pb-2">
            <button
              type="button"
              onClick={() => {
                setModalNuevoEventoAbierto(
                  true
                );

                setMenuAbierto(
                  false
                );
              }}
              className="w-full rounded-xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700"
            >
              + Nuevo evento
            </button>
          </div>

          {/* NAVEGACIÓN */}
          <nav className="flex-1 space-y-2 overflow-y-auto p-4">
            <p className="mb-3 px-4 text-xs font-semibold uppercase tracking-wider text-slate-500">
              Navegación
            </p>

            <NavLink
              to="/admin"
              end
              className={enlaceClase}
              onClick={() =>
                setMenuAbierto(
                  false
                )
              }
            >
              Dashboard
            </NavLink>

            <NavLink
              to="/admin/eventos"
              className={enlaceClase}
              onClick={() =>
                setMenuAbierto(
                  false
                )
              }
            >
              Eventos
            </NavLink>
          </nav>

          {/* USUARIO */}
          <div className="border-t border-slate-800 p-4">
            <div className="mb-3 rounded-xl bg-slate-900 p-4">
              <p className="text-sm font-semibold text-white">
                Administrador
              </p>

              <p className="mt-1 text-xs text-slate-400">
                Gestión de eventos
              </p>
            </div>

            <button
              type="button"
              onClick={
                cerrarSesion
              }
              className="w-full rounded-xl border border-red-900/50 px-4 py-3 text-left text-sm font-medium text-red-400 transition hover:bg-red-950/50"
            >
              Cerrar sesión
            </button>
          </div>
        </div>
      </aside>

      {/* CONTENIDO */}
      <div className="lg:pl-72">
        {/* BARRA SUPERIOR PC */}
        <header className="hidden h-16 items-center justify-between border-b border-slate-200 bg-white px-8 lg:flex">
          <div>
            <p className="text-sm font-medium text-slate-500">
              Sistema de eventos estudiantiles
            </p>
          </div>

          <button
            type="button"
            onClick={() =>
              setModalNuevoEventoAbierto(
                true
              )
            }
            className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-700"
          >
            + Nuevo evento
          </button>
        </header>

        {/* PÁGINA ACTUAL */}
        <main className="min-h-[calc(100vh-4rem)] p-4 sm:p-6 lg:p-8">
          <div className="mx-auto max-w-7xl">
            <Outlet
              context={{
                abrirModalNuevoEvento:
                  () =>
                    setModalNuevoEventoAbierto(
                      true
                    ),
              }}
            />
          </div>
        </main>
      </div>

      {/* MODAL NUEVO EVENTO */}
      <ModalNuevoEvento
        abierto={
          modalNuevoEventoAbierto
        }
        cerrar={() =>
          setModalNuevoEventoAbierto(
            false
          )
        }
        alCrear={alCrearEvento}
      />

      {/* MODAL EVENTO CREADO */}
      {eventoCreado && (
        <ModalEventoCreado
          evento={eventoCreado}
          cerrar={() =>
            setEventoCreado(
              null
            )
          }
          verEvento={
            verEventoCreado
          }
        />
      )}
    </div>
  );
}