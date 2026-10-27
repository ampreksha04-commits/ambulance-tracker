const configuredBase = import.meta.env.VITE_API_BASE_URL || "";

async function request(baseUrl, path, options = {}) {
  const response = await fetch(`${baseUrl || configuredBase}${path}`, {
    ...options,
    headers: { "Content-Type": "application/json", ...options.headers },
  });
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(body.error || `Request failed (${response.status})`);
  }
  return response.status === 204 ? null : response.json();
}

export async function getHealth(baseUrl = configuredBase) {
  try {
    return { ok: true, data: await request(baseUrl, "/api/health") };
  } catch (error) {
    if (!/404/.test(error.message)) throw error;
    return { ok: true, data: await request(baseUrl, "/api/ambulances"), legacy: true };
  }
}

export async function getAmbulances(baseUrl = configuredBase) {
  const result = await request(baseUrl, "/api/ambulances");
  return Array.isArray(result) ? result : result.ambulances || [];
}

export async function getAmbulance(id, baseUrl = configuredBase) {
  try {
    return await request(baseUrl, `/api/ambulances/${encodeURIComponent(id)}`);
  } catch (error) {
    if (!/404/.test(error.message)) throw error;
    const history = await request(baseUrl, `/api/ambulances/${encodeURIComponent(id)}/history?limit=1`);
    return Array.isArray(history) ? history[0] : history;
  }
}

export async function postLocation(id, location, baseUrl = configuredBase) {
  try {
    return await request(baseUrl, "/api/locations", {
      method: "POST",
      body: JSON.stringify({ ...location, ambulanceId: id }),
    });
  } catch (error) {
    if (!/404/.test(error.message)) throw error;
    return request(baseUrl, `/api/ambulances/${encodeURIComponent(id)}/location`, {
      method: "POST",
      body: JSON.stringify(location),
    });
  }
}
