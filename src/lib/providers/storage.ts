/**
 * StorageProvider: fotos e assinaturas ficam atrás desta interface.
 * Dev: LocalStorageProvider grava em /uploads (fora de /public — acesso só
 * via rota autenticada). Deploy: trocar por S3/Supabase Storage sem refatorar.
 *
 * Convenção de chave: "<professionalId>/<categoria>/<arquivo>" — o dono é
 * sempre o primeiro segmento, usado na checagem de acesso.
 */
import { mkdir, readFile, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";

export type StoredFile = { data: Buffer; contentType: string };

export interface StorageProvider {
  readonly name: string;
  put(key: string, data: Buffer, contentType: string): Promise<void>;
  get(key: string): Promise<StoredFile | null>;
  delete(key: string): Promise<void>;
}

const EXT_BY_TYPE: Record<string, string> = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
};

const TYPE_BY_EXT: Record<string, string> = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
};

function safeKey(key: string): string {
  // impede path traversal; chaves só com [a-zA-Z0-9/_-.] simples
  const normalized = key.replace(/\\/g, "/");
  if (normalized.includes("..") || path.isAbsolute(normalized)) {
    throw new Error("Chave de arquivo inválida");
  }
  return normalized;
}

export class LocalStorageProvider implements StorageProvider {
  readonly name = "local";
  private readonly root = path.join(process.cwd(), "uploads");

  private filePath(key: string): string {
    return path.join(this.root, safeKey(key));
  }

  async put(key: string, data: Buffer, contentType: string): Promise<void> {
    const filePath = this.filePath(key);
    await mkdir(path.dirname(filePath), { recursive: true });
    await writeFile(filePath, data);
    void contentType; // tipo é inferido da extensão na leitura
  }

  async get(key: string): Promise<StoredFile | null> {
    try {
      const filePath = this.filePath(key);
      const data = await readFile(filePath);
      const ext = path.extname(filePath).toLowerCase();
      return { data, contentType: TYPE_BY_EXT[ext] ?? "application/octet-stream" };
    } catch {
      return null;
    }
  }

  async delete(key: string): Promise<void> {
    try {
      await unlink(this.filePath(key));
    } catch {
      // já não existe — ok
    }
  }
}

/**
 * Produção (Vercel + Supabase): arquivos no Supabase Storage via API REST,
 * autenticados com a service key (bucket privado — o acesso público continua
 * passando pelas rotas autenticadas do app).
 */
export class SupabaseStorageProvider implements StorageProvider {
  readonly name = "supabase";
  private readonly baseUrl: string;
  private readonly serviceKey: string;
  private readonly bucket: string;

  constructor() {
    this.baseUrl = (process.env.SUPABASE_URL ?? "").replace(/\/$/, "");
    this.serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
    this.bucket = process.env.SUPABASE_STORAGE_BUCKET ?? "uploads";
  }

  private objectUrl(key: string): string {
    return `${this.baseUrl}/storage/v1/object/${this.bucket}/${safeKey(key)}`;
  }

  private headers(extra: Record<string, string> = {}): Record<string, string> {
    return { Authorization: `Bearer ${this.serviceKey}`, ...extra };
  }

  async put(key: string, data: Buffer, contentType: string): Promise<void> {
    const res = await fetch(this.objectUrl(key), {
      method: "POST",
      headers: this.headers({ "Content-Type": contentType, "x-upsert": "true" }),
      body: new Uint8Array(data),
    });
    if (!res.ok) {
      throw new Error(`Supabase Storage: upload falhou (${res.status} ${await res.text()})`);
    }
  }

  async get(key: string): Promise<StoredFile | null> {
    const res = await fetch(this.objectUrl(key), { headers: this.headers() });
    if (!res.ok) return null;
    const data = Buffer.from(await res.arrayBuffer());
    return {
      data,
      contentType: res.headers.get("content-type") ?? "application/octet-stream",
    };
  }

  async delete(key: string): Promise<void> {
    await fetch(this.objectUrl(key), { method: "DELETE", headers: this.headers() });
  }
}

let provider: StorageProvider | null = null;

export function getStorageProvider(): StorageProvider {
  if (!provider) {
    provider =
      process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY
        ? new SupabaseStorageProvider()
        : new LocalStorageProvider();
  }
  return provider;
}

/** Gera uma chave única: "<professionalId>/<categoria>/<aleatório><ext>". */
export function newStorageKey(
  professionalId: string,
  category: "fotos" | "assinaturas" | "logo",
  contentType: string,
): string {
  const ext = EXT_BY_TYPE[contentType] ?? ".bin";
  return `${professionalId}/${category}/${crypto.randomUUID()}${ext}`;
}

/** Dono da chave = primeiro segmento. */
export function storageKeyOwner(key: string): string {
  return safeKey(key).split("/")[0] ?? "";
}
