import { BrowserRouter, Route, Routes } from "react-router";

import Login from "./pages/admin/Login";
import Dashboard from "./pages/admin/Dashboard";
import Eventos from "./pages/admin/Eventos";
import NuevoEvento from "./pages/admin/NuevoEvento";
import DetalleEvento from "./pages/admin/DetalleEvento";
import EscanerQR from "./pages/admin/EscanerQR";
import RutaProtegida from "./components/RutaProtegida";
import RegistroEvento from "./pages/public/RegistroEvento";

function App() {
  return (
    <BrowserRouter>
      <Routes>
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

        <Route path="/evento/:codigoEvento" element={<RegistroEvento />} />

        <Route path="/admin/login" element={<Login />} />

        <Route
          path="/admin/eventos/:id/escanear"
          element={
            <RutaProtegida>
              <EscanerQR />
            </RutaProtegida>
          }
        />

        <Route
          path="/admin"
          element={
            <RutaProtegida>
              <Dashboard />
            </RutaProtegida>
          }
        />

        <Route
          path="/admin/eventos"
          element={
            <RutaProtegida>
              <Eventos />
            </RutaProtegida>
          }
        />

        <Route
          path="/admin/eventos/nuevo"
          element={
            <RutaProtegida>
              <NuevoEvento />
            </RutaProtegida>
          }
        />

        <Route
          path="/admin/eventos/:id"
          element={
            <RutaProtegida>
              <DetalleEvento />
            </RutaProtegida>
          }
        />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
