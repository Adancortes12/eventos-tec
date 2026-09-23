import {
  createHmac,
  timingSafeEqual,
} from "node:crypto";

const obtenerSecret = () => {
  const secret =
    process.env.SESSION_SECRET;

  if (!secret) {
    throw new Error(
      "SESSION_SECRET no está configurado."
    );
  }

  return secret;
};

const firmar = (contenido) => {
  return createHmac(
    "sha256",
    obtenerSecret()
  )
    .update(contenido)
    .digest("hex");
};

export function crearSesion(datos) {
  const payload = {
    ...datos,

    exp:
      Date.now() +
      1000 * 60 * 60 * 8,
  };

  const contenido = Buffer.from(
    JSON.stringify(payload)
  ).toString("base64url");

  const firma =
    firmar(contenido);

  return `${contenido}.${firma}`;
}

export function verificarSesion(token) {
  if (!token) {
    return null;
  }

  const partes =
    token.split(".");

  if (partes.length !== 2) {
    return null;
  }

  const [
    contenido,
    firmaRecibida,
  ] = partes;

  const firmaEsperada =
    firmar(contenido);

  const bufferRecibido =
    Buffer.from(firmaRecibida);

  const bufferEsperado =
    Buffer.from(firmaEsperada);

  if (
    bufferRecibido.length !==
    bufferEsperado.length
  ) {
    return null;
  }

  const firmaValida =
    timingSafeEqual(
      bufferRecibido,
      bufferEsperado
    );

  if (!firmaValida) {
    return null;
  }

  try {
    const datos = JSON.parse(
      Buffer.from(
        contenido,
        "base64url"
      ).toString("utf8")
    );

    if (
      !datos.exp ||
      datos.exp < Date.now()
    ) {
      return null;
    }

    return datos;
  } catch {
    return null;
  }
}

export function obtenerCookie(
  req,
  nombre
) {
  const cookies =
    req.headers.cookie ?? "";

  const cookie = cookies
    .split(";")
    .map((valor) =>
      valor.trim()
    )
    .find((valor) =>
      valor.startsWith(
        `${nombre}=`
      )
    );

  if (!cookie) {
    return null;
  }

  return decodeURIComponent(
    cookie.substring(
      nombre.length + 1
    )
  );
}