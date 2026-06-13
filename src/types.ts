export interface User {
  email: string;
  username: string;
  passwordHash: string;
  coins: number;
  isSuspended: boolean;
  role: "admin" | "user";
  claimsToday: number;
  lastClaimDate: string; // YYYY-MM-DD
  createdAt: string;
}

export interface MCServer {
  id: string;
  name: string;
  ownerEmail: string;
  serverType?: "minecraft" | "bot";
  botType?: "python" | "nodejs";
  planId?: number; // 1 = default, 2, 3, 4
  cpu: number; // e.g. 100 (% CPU)
  ram: number; // e.g. 4096 (MB RAM)
  disk: number; // e.g. 10240 (MB Disk)
  status: "creating" | "running" | "stopped" | "suspended" | "deleting";
  expiresAt: string; // ISO string
  suspendedAt: string | null; // ISO string if suspended
  pterodactylId: string | null;
  pteroUsername?: string;
  pteroPassword?: string;
  panelUrl?: string;
  ipAddress: string;
  port: number;
  createdAt: string;
}

export interface PterodactylSettings {
  panelUrl: string;
  clientApiKey: string;
  applicationApiKey: string;
  eggId: string;
  nestId: string;
  locationId: string;
  dockerImage: string;
  isConfigured: boolean;
}

export interface AdSettings {
  headerCode: string;
  banner728x90: string;
  banner300x250: string;
  banner320x50: string;
  banner160x600: string;
}

export interface SponsoredAd {
  id: string;
  title: string;
  reward: number; // in Thunder coins, e.g. 0.1
  duration: number; // in seconds, e.g. 15
  embedUrl?: string; // custom web url
  type: "video" | "banner" | "url_shortener";
}

export interface Notification {
  id: string;
  userEmail: string;
  title: string;
  message: string;
  type: "warning" | "success" | "info" | "danger";
  isRead: boolean;
  createdAt: string;
}

export interface SystemStats {
  totalUsers: number;
  activeServers: number;
  suspendedServers: number;
  totalCoins: number;
  pteroStatus: "connected" | "disconnected" | "unconfigured";
}

export interface AuthResponse {
  user: {
    email: string;
    username: string;
    role: "admin" | "user";
    coins: number;
    claimsToday: number;
    isSuspended: boolean;
  } | null;
  token: string | null;
  message?: string;
}

export interface UrlShortener {
  id: string;
  name: string;
  apiUrl: string;
  apiToken: string;
  reward: number; // e.g., 1.0 coin
  viewsLimit?: number;
  isEnabled: boolean;
  createdAt: string;
}

export interface ShortenerCompletion {
  id: string;
  userEmail: string;
  shortenerId: string;
  completedAt: string; // ISOString
}

