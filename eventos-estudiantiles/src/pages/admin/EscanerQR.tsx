import {
  useEffect,
  useRef,
  useState,
} from "react";

import {
  Link,
  useParams,
} from "react-router";

import {
  Html5Qrcode,
} from "html5-qrcode";

type ResultadoEscaneo = {
  tipo:
    | "exito"
    | "repetido"
    | "invalido"
    | "otro_evento"
    | "error";

  titulo: string;
  nombre?: string;
  numero?: string;
  hora?: string;
};

type RespuestaAsistencia = {
  tipo?: string;
  error?: string;
  nombre?: string;
  numero?: string;
  asistioEn?: string | null;
};

export default function EscanerQR() {
  const { id } = useParams();

  const [
    resultado,
    setResultado,
  ] =
    useState<ResultadoEscaneo | null>(
      null
    );

  const [
    iniciandoCamara,
    setIniciandoCamara,
  ] = useState(true);

  const [
    errorCamara,
    setErrorCamara,
  ] = useState("");

  const procesandoRef =
    useRef(false);

  useEffect(() => {
    if (!id) {
      return;
    }

    const lector =
      new Html5Qrcode(
        "lector-qr"
      );

    const liberarEscaner = () => {
      setTimeout(() => {
        procesandoRef.current =
          false;

        setResultado(null);
      }, 2500);
    };

    const procesarQr = async (
      tokenQr: string
    ) => {
      if (
        procesandoRef.current ||
        !id
      ) {
        return;
      }

      procesandoRef.current =
        true;

      try {
        const respuesta =
          await fetch(
            "/api/asistencia/registrar",
            {
              method: "POST",
              credentials:
                "include",

              headers: {
                "Content-Type":
                  "application/json",
              },

              body: JSON.stringify({
                eventoId: id,
                tokenQr,
              }),
            }
          );

        const datos: RespuestaAsistencia =
          await respuesta.json();

        /*
         * QR INVÁLIDO
         */
        if (
          datos.tipo ===
          "invalido"
        ) {
          setResultado({
            tipo: "invalido",
            titulo:
              "QR NO VÁLIDO",
          });

          liberarEscaner();
          return;
        }

        /*
         * QR DE OTRO EVENTO
         */
        if (
          datos.tipo ===
          "otro_evento"
        ) {
          setResultado({
            tipo:
              "otro_evento",

            titulo:
              "ESTE QR NO PERTENECE A ESTE EVENTO",
          });

          liberarEscaner();
          return;
        }

        /*
         * YA TENÍA ASISTENCIA
         */
        if (
          datos.tipo ===
          "repetido"
        ) {
          setResultado({
            tipo: "repetido",

            titulo:
              "ASISTENCIA YA REGISTRADA",

            nombre:
              datos.nombre,

            numero:
              datos.numero,

            hora:
              datos.asistioEn
                ? new Date(
                    datos.asistioEn
                  ).toLocaleString(
                    "es-MX"
                  )
                : undefined,
          });

          liberarEscaner();
          return;
        }

        /*
         * RESPUESTA DE ERROR
         */
        if (!respuesta.ok) {
          setResultado({
            tipo: "error",

            titulo:
              datos.error ??
              "NO SE PUDO REGISTRAR LA ASISTENCIA",
          });

          liberarEscaner();
          return;
        }

        /*
         * ASISTENCIA REGISTRADA
         */
        if (
          datos.tipo ===
          "exito"
        ) {
          setResultado({
            tipo: "exito",

            titulo:
              "ASISTENCIA REGISTRADA",

            nombre:
              datos.nombre,

            numero:
              datos.numero,

            hora:
              datos.asistioEn
                ? new Date(
                    datos.asistioEn
                  ).toLocaleString(
                    "es-MX"
                  )
                : undefined,
          });

          liberarEscaner();
          return;
        }

        /*
         * RESPUESTA INESPERADA
         */
        setResultado({
          tipo: "error",

          titulo:
            "RESPUESTA NO VÁLIDA DEL SERVIDOR",
        });

        liberarEscaner();
      } catch (error) {
        console.error(error);

        setResultado({
          tipo: "error",

          titulo:
            "NO SE PUDO CONECTAR CON EL SERVIDOR",
        });

        liberarEscaner();
      }
    };

    const iniciarCamara =
      async () => {
        try {
          setIniciandoCamara(
            true
          );

          setErrorCamara("");

          await lector.start(
            {
              facingMode:
                "environment",
            },

            {
              fps: 10,

              qrbox: {
                width: 250,
                height: 250,
              },
            },

            async (
              textoDecodificado
            ) => {
              await procesarQr(
                textoDecodificado.trim()
              );
            },

            () => {
              // Ignoramos lecturas
              // que todavía no detecten QR.
            }
          );

          setIniciandoCamara(
            false
          );
        } catch (error) {
          console.error(error);

          setErrorCamara(
            "No se pudo abrir la cámara. Verifica los permisos del navegador."
          );

          setIniciandoCamara(
            false
          );
        }
      };

    iniciarCamara();

    return () => {
      const detener =
        async () => {
          try {
            if (
              lector.isScanning
            ) {
              await lector.stop();
            }

            lector.clear();
          } catch (error) {
            console.error(
              error
            );
          }
        };

      detener();
    };
  }, [id]);

  const obtenerEstilosResultado =
    () => {
      if (!resultado) {
        return "";
      }

      switch (
        resultado.tipo
      ) {
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
          className="text-sm font-medium text-[#1B396A]"
        >
          ← Volver al evento
        </Link>

        <h1 className="mt-4 text-3xl font-bold text-[#1F2937]">
          Pasar asistencia
        </h1>

        <p className="mt-2 text-gray-600">
          Coloca el código QR
          del estudiante frente
          a la cámara.
        </p>
      </div>

      <div className="mx-auto max-w-2xl rounded-2xl bg-white p-4 shadow sm:p-6">
        {iniciandoCamara && (
          <div className="mb-4 rounded-lg bg-[#EEF2F7] p-4 text-center text-sm text-[#1B396A]">
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
                Hora:{" "}
                {resultado.hora}
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}