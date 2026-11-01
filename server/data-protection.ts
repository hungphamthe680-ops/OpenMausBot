import { createCipheriv, createDecipheriv, createHash, randomBytes, randomUUID } from "node:crypto";
import { appendFileSync, mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { spawnSync } from "node:child_process";

export type SensitiveCategory = "national-id" | "phone" | "email" | "address" | "financial" | "contract";
export interface SensitiveFinding { category: SensitiveCategory; count: number }
export interface Classification { sensitive: boolean; findings: SensitiveFinding[] }

const RULES: Array<{ category: SensitiveCategory; pattern: RegExp }> = [
  { category: "national-id", pattern: /\b(?:\d{12}|\d{9})\b/g },
  { category: "phone", pattern: /(?:\+?84|0)(?:\s|[-.])?(?:\d(?:\s|[-.]?)){8,10}\b/g },
  { category: "email", pattern: /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi },
  { category: "financial", pattern: /\b(?:số tài khoản|stk|tài khoản ngân hàng|số dư|số tiền|thanh toán|chuyển khoản|mã giao dịch|giá bán|đặt cọc|công nợ)\b/gi },
  { category: "contract", pattern: /\b(?:hợp đồng|phụ lục hợp đồng|biên bản thanh lý|giấy đặt cọc|hồ sơ khách hàng|căn cước công dân|cccd)\b/gi },
  { category: "address", pattern: /\b(?:số nhà|đường|phường|xã|quận|huyện|tỉnh|thành phố|địa chỉ thường trú|nơi ở hiện tại)\b/gi },
];

/** Local heuristic only. Returns categories/counts, never matched values or excerpts. */
export function classifySensitiveText(input: string): Classification {
  const text = input.normalize("NFC");
  const findings: SensitiveFinding[] = [];
  for (const rule of RULES) {
    rule.pattern.lastIndex = 0;
    let count = 0;
    while (rule.pattern.exec(text)) count += 1;
    if (count) findings.push({ category: rule.category, count });
  }
  return { sensitive: findings.length > 0, findings };
}

export interface ConsentChallenge { id: string; provider: string; payloadHash: string; expiresAt: number }
/** One-use approval bound to an exact provider and exact payload hash. */
export class OutboundConsentGate {
  readonly #pending = new Map<string, ConsentChallenge>();
  readonly #ttlMs: number;
  readonly #now: () => number;
  constructor(ttlMs = 120_000, now = () => Date.now()) {
    this.#ttlMs = ttlMs;
    this.#now = now;
  }
  request(provider: string, payload: string): ConsentChallenge {
    const challenge = { id: randomUUID(), provider, payloadHash: createHash("sha256").update(payload).digest("hex"), expiresAt: this.#now() + this.#ttlMs };
    this.#pending.set(challenge.id, challenge);
    return { ...challenge };
  }
  approve(id: string, provider: string, payload: string): boolean {
    const challenge = this.#pending.get(id);
    this.#pending.delete(id);
    if (!challenge || challenge.expiresAt <= this.#now() || challenge.provider !== provider) return false;
    return challenge.payloadHash === createHash("sha256").update(payload).digest("hex");
  }
  clear(): void { this.#pending.clear(); }
}

export interface PrivacyAuditRecord {
  at: string; provider: string; action: "blocked" | "consent-requested" | "approved" | "denied";
  categories: SensitiveCategory[]; payloadHash: string; operationId: string;
}
/** Metadata-only audit. Never write prompt bodies, filenames, excerpts, credentials or detected values. */
export function appendPrivacyAudit(path: string, input: Omit<PrivacyAuditRecord, "at" | "operationId"> & { operationId?: string }): void {
  mkdirSync(dirname(path), { recursive: true, mode: 0o700 });
  const row: PrivacyAuditRecord = {
    at: new Date().toISOString(), operationId: input.operationId ?? randomUUID(),
    provider: input.provider.slice(0, 80), action: input.action,
    categories: [...new Set(input.categories)], payloadHash: input.payloadHash,
  };
  appendFileSync(path, JSON.stringify(row) + "\n", { encoding: "utf8", mode: 0o600 });
}

export interface EncryptedEnvelope { version: 1; algorithm: "aes-256-gcm"; iv: string; tag: string; ciphertext: string }
/** AES-256-GCM authenticated encryption. Key custody must be supplied by the OS key store. */
export function encryptLocal(plaintext: Uint8Array, key: Uint8Array): EncryptedEnvelope {
  if (key.byteLength !== 32) throw new Error("Data-protection key must be exactly 32 bytes");
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const ciphertext = Buffer.concat([cipher.update(plaintext), cipher.final()]);
  return { version: 1, algorithm: "aes-256-gcm", iv: iv.toString("base64"), tag: cipher.getAuthTag().toString("base64"), ciphertext: ciphertext.toString("base64") };
}
export function decryptLocal(envelope: EncryptedEnvelope, key: Uint8Array): Buffer {
  if (key.byteLength !== 32 || envelope.version !== 1 || envelope.algorithm !== "aes-256-gcm") throw new Error("Unsupported encrypted data envelope");
  const decipher = createDecipheriv("aes-256-gcm", key, Buffer.from(envelope.iv, "base64"));
  decipher.setAuthTag(Buffer.from(envelope.tag, "base64"));
  return Buffer.concat([decipher.update(Buffer.from(envelope.ciphertext, "base64")), decipher.final()]);
}

/** Windows DPAPI CurrentUser protects the 32-byte data key; key material is sent on stdin, never argv. */
export function protectKeyWithWindowsDpapi(key: Uint8Array, protect: boolean): Buffer {
  if (process.platform !== "win32") throw new Error("Windows DPAPI is available only on Windows");
  if (protect && key.byteLength !== 32) throw new Error("Data-protection key must be exactly 32 bytes");
  const script = protect
    ? "$b=[Convert]::FromBase64String([Console]::In.ReadToEnd());$p=[Security.Cryptography.ProtectedData]::Protect($b,$null,[Security.Cryptography.DataProtectionScope]::CurrentUser);[Console]::Out.Write([Convert]::ToBase64String($p))"
    : "$b=[Convert]::FromBase64String([Console]::In.ReadToEnd());$p=[Security.Cryptography.ProtectedData]::Unprotect($b,$null,[Security.Cryptography.DataProtectionScope]::CurrentUser);[Console]::Out.Write([Convert]::ToBase64String($p))";
  const result = spawnSync("powershell.exe", ["-NoLogo", "-NoProfile", "-NonInteractive", "-Command", script], {
    input: Buffer.from(key).toString("base64"), encoding: "utf8", windowsHide: true, timeout: 10_000,
  });
  if (result.status !== 0 || result.error) throw new Error("Windows DPAPI key operation failed");
  const output = Buffer.from(result.stdout.trim(), "base64");
  if (!protect && output.byteLength !== 32) throw new Error("DPAPI returned an invalid data key");
  return output;
}
