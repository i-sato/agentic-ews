import {
  getValidationItems,
  updateValidationItemStatus,
  getBatchById,
  saveBatch,
} from "../sheets/store.ts";
import type { ValidationItem } from "../../shared/types.ts";
import { catatAuditLog } from "../lib/audit.ts";

export async function handleGetValidationItems(status?: string): Promise<ValidationItem[]> {
  return await getValidationItems(status);
}

export async function handleDecideValidationItem(
  id: string,
  status: "diterima" | "diubah" | "ditolak",
  catatan?: string,
  saran?: any,
  adminUserId?: string
): Promise<{ success: boolean; item: ValidationItem | null; message?: string }> {
  const updated = await updateValidationItemStatus(id, status, adminUserId, saran);
  if (!updated) {
    return { success: false, item: null, message: "Item validasi tidak ditemukan." };
  }

  // Jika item validasi terkait perubahan level batch
  if (updated.batch_id && updated.jenis === "level") {
    const batch = await getBatchById(updated.batch_id);
    if (batch) {
      if (status === "diterima") {
        batch.level = "Fundamental";
        batch.level_source = "manual";
        batch.masuk_capaian_pk = true;
        batch.validasi_status = "valid";
        await saveBatch(batch);
      } else if (status === "diubah") {
        const newLevel = saran?.level || "Intermediate";
        batch.level = newLevel;
        batch.level_source = "manual";
        batch.masuk_capaian_pk = newLevel === "Fundamental";
        batch.validasi_status = "valid";
        await saveBatch(batch);
      } else if (status === "ditolak") {
        batch.validasi_status = "ditolak";
        batch.masuk_capaian_pk = false;
        await saveBatch(batch);
      }
    }
  }

  // Catat keputusan manusia ke audit_log
  await catatAuditLog({
    userId: adminUserId || null,
    aksi: `keputusan_validasi_${status}`,
    objek: `validation_items:${id}`,
    alasan: catatan || `Keputusan admin: ${status} untuk item ${updated.jenis}`,
    detail: {
      itemId: id,
      jenis: updated.jenis,
      status,
      batchId: updated.batch_id,
      saran,
    },
  });

  return { success: true, item: updated };
}
