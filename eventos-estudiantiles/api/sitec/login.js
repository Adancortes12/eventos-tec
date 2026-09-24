import { randomBytes } from "node:crypto";

export default function handler(req, res) {
  if (req.method !== "GET") {
    res.status(405).json({
      error: "Método no permitido",
    });

    return;
  }

  const authorizationEndpoint =
    process.env.SIITEC_AUTHORIZATION_ENDPOINT;

  const clientId =
    process.env.SIITEC_CLIENT_ID;

  if (!authorizationEndpoint || !clientId) {
    res.status(500).json({
      error:
        "Faltan variables de configuración de SIITEC.",
    });

    return;
  }

 const appUrl = process.env.APP_URL;

if (!appUrl) {
  res.status(500).json({
    error: "APP_URL no está configurada.",
  });

  return;
}

const redirectUri =
  `${appUrl}/api/sitec/callback`;

  const state =
    randomBytes(32).toString("hex");

  const secure =
    process.env.NODE_ENV ===
    "production"
      ? "; Secure"
      : "";

  res.setHeader(
    "Set-Cookie",
    `sitec_oauth_state=${state}; HttpOnly; Path=/; Max-Age=600; SameSite=Lax${secure}`
  );

  const parametros =
    new URLSearchParams({
      response_type: "code",
      client_id: clientId,
      redirect_uri: redirectUri,
      scope: "openid profile email",
      state,
    });

  const urlAutorizacion =
    `${authorizationEndpoint}?${parametros.toString()}`;

  res.redirect(302, urlAutorizacion);
}
