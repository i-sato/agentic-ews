import test from "node:test";
import assert from "node:assert/strict";
import {
  onboarding,
  lulus,
  hitungBatch,
  kumulatif,
  kebutuhanLulus,
  tingkatEws,
  maskNoReg,
  containsIdentifier,
  containsPii,
} from "../server/lib/rules.ts";
import {
  validatePasswordPolicy,
  checkLockout,
  recordFailedLogin,
  recordSuccessfulLogin,
} from "../server/lib/authPolicy.ts";
import {
  PkProfilSchema,
  EwsAnalisisSchema,
  FilenameParseSchema,
} from "../shared/schemas.ts";

test("server/lib/rules: hitung capaian, onboarding, kebutuhan lulus", () => {
  assert.equal(onboarding({ modulSelesai: 26, totalModul: 28 }), true);
  assert.equal(onboarding({ modulSelesai: 25, totalModul: 28 }), false);
  assert.equal(onboarding({ modulSelesai: 41, totalModul: 45 }), true);
  assert.equal(onboarding({ modulSelesai: 40, totalModul: 45 }), false);

  assert.equal(lulus({ modulSelesai: 45, totalModul: 45 }), true);
  assert.equal(lulus({ modulSelesai: 44, totalModul: 45 }), false);

  assert.equal(kebutuhanLulus(45, 87), 40);
  assert.equal(kebutuhanLulus(28, 87), 25);

  const ps = [
    { modulSelesai: 45, totalModul: 45 },
    { modulSelesai: 41, totalModul: 45 },
    { modulSelesai: 30, totalModul: 45 },
    { modulSelesai: 45, totalModul: 45, batal: true },
  ];
  const hasil = hitungBatch(ps);
  assert.equal(hasil.aktif, 3);
  assert.equal(hasil.onboarding, 2);
  assert.equal(hasil.lulus, 1);
  assert.equal(hasil.capaian, 50);
});

test("server/lib/rules: maskNoReg dan PII sentinel", () => {
  assert.equal(maskNoReg("1234567890"), "******7890");
  assert.equal(maskNoReg("123"), "***");
  assert.equal(maskNoReg("REG-13108-001"), "*********-001");

  assert.equal(containsPii("peserta dengan email test@komdigi.go.id lulus"), true);
  assert.equal(containsPii("peserta dengan NIK 3471012304900001"), true);
  assert.equal(containsPii("peserta anonim aman"), false);

  assert.equal(containsIdentifier("batch P-12345 reg 98765432 aktif", ["98765432"]), true);
  assert.equal(containsIdentifier("batch P-12345 aman", ["98765432"]), false);
});

test("server/lib/authPolicy: kata sandi minimal 12 karakter", () => {
  const shortPass = validatePasswordPolicy("Pendek123");
  assert.equal(shortPass.valid, false);

  const validPass = validatePasswordPolicy("AdminBLSDM2026!Yogya");
  assert.equal(validPass.valid, true);
});

test("server/lib/authPolicy: penguncian setelah 5 kali gagal", async () => {
  const testEmail = "test-fail@blsdm.komdigi.go.id";
  for (let i = 1; i <= 4; i++) {
    const res = await recordFailedLogin(testEmail, "uji_gagal");
    assert.equal(res.isLocked, false);
    assert.equal(res.failedAttempts, i);
  }

  // 5th attempt locks out
  const fifth = await recordFailedLogin(testEmail, "uji_gagal_5");
  assert.equal(fifth.isLocked, true);
  assert.equal(fifth.failedAttempts, 5);

  const check = checkLockout(testEmail);
  assert.equal(check.isLocked, true);
  assert.ok(check.remainingSeconds > 0);

  // Success resets
  await recordSuccessfulLogin("00000000-0000-0000-0000-000000000001", testEmail);
  const checkAfterSuccess = checkLockout(testEmail);
  assert.equal(checkAfterSuccess.isLocked, false);
});

test("shared/schemas: validasi Zod sesuai JSON schema", () => {
  const parsedFilename = FilenameParseSchema.safeParse({
    id_pelatihan: "13108",
    tema_atau_alias: "FAWD",
    level: "Fundamental",
    tanggal_mulai: "01-09",
    tanggal_selesai: "30-09",
    keyakinan: "tinggi",
    catatan: "Sesuai regex",
  });
  assert.equal(parsedFilename.success, true);

  const invalidLevel = FilenameParseSchema.safeParse({
    id_pelatihan: "13108",
    tema_atau_alias: "FAWD",
    level: "Expert", // invalid
    tanggal_mulai: "01-09",
    tanggal_selesai: "30-09",
    keyakinan: "tinggi",
    catatan: "",
  });
  assert.equal(invalidLevel.success, false);
});
