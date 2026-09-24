export default function handler(req, res) {
  if (
    req.method !== "POST" &&
    req.method !== "GET"
  ) {
    return res.status(405).json({
      error: "Método no permitido",
    });
  }

  const secure =
    process.env.NODE_ENV === "production"
      ? "; Secure"
      : "";

  res.setHeader(
    "Set-Cookie",
    `eventos_session=; HttpOnly; Path=/; Max-Age=0; SameSite=Lax${secure}`
  );

  return res.status(200).json({
    cerrado: true,
  });
}
