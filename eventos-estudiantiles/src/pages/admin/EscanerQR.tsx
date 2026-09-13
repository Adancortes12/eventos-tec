import { useEffect, useRef, useState } from "react";
import { Link, useParams } from "react-router";
import { Html5Qrcode } from "html5-qrcode";
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

  const [iniciandoCamara, setIniciandoCamara] =
    useState(true);

  const [errorCamara, setErrorCamara] =
    useState("");

  const procesandoRef = useRef(false);
  const lectorRef = useRef<Html5Qrcode | null>(null);

  useEffect(() => {
    if (!id) return;

    const lector = new Html5Qrcode("lector-qr");

    lectorRef.current = lector;

    const iniciarCamara = async () => {
      try {
        setIniciandoCamara(true);
        setErrorCamara("");

        await lector.start(
          {
            facingMode: "environment",
          },
          {
            fps: 10,
            qrbox: {
              width: 250,
              height: 250,
            },
          },
          async (textoDecodificado) => {
            await procesarQr(textoDecodificado.trim());
          },
          () => {
            // Ignoramos los intentos fallidos de lectura.
          }
        );

        setIniciandoCamara(false);
      } catch (error) {
        console.error(error);

        setErrorCamara(
          "No se pudo abrir la cámara. Verifica los permisos del navegador."
        );

        setIniciandoCamara(false);
      }
    };

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
          titulo: "ERROR AL CONSULTAR EL QR",
        });

        liberarEscaner();
        return;
      }

      if (!inscripcion) {
        setResultado({
          tipo: "invalido",
          titulo: "QR NO VÁLIDO",
        });

        liberarEscaner();
        return;
      }

      if (inscripcion.evento_id !== id) {
        setResultado({
          tipo: "otro_evento",
          titulo: "ESTE QR NO PERTENECE A ESTE EVENTO",
        });

        liberarEscaner();
        return;
      }

      if (inscripcion.asistio) {
        setResultado({
          tipo: "repetido",
          titulo: "ASISTENCIA YA REGISTRADA",
          nombre: inscripcion.nombre_completo,
          numero: inscripcion.numero_estudiante,
          hora: inscripcion.asistio_en
            ? new Date(
                inscripcion.asistio_en
              ).toLocaleString("es-MX")
            : undefined,
        });

        liberarEscaner();
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

        liberarEscaner();
        return;
      }

      setResultado({
        tipo: "exito",
        titulo: "ASISTENCIA REGISTRADA",
        nombre: inscripcion.nombre_completo,
        numero: inscripcion.numero_estudiante,
        hora: new Date(ahora).toLocaleString("es-MX"),
      });

      liberarEscaner();
    };

    const liberarEscaner = () => {
      setTimeout(() => {
        procesandoRef.current = false;
        setResultado(null);
      }, 2500);
    };

    iniciarCamara();

    return () => {
      const detener = async () => {
        try {
          if (lector.isScanning) {
            await lector.stop();
          }

          lector.clear();
        } catch (error) {
          console.error(error);
        }
      };

      detener();
    };
  }, [id]);

  const obtenerEstilosResultado = () => {
    if (!resultado) return "";

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
    <div>
      <div className="mb-6">
        <Link
          to={`/admin/eventos/${id}`}
          className="text-sm font-medium text-blue-600"
        >
          ← Volver al evento
        </Link>

        <h1 className="mt-4 text-3xl font-bold text-gray-900">
          Pasar asistencia
        </h1>

        <p className="mt-2 text-gray-600">
          Coloca el código QR del estudiante frente a la cámara.
        </p>
      </div>

      <div className="mx-auto max-w-2xl rounded-2xl bg-white p-4 shadow sm:p-6">
        {iniciandoCamara && (
          <div className="mb-4 rounded-lg bg-blue-50 p-4 text-center text-sm text-blue-700">
            Abriendo cámara...
          </div>
        )}

        {errorCamara && (
          <div className="mb-4 rounded-lg bg-red-50 p-4 text-center text-sm text-red-600">
            {errorCamara}
          </div>
        )}

        <div
          id="lector-qr"
          className="overflow-hidden rounded-xl"
        />

        {resultado && (
          <div
            className={`mt-5 rounded-xl border p-5 text-center ${obtenerEstilosResultado()}`}
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
  );
}