import { useEffect, useRef, useState } from "react";
import { Link, useParams } from "react-router";
import { Html5QrcodeScanner } from "html5-qrcode";
import { supabase } from "../../lib/supabase";

type ResultadoEscaneo = {
  tipo: "exito" | "repetido" | "invalido" | "otro_evento" | "error";
  titulo: string;
  nombre?: string;
  numero?: string;
  hora?: string;
};

export default function EscanerQR() {
  const { id } = useParams();

  const [resultado, setResultado] =
    useState<ResultadoEscaneo | null>(null);

  const procesandoRef = useRef(false);

  useEffect(() => {
    const scanner = new Html5QrcodeScanner(
      "lector-qr",
      {
        fps: 10,
        qrbox: {
          width: 250,
          height: 250,
        },
      },
      false
    );

    const procesarQr = async (tokenQr: string) => {
      if (procesandoRef.current || !id) {
        return;
      }

      procesandoRef.current = true;

      const { data: inscripcion, error } = await supabase
        .from("inscripciones")
        .select(`
          id,
          evento_id,
          numero_estudiante,
          nombre_completo,
          asistio,
          asistio_en
        `)
        .eq("token_qr", tokenQr)
        .maybeSingle();

      if (error) {
        console.error(error);

        setResultado({
          tipo: "error",
          titulo: "Error al consultar el QR",
        });

        setTimeout(() => {
          procesandoRef.current = false;
        }, 2500);

        return;
      }

      if (!inscripcion) {
        setResultado({
          tipo: "invalido",
          titulo: "QR NO VÁLIDO",
        });

        setTimeout(() => {
          procesandoRef.current = false;
        }, 2500);

        return;
      }

      if (inscripcion.evento_id !== id) {
        setResultado({
          tipo: "otro_evento",
          titulo: "ESTE QR NO PERTENECE A ESTE EVENTO",
        });

        setTimeout(() => {
          procesandoRef.current = false;
        }, 2500);

        return;
      }

      if (inscripcion.asistio) {
        setResultado({
          tipo: "repetido",
          titulo: "ASISTENCIA YA REGISTRADA",
          nombre: inscripcion.nombre_completo,
          numero: inscripcion.numero_estudiante,
          hora: inscripcion.asistio_en
            ? new Date(inscripcion.asistio_en).toLocaleString("es-MX")
            : undefined,
        });

        setTimeout(() => {
          procesandoRef.current = false;
        }, 2500);

        return;
      }

      const ahora = new Date().toISOString();

      const { error: errorActualizar } = await supabase
        .from("inscripciones")
        .update({
          asistio: true,
          asistio_en: ahora,
        })
        .eq("id", inscripcion.id);

      if (errorActualizar) {
        console.error(errorActualizar);

        setResultado({
          tipo: "error",
          titulo: "NO SE PUDO REGISTRAR LA ASISTENCIA",
        });

        setTimeout(() => {
          procesandoRef.current = false;
        }, 2500);

        return;
      }

      setResultado({
        tipo: "exito",
        titulo: "ASISTENCIA REGISTRADA",
        nombre: inscripcion.nombre_completo,
        numero: inscripcion.numero_estudiante,
        hora: new Date(ahora).toLocaleString("es-MX"),
      });

      setTimeout(() => {
        procesandoRef.current = false;
      }, 2500);
    };

    scanner.render(
      (textoDecodificado) => {
        procesarQr(textoDecodificado.trim());
      },
      () => {
        // html5-qrcode genera avisos mientras busca un QR.
        // No necesitamos mostrarlos.
      }
    );

    return () => {
      scanner.clear().catch(() => {});
    };
  }, [id]);

  const obtenerEstilosResultado = () => {
    if (!resultado) {
      return "";
    }

    switch (resultado.tipo) {
      case "exito":
        return "border-green-200 bg-green-50 text-green-800";

      case "repetido":
        return "border-yellow-200 bg-yellow-50 text-yellow-800";

      case "invalido":
      case "otro_evento":
      case "error":
        return "border-red-200 bg-red-50 text-red-800";

      default:
        return "";
    }
  };

  return (
    <main className="min-h-screen bg-gray-100 p-4 sm:p-6">
      <div className="mx-auto max-w-2xl">
        <Link
          to={`/admin/eventos/${id}`}
          className="text-sm font-medium text-blue-600"
        >
          ← Volver al evento
        </Link>

        <div className="mt-4 rounded-2xl bg-white p-5 shadow sm:p-6">
          <h1 className="text-2xl font-bold text-gray-900">
            Escanear asistencia
          </h1>

          <p className="mt-2 text-sm text-gray-600">
            Coloca el código QR del estudiante frente a la cámara.
          </p>

          <div className="mt-6 overflow-hidden rounded-xl">
            <div id="lector-qr" />
          </div>

          {resultado && (
            <div
              className={`mt-6 rounded-xl border p-5 text-center ${obtenerEstilosResultado()}`}
            >
              <h2 className="text-xl font-bold">
                {resultado.titulo}
              </h2>

              {resultado.nombre && (
                <p className="mt-4 text-lg font-semibold">
                  {resultado.nombre}
                </p>
              )}

              {resultado.numero && (
                <p className="mt-1">
                  {resultado.numero}
                </p>
              )}

              {resultado.hora && (
                <p className="mt-3 text-sm">
                  Hora: {resultado.hora}
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}