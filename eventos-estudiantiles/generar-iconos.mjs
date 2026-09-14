import sharp from "sharp";

await sharp("public/pwa-icon.svg")
  .resize(192, 192)
  .png()
  .toFile("public/pwa-192x192.png");

await sharp("public/pwa-icon.svg")
  .resize(512, 512)
  .png()
  .toFile("public/pwa-512x512.png");

await sharp("public/pwa-icon.svg")
  .resize(512, 512)
  .png()
  .toFile("public/pwa-maskable-512x512.png");

console.log("Iconos PWA generados correctamente.");