export type InscripcionLocal = {
  eventoId: string;
  codigoEvento: string;
  nombreEvento: string;
  descripcionEvento: string | null;
  fechaEvento: string;
  horaEvento: string;

  numeroEstudiante: string;
  nombreCompleto: string;

  tokenQr: string;
  registradoEn: string;
};

const CLAVE =
  "eventos-estudiantiles-inscripciones";

export function obtenerInscripcionesLocales(): InscripcionLocal[] {
  try {
    const datos =
      localStorage.getItem(CLAVE);

    if (!datos) {
      return [];
    }

    const inscripciones =
      JSON.parse(datos);

    if (!Array.isArray(inscripciones)) {
      return [];
    }

    return inscripciones;
  } catch (error) {
    console.error(
      "No se pudieron leer las inscripciones locales:",
      error
    );

    return [];
  }
}

export function guardarInscripcionLocal(
  nuevaInscripcion: InscripcionLocal
) {
  try {
    const inscripciones =
      obtenerInscripcionesLocales();

    const existe =
      inscripciones.some(
        (inscripcion) =>
          inscripcion.eventoId ===
            nuevaInscripcion.eventoId &&
          inscripcion.numeroEstudiante ===
            nuevaInscripcion.numeroEstudiante
      );

    if (existe) {
      return;
    }

    const nuevasInscripciones = [
      ...inscripciones,
      nuevaInscripcion,
    ];

    localStorage.setItem(
      CLAVE,
      JSON.stringify(
        nuevasInscripciones
      )
    );
  } catch (error) {
    console.error(
      "No se pudo guardar la inscripción local:",
      error
    );
  }
}

export function obtenerInscripcionPorEvento(
  codigoEvento: string
) {
  const inscripciones =
    obtenerInscripcionesLocales();

  return (
    inscripciones.find(
      (inscripcion) =>
        inscripcion.codigoEvento ===
        codigoEvento
    ) ?? null
  );
}