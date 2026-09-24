import crear from "../../server/eventos/crear.js";
import editar from "../../server/eventos/editar.js";
import eliminar from "../../server/eventos/eliminar.js";
import finalizar from "../../server/eventos/finalizar.js";
import inscribirse from "../../server/eventos/inscribirse.js";
import misEventos from "../../server/eventos/mis-eventos.js";
import detalle from "../../server/eventos/detalle.js";

export default async function handler(req, res) {
  const parametro = req.query?.accion;

  const accion = Array.isArray(parametro)
    ? parametro[0]
    : parametro;

  switch (accion) {
    case "crear":
      return crear(req, res);

    case "editar":
      return editar(req, res);

    case "eliminar":
      return eliminar(req, res);

    case "finalizar":
      return finalizar(req, res);

    case "inscribirse":
      return inscribirse(req, res);

    case "mis-eventos":
      return misEventos(req, res);

    case "detalle":
      return detalle(req, res);

    default:
      return res.status(404).json({
        error: "Acción no encontrada.",
      });
  }
}