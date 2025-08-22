export type GraphAuth = {
  tenantId: string;
  clientId: string;
  clientSecret: string;
};

let cachedToken: { accessToken: string; expiresAt: number } | null = null;

function getEnv(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env ${name}`);
  return v;
}

async function getAccessToken(): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  if (cachedToken && cachedToken.expiresAt - 60 > now) {
    return cachedToken.accessToken;
  }
  const tenantId = getEnv('GRAPH_TENANT_ID');
  const clientId = getEnv('GRAPH_CLIENT_ID');
  const clientSecret = getEnv('GRAPH_CLIENT_SECRET');
  const body = new URLSearchParams();
  body.set('client_id', clientId);
  body.set('client_secret', clientSecret);
  body.set('grant_type', 'client_credentials');
  body.set('scope', 'https://graph.microsoft.com/.default');
  const res = await fetch(`https://login.microsoftonline.com/${encodeURIComponent(tenantId)}/oauth2/v2.0/token`, {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: body.toString()
  });
  if (!res.ok) {
    const t = await res.text();
    throw new Error(`Graph token error: ${t}`);
  }
  const json = await res.json();
  cachedToken = { accessToken: json.access_token, expiresAt: now + (json.expires_in || 3600) };
  return cachedToken.accessToken;
}

export async function graphFetch<T = any>(path: string, init?: RequestInit): Promise<T> {
  const token = await getAccessToken();
  const url = path.startsWith('https://') ? path : `https://graph.microsoft.com/v1.0${path}`;
  const res = await fetch(url, {
    ...init,
    headers: {
      'authorization': `Bearer ${token}`,
      'accept': 'application/json',
      ...(init?.headers || {})
    }
  });
  if (!res.ok) {
    const t = await res.text();
    throw new Error(`Graph fetch ${url} failed: ${res.status} ${t}`);
  }
  return res.json();
}

export async function resolveSiteIdFromUrl(siteUrl: string): Promise<{ siteId: string; hostname: string; sitePath: string }> {
  // Example: https://appaltibv.sharepoint.com/sites/appalti9
  const u = new URL(siteUrl);
  const hostname = u.hostname; // appaltibv.sharepoint.com
  // path looks like /sites/appalti9
  const sitePath = u.pathname.replace(/\/+$/,'');
  const data = await graphFetch<{ id: string }>(`/sites/${hostname}:${sitePath}`);
  return { siteId: data.id, hostname, sitePath };
}

export async function listSiteDrives(siteId: string): Promise<Array<{ id: string; name: string }>> {
  const data = await graphFetch<{ value: Array<{ id: string; name: string }> }>(`/sites/${siteId}/drives`);
  return data.value || [];
}

export async function getDriveByName(siteId: string, driveName: string): Promise<{ id: string; name: string } | null> {
  const drives = await listSiteDrives(siteId);
  return drives.find(d => d.name.toLowerCase() === driveName.toLowerCase()) || null;
}

export type DriveItem = {
  id: string;
  name: string;
  webUrl: string;
  size?: number;
  mimeType?: string;
  path: string; // virtual path within the drive
};

async function listChildren(driveId: string, encodedPath: string): Promise<DriveItem[]> {
  // encodedPath like /Klanten%20Shares or /Klanten%20Shares/Sub
  const res = await graphFetch<{ value: any[] }>(`/drives/${driveId}/root:${encodedPath}:/children?$top=999`);
  const items: DriveItem[] = [];
  for (const v of res.value || []) {
    const isFolder = !!v.folder;
    const mimeType = v.file?.mimeType;
    const name = v.name as string;
    const id = v.id as string;
    const webUrl = v.webUrl as string;
    const size = typeof v.size === 'number' ? v.size : undefined;
    const path = `${decodeURIComponent(encodedPath)}/${name}`;
    if (isFolder) {
      const sub = await listChildren(driveId, `${encodedPath}/${encodeURIComponent(name)}`);
      items.push(...sub);
    } else {
      items.push({ id, name, webUrl, size, mimeType, path });
    }
  }
  return items;
}

export async function listFilesInSiteLibraryFolder(siteUrl: string, driveName: string, folderPath: string): Promise<DriveItem[]> {
  const { siteId } = await resolveSiteIdFromUrl(siteUrl);
  const drive = await getDriveByName(siteId, driveName);
  if (!drive) throw new Error(`Drive not found: ${driveName}`);
  const encodedPath = folderPath
    .split('/')
    .filter(Boolean)
    .map(s => encodeURIComponent(s))
    .join('/');
  const prefix = encodedPath ? `/${encodedPath}` : '';
  return listChildren(drive.id, prefix || '/');
}

export async function listFilesInUserOneDriveFolder(userPrincipalName: string, folderPath: string): Promise<DriveItem[]> {
  // Resolve folder and traverse recursively
  const segments = folderPath.split('/').filter(Boolean).map(s => encodeURIComponent(s)).join('/');
  const encoded = segments ? `/${segments}` : '';
  async function recur(encodedPath: string): Promise<DriveItem[]> {
    const data = await graphFetch<{ value: any[] }>(`/users/${encodeURIComponent(userPrincipalName)}/drive/root:${encodedPath}:/children?$top=999`);
    const results: DriveItem[] = [];
    for (const v of data.value || []) {
      const isFolder = !!v.folder;
      const name = v.name as string;
      const id = v.id as string;
      const webUrl = v.webUrl as string;
      const size = typeof v.size === 'number' ? v.size : undefined;
      const mimeType = v.file?.mimeType as string | undefined;
      const newPath = `${decodeURIComponent(encodedPath)}/${name}`;
      if (isFolder) {
        const sub = await recur(`${encodedPath}/${encodeURIComponent(name)}`);
        results.push(...sub);
      } else {
        results.push({ id, name, webUrl, size, mimeType, path: newPath });
      }
    }
    return results;
  }
  return recur(encoded || '/');
}

export async function downloadTextContentForItem(driveIdOrUser: { driveId?: string; userUpn?: string }, itemId: string, mimeType?: string, name?: string): Promise<string | null> {
  // Only handle text-like files for now
  const lower = (name || '').toLowerCase();
  const exts = ['.txt', '.md', '.markdown', '.csv', '.log', '.json', '.html', '.htm'];
  const ok = exts.some(e => lower.endsWith(e));
  if (!ok) return null;
  const token = await getAccessToken();
  let url: string;
  if (driveIdOrUser.driveId) {
    url = `https://graph.microsoft.com/v1.0/drives/${driveIdOrUser.driveId}/items/${itemId}/content`;
  } else if (driveIdOrUser.userUpn) {
    url = `https://graph.microsoft.com/v1.0/users/${encodeURIComponent(driveIdOrUser.userUpn)}/drive/items/${itemId}/content`;
  } else {
    throw new Error('driveId or userUpn required');
  }
  const res = await fetch(url, { headers: { authorization: `Bearer ${token}` } });
  if (!res.ok) {
    return null;
  }
  const buffer = await res.arrayBuffer();
  let text = new TextDecoder('utf-8').decode(new Uint8Array(buffer));
  if (lower.endsWith('.html') || lower.endsWith('.htm')) {
    // naive strip tags
    text = text.replace(/<script[\s\S]*?<\/script>/gi, ' ').replace(/<style[\s\S]*?<\/style>/gi, ' ').replace(/<[^>]+>/g, ' ');
  }
  return text;
}