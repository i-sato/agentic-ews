import { getPengaturan, setPengaturan } from "../sheets/store.ts";
import { getServiceAccountInfo } from "../sheets/reader.ts";
import { catatAuditLog } from "../lib/audit.ts";

export interface SettingsResponse {
  noreg_stabil_lintas_batch: "ya" | "tidak" | "belum_diverifikasi";
  catatan_lintas_batch_aktif: boolean;
  serviceAccount: {
    configured: boolean;
    clientEmail?: string;
  };
}

export async function handleGetSettings(): Promise<SettingsResponse> {
  const noregStabil = await getPengaturan("noreg_stabil_lintas_batch", "belum_diverifikasi");
  const catatanAktif = await getPengaturan("catatan_lintas_batch_aktif", false);
  const saInfo = getServiceAccountInfo();

  return {
    noreg_stabil_lintas_batch: noregStabil,
    catatan_lintas_batch_aktif: catatanAktif,
    serviceAccount: {
      configured: saInfo.configured,
      clientEmail: saInfo.clientEmail,
    },
  };
}

export async function handleUpdateCrossBatchSettings(
  noregStabil: "ya" | "tidak" | "belum_diverifikasi",
  catatanAktif: boolean,
  adminUserId?: string
): Promise<{ success: boolean }> {
  await setPengaturan("noreg_stabil_lintas_batch", noregStabil);
  await setPengaturan("catatan_lintas_batch_aktif", catatanAktif);

  await catatAuditLog({
    userId: adminUserId || null,
    aksi: "ubah_pengaturan_lintas_batch",
    objek: "pengaturan:catatan_lintas_batch",
    alasan: `Admin memverifikasi noreg_stabil: ${noregStabil}, status catatan lintas batch: ${catatanAktif}`,
    detail: { noregStabil, catatanAktif },
  });

  return { success: true };
}
