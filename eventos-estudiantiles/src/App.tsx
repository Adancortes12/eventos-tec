import { BrowserRouter, Route, Routes } from "react-router";

import RutaProtegida from "./components/RutaProtegida";
import LayoutAdmin from "./components/admin/LayoutAdmin";

import Login from "./pages/admin/Login";
import Dashboard from "./pages/admin/Dashboard";
import Eventos from "./pages/admin/Eventos";
import DetalleEvento from "./pages/admin/DetalleEvento";
import EscanerQR from "./pages/admin/EscanerQR";

import RegistroEvento from "./pages/public/RegistroEvento";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Rutas públicas */}
        <Route
          path="/"
          element={
            <main className="flex min-h-screen items-center justify-center bg-gray-100">
              <h1 className="text-2xl font-bold text-gray-900">
                Eventos Estudiantiles
              </h1>
            </main>
          }
        />

        <Route
          path="/evento/:codigoEvento"
          element={<RegistroEvento />}
        />

        {/* Login administrador */}
        <Route
          path="/admin/login"
          element={<Login />}
        />

        {/* Panel administrador */}
        <Route
          path="/admin"
          element={
            <RutaProtegida>
              <LayoutAdmin />
            </RutaProtegida>
          }
        >
          <Route
            index
            element={<Dashboard />}
          />

          <Route
            path="eventos"
            element={<Eventos />}
          />

          <Route
            path="eventos/:id"
            element={<DetalleEvento />}
          />

          <Route
            path="eventos/:id/escanear"
            element={<EscanerQR />}
          />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;