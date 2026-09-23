export default function handler(req, res) {
  res.status(200).json({
    authorizationEndpoint: Boolean(
      process.env.SIITEC_AUTHORIZATION_ENDPOINT
    ),
    clientId: Boolean(
      process.env.SIITEC_CLIENT_ID
    ),
    clientSecret: Boolean(
      process.env.SIITEC_CLIENT_SECRET
    ),
    tokenEndpoint: Boolean(
      process.env.SIITEC_TOKEN_ENDPOINT
    ),
    userinfoEndpoint: Boolean(
      process.env.SIITEC_USERINFO_ENDPOINT
    ),
    usuariosEndpoint: Boolean(
      process.env.SIITEC_USUARIOS_ENDPOINT
    ),
    supabaseSecret: Boolean(
      process.env.SUPABASE_SECRET_KEY
    ),
    sessionSecret: Boolean(
      process.env.SESSION_SECRET
    ),
  });
}