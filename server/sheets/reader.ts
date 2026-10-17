import { createSign } from "node:crypto";

export interface SheetUrlInfo {
  url: string;
  sheetId: string;
  gid: string | null;
}

export interface ServiceAccountInfo {
  configured: boolean;
  clientEmail?: string;
  projectId?: string;
}

export interface SheetReadResult {
  success: boolean;
  status: "ok" | "tidak_berubah" | "gagal" | "tab_hilang" | "akses_ditolak";
  title?: string;
  rows?: string[][];
  error?: string;
  serviceAccountEmail?: string;
}

/**
 * Parsing URL Google Sheets untuk mengambil sheetId dan gid
 */
export function parseSheetUrl(url: string): SheetUrlInfo | null {
  if (!url || typeof url !== "string") return null;

  // Pola: https://docs.google.com/spreadsheets/d/{sheetId}/edit#gid={gid}
  // Atau /d/{sheetId}/
  const mId = url.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
  if (!mId) return null;

  const sheetId = mId[1];
  const mGid = url.match(/[#&]gid=([0-9]+)/);
  const gid = mGid ? mGid[1] : null;

  return {
    url,
    sheetId,
    gid,
  };
}

/**
 * Mendapatkan informasi Service Account dari environment variable
 */
export function getServiceAccountInfo(): ServiceAccountInfo {
  const raw = process.env.GOOGLE_SERVICE_ACCOUNT_JSON || "";
  if (!raw.trim()) {
    return { configured: false };
  }

  try {
    let jsonStr = raw.trim();
    // Jika tidak berawalan '{', diasumsikan base64
    if (!jsonStr.startsWith("{")) {
      jsonStr = Buffer.from(jsonStr, "base64").toString("utf8");
    }
    const parsed = JSON.parse(jsonStr);
    return {
      configured: Boolean(parsed.client_email && parsed.private_key),
      clientEmail: parsed.client_email,
      projectId: parsed.project_id,
    };
  } catch {
    return { configured: false };
  }
}

/**
 * Meminta Google OAuth2 Access Token menggunakan signed JWT dari service account
 */
async function getGoogleAccessToken(serviceAccountJson: any): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const header = { alg: "RS256", typ: "JWT" };
  const claimSet = {
    iss: serviceAccountJson.client_email,
    scope: "https://www.googleapis.com/auth/spreadsheets.readonly",
    aud: "https://oauth2.googleapis.com/token",
    exp: now + 3600,
    iat: now,
  };

  const encodeBase64Url = (obj: any) =>
    Buffer.from(JSON.stringify(obj))
      .toString("base64")
      .replace(/=/g, "")
      .replace(/\+/g, "-")
      .replace(/\//g, "_");

  const unsignedToken = `${encodeBase64Url(header)}.${encodeBase64Url(claimSet)}`;

  const sign = createSign("RSA-SHA256");
  sign.update(unsignedToken);
  sign.end();

  const signature = sign
    .sign(serviceAccountJson.private_key, "base64")
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");

  const jwt = `${unsignedToken}.${signature}`;

  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: jwt,
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Gagal memperoleh token Google: ${res.status} ${errText}`);
  }

  const tokenData = await res.json();
  return tokenData.access_token;
}

/**
 * Membaca Google Sheet via REST API (read-only)
 */
export async function bacaGoogleSheet(
  sheetId: string,
  tabNama = "All Pendaftar Web"
): Promise<SheetReadResult> {
  const saRaw = process.env.GOOGLE_SERVICE_ACCOUNT_JSON || "";
  if (!saRaw.trim()) {
    return {
      success: false,
      status: "gagal",
      error: "Service Account Google (GOOGLE_SERVICE_ACCOUNT_JSON) belum dikonfigurasi di server.",
    };
  }

  let sa: any;
  try {
    let jsonStr = saRaw.trim();
    if (!jsonStr.startsWith("{")) {
      jsonStr = Buffer.from(jsonStr, "base64").toString("utf8");
    }
    sa = JSON.parse(jsonStr);
  } catch (err: any) {
    return {
      success: false,
      status: "gagal",
      error: `Format GOOGLE_SERVICE_ACCOUNT_JSON tidak valid: ${err.message}`,
    };
  }

  try {
    const accessToken = await getGoogleAccessToken(sa);

    // 1. Ambil metadata spreadsheet (judul & daftar sheet)
    const metaRes = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}?fields=properties.title,sheets.properties.title`,
      {
        headers: { Authorization: `Bearer ${accessToken}` },
      }
    );

    if (metaRes.status === 403 || metaRes.status === 401) {
      return {
        success: false,
        status: "akses_ditolak",
        serviceAccountEmail: sa.client_email,
        error: `Akses ditolak (${metaRes.status}). Silakan bagikan sheet ini sebagai 'Viewer' ke ${sa.client_email}.`,
      };
    }

    if (!metaRes.ok) {
      const err = await metaRes.text();
      return {
        success: false,
        status: "gagal",
        error: `Gagal membaca spreadsheet: ${metaRes.status} ${err}`,
      };
    }

    const metaData = await metaRes.json();
    const sheetTitle = metaData.properties?.title || "";
    const sheetTabs: string[] = (metaData.sheets || []).map(
      (s: any) => s.properties?.title
    );

    // 2. Cek apakah tab yang diminta tersedia
    const targetTabExists = sheetTabs.includes(tabNama);
    if (!targetTabExists) {
      return {
        success: false,
        status: "tab_hilang",
        title: sheetTitle,
        error: `Tab '${tabNama}' tidak ditemukan dalam sheet. Tab yang tersedia: ${sheetTabs.join(", ")}`,
      };
    }

    // 3. Baca baris data dari tab
    const encodedTab = encodeURIComponent(tabNama);
    const valRes = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${encodedTab}`,
      {
        headers: { Authorization: `Bearer ${accessToken}` },
      }
    );

    if (!valRes.ok) {
      const err = await valRes.text();
      return {
        success: false,
        status: "gagal",
        title: sheetTitle,
        error: `Gagal membaca tab '${tabNama}': ${valRes.status} ${err}`,
      };
    }

    const valData = await valRes.json();
    const rows: string[][] = valData.values || [];

    return {
      success: true,
      status: "ok",
      title: sheetTitle,
      rows,
    };
  } catch (err: any) {
    return {
      success: false,
      status: "gagal",
      error: err.message || "Kesalahan koneksi saat membaca Google Sheets.",
    };
  }
}

/**
 * Parsing teks CSV menjadi baris 2D string
 */
export function parseCsvRows(csvText: string): string[][] {
  const lines: string[][] = [];
  const rawLines = csvText.split(/\r?\n/);

  for (const line of rawLines) {
    if (!line.trim()) continue;

    const row: string[] = [];
    let current = "";
    let insideQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"') {
        if (insideQuotes && line[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          insideQuotes = !insideQuotes;
        }
      } else if (char === "," && !insideQuotes) {
        row.push(current.trim());
        current = "";
      } else {
        current += char;
      }
    }
    row.push(current.trim());
    lines.push(row);
  }

  return lines;
}
