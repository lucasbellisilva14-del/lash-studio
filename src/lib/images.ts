import "server-only";
import sharp from "sharp";

/**
 * Processa fotos no upload: corrige rotação EXIF, converte para WebP
 * (menor e universal) e gera miniatura para listas/timeline.
 * Obs.: iOS converte HEIC→JPEG sozinho no input de arquivo do Safari.
 */
export async function processPhoto(input: Buffer): Promise<{
  full: Buffer;
  thumb: Buffer;
  contentType: "image/webp";
}> {
  const base = sharp(input, { failOn: "none" }).rotate();
  const [full, thumb] = await Promise.all([
    base
      .clone()
      .resize({ width: 1600, height: 1600, fit: "inside", withoutEnlargement: true })
      .webp({ quality: 82 })
      .toBuffer(),
    base.clone().resize({ width: 320, height: 320, fit: "cover" }).webp({ quality: 70 }).toBuffer(),
  ]);
  return { full, thumb, contentType: "image/webp" };
}
