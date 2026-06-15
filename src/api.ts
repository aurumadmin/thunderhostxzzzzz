import { User, MCServer, PterodactylSettings, SponsoredAd, Notification, SystemStats, UrlShortener } from "./types";

const API_BASE = "/api";

function getHeaders() {
  const token = localStorage.getItem("th_token");
  const headers: Record<string, string> = {
    "Content-Type": "application/json"
  };
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }
  return headers;
}

async function fetchJson<T>(url: string, options: RequestInit = {}): Promise<T> {
  const mergedOptions = {
    ...options,
    headers: {
      ...getHeaders(),
      ...(options.headers || {})
    }
  };

  const response = await fetch(url, mergedOptions);
  
  if (!response.ok) {
    let message = "An error occurred";
    try {
      const data = await response.json();
      message = data.message || message;
    } catch (_) {
      try {
        message = await response.text() || message;
      } catch (_) {}
    }
    throw new Error(message);
  }

  return response.json() as Promise<T>;
}

export const api = {
  // --- Authentication ---
  async register(username: string, email: string, password: string) {
    const data = await fetchJson<{ user: any; token: string }>(`${API_BASE}/auth/register`, {
      method: "POST",
      body: JSON.stringify({ username, email, password })
    });
    localStorage.setItem("th_token", data.token);
    localStorage.setItem("th_user", JSON.stringify(data.user));
    return data;
  },

  async login(email: string, password: string) {
    const data = await fetchJson<{ user: any; token: string }>(`${API_BASE}/auth/login`, {
      method: "POST",
      body: JSON.stringify({ email, password })
    });
    localStorage.setItem("th_token", data.token);
    localStorage.setItem("th_user", JSON.stringify(data.user));
    return data;
  },

  logout() {
    localStorage.removeItem("th_token");
    localStorage.removeItem("th_user");
  },

  async getProfile() {
    const data = await fetchJson<{ user: any }>(`${API_BASE}/auth/me`);
    localStorage.setItem("th_user", JSON.stringify(data.user));
    return data.user;
  },

  // --- Servers CRUD ---
  async getServers() {
    return fetchJson<MCServer[]>(`${API_BASE}/servers`);
  },

  async createServer(name: string, serverType?: "minecraft" | "bot", botType?: "nodejs" | "python") {
    return fetchJson<{ message: string; server: MCServer; coins: number }>(`${API_BASE}/servers/create`, {
      method: "POST",
      body: JSON.stringify({ name, serverType, botType })
    });
  },

  async renewServer(id: string, renewType: "upgraded" | "default" = "default") {
    return fetchJson<{ message: string; server: MCServer; coins: number }>(`${API_BASE}/servers/${id}/renew`, {
      method: "POST",
      body: JSON.stringify({ renewType })
    });
  },

  async resetPassword(email: string, username: string, newPassword: string) {
    return fetchJson<{ message: string }>(`${API_BASE}/auth/reset-password`, {
      method: "POST",
      body: JSON.stringify({ email, username, newPassword })
    });
  },

  async upgradeServer(id: string, planId: number) {
    return fetchJson<{ message: string; server: MCServer; coins: number }>(`${API_BASE}/servers/${id}/upgrade`, {
      method: "POST",
      body: JSON.stringify({ planId })
    });
  },

  async controlServer(id: string, action: "start" | "stop" | "restart") {
    return fetchJson<{ status: string }>(`${API_BASE}/servers/${id}/power`, {
      method: "POST",
      body: JSON.stringify({ action })
    });
  },

  async getServerStatus(id: string) {
    return fetchJson<{ status: string; cpuUsage: number; ramUsage: number }>(`${API_BASE}/servers/${id}/status`);
  },

  async deleteServer(id: string) {
    return fetchJson<{ message: string }>(`${API_BASE}/servers/${id}/delete`, {
      method: "POST"
    });
  },

  // --- Ads System ---
  async getAds() {
    return fetchJson<SponsoredAd[]>(`${API_BASE}/ads`);
  },

  async claimAd(adId: string) {
    return fetchJson<{ message: string; coins: number; claimsToday: number }>(`${API_BASE}/ads/claim`, {
      method: "POST",
      body: JSON.stringify({ adId })
    });
  },

  // --- Notifications ---
  async getNotifications() {
    return fetchJson<Notification[]>(`${API_BASE}/notifications`);
  },

  async markNotificationRead(id: string) {
    return fetchJson<{ success: boolean }>(`${API_BASE}/notifications/${id}/read`, {
      method: "POST"
    });
  },

  async clearNotifications() {
    return fetchJson<{ success: boolean }>(`${API_BASE}/notifications/clear`, {
      method: "POST"
    });
  },

  // --- Admin Methods ---
  async adminCreateServer(payload: {
    name: string;
    ownerEmail: string;
    serverType: "minecraft" | "bot";
    botType?: "nodejs" | "python";
    planId: number;
    cpu: number;
    ram: number;
    disk: number;
    durationHours: number;
  }) {
    return fetchJson<{ message: string; server: MCServer }>(`${API_BASE}/admin/servers/create`, {
      method: "POST",
      body: JSON.stringify(payload)
    });
  },

  async getAdminUsers() {
    return fetchJson<any[]>(`${API_BASE}/admin/users`);
  },

  async toggleUserSuspension(email: string) {
    return fetchJson<{ message: string; user: any }>(`${API_BASE}/admin/users/${encodeURIComponent(email)}/suspend`, {
      method: "POST"
    });
  },

  async deleteUser(email: string) {
    return fetchJson<{ message: string }>(`${API_BASE}/admin/users/${encodeURIComponent(email)}`, {
      method: "DELETE"
    });
  },

  async addAdminCoins(email: string, amount: number) {
    return fetchJson<{ message: string; coins: number }>(`${API_BASE}/admin/users/${encodeURIComponent(email)}/add-coins`, {
      method: "POST",
      body: JSON.stringify({ amount })
    });
  },

  async getAdminSettings() {
    return fetchJson<PterodactylSettings>(`${API_BASE}/admin/settings`);
  },

  async saveAdminSettings(settings: Partial<PterodactylSettings>) {
    return fetchJson<{ message: string; settings: PterodactylSettings }>(`${API_BASE}/admin/settings`, {
      method: "POST",
      body: JSON.stringify(settings)
    });
  },

  async getAdminAdSettings() {
    return fetchJson<any>(`${API_BASE}/admin/ad-settings`);
  },

  async saveAdminAdSettings(settings: any) {
    return fetchJson<{ message: string; settings: any }>(`${API_BASE}/admin/ad-settings`, {
      method: "POST",
      body: JSON.stringify(settings)
    });
  },

  async saveAdminAds(ads: SponsoredAd[]) {
    return fetchJson<{ message: string; ads: SponsoredAd[] }>(`${API_BASE}/admin/ads`, {
      method: "POST",
      body: JSON.stringify({ ads })
    });
  },

  async getAdminStats() {
    return fetchJson<SystemStats>(`${API_BASE}/admin/stats`);
  },

  // --- URL Shorteners ---
  async getShorteners() {
    return fetchJson<(UrlShortener & { completedToday: boolean })[]>(`${API_BASE}/shorteners`);
  },

  async generateShortenerLink(id: string) {
    return fetchJson<{ shortenedUrl: string }>(`${API_BASE}/shorteners/${id}/generate`, {
      method: "POST"
    });
  },

  async getAdminShorteners() {
    return fetchJson<UrlShortener[]>(`${API_BASE}/admin/shorteners`);
  },

  async addAdminShortener(name: string, apiUrl: string, apiToken: string, reward: number, viewsLimit: number) {
    return fetchJson<{ message: string; shortener: UrlShortener }>(`${API_BASE}/admin/shorteners`, {
      method: "POST",
      body: JSON.stringify({ name, apiUrl, apiToken, reward, viewsLimit })
    });
  },

  async deleteAdminShortener(id: string) {
    return fetchJson<{ message: string }>(`${API_BASE}/admin/shorteners/${id}`, {
      method: "DELETE"
    });
  },

  async getShortenerStats() {
    return fetchJson<any[]>(`${API_BASE}/admin/shortener-stats`);
  },

  async setUserRole(email: string, role: "admin" | "user") {
    return fetchJson<{ message: string; user: any }>(`${API_BASE}/admin/users/${encodeURIComponent(email)}/role`, {
      method: "POST",
      body: JSON.stringify({ role })
    });
  }
};
