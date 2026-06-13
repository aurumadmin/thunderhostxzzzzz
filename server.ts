import express from "express";
import path from "path";
import fs from "fs";
import { createServer as createViteServer } from "vite";
import { db } from "./server/db.js";
import { createPteroServer, deletePteroServer, controlPteroPower, getPteroServerStatus, updatePteroServerBuild } from "./server/pterodactyl.js";
import { User, MCServer, Notification } from "./src/types.js";

const app = express();
const PORT = 3000;

app.use(express.json());

// --- Helper: Simple Authentication Middleware ---
// Since we run in sandbox preview, we use safe Bearer token parsing where
// token = email of the user (or base64 of it).
function authenticateToken(req: express.Request, res: express.Response, next: express.NextFunction) {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];

  if (!token) {
    res.status(401).json({ message: "Authentication token missing" });
    return;
  }

  // Decrypt/Parse token (just simple string check of email for ease of use)
  let email = token;
  if (token.includes(":")) {
    email = token.split(":")[0];
  }

  const user = db.getUser(email);
  if (!user) {
    res.status(403).json({ message: "User account not found" });
    return;
  }

  if (user.isSuspended) {
    res.status(403).json({ message: "Your ThunderHost account has been suspended by support." });
    return;
  }

  // Setup current local YYYY-MM-DD to reset ad claims daily if context calendar shifted
  const todayStr = new Date().toISOString().split("T")[0];
  if (user.lastClaimDate !== todayStr) {
    db.updateUser(user.email, u => {
      u.claimsToday = 0;
      u.lastClaimDate = todayStr;
    });
  }

  req.user = db.getUser(email); // assign fresh updated user
  next();
}

// Extends express Request type to host user
declare global {
  namespace Express {
    interface Request {
      user?: User;
    }
  }
}

// --- Auth Endpoints ---

app.post("/api/auth/register", (req, res) => {
  const { username, email, password } = req.body;

  if (!username || !email || !password) {
    res.status(400).json({ message: "Please fill out all fields" });
    return;
  }

  const existing = db.getUser(email);
  if (existing) {
    res.status(400).json({ message: "This email address is already registered." });
    return;
  }

  const rawIp = req.headers["x-forwarded-for"] as string || req.headers["x-real-ip"] as string || req.socket.remoteAddress || "";
  const ip = rawIp.split(",")[0].trim();

  // Restrict creating multiple accounts from a single IP (bypass loopback/localhost)
  if (ip && ip !== "127.0.0.1" && ip !== "::1" && ip !== "localhost") {
    const isIpRegistered = db.listUsers().some(u => u.registrationIp === ip);
    if (isIpRegistered) {
      res.status(400).json({ message: "An account has already been registered from this IP address to prevent multiple accounts." });
      return;
    }
  }

  // Pre-load with 1.0 Thunder Coins to allow instant first-server setup trial!
  const isDefaultAdmin = ["teamthunderofficialyt@gmail.com", "freefiregtamcpe@gmail.com"].includes(email.toLowerCase());

  const newUser: User = {
    email: email.toLowerCase(),
    username: username.trim(),
    passwordHash: password, // Store password (simple storage for mockup database)
    coins: 1.0, // Initial balance
    isSuspended: false,
    role: isDefaultAdmin ? "admin" : "user",
    claimsToday: 0,
    lastClaimDate: new Date().toISOString().split("T")[0],
    createdAt: new Date().toISOString(),
    registrationIp: ip || undefined
  };

  db.createUser(newUser);

  // Send a welcome notification
  db.addNotification({
    id: Math.random().toString(36).substring(7),
    userEmail: newUser.email,
    title: "⚡ Welcome to ThunderHost!",
    message: "Welcome! We've credited your wallet with 1.0 free Thunder Coin to get you started with your first Minecraft server instantly.",
    type: "success",
    isRead: false,
    createdAt: new Date().toISOString()
  });

  res.json({
    user: {
      email: newUser.email,
      username: newUser.username,
      role: newUser.role,
      coins: newUser.coins,
      claimsToday: newUser.claimsToday,
      isSuspended: false
    },
    token: `${newUser.email}:session-key`
  });
});

app.post("/api/auth/login", (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    res.status(400).json({ message: "Please provide email and password" });
    return;
  }

  const user = db.getUser(email);
  if (!user || user.passwordHash !== password) {
    res.status(400).json({ message: "Invalid email credentials or password." });
    return;
  }

  if (user.isSuspended) {
    res.status(403).json({ message: "Your ThunderHost account has been suspended by administrators." });
    return;
  }

  res.json({
    user: {
      email: user.email,
      username: user.username,
      role: user.role,
      coins: user.coins,
      claimsToday: user.claimsToday,
      isSuspended: false
    },
    token: `${user.email}:session-key`
  });
});

app.post("/api/auth/reset-password", (req, res) => {
  const { email, username, newPassword } = req.body;

  if (!email || !username || !newPassword) {
    res.status(400).json({ message: "Please fill out all fields: email, username, and new password." });
    return;
  }

  const user = db.getUser(email);
  if (!user) {
    res.status(400).json({ message: "No registered account found with that email address." });
    return;
  }

  if (user.username.trim().toLowerCase() !== username.trim().toLowerCase()) {
    res.status(400).json({ message: "The provided username does not match the registered account details." });
    return;
  }

  if (newPassword.length < 4) {
    res.status(400).json({ message: "The new password must be at least 4 characters long." });
    return;
  }

  db.updateUser(user.email, u => {
    u.passwordHash = newPassword;
  });

  db.addNotification({
    id: Math.random().toString(36).substring(7),
    userEmail: user.email,
    title: "🔒 Password Reset Successful",
    message: "Your account password was successfully reset from the forgot password page.",
    type: "info",
    isRead: false,
    createdAt: new Date().toISOString()
  });

  res.json({ message: "Password reset successful! You can now log in with your new password." });
});

app.get("/api/auth/me", authenticateToken, (req, res) => {
  res.json({
    user: {
      email: req.user!.email,
      username: req.user!.username,
      role: req.user!.role,
      coins: req.user!.coins,
      claimsToday: req.user!.claimsToday,
      isSuspended: req.user!.isSuspended
    }
  });
});

// --- Server Management ---

app.get("/api/servers", authenticateToken, (req, res) => {
  const allServers = db.listServers();
  // Admins see all servers, normal users only see their own
  const visible = req.user!.role === "admin"
    ? allServers
    : allServers.filter(s => s.ownerEmail.toLowerCase() === req.user!.email.toLowerCase());

  const settings = db.getSettings();
  const serversWithPanel = visible.map(s => ({
    ...s,
    panelUrl: settings.panelUrl || "https://panel.thunderhost.club"
  }));

  res.json(serversWithPanel);
});

app.post("/api/servers/create", authenticateToken, async (req, res) => {
  const { name, serverType, botType } = req.body;

  if (!name || name.trim().length === 0) {
    res.status(400).json({ message: "Please supply a server name." });
    return;
  }

  // Deduct 1 Coin immediately to launch the server
  if (req.user!.coins < 1.0) {
    res.status(400).json({ message: "Insufficient Thunder Coins. You need at least 1.0 Thunder Coin to deploy." });
    return;
  }

  // Deduct coin from wallet
  const updatedUser = db.updateUser(req.user!.email, u => {
    u.coins -= 1.0;
  });

  const settings = db.getSettings();
  const isBot = serverType === "bot";

  const initialServer: MCServer = {
    id: "th_" + Math.random().toString(36).substring(2, 9),
    name: name.trim(),
    ownerEmail: req.user!.email,
    serverType: isBot ? "bot" : "minecraft",
    botType: isBot ? (botType === "python" ? "python" : "nodejs") : undefined,
    planId: 1,
    cpu: isBot ? 25 : 100,
    ram: isBot ? 1024 : 4096,
    disk: isBot ? 2048 : 10240,
    status: "creating",
    expiresAt: new Date(Date.now() + (isBot ? 3 * 24 * 60 * 60 * 1000 : 24 * 60 * 60 * 1000)).toISOString(),
    suspendedAt: null,
    pterodactylId: null,
    ipAddress: "connecting...",
    port: isBot ? 3000 : 25565,
    createdAt: new Date().toISOString()
  };

  db.createServer(initialServer);

  // Trigger Pterodactyl deployment asynchronously or wait briefly
  try {
    const deployment = await createPteroServer(initialServer, settings);
    db.updateServer(initialServer.id, s => {
      s.pterodactylId = deployment.pterodactylId;
      s.ipAddress = deployment.ipAddress;
      s.port = deployment.port;
      s.pteroUsername = deployment.pteroUsername;
      s.pteroPassword = deployment.pteroPassword;
      s.status = "running";
    });

    db.addNotification({
      id: Math.random().toString(36).substring(7),
      userEmail: req.user!.email,
      title: isBot ? "🚀 Bot Hosting Deployed!" : "🚀 Server Deployed successfully!",
      message: isBot
        ? `Your bot hosting node "${initialServer.name}" (${botType === "python" ? "Python" : "NodeJS"}) is online at ${deployment.ipAddress}:${deployment.port}!`
        : `Your Minecraft Server "${initialServer.name}" is online at ${deployment.ipAddress}:${deployment.port}!`,
      type: "success",
      isRead: false,
      createdAt: new Date().toISOString()
    });

    const freshCreated = db.getServer(initialServer.id);
    res.json({
      message: "Server created successfully",
      server: freshCreated ? {
        ...freshCreated,
        panelUrl: settings.panelUrl || "https://panel.thunderhost.club"
      } : null,
      coins: updatedUser?.coins
    });
  } catch (error: any) {
    console.error("Server deployment failed:", error);
    // Refund the user if there is a true setup error
    db.updateUser(req.user!.email, u => {
      u.coins += 1.0;
    });
    db.deleteServer(initialServer.id);
    res.status(500).json({ message: "Pterodactyl panel deployment failed: " + error.message });
  }
});

app.post("/api/servers/:id/renew", authenticateToken, async (req, res) => {
  const server = db.getServer(req.params.id);

  if (!server) {
    res.status(404).json({ message: "Server not found." });
    return;
  }

  // Ensure owner
  if (server.ownerEmail.toLowerCase() !== req.user!.email.toLowerCase() && req.user!.role !== "admin") {
    res.status(403).json({ message: "Forbidden Access" });
    return;
  }

  const { renewType } = req.body || {}; // "upgraded" or "default" (default is "default")
  const currentPlanId = server.planId || 1;
  const isBot = server.serverType === "bot";
  
  let price = 1.0;
  let keepUpgrade = false;
  
  if (currentPlanId > 1 && renewType === "upgraded") {
    price = currentPlanId === 2 ? 2.0 : 3.0;
    keepUpgrade = true;
  }

  if (req.user!.coins < price) {
    res.status(400).json({ 
      message: `You need ${price} Thunder Coin(s) to renew your ${isBot ? "bot" : "Minecraft"} slot${keepUpgrade ? " keeping your upgraded specs" : ""}.` 
    });
    return;
  }

  // Deduct
  const updatedUser = db.updateUser(req.user!.email, u => {
    u.coins -= price;
  });

  const addedTime = isBot ? 3 * 24 * 60 * 60 * 1000 : 24 * 60 * 60 * 1000;
  const timeName = isBot ? "3 days" : "24 hours";

  // Alter server expiration
  db.updateServer(server.id, s => {
    let baseTime = new Date();
    if (s.status !== "suspended") {
      baseTime = new Date(s.expiresAt); // Stack onto existing time if running
    }
    s.expiresAt = new Date(baseTime.getTime() + addedTime).toISOString();
    s.status = "running"; // unsuspend if suspended
    s.suspendedAt = null;

    if (keepUpgrade) {
      // Set upgradedAt to now so the 24 hour duration window starts fresh!
      (s as any).upgradedAt = new Date().toISOString();
    } else {
      // If we renew as default:
      // Check if original 24h upgrade is STILL active
      const originalUpgradedAt = (s as any).upgradedAt;
      const isUpgradeActive = originalUpgradedAt && (new Date().getTime() - new Date(originalUpgradedAt).getTime() < 24 * 60 * 60 * 1000);
      
      if (isUpgradeActive) {
        // Under the requirement: "But the plan will yet be on the upgraded plan until next 24 hrs."
        // We do NOT change specs or s.planId, and we leave s.upgradedAt intact so background daemon can revert it.
      } else {
        // Revert specs because it's not upgraded or upgrade has already expired.
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
    }
  });

  const refreshedServer = db.getServer(server.id);

  if (refreshedServer && refreshedServer.pterodactylId) {
    const settings = db.getSettings();
    updatePteroServerBuild(
      refreshedServer.pterodactylId,
      refreshedServer.cpu,
      refreshedServer.ram,
      refreshedServer.disk,
      settings
    ).catch(err => {
      console.error("[PTERODACTYL] Failed to patch specs in Pterodactyl on renew:", err);
    });
  }

  db.addNotification({
    id: Math.random().toString(36).substring(7),
    userEmail: req.user!.email,
    title: keepUpgrade ? "⚡ Specifications Renewed" : "⚡ Server Renewed",
    message: keepUpgrade 
      ? `Server "${server.name}" has been extended for ${timeName} at Tier ${currentPlanId}.`
      : `Server "${server.name}" has been extended for ${timeName} with standard default specs. (If you had an active upgrade, it remains active until its original 24h expires).`,
    type: "success",
    isRead: false,
    createdAt: new Date().toISOString()
  });

  res.json({
    message: `Server renewed successfully for ${timeName}`,
    server: refreshedServer ? {
      ...refreshedServer,
      panelUrl: db.getSettings().panelUrl || "https://panel.thunderhost.club"
    } : null,
    coins: updatedUser?.coins
  });
});

app.post("/api/servers/:id/upgrade", authenticateToken, async (req, res) => {
  const server = db.getServer(req.params.id);
  const { planId } = req.body;

  if (!server) {
    res.status(404).json({ message: "Server not found." });
    return;
  }

  // Ensure owner
  if (server.ownerEmail.toLowerCase() !== req.user!.email.toLowerCase() && req.user!.role !== "admin") {
    res.status(403).json({ message: "Forbidden Access" });
    return;
  }

  const targetPlanId = parseInt(planId);
  if (![1, 2, 3, 4].includes(targetPlanId)) {
    res.status(400).json({ message: "Invalid target plan level selected." });
    return;
  }

  const currentPlanId = server.planId || 1;
  const isBot = server.serverType === "bot";

  // Prevent downgrade
  if (targetPlanId <= currentPlanId && !(isBot && currentPlanId === 3 && targetPlanId === 4)) {
    res.status(400).json({ message: "You can only upgrade to a higher tier plan." });
    return;
  }

  if (isBot && targetPlanId === 4 && currentPlanId === 4) {
    res.status(400).json({ message: "You are already on the maximum bot plan tier." });
    return;
  }

  if (!isBot && targetPlanId === 4) {
    res.status(400).json({ message: "Plan level 4 is only available for Bot Hosting." });
    return;
  }

  // Difference:
  // For bot: Plan 1 (1 coin), Plan 2 (2 coins), Plan 3 (3 coins), Plan 4 (4 coins)
  // For minecraft: Plan 1 (1 coin), Plan 2 (2 coins), Plan 3 (3 coins)
  let currentPrice = 1;
  if (currentPlanId === 2) currentPrice = 2;
  if (currentPlanId === 3) currentPrice = 3;
  if (currentPlanId === 4) currentPrice = 4;

  let targetPrice = 1;
  if (targetPlanId === 2) targetPrice = 2;
  if (targetPlanId === 3) targetPrice = 3;
  if (targetPlanId === 4) targetPrice = 4;

  const coinCost = Math.max(0, targetPrice - currentPrice);

  if (req.user!.coins < coinCost) {
    res.status(400).json({ message: `Insufficient coins. You need ${coinCost} Thunder coin(s) to upgrade specifications.` });
    return;
  }

  // Deduct
  const updatedUser = db.updateUser(req.user!.email, u => {
    u.coins -= coinCost;
  });

  let newCpu = 100;
  let newRam = 4096;
  let newDisk = 10240;

  if (isBot) {
    if (targetPlanId === 2) {
      newCpu = 50;
      newRam = 2048;
      newDisk = 4096;
    } else if (targetPlanId === 3) {
      newCpu = 75;
      newRam = 3072;
      newDisk = 6144;
    } else if (targetPlanId === 4) {
      newCpu = 100;
      newRam = 4096;
      newDisk = 8192;
    }
  } else {
    if (targetPlanId === 2) {
      newCpu = 200;
      newRam = 8192;
      newDisk = 20480;
    } else if (targetPlanId === 3) {
      newCpu = 300;
      newRam = 12288;
      newDisk = 30720;
    }
  }

  db.updateServer(server.id, s => {
    s.planId = targetPlanId;
    s.cpu = newCpu;
    s.ram = newRam;
    s.disk = newDisk;
    (s as any).upgradedAt = new Date().toISOString();
  });

  const refreshedServer = db.getServer(server.id);

  if (refreshedServer && refreshedServer.pterodactylId) {
    const settings = db.getSettings();
    updatePteroServerBuild(
      refreshedServer.pterodactylId,
      newCpu,
      newRam,
      newDisk,
      settings
    ).catch(err => {
      console.error("[PTERODACTYL] Failed to patch upgraded specs inside Pterodactyl panel:", err);
    });
  }

  db.addNotification({
    id: Math.random().toString(36).substring(7),
    userEmail: req.user!.email,
    title: "⚡ Specifications Upgraded!",
    message: `Your server "${server.name}" has been upgraded to Tier ${targetPlanId} (${newRam / 1024} GB RAM / ${newCpu}% CPU) for 24 hours.`,
    type: "success",
    isRead: false,
    createdAt: new Date().toISOString()
  });

  res.json({
    message: `Server specifications successfully upgraded to Tier ${targetPlanId}!`,
    server: refreshedServer ? {
      ...refreshedServer,
      panelUrl: db.getSettings().panelUrl || "https://panel.thunderhost.club"
    } : null,
    coins: updatedUser?.coins
  });
});

app.post("/api/servers/:id/power", authenticateToken, async (req, res) => {
  const { action } = req.body; // "start" | "stop" | "restart"
  const server = db.getServer(req.params.id);

  if (!server) {
    res.status(404).json({ message: "Server not found." });
    return;
  }

  if (server.ownerEmail.toLowerCase() !== req.user!.email.toLowerCase() && req.user!.role !== "admin") {
    res.status(403).json({ message: "Unauthorized resource access." });
    return;
  }

  if (server.status === "suspended") {
    res.status(400).json({ message: "This Minecraft instance is suspended due to billing expiration. Renew it first!" });
    return;
  }

  const settings = db.getSettings();

  if (server.pterodactylId) {
    await controlPteroPower(server.pterodactylId, action, settings);
  }

  db.updateServer(server.id, s => {
    s.status = action === "start" ? "running" : action === "stop" ? "stopped" : "running";
  });

  res.json({ status: db.getServer(server.id)?.status });
});

app.get("/api/servers/:id/status", authenticateToken, async (req, res) => {
  const server = db.getServer(req.params.id);

  if (!server) {
    res.status(404).json({ message: "Instance not found" });
    return;
  }

  if (server.ownerEmail.toLowerCase() !== req.user!.email.toLowerCase() && req.user!.role !== "admin") {
    res.status(403).json({ message: "Unauthorized" });
    return;
  }

  const settings = db.getSettings();
  if (server.pterodactylId) {
    const metrics = await getPteroServerStatus(server.pterodactylId, settings, server.status);
    res.json(metrics);
  } else {
    res.json({ status: server.status, cpuUsage: 0, ramUsage: 0 });
  }
});

app.post("/api/servers/:id/delete", authenticateToken, async (req, res) => {
  const server = db.getServer(req.params.id);

  if (!server) {
    res.status(404).json({ message: "Instance not found." });
    return;
  }

  if (server.ownerEmail.toLowerCase() !== req.user!.email.toLowerCase() && req.user!.role !== "admin") {
    res.status(403).json({ message: "Forbidden" });
    return;
  }

  const settings = db.getSettings();
  if (server.pterodactylId) {
    await deletePteroServer(server.pterodactylId, settings);
  }

  db.deleteServer(server.id);

  db.addNotification({
    id: Math.random().toString(36).substring(7),
    userEmail: server.ownerEmail,
    title: "🗑️ Server Deleted",
    message: `Your Minecraft instance "${server.name}" has been permanently purged.`,
    type: "info",
    isRead: false,
    createdAt: new Date().toISOString()
  });

  res.json({ message: "Server deleted successfully" });
});

// --- Ad Watching Earning System ---

app.get("/api/ads", authenticateToken, (req, res) => {
  res.json(db.getAds());
});

app.post("/api/ads/claim", authenticateToken, (req, res) => {
  const { adId } = req.body;
  const user = req.user!;

  if (user.claimsToday >= 25) {
    res.status(400).json({ message: "Daily claim limit reached! You can earn up to 2.5 Thunder Coins (25 claims) per day." });
    return;
  }

  const matchedAd = db.getAds().find(a => a.id === adId);
  const rewardAmount = matchedAd ? matchedAd.reward : 0.1;

  const updated = db.updateUser(user.email, u => {
    u.coins = parseFloat((u.coins + rewardAmount).toFixed(2));
    u.claimsToday += 1;
    u.lastClaimDate = new Date().toISOString().split("T")[0];
  });

  db.addNotification({
    id: Math.random().toString(36).substring(7),
    userEmail: user.email,
    title: "⚡ +0.1 Thunder Coins Recieved!",
    message: `You earned ${rewardAmount} Thunder Coins by watching an ad! Your new balance is ${updated?.coins} ⚡. Keep earning today!`,
    type: "success",
    isRead: false,
    createdAt: new Date().toISOString()
  });

  res.json({
    message: "Thunder Coin credited!",
    coins: updated?.coins,
    claimsToday: updated?.claimsToday
  });
});

// --- User Notifications Handler ---

app.get("/api/notifications", authenticateToken, (req, res) => {
  res.json(db.getNotifications(req.user!.email));
});

app.post("/api/notifications/:id/read", authenticateToken, (req, res) => {
  db.markNotificationAsRead(req.params.id, req.user!.email);
  res.json({ success: true });
});

app.post("/api/notifications/clear", authenticateToken, (req, res) => {
  db.clearNotifications(req.user!.email);
  res.json({ success: true });
});

// --- ADMIN CONTROL PANEL ENDPOINTS (Access restricted to designated team emails) ---

function verifyAdminPrivileges(req: express.Request, res: express.Response, next: express.NextFunction) {
  authenticateToken(req, res, () => {
    if (req.user!.role !== "admin") {
      res.status(403).json({ message: "Admin access forbidden: authorized team accounts only." });
      return;
    }
    next();
  });
}

app.get("/api/admin/users", verifyAdminPrivileges, (req, res) => {
  const users = db.listUsers().map(u => ({
    email: u.email,
    username: u.username,
    coins: u.coins,
    isSuspended: u.isSuspended,
    role: u.role,
    claimsToday: u.claimsToday,
    createdAt: u.createdAt
  }));
  res.json(users);
});

app.post("/api/admin/users/:email/suspend", verifyAdminPrivileges, (req, res) => {
  const targetEmail = req.params.email;
  const targetUser = db.getUser(targetEmail);

  if (!targetUser) {
    res.status(404).json({ message: "Target user not found." });
    return;
  }

  // Prevent self-suspension
  if (targetEmail.toLowerCase() === req.user!.email.toLowerCase()) {
    res.status(400).json({ message: "You cannot suspend your own admin account!" });
    return;
  }

  const updated = db.updateUser(targetEmail, u => {
    u.isSuspended = !u.isSuspended;
  });

  // If user is suspended, suspend or stopped all their servers
  if (updated?.isSuspended) {
    const servers = db.listServers().filter(s => s.ownerEmail.toLowerCase() === targetEmail.toLowerCase());
    for (const server of servers) {
      db.updateServer(server.id, s => {
        s.status = "stopped";
      });
    }
  }

  res.json({
    message: updated?.isSuspended ? "User account has been suspended" : "User account has been active unsuspended",
    user: updated
  });
});

app.post("/api/admin/users/:email/add-coins", verifyAdminPrivileges, (req, res) => {
  const { amount } = req.body;
  const targetUser = db.getUser(req.params.email);

  if (!targetUser) {
    res.status(404).json({ message: "User not found" });
    return;
  }

  const updated = db.updateUser(req.params.email, u => {
    u.coins = parseFloat((u.coins + Number(amount)).toFixed(2));
  });

  db.addNotification({
    id: Math.random().toString(36).substring(7),
    userEmail: targetUser.email,
    title: "⚡ Admin Credited Coins",
    message: `An administrator credited your account with ${amount} Thunder Coins. Enjoy!`,
    type: "success",
    isRead: false,
    createdAt: new Date().toISOString()
  });

  res.json({ message: `Successfully added ${amount} coins. New balance: ${updated?.coins}`, coins: updated?.coins });
});

app.get("/api/admin/settings", verifyAdminPrivileges, (req, res) => {
  res.json(db.getSettings());
});

app.post("/api/admin/settings", verifyAdminPrivileges, (req, res) => {
  const { panelUrl, clientApiKey, applicationApiKey, eggId, nestId, locationId, dockerImage, isConfigured } = req.body;

  const current = db.getSettings();
  const nextSettings = {
    panelUrl: panelUrl !== undefined ? panelUrl.trim() : current.panelUrl,
    clientApiKey: clientApiKey !== undefined ? clientApiKey.trim() : current.clientApiKey,
    applicationApiKey: applicationApiKey !== undefined ? applicationApiKey.trim() : current.applicationApiKey,
    eggId: eggId !== undefined ? String(eggId) : current.eggId,
    nestId: nestId !== undefined ? String(nestId) : current.nestId,
    locationId: locationId !== undefined ? String(locationId) : current.locationId,
    dockerImage: dockerImage !== undefined ? dockerImage.trim() : current.dockerImage,
    isConfigured: isConfigured !== undefined ? Boolean(isConfigured) : current.isConfigured
  };

  db.saveSettings(nextSettings);
  res.json({ message: "Pterodactyl configuration keys updated successfully!", settings: nextSettings });
});

app.get("/api/admin/ad-settings", verifyAdminPrivileges, (req, res) => {
  res.json(db.getAdSettings());
});

app.post("/api/admin/ad-settings", verifyAdminPrivileges, (req, res) => {
  const { globalHeaderCode, adsHeaderCode, banner728x90, banner300x250, banner320x50, banner160x600 } = req.body;
  const nextAdSettings = {
    globalHeaderCode: String(globalHeaderCode !== undefined ? globalHeaderCode : ""),
    adsHeaderCode: String(adsHeaderCode !== undefined ? adsHeaderCode : ""),
    banner728x90: String(banner728x90 !== undefined ? banner728x90 : ""),
    banner300x250: String(banner300x250 !== undefined ? banner300x250 : ""),
    banner320x50: String(banner320x50 !== undefined ? banner320x50 : ""),
    banner160x600: String(banner160x600 !== undefined ? banner160x600 : "")
  };
  db.saveAdSettings(nextAdSettings);
  res.json({ message: "Ad Network codes and verification headers successfully compiled!", settings: nextAdSettings });
});

app.get("/api/ads/header", (req, res) => {
  const s = db.getAdSettings();
  res.json({ 
    globalHeaderCode: s.globalHeaderCode || "",
    adsHeaderCode: s.adsHeaderCode || ""
  });
});

app.get("/api/ads/banners", (req, res) => {
  const s = db.getAdSettings();
  res.json({
    banner728x90: s.banner728x90,
    banner300x250: s.banner300x250,
    banner320x50: s.banner320x50,
    banner160x600: s.banner160x600
  });
});

app.post("/api/admin/ads", verifyAdminPrivileges, (req, res) => {
  const { ads } = req.body;
  if (!Array.isArray(ads)) {
    res.status(400).json({ message: "Invalid ads format. Must be an array." });
    return;
  }
  db.saveAds(ads);
  res.json({ message: "Ads inventory updated!", ads });
});

// --- URL Shorteners Earning System ---

app.get("/api/shorteners", authenticateToken, (req, res) => {
  try {
    const completions = db.getShortenerCompletions(req.user!.email);
    const todayStr = new Date().toISOString().split("T")[0];

    const shorteners = db.getShorteners().map(s => {
      const todayCompletions = completions.filter(
        c => c.shortenerId === s.id && c.completedAt.split("T")[0] === todayStr
      );
      const limit = typeof s.viewsLimit !== 'undefined' && s.viewsLimit !== null ? s.viewsLimit : 1;
      const completedCount = todayCompletions.length;
      return {
        ...s,
        viewsLimit: limit,
        completedTodayCount: completedCount,
        completedToday: completedCount >= limit
      };
    });

    res.json(shorteners);
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
});

app.post("/api/shorteners/:id/generate", authenticateToken, async (req, res) => {
  const shortenerId = req.params.id;
  try {
    const shortener = db.getShorteners().find(s => s.id === shortenerId);
    if (!shortener) {
      res.status(404).json({ message: "URL Shortener partner not found." });
      return;
    }

    if (!shortener.isEnabled) {
      res.status(400).json({ message: "This URL Shortener is currently disabled by admin." });
      return;
    }

    const completions = db.getShortenerCompletions(req.user!.email);
    const todayStr = new Date().toISOString().split("T")[0];
    const todayCompletions = completions.filter(
      c => c.shortenerId === shortenerId && c.completedAt.split("T")[0] === todayStr
    );
    const limit = typeof shortener.viewsLimit !== 'undefined' && shortener.viewsLimit !== null ? shortener.viewsLimit : 1;

    if (todayCompletions.length >= limit) {
      res.status(400).json({ message: `You have reached the maximum allowed limit of ${limit} link completion(s) per 24 hours for this shortener.` });
      return;
    }

    // Generate unique verification token
    const token = Math.random().toString(36).substring(2) + Math.random().toString(36).substring(2);
    db.saveShortenerToken(token, {
      userEmail: req.user!.email,
      shortenerId: shortener.id,
      createdAt: new Date().toISOString()
    });

    // Build absolute callback verification URL
    let proto = "https";
    let host = req.get('x-forwarded-host') || req.get('host') || "localhost";

    const referer = req.get('referer');
    const origin = req.get('origin');
    
    if (referer) {
      try {
        const u = new URL(referer);
        proto = u.protocol.replace(":", "") || "https";
        host = u.host;
      } catch (e) {
        // Fallback
      }
    } else if (origin) {
      try {
        const u = new URL(origin);
        proto = u.protocol.replace(":", "") || "https";
        host = u.host;
      } catch (e) {
        // Fallback
      }
    }

    // Fallback if host contains localhost or 127.0.0.1 or 3000 but we are behind a proxy
    if (host.includes("localhost") || host.includes("127.0.0.1") || host.includes("3000")) {
      const xProto = req.get('x-forwarded-proto') || "https";
      const xHost = req.get('x-forwarded-host');
      if (xHost) {
        proto = xProto;
        host = xHost;
      }
    }

    const destinationUrl = `${proto}://${host}/api/shorteners/verify?token=${token}`;
    console.log(`[Shortener] Computed Callback Verification URL: ${destinationUrl}`);

    // Normalize custom shortener URL to always communicate with /api
    let base = (shortener.apiUrl || "https://adrinolinks.in").trim();
    // Trim trailing slashes
    base = base.replace(/\/+$/, "");
    if (!base.endsWith("/api")) {
      base = `${base}/api`;
    }
    const separator = base.includes("?") ? "&" : "?";
    const adrinolinksUrl = `${base}${separator}api=${encodeURIComponent(shortener.apiToken)}&url=${encodeURIComponent(destinationUrl)}`;
    
    console.log(`[Shortener] Requesting provider API URL: ${adrinolinksUrl}`);
    const fetchResponse = await fetch(adrinolinksUrl);
    const responseText = await fetchResponse.text();
    
    let result: any = null;
    try {
      result = JSON.parse(responseText);
    } catch (e) {
      console.error(`[Shortener] Non-JSON payload received from provider:`, responseText);
      res.status(502).json({ 
        message: `Provider gave an invalid response format (HTML or non-JSON). Please confirm if the shortener base website URL is correct.` 
      });
      return;
    }

    console.log(`[Shortener] Received API Response:`, result);

    if (result && result.status === "success" && result.shortenedUrl) {
      res.json({ shortenedUrl: result.shortenedUrl });
    } else {
      res.status(500).json({ 
        message: result?.message || "Failed to shorten link from provider. Please verify your API Key and configuration." 
      });
    }
  } catch (err: any) {
    res.status(500).json({ message: "Error communicating with url shortener: " + err.message });
  }
});

app.get("/api/shorteners/verify", (req, res) => {
  const token = req.query.token as string;
  if (!token) {
    res.status(400).send("Verification token is missing.");
    return;
  }

  const details = db.getShortenerToken(token);
  if (!details) {
    res.status(400).send(`
      <html>
        <head>
          <title>Verification Failed</title>
          <style>
            body { background: #0b0f19; color: #f1f5f9; font-family: system-ui, sans-serif; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; text-align: center; }
            .card { background: #111827; border: 1px solid #1f2937; padding: 2.5rem; border-radius: 1.5rem; max-width: 400px; margin: auto; box-shadow: 0 10px 25px rgba(0,0,0,0.5); }
            h1 { color: #ef4444; font-weight: 800; font-size: 1.5rem; margin-top: 0; }
            p { color: #94a3b8; font-size: 0.95rem; line-height: 1.5; }
            a { display: inline-block; margin-top: 1.5rem; background: #3b82f6; color: white; padding: 0.75rem 1.5rem; border-radius: 0.75rem; text-decoration: none; font-weight: bold; font-size: 0.875rem; transition: background 0.2s; }
            a:hover { background: #2563eb; }
          </style>
        </head>
        <body>
          <div class="card">
            <h1>Claim Verification Failed</h1>
            <p>Your one-time claim token is invalid, expired, or was already used. Please try generating a new link inside the dashboard.</p>
            <a href="/">Go Back to Dashboard</a>
          </div>
        </body>
      </html>
    `);
    return;
  }

  // Claim is valid! Expire immediately to prevent reuse
  db.deleteShortenerToken(token);

  const shortener = db.getShorteners().find(s => s.id === details.shortenerId);
  const rewardCoins = shortener && typeof shortener.reward !== 'undefined' ? shortener.reward : 1.0;

  const updatedUser = db.updateUser(details.userEmail, u => {
    u.coins = parseFloat((u.coins + rewardCoins).toFixed(2));
  });

  db.addShortenerCompletion({
    id: "comp_" + Math.random().toString(36).substring(7),
    userEmail: details.userEmail,
    shortenerId: details.shortenerId,
    completedAt: new Date().toISOString()
  });

  db.addNotification({
    id: Math.random().toString(36).substring(7),
    userEmail: details.userEmail,
    title: "🎉 URL Shortener Reward Credited!",
    message: `Successfully completed Adrinolinks shortener task "${shortener ? shortener.name : "Sponsor"}" and earned ${rewardCoins} Thunder Coin! New Balance: ${updatedUser ? updatedUser.coins : "0"} ⚡.`,
    type: "success",
    isRead: false,
    createdAt: new Date().toISOString()
  });

  // Render automatic local storage action and redirect to applet dashboard
  res.send(`
    <html>
      <head>
        <title>Claim Successful!</title>
        <script>
          try {
            localStorage.setItem("shortener_success", "true");
            localStorage.setItem("dashboard_tab", "earn");
          } catch(e) {}
          window.location.href = "/";
        </script>
      </head>
      <body style="background: #0b0f19; color: #f1f5f9; font-family: system-ui, sans-serif; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0;">
        <div style="background: #111827; border: 1px solid #1f2937; padding: 2.5rem; border-radius: 1.5rem; max-width: 400px; text-align: center; box-shadow: 0 10px 25px rgba(0,0,0,0.5);">
          <div style="font-size: 3rem; margin-bottom: 1rem; animation: bounce 1s infinite;">🎉</div>
          <h1 style="color: #10b981; margin-bottom: 0.5rem; font-weight: 900; font-size: 1.5rem;">Wallet Credited!</h1>
          <p style="color: #94a3b8; font-size: 0.95rem; line-height: 1.5; margin: 0 0 1.5rem 0;">${rewardCoins.toFixed(1)} Thunder Coins have been successfully credited to your account.</p>
          <p style="color: #64748b; font-size: 0.8rem; margin: 0;">Redirecting you back to dashboard...</p>
          <a href="/" style="display: inline-block; margin-top: 1.5rem; background: #10b981; color: white; padding: 0.75rem 1.5rem; border-radius: 0.75rem; text-decoration: none; font-weight: bold; font-size: 0.875rem;">Return Immediately</a>
        </div>
      </body>
    </html>
  `);
});

// --- ADMIN SHORTENERS CRUD ---

app.get("/api/admin/shorteners", verifyAdminPrivileges, (req, res) => {
  res.json(db.getShorteners());
});

app.post("/api/admin/shorteners", verifyAdminPrivileges, (req, res) => {
  const { name, apiUrl, apiToken, reward, viewsLimit } = req.body;
  if (!name || !apiToken) {
    res.status(400).json({ message: "Name and API Token are required fields." });
    return;
  }

  const parsedReward = typeof reward !== 'undefined' && !isNaN(parseFloat(String(reward))) ? parseFloat(String(reward)) : 1.0;
  const parsedViewsLimit = typeof viewsLimit !== 'undefined' && !isNaN(parseInt(String(viewsLimit))) ? parseInt(String(viewsLimit)) : 1;

  const shorteners = db.getShorteners();
  const nextShortener = {
    id: "sh_" + Math.random().toString(36).substring(7),
    name: String(name).trim(),
    apiUrl: String(apiUrl || "https://adrinolinks.in").trim(),
    apiToken: String(apiToken).trim(),
    reward: parsedReward,
    viewsLimit: parsedViewsLimit,
    isEnabled: true,
    createdAt: new Date().toISOString()
  };

  shorteners.push(nextShortener);
  db.saveShorteners(shorteners);

  res.json({ message: "New URL Shortener added successfully!", shortener: nextShortener });
});

app.delete("/api/admin/shorteners/:id", verifyAdminPrivileges, (req, res) => {
  const { id } = req.params;
  const shorteners = db.getShorteners().filter(s => s.id !== id);
  db.saveShorteners(shorteners);
  res.json({ message: "URL Shortener removed successfully." });
});

app.get("/api/admin/stats", verifyAdminPrivileges, (req, res) => {
  const users = db.listUsers();
  const servers = db.listServers();
  const settings = db.getSettings();

  const totalUsers = users.length;
  const activeServers = servers.filter(s => s.status === "running").length;
  const suspendedServers = servers.filter(s => s.status === "suspended").length;
  const totalCoins = users.reduce((sum, u) => sum + u.coins, 0);

  let pteroStatus: "connected" | "disconnected" | "unconfigured" = "unconfigured";
  if (settings.isConfigured) {
    pteroStatus = (settings.panelUrl && settings.clientApiKey) ? "connected" : "disconnected";
  }

  res.json({
    totalUsers,
    activeServers,
    suspendedServers,
    totalCoins,
    pteroStatus
  });
});

// --- Periodic Background billing cycle Daemon daemon ---
// Set an interval on the running container node to auto run coin processing.
// Runs every 60 seconds (1 minute). Expired servers trigger.
setInterval(async () => {
  try {
    db.tickBilling();

    // Revert upgraded servers/bots back to default when 24h duration expires
    const now = new Date();
    const servers = db.listServers();
    const settings = db.getSettings();
    for (const server of servers) {
      if (server.planId && server.planId > 1 && (server as any).upgradedAt) {
        const upgradeTime = new Date((server as any).upgradedAt).getTime();
        if (now.getTime() - upgradeTime >= 24 * 60 * 60 * 1000) {
          console.log(`[DAEMON] Upgrade duration (24h) expired for server "${server.name}" (${server.serverType || "minecraft"}). Reverting to default specs.`);
          
          let defCpu = 100;
          let defRam = 4096;
          let defDisk = 10240;

          if (server.serverType === "bot") {
            defCpu = 25;
            defRam = 1024;
            defDisk = 2048;
          }

          db.updateServer(server.id, s => {
            s.planId = 1;
            s.cpu = defCpu;
            s.ram = defRam;
            s.disk = defDisk;
            delete (s as any).upgradedAt;
          });

          if (server.pterodactylId) {
            try {
              await updatePteroServerBuild(server.pterodactylId, defCpu, defRam, defDisk, settings);
            } catch (err) {
              console.error(`[DAEMON] Failed to patch Pterodactyl limits back to default for server "${server.name}":`, err);
            }
          }
        }
      }
    }
  } catch (error) {
    console.error("Critical error inside background tickBilling daemon loop:", error);
  }
}, 60000);

// --- Mounting Vite development server or serving static build bundle ---
async function serveApp() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa"
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath, { index: false }));
    
    const handleIndexServe = (req: express.Request, res: express.Response) => {
      const indexPath = path.join(distPath, "index.html");
      if (fs.existsSync(indexPath)) {
        let htmlContent = fs.readFileSync(indexPath, "utf-8");
        try {
          const adSet = db.getAdSettings();
          if (adSet && adSet.globalHeaderCode) {
            htmlContent = htmlContent.replace("</head>", `${adSet.globalHeaderCode}</head>`);
          }
        } catch (e) {
          console.error("Failed to inject header code:", e);
        }
        res.send(htmlContent);
      } else {
        res.sendStatus(404);
      }
    };

    app.get(["/", "/index.html"], handleIndexServe);
    app.get("*all", handleIndexServe);
    // Fallback handler if express version is v4 matching
    app.get("*", (req, res, next) => {
      if (req.path.includes(".") && !req.path.endsWith(".html")) {
        next();
        return;
      }
      handleIndexServe(req, res);
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`ThunderHost server running at http://0.0.0.0:${PORT}`);
    // Run initial billing check on boot
    try {
      db.tickBilling();
    } catch (_) {}
  });
}

serveApp();
