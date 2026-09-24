import maestros from "../../server/admin/maestros.js";

export default async function handler(req, res) {
  let accion = req.query?.accion;

  if (Array.isArray(accion)) {
    accion = accion[0];
  }

  switch (accion) {
    case "maestros":
      return maestros(req, res);

    default:
      return res.status(404).json({
        error: "Acción no encontrada.",
      });
  }
}