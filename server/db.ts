import fs from "fs";
import path from "path";
import { User, MCServer, PterodactylSettings, AdSettings, SponsoredAd, Notification, UrlShortener, ShortenerCompletion } from "../src/types.js";

const DATA_DIR = path.join(process.cwd(), "data");
const DB_FILE = path.join(DATA_DIR, "db.json");

interface DBStructure {
  users: Record<string, User>; // email -> User
  servers: Record<string, MCServer>; // serverId -> MCServer
  settings: PterodactylSettings;
  adSettings: AdSettings;
  ads: SponsoredAd[];
  notifications: Notification[];
  shorteners?: UrlShortener[];
  shortenerCompletions?: ShortenerCompletion[];
  shortenerTokens?: Record<string, {
    userEmail: string;
    shortenerId: string;
    createdAt: string;
  }>;
}

const DEFAULT_AD_SETTINGS: AdSettings = {
  globalHeaderCode: `<!-- ThunderHost Site Verification Header -->\n<meta name="thunderhost-verification" content="site-verified-123456">`,
  adsHeaderCode: ``,
  banner728x90: `<div style="background: radial-gradient(circle, #1e293b 0%, #0f172a 100%); border: 1px solid #334155; border-radius: 12px; width: 728px; height: 90px; display: flex; flex-direction: column; justify-content: center; align-items: center; text-align: center; font-family: sans-serif; color: #94a3b8; box-sizing: border-box; overflow: hidden; padding: 10px; margin: 0 auto;">\n  <span style="font-weight: 800; font-size: 10px; text-transform: uppercase; color: #3b82f6; margin-bottom: 2px; letter-spacing: 0.05em; display: block;">Sponsor Advertisement (Leaderboard 728x90)</span>\n  <span style="font-size: 14px; font-weight: bold; color: #ffffff; display: block;">Host Your Minecraft Server on ThunderHost!</span>\n  <span style="font-size: 11px; color: #64748b; margin-top: 4px; display: block;">Free Slot • 4GB RAM • 100% CPU Ryzen Server</span>\n</div>`,
  banner300x250: `<div style="background: radial-gradient(circle, #1e293b 0%, #0f172a 100%); border: 1px solid #334155; border-radius: 12px; width: 300px; height: 250px; display: flex; flex-direction: column; justify-content: center; align-items: center; text-align: center; font-family: sans-serif; color: #94a3b8; box-sizing: border-box; overflow: hidden; padding: 20px; margin: 0 auto;">\n  <span style="font-weight: 800; font-size: 10px; text-transform: uppercase; color: #3b82f6; margin-bottom: 8px; letter-spacing: 0.05em; display: block;">Sponsor ad (Square 300x250)</span>\n  <span style="font-size: 16px; font-weight: bold; color: #ffffff; line-height: 1.3; display: block;">Need High Performance MC Slots?</span>\n  <p style="font-size: 12px; color: #94a3b8; margin: 8px 0 12px 0;">Level up your gameplay with zero lag and full FTP files configuration access.</p>\n  <button style="background: #2563eb; color: white; border: none; padding: 8px 16px; border-radius: 8px; font-size: 11px; font-weight: bold; cursor: pointer; display: inline-block;">Deploy Now</button>\n</div>`,
  banner320x50: `<div style="background: radial-gradient(circle, #1e293b 0%, #0f172a 100%); border: 1px solid #334155; border-radius: 12px; width: 320px; height: 50px; display: flex; flex-direction: column; justify-content: center; align-items: center; text-align: center; font-family: sans-serif; color: #94a3b8; box-sizing: border-box; overflow: hidden; padding: 5px; margin: 0 auto;">\n  <span style="font-weight: 800; font-size: 9px; text-transform: uppercase; color: #3b82f6; letter-spacing: 0.05em; display: block;">Sponsor (Mobile 320x50)</span>\n  <span style="font-size: 11px; font-weight: bold; color: #ffffff; display: block;">ThunderHost • 100% Free Hosting</span>\n</div>`,
  banner160x600: `<div style="background: radial-gradient(circle, #1e293b 0%, #0f172a 100%); border: 1px solid #334155; border-radius: 12px; width: 160px; height: 600px; display: flex; flex-direction: column; justify-content: center; align-items: center; text-align: center; font-family: sans-serif; color: #94a3b8; box-sizing: border-box; overflow: hidden; padding: 25px 15px; margin: 0 auto;">\n  <span style="font-weight: 800; font-size: 10px; text-transform: uppercase; color: #3b82f6; margin-bottom: 20px; letter-spacing: 0.05em; display: block;">Sponsor Skyscraper (160x600)</span>\n  <div style="font-size: 24px; margin-bottom: 20px;">⚡</div>\n  <span style="font-size: 15px; font-weight: bold; color: #ffffff; display: block; margin-bottom: 15px;">Zero Lag Server</span>\n  <p style="font-size: 12px; color: #64748b; line-height: 1.4; margin: 0 0 20px 0;">24/7 uptime guarantee, automatic backup systems, and direct Pterodactyl access console keys.</p>\n  <div style="margin-top: 40px; font-size: 11px; background: rgba(59,130,246,0.1); border: 1px solid rgba(59,130,246,0.2); padding: 10px; border-radius: 8px; color: #3b82f6; font-weight: bold; display: block;">ADSTERRA PRESET</div>\n</div>`
};

const DEFAULT_ADS: SponsoredAd[] = [
  {
    id: "ad_1",
    title: "⚡ ThunderHost Mega High-Performance Promo",
    reward: 0.1,
    duration: 15,
    embedUrl: "https://www.youtube.com/embed/dQw4w9WgXcQ", // fun video but highly interactive
    type: "video"
  },
  {
    id: "ad_2",
    title: "⛏️ Minecraft 1.21 Tricky Trials Showcase",
    reward: 0.1,
    duration: 15,
    embedUrl: "https://www.youtube.com/embed/gMvK6I7_92c",
    type: "video"
  },
  {
    id: "ad_3",
    title: "🎮 Epic Redstone Build Tutorials ad block",
    reward: 0.1,
    duration: 15,
    embedUrl: "https://www.youtube.com/embed/v78E6i_RREw",
    type: "video"
  }
];

const DEFAULT_SETTINGS: PterodactylSettings = {
  panelUrl: "https://gp.thunderhost.us.cc/",
  clientApiKey: "",
  applicationApiKey: "ptla_dChCIIZElU9zm12ToFfbGZeeQisk4j89w3yldZb0Di2",
  eggId: "2", // Default Minecraft Paper egg ID
  nestId: "1",  // Default Minecraft nest ID
  locationId: "1",
  dockerImage: "ghcr.io/pterodactyl/yolks:java_25",
  isConfigured: true
};

class JSONDatabase {
  private data: DBStructure = {
    users: {},
    servers: {},
    settings: DEFAULT_SETTINGS,
    adSettings: DEFAULT_AD_SETTINGS,
    ads: DEFAULT_ADS,
    notifications: [],
    shorteners: [],
    shortenerCompletions: [],
    shortenerTokens: {}
  };

  constructor() {
    this.init();
  }

  private init() {
    try {
      if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
      }

      if (fs.existsSync(DB_FILE)) {
        const fileContent = fs.readFileSync(DB_FILE, "utf-8");
        const parsed = JSON.parse(fileContent);
        this.data = {
          users: parsed.users || {},
          servers: parsed.servers || {},
          settings: parsed.settings ? { ...DEFAULT_SETTINGS, ...parsed.settings } : DEFAULT_SETTINGS,
          adSettings: parsed.adSettings ? { ...DEFAULT_AD_SETTINGS, ...parsed.adSettings } : DEFAULT_AD_SETTINGS,
          ads: parsed.ads || DEFAULT_ADS,
          notifications: parsed.notifications || [],
          shorteners: parsed.shorteners || [],
          shortenerCompletions: parsed.shortenerCompletions || [],
          shortenerTokens: parsed.shortenerTokens || {}
        };

        // Smoothly migrate old single headerCode / headerCodeBannerOnly settings to global/ads split structure
        if (parsed.adSettings) {
          const old = parsed.adSettings as any;
          if (old.headerCode !== undefined && old.globalHeaderCode === undefined) {
            if (old.headerCodeBannerOnly) {
              this.data.adSettings.adsHeaderCode = old.headerCode || "";
              this.data.adSettings.globalHeaderCode = "";
            } else {
              this.data.adSettings.globalHeaderCode = old.headerCode || "";
              this.data.adSettings.adsHeaderCode = "";
            }
            this.save();
          }
        }

        // Guarantee specific user-requested Pterodactyl active configuration is integrated
        if (
          !this.data.settings.panelUrl || 
          this.data.settings.panelUrl === "" || 
          !this.data.settings.isConfigured || 
          this.data.settings.applicationApiKey !== "ptla_dChCIIZElU9zm12ToFfbGZeeQisk4j89w3yldZb0Di2" ||
          this.data.settings.eggId !== "2" ||
          this.data.settings.nestId !== "1" ||
          this.data.settings.dockerImage !== "ghcr.io/pterodactyl/yolks:java_25"
        ) {
          this.data.settings.panelUrl = "https://gp.thunderhost.us.cc/";
          this.data.settings.applicationApiKey = "ptla_dChCIIZElU9zm12ToFfbGZeeQisk4j89w3yldZb0Di2";
          this.data.settings.eggId = "2";
          this.data.settings.nestId = "1";
          this.data.settings.dockerImage = "ghcr.io/pterodactyl/yolks:java_25";
          this.data.settings.isConfigured = true;
          this.save();
        }
      } else {
        this.save();
      }
    } catch (e) {
      console.error("Database file initialization error, starting fresh:", e);
    }
  }

  private save() {
    try {
      if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
      }
      fs.writeFileSync(DB_FILE, JSON.stringify(this.data, null, 2), "utf-8");
    } catch (err) {
      console.error("Failed to persist database file to disk:", err);
    }
  }

  // --- Users CRUD ---
  getUser(email: string): User | undefined {
    this.init(); // reload to keep updated
    return this.data.users[email.toLowerCase()];
  }

  createUser(user: User): void {
    this.data.users[user.email.toLowerCase()] = user;
    this.save();
  }

  updateUser(email: string, updater: (u: User) => void): User | null {
    const user = this.getUser(email);
    if (!user) return null;
    updater(user);
    this.data.users[email.toLowerCase()] = user;
    this.save();
    return user;
  }

  listUsers(): User[] {
    this.init();
    return Object.values(this.data.users);
  }

  deleteUser(email: string): void {
    const targetEmail = email.toLowerCase();
    delete this.data.users[targetEmail];
    
    // Also delete any servers owned by this user
    for (const key of Object.keys(this.data.servers)) {
      if (this.data.servers[key].ownerEmail.toLowerCase() === targetEmail) {
        delete this.data.servers[key];
      }
    }
    
    // Also delete associated notifications
    this.data.notifications = this.data.notifications.filter(n => n.userEmail.toLowerCase() !== targetEmail);
    
    // Also delete shortener completions
    if (this.data.shortenerCompletions) {
      this.data.shortenerCompletions = this.data.shortenerCompletions.filter(c => c.userEmail.toLowerCase() !== targetEmail);
    }
    this.save();
  }

  // --- Servers CRUD ---
  getServer(id: string): MCServer | undefined {
    this.init();
    return this.data.servers[id];
  }

  listServers(): MCServer[] {
    this.init();
    return Object.values(this.data.servers);
  }

  createServer(server: MCServer): void {
    this.data.servers[server.id] = server;
    this.save();
  }

  updateServer(id: string, updater: (s: MCServer) => void): MCServer | null {
    const server = this.getServer(id);
    if (!server) return null;
    updater(server);
    this.data.servers[id] = server;
    this.save();
    return server;
  }

  deleteServer(id: string): void {
    delete this.data.servers[id];
    this.save();
  }

  // --- Settings ---
  getSettings(): PterodactylSettings {
    this.init();
    return this.data.settings;
  }

  saveSettings(settings: PterodactylSettings): void {
    this.data.settings = settings;
    this.save();
  }

  // --- Ad Network Settings ---
  getAdSettings(): AdSettings {
    this.init();
    return this.data.adSettings || DEFAULT_AD_SETTINGS;
  }

  saveAdSettings(adSettings: AdSettings): void {
    this.data.adSettings = adSettings;
    this.save();
  }

  // --- Ads ---
  getAds(): SponsoredAd[] {
    this.init();
    return this.data.ads;
  }

  saveAds(ads: SponsoredAd[]): void {
    this.data.ads = ads;
    this.save();
  }

  // --- Notifications ---
  getNotifications(email: string): Notification[] {
    this.init();
    return this.data.notifications.filter(n => n.userEmail.toLowerCase() === email.toLowerCase());
  }

  addNotification(notification: Notification): void {
    this.data.notifications.unshift(notification);
    // keep only last 200 notifications for memory
    if (this.data.notifications.length > 200) {
      this.data.notifications.pop();
    }
    this.save();
  }

  markNotificationAsRead(id: string, email: string): void {
    const notification = this.data.notifications.find(n => n.id === id && n.userEmail.toLowerCase() === email.toLowerCase());
    if (notification) {
      notification.isRead = true;
      this.save();
    }
  }

  clearNotifications(email: string): void {
    this.data.notifications = this.data.notifications.filter(n => n.userEmail.toLowerCase() !== email.toLowerCase());
    this.save();
  }

  // --- Periodic Billing Daemon ---
  tickBilling(): void {
    this.init();
    const now = new Date();
    const servers = this.listServers();

    for (const server of servers) {
      const expirationDate = new Date(server.expiresAt);
      if (expirationDate <= now) {
        // Expiration reached! Let's check status
        if (server.status === "running" || server.status === "stopped") {
          // Attempt automatic daily/3-daily billing of 1 coin
          const owner = this.getUser(server.ownerEmail);
          const currentPlanId = server.planId || 1;
          let billAmount = 0;
          let keepUpgrade = false;

          if (owner && !owner.isSuspended) {
            if (currentPlanId > 1) {
              const upgradedPrice = currentPlanId === 2 ? 2 : 3;
              if (owner.coins >= upgradedPrice) {
                billAmount = upgradedPrice;
                keepUpgrade = true;
              } else if (owner.coins >= 1) {
                billAmount = 1;
                keepUpgrade = false;
              }
            } else {
              if (owner.coins >= 1) {
                billAmount = 1;
                keepUpgrade = false;
              }
            }
          }

          if (billAmount > 0 && owner) {
            this.updateUser(owner.email, u => {
              u.coins -= billAmount;
            });

            this.updateServer(server.id, s => {
              const isBot = s.serverType === "bot";
              const addedTime = isBot ? 3 * 24 * 60 * 60 * 1000 : 24 * 60 * 60 * 1000;
              s.expiresAt = new Date(expirationDate.getTime() + addedTime).toISOString();
              
              if (keepUpgrade) {
                (s as any).upgradedAt = new Date().toISOString();
              } else if (currentPlanId > 1) {
                // Paid default price, but specs stay upgraded until standard 24 hours expires.
                // Reverting daemon will handle resetting back to default plan when s.upgradedAt expires.
              } else {
                s.planId = 1;
                if (isBot) {
                  s.cpu = 25;
                  s.ram = 1024;
                  s.disk = 2048;
                } else {
                  s.cpu = 100;
                  s.ram = 4096;
                  s.disk = 10240;
                }
                delete (s as any).upgradedAt;
              }
            });

            this.addNotification({
              id: Math.random().toString(36).substring(7),
              userEmail: server.ownerEmail,
              title: keepUpgrade ? "⚡ Specifications Auto-Renewed" : "⚡ Server Auto-Renewed",
              message: keepUpgrade 
                ? `Your server "${server.name}" has been auto-renewed at Tier ${currentPlanId}. ${billAmount} Thunder coins deducted.`
                : `Your server "${server.name}" has been auto-renewed. 1 Thunder coin deducted from wallet. Specs will revert to default if upgrade expires.`,
              type: "success",
              isRead: false,
              createdAt: new Date().toISOString()
            });

            console.log(`Billed ${billAmount} coin(s) for server "${server.name}" owned by ${server.ownerEmail}`);
          } else {
            // Insufficient coins or suspended user. Suspend the server for 3 days
            const suspensionDuration = 3 * 24 * 60 * 60 * 1000; // 3 days
            const finalDeletionDate = new Date(now.getTime() + suspensionDuration).toISOString();

            this.updateServer(server.id, s => {
              s.status = "suspended";
              s.suspendedAt = now.toISOString();
              s.expiresAt = finalDeletionDate; // repurposed to mean deletion date if suspended
            });

            this.addNotification({
              id: Math.random().toString(36).substring(7),
              userEmail: server.ownerEmail,
              title: "⚠️ Server Suspended!",
              message: `Your server "${server.name}" has been suspended due to insufficient Thunder Coins. Refill and renew within 72 hours, otherwise it will be permanently deleted.`,
              type: "warning",
              isRead: false,
              createdAt: new Date().toISOString()
            });

            console.log(`Server suspended "${server.name}" owned by ${server.ownerEmail} (no coins)`);
          }
        } else if (server.status === "suspended") {
          // 3 days elapsed in suspension state -> complete deletion
          console.log(`Suspension expired for server "${server.name}". Deleting permanently.`);
          this.deleteServer(server.id);

          this.addNotification({
            id: Math.random().toString(36).substring(7),
            userEmail: server.ownerEmail,
            title: "❌ Server Permanently Deleted",
            message: `Your server "${server.name}" was permanently deleted because the 3 days suspension grace period passed and it wasn't renewed.`,
            type: "danger",
            isRead: false,
            createdAt: new Date().toISOString()
          });

          // Pterodactyl actual deletion would go here if configured
        }
      }
    }
  }

  // --- URL Shorteners CRUD ---
  getShorteners(): UrlShortener[] {
    this.init();
    return this.data.shorteners || [];
  }

  saveShorteners(shorteners: UrlShortener[]): void {
    this.data.shorteners = shorteners;
    this.save();
  }

  getAllShortenerCompletions(): ShortenerCompletion[] {
    this.init();
    return this.data.shortenerCompletions || [];
  }

  // --- Completions CRUD ---
  getShortenerCompletions(email: string): ShortenerCompletion[] {
    this.init();
    return (this.data.shortenerCompletions || []).filter(c => c.userEmail.toLowerCase() === email.toLowerCase());
  }

  addShortenerCompletion(completion: ShortenerCompletion): void {
    if (!this.data.shortenerCompletions) {
      this.data.shortenerCompletions = [];
    }
    this.data.shortenerCompletions.push(completion);
    this.save();
  }

  // --- Shortener Claim Tokens (One-time links) ---
  saveShortenerToken(token: string, details: { userEmail: string; shortenerId: string; createdAt: string }): void {
    if (!this.data.shortenerTokens) {
      this.data.shortenerTokens = {};
    }
    this.data.shortenerTokens[token] = details;
    this.save();
  }

  getShortenerToken(token: string) {
    this.init();
    return this.data.shortenerTokens ? this.data.shortenerTokens[token] : undefined;
  }

  deleteShortenerToken(token: string): void {
    if (this.data.shortenerTokens && this.data.shortenerTokens[token]) {
      delete this.data.shortenerTokens[token];
      this.save();
    }
  }
}

export const db = new JSONDatabase();
