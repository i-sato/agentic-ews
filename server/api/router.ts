import { handleAdminLogin, handleAdminLogout } from "./auth.ts";
import { fetchAuditLogs } from "./audit.ts";
import {
  handleRegisterBatches,
  handleFetchBatch,
  handleFetchAllBatches,
  handleUploadBatchCsv,
} from "./batch.ts";
import {
  handleGetValidationItems,
  handleDecideValidationItem,
} from "./validation.ts";
import {
  handleGetSettings,
  handleUpdateCrossBatchSettings,
} from "./settings.ts";
import { getBatches, getBatchById, getLatestSnapshot, getPesertaMasked } from "../sheets/store.ts";

/**
 * Handle incoming API requests in server environment (Vite middleware or Vercel Function)
 */
export async function handleApiRoute(
  method: string,
  pathname: string,
  searchParams: URLSearchParams,
  body: any
): Promise<{ status: number; data: any }> {
  try {
    // Auth routes
    if (pathname === "/api/auth/login" && method === "POST") {
      const res = await handleAdminLogin(body);
      return { status: res.success ? 200 : 401, data: res };
    }

    if (pathname === "/api/auth/logout" && method === "POST") {
      const res = await handleAdminLogout(body?.userId, body?.email, body?.reason);
      return { status: 200, data: res };
    }

    // Audit routes
    if (pathname === "/api/audit" && method === "GET") {
      const limit = parseInt(searchParams.get("limit") || "50", 10);
      const logs = await fetchAuditLogs(limit);
      return { status: 200, data: logs };
    }

    // Settings routes
    if (pathname === "/api/settings" && method === "GET") {
      const settings = await handleGetSettings();
      return { status: 200, data: settings };
    }

    if (pathname === "/api/settings/cross-batch" && method === "POST") {
      const res = await handleUpdateCrossBatchSettings(
        body.noreg_stabil_lintas_batch,
        body.catatan_lintas_batch_aktif,
        body.userId
      );
      return { status: 200, data: res };
    }

    // Batches routes
    if (pathname === "/api/batches" && method === "GET") {
      const tahunParam = searchParams.get("tahun");
      const tahun = tahunParam ? parseInt(tahunParam, 10) : undefined;
      const batches = await getBatches(tahun);

      // Attach latest snapshot info
      const enriched = await Promise.all(
        batches.map(async (b) => {
          const snap = await getLatestSnapshot(b.id);
          return {
            ...b,
            snapshot: snap,
          };
        })
      );
      return { status: 200, data: enriched };
    }

    if (pathname === "/api/batches/register" && method === "POST") {
      const res = await handleRegisterBatches(body.inputs || [], body.userId);
      return { status: 200, data: res };
    }

    if (pathname === "/api/batches/fetch-all" && method === "POST") {
      const tahun = body.tahun ? parseInt(body.tahun, 10) : undefined;
      const res = await handleFetchAllBatches(tahun, body.pemicu || "manual");
      return { status: 200, data: res };
    }

    const batchFetchMatch = pathname.match(/^\/api\/batches\/([a-zA-Z0-9-_]+)\/fetch$/);
    if (batchFetchMatch && method === "POST") {
      const batchId = batchFetchMatch[1];
      const res = await handleFetchBatch(batchId, body?.pemicu || "manual");
      return { status: 200, data: res };
    }

    const batchUploadMatch = pathname.match(/^\/api\/batches\/([a-zA-Z0-9-_]+)\/upload$/);
    if (batchUploadMatch && method === "POST") {
      const batchId = batchUploadMatch[1];
      const res = await handleUploadBatchCsv(batchId, body.csvText || "");
      return { status: 200, data: res };
    }

    const batchDetailMatch = pathname.match(/^\/api\/batches\/([a-zA-Z0-9-_]+)$/);
    if (batchDetailMatch && method === "GET") {
      const batchId = batchDetailMatch[1];
      const batch = await getBatchById(batchId);
      if (!batch) {
        return { status: 404, data: { error: "Batch tidak ditemukan" } };
      }
      const snapshot = await getLatestSnapshot(batchId);
      const peserta = await getPesertaMasked(batchId);
      return {
        status: 200,
        data: {
          batch,
          snapshot,
          pesertaCount: peserta.length,
          pesertaMasked: peserta.slice(0, 50), // Preview 50 masked
        },
      };
    }

    // Validation routes
    if (pathname === "/api/validation" && method === "GET") {
      const status = searchParams.get("status") || undefined;
      const items = await handleGetValidationItems(status);
      return { status: 200, data: items };
    }

    const valDecideMatch = pathname.match(/^\/api\/validation\/([a-zA-Z0-9-_]+)\/decide$/);
    if (valDecideMatch && method === "POST") {
      const id = valDecideMatch[1];
      const res = await handleDecideValidationItem(
        id,
        body.status,
        body.catatan,
        body.saran,
        body.userId
      );
      return { status: 200, data: res };
    }

    return { status: 404, data: { error: `Endpoint '${pathname}' tidak ditemukan.` } };
  } catch (err: any) {
    console.error("[API Router Error]", err);
    return { status: 500, data: { error: err.message || "Internal server error" } };
  }
}
