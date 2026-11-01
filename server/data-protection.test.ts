import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import {
  appendPrivacyAudit,
  classifySensitiveText,
  decryptLocal,
  encryptLocal,
  OutboundConsentGate,
} from "./data-protection.ts";

const temporary: string[] = [];
afterEach(() => {
  for (const path of temporary.splice(0)) rmSync(path, { recursive: true, force: true });
});

describe("local sensitive-data classifier", () => {
  it("detects Vietnamese identity, contact, contract and financial indicators without returning values", () => {
    const result = classifySensitiveText("CCCD 012345678901, điện thoại 0912345678, email a@example.com, hợp đồng thanh toán");
    expect(result.sensitive).toBe(true);
    expect(result.findings.map((item) => item.category)).toEqual(expect.arrayContaining(["national-id", "phone", "email", "contract", "financial"]));
    expect(JSON.stringify(result)).not.toContain("012345678901");
    expect(JSON.stringify(result)).not.toContain("a@example.com");
  });

  it("does not flag ordinary non-sensitive prose", () => {
    expect(classifySensitiveText("Xin chào, hôm nay chúng ta thảo luận về giao diện ứng dụng.").sensitive).toBe(false);
  });
});

describe("outbound consent challenge", () => {
  it("is one-use and bound to provider and exact payload", () => {
    const gate = new OutboundConsentGate();
    const challenge = gate.request("provider-a", "payload-a");
    expect(gate.approve(challenge.id, "provider-b", "payload-a")).toBe(false);
    expect(gate.approve(challenge.id, "provider-a", "payload-a")).toBe(false);
    const second = gate.request("provider-a", "payload-a");
    expect(gate.approve(second.id, "provider-a", "payload-b")).toBe(false);
    const third = gate.request("provider-a", "payload-a");
    expect(gate.approve(third.id, "provider-a", "payload-a")).toBe(true);
    expect(gate.approve(third.id, "provider-a", "payload-a")).toBe(false);
  });

  it("expires challenges", () => {
    let now = 1_000;
    const gate = new OutboundConsentGate(10, () => now);
    const challenge = gate.request("provider", "payload");
    now = 1_011;
    expect(gate.approve(challenge.id, "provider", "payload")).toBe(false);
  });
});

describe("AES-256-GCM local encryption", () => {
  it("round-trips data and rejects modified ciphertext", () => {
    const key = Buffer.alloc(32, 7);
    const plaintext = Buffer.from("private attachment contents");
    const envelope = encryptLocal(plaintext, key);
    expect(decryptLocal(envelope, key)).toEqual(plaintext);
    expect(() => decryptLocal({ ...envelope, ciphertext: Buffer.from("tampered").toString("base64") }, key)).toThrow();
  });

  it("rejects invalid key sizes", () => {
    expect(() => encryptLocal(Buffer.from("x"), Buffer.alloc(16))).toThrow(/32 bytes/);
    expect(() => decryptLocal({ version: 1, algorithm: "aes-256-gcm", iv: "", tag: "", ciphertext: "" }, Buffer.alloc(16))).toThrow(/32 bytes/);
  });
});

describe("metadata-only privacy audit", () => {
  it("writes categories and a digest but never the supplied secret text", () => {
    const dir = mkdtempSync(join(tmpdir(), "omb-privacy-audit-"));
    temporary.push(dir);
    const path = join(dir, "privacy.jsonl");
    appendPrivacyAudit(path, {
      provider: "provider-a",
      action: "approved",
      categories: ["contract", "financial"],
      payloadHash: "a".repeat(64),
    });
    const row = readFileSync(path, "utf8");
    expect(row).toContain('"contract"');
    expect(row).toContain("a".repeat(64));
    expect(row).not.toContain("private attachment contents");
  });
});
