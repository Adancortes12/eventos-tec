import https from 'https';
import fs from 'fs';
import express from "express";
import dashboard from "./server/eventos/dashboard.js";
import { db } from "./server/lib/db.js";
import crear from "./server/eventos/crear.js";
import editar from "./server/eventos/editar.js";
import eliminar from "./server/eventos/eliminar.js";
import finalizar from "./server/eventos/finalizar.js";
import inscribirse from "./server/eventos/inscribirse.js";
import misEventos from "./server/eventos/mis-eventos.js";
import detalle from "./server/eventos/detalle.js";
import listar from "./server/eventos/listar.js";
import maestros from "./server/admin/maestros.js";
import disponibles from "./server/eventos/disponibles.js";
import registrarAsistencia from "./api/asistencia/registrar.js";
import publico from "./server/eventos/publico.js";
import sitecLogin from "./api/sitec/login.js";
import sitecCallback from "./api/sitec/callback.js";
import sitecLogout from "./api/sitec/logout.js";
import sitecMe from "./api/sitec/me.js";

const app = express();

const PORT = Number(process.env.PORT || 3001);
const HTTPS_PORT = Number(process.env.HTTPS_PORT || 3443);

const HTTPS_SERVER_KEY_FILE = '/app/certs/server.key';
const HTTPS_SERVER_CRT_FILE = '/app/certs/server.crt';

/*
 * BODY
 */
app.use(express.json());

app.use(
  express.urlencoded({
    extended: true,
  })
);

/*
 * EVENTOS
 */
const accionesEventos = {
  crear,
  editar,
  eliminar,
  finalizar,
  inscribirse,
  "mis-eventos": misEventos,
  detalle,
  disponibles,
  publico,
  listar,
  dashboard,
};

app.all(
  "/api/eventos/:accion",
  async (req, res, next) => {
    try {
      const handler =
        accionesEventos[
          req.params.accion
        ];

      if (!handler) {
        return res.status(404).json({
          error:
            "Acción de evento no encontrada.",
        });
      }

      return await handler(
        req,
        res
      );
    } catch (error) {
      next(error);
    }
  }
);

/*
 * ADMINISTRACIÓN
 */
const accionesAdmin = {
  maestros,
};

app.all(
  "/api/admin/:accion",
  async (req, res, next) => {
    try {
      const handler =
        accionesAdmin[
          req.params.accion
        ];

      if (!handler) {
        return res.status(404).json({
          error:
            "Acción administrativa no encontrada.",
        });
      }

      return await handler(
        req,
        res
      );
    } catch (error) {
      next(error);
    }
  }
);

/*
 * ASISTENCIA
 */
app.all(
  "/api/asistencia/registrar",
  async (req, res, next) => {
    try {
      return await registrarAsistencia(
        req,
        res
      );
    } catch (error) {
      next(error);
    }
  }
);

/*
 * SITEc
 */
app.all(
  "/api/sitec/login",
  async (req, res, next) => {
    try {
      return await sitecLogin(
        req,
        res
      );
    } catch (error) {
      next(error);
    }
  }
);

app.all(
  "/api/sitec/callback",
  async (req, res, next) => {
    try {
      return await sitecCallback(
        req,
        res
      );
    } catch (error) {
      next(error);
    }
  }
);

app.all(
  "/api/sitec/logout",
  async (req, res, next) => {
    try {
      return await sitecLogout(
        req,
        res
      );
    } catch (error) {
      next(error);
    }
  }
);

app.all(
  "/api/sitec/me",
  async (req, res, next) => {
    try {
      return await sitecMe(
        req,
        res
      );
    } catch (error) {
      next(error);
    }
  }
);

/*
 * HEALTH CHECK
 *
 * Nos servirá después para Docker.
 */
app.get(
  "/api/health",
  (_req, res) => {
    return res.status(200).json({
      ok: true,
      servicio:
        "eventos-estudiantiles-api",
    });
  }
);
app.get(
  "/api/health/database",
  async (_req, res) => {
    try {
      const resultado = await db.query(`
        SELECT
          current_database() AS database,
          NOW() AS fecha
      `);

      return res.status(200).json({
        ok: true,
        database:
          resultado.rows[0].database,
        fecha:
          resultado.rows[0].fecha,
      });
    } catch (error) {
      console.error(
        "Error conectando PostgreSQL:",
        error
      );

      return res.status(500).json({
        ok: false,
        error:
          "No se pudo conectar con PostgreSQL.",
      });
    }
  }
);

/*
 * 404
 */
app.use((req, res) => {
  return res.status(404).json({
    error: "Ruta no encontrada.",
    ruta: req.originalUrl,
  });
});

/*
 * ERROR GLOBAL
 */
app.use(
  (error, _req, res, _next) => {
    console.error(
      "Error interno del servidor:",
      error
    );

    if (res.headersSent) {
      return;
    }

    return res.status(500).json({
      error:
        "Error interno del servidor.",
    });
  }
);

/*
 * INICIAR SERVIDOR
 */
app.listen(
  PORT,
  "0.0.0.0",
  () => {
    console.log(
      `API ejecutándose en puerto ${PORT}`
    );
  }
);

if (fs.existsSync(HTTPS_SERVER_KEY_FILE) && fs.existsSync(HTTPS_SERVER_CRT_FILE)) {
  const httpsOptions = {
    key: fs.readFileSync(HTTPS_SERVER_KEY_FILE),
    cert: fs.readFileSync(HTTPS_SERVER_CRT_FILE)
  };

  https.createServer(httpsOptions, app).listen(HTTPS_PORT, () => {
    console.log(`Listening on https://localhost:${HTTPS_PORT}`);
  });
}