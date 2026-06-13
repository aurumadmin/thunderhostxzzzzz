import { useState, useEffect, FormEvent } from "react";
import { Shield, Users, Server, Settings, Video, Activity, Ban, CheckCircle, Trash2, Key, HelpCircle, Save, Plus, ArrowLeft, Coins } from "lucide-react";
import { api } from "../api";
import { MCServer, PterodactylSettings, SponsoredAd, SystemStats, User, UrlShortener } from "../types";

interface AdminPanelProps {
  user: User;
  onRefreshUser: () => Promise<void>;
  onServerNotification: (title: string, message: string, type: "success" | "warning" | "danger" | "info") => void;
  onBackToDashboard: () => void;
}

type AdminTab = "servers" | "users" | "settings" | "ad-settings" | "shorteners";

export default function AdminPanel({
  user,
  onRefreshUser,
  onServerNotification,
  onBackToDashboard
}: AdminPanelProps) {
  const [activeTab, setActiveTab] = useState<AdminTab>("servers");
  
  // States of admin-bound parameters
  const [stats, setStats] = useState<SystemStats | null>(null);
  const [servers, setServers] = useState<MCServer[]>([]);
  const [usersList, setUsersList] = useState<User[]>([]);
  const [settings, setSettings] = useState<PterodactylSettings | null>(null);
  const [adsInventory, setAdsInventory] = useState<SponsoredAd[]>([]);
  const [shorteners, setShorteners] = useState<UrlShortener[]>([]);

  // Editing forms state
  const [loading, setLoading] = useState(true);
  const [panelUrl, setPanelUrl] = useState("");
  const [clientApiKey, setClientApiKey] = useState("");
  const [applicationApiKey, setApplicationApiKey] = useState("");
  const [eggId, setEggId] = useState("");
  const [nestId, setNestId] = useState("");
  const [locationId, setLocationId] = useState("");
  const [dockerImage, setDockerImage] = useState("");
  const [isConfigured, setIsConfigured] = useState(false);

  // New URL shortener states
  const [newShortenerName, setNewShortenerName] = useState("");
  const [newShortenerUrl, setNewShortenerUrl] = useState("");
  const [newShortenerApi, setNewShortenerApi] = useState("");
  const [newShortenerReward, setNewShortenerReward] = useState("1.0");
  const [newShortenerViewsLimit, setNewShortenerViewsLimit] = useState("1");
  const [isShortenerSubmitting, setIsShortenerSubmitting] = useState(false);

  // New ad form parameters
  const [newAdTitle, setNewAdTitle] = useState("");
  const [newAdReward, setNewAdReward] = useState("0.1");
  const [newAdDuration, setNewAdDuration] = useState("15");
  const [newAdUrl, setNewAdUrl] = useState("");

  // Ad Network Banner codes states
  const [adGlobalHeaderCode, setAdGlobalHeaderCode] = useState("");
  const [adAdsHeaderCode, setAdAdsHeaderCode] = useState("");
  const [adBanner728x90, setAdBanner728x90] = useState("");
  const [adBanner300x250, setAdBanner300x250] = useState("");
  const [adBanner320x50, setAdBanner320x50] = useState("");
  const [adBanner160x600, setAdBanner160x600] = useState("");

  const refreshAllAdminData = async () => {
    try {
      setLoading(true);
      const fetchedStats = await api.getAdminStats();
      setStats(fetchedStats);

      const fetchedServers = await api.getServers(); // returns all because auth role is admin
      setServers(fetchedServers);

      const fetchedUsers = await api.getAdminUsers();
      setUsersList(fetchedUsers);

      const fetchedSettings = await api.getAdminSettings();
      setSettings(fetchedSettings);
      setPanelUrl(fetchedSettings.panelUrl);
      setClientApiKey(fetchedSettings.clientApiKey);
      setApplicationApiKey(fetchedSettings.applicationApiKey);
      setEggId(fetchedSettings.eggId);
      setNestId(fetchedSettings.nestId);
      setLocationId(fetchedSettings.locationId);
      setDockerImage(fetchedSettings.dockerImage);
      setIsConfigured(fetchedSettings.isConfigured);

      try {
        const fetchedAdSettings = await api.getAdminAdSettings();
        setAdGlobalHeaderCode(fetchedAdSettings.globalHeaderCode || "");
        setAdAdsHeaderCode(fetchedAdSettings.adsHeaderCode || "");
        setAdBanner728x90(fetchedAdSettings.banner728x90 || "");
        setAdBanner300x250(fetchedAdSettings.banner300x250 || "");
        setAdBanner320x50(fetchedAdSettings.banner320x50 || "");
        setAdBanner160x600(fetchedAdSettings.banner160x600 || "");
      } catch (err: any) {
        console.error("Failed to load ad network codes", err);
      }

      const fetchedAds = await api.getAds();
      setAdsInventory(fetchedAds);

      try {
        const fetchedShorteners = await api.getAdminShorteners();
        setShorteners(fetchedShorteners);
      } catch (err) {
        console.error("Failed to load admin shorteners list", err);
      }

    } catch (err: any) {
      onServerNotification("Admin Request Failed", err?.message || "Failed to load administrative details.", "danger");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshAllAdminData();
  }, []);

  // Update Settings
  const handleSaveSettings = async (e: FormEvent) => {
    e.preventDefault();
    try {
      const res = await api.saveAdminSettings({
        panelUrl,
        clientApiKey,
        applicationApiKey,
        eggId,
        nestId,
        locationId,
        dockerImage,
        isConfigured
      });
      onServerNotification("Configuration Updated", res.message || "Pterodactyl properties committed successfully.", "success");
      await refreshAllAdminData();
    } catch (e: any) {
      onServerNotification("Failed to save settings", e.message, "danger");
    }
  };

  // Update Ad Network Custom codes and Verification Script
  const handleSaveAdSettings = async (e: FormEvent) => {
    e.preventDefault();
    try {
      const res = await api.saveAdminAdSettings({
        globalHeaderCode: adGlobalHeaderCode,
        adsHeaderCode: adAdsHeaderCode,
        banner728x90: adBanner728x90,
        banner300x250: adBanner300x250,
        banner320x50: adBanner320x50,
        banner160x600: adBanner160x600
      });
      onServerNotification("Ad Network Config Updated", res.message || "Banner ad network configuration updated successfully.", "success");
      await refreshAllAdminData();
    } catch (e: any) {
      onServerNotification("Failed to save ad network settings", e.message, "danger");
    }
  };

  // Toggle user suspension
  const handleToggleUserSuspension = async (targetEmail: string) => {
    try {
      const res = await api.toggleUserSuspension(targetEmail);
      onServerNotification("Account Status Updated", res.message, "success");
      await refreshAllAdminData();
    } catch (e: any) {
      onServerNotification("Suspension Failed", e.message, "danger");
    }
  };

  // Add custom coins to user
  const handleAwardCoins = async (targetEmail: string) => {
    const sum = prompt("How many THUNDERS do you want to credit to this wallet?", "10");
    if (!sum) return;
    const coins = parseFloat(sum);
    if (isNaN(coins)) return;

    try {
      const res = await api.addAdminCoins(targetEmail, coins);
      onServerNotification("Coins Credited", res.message, "success");
      await refreshAllAdminData();
    } catch (e: any) {
      onServerNotification("Allocation failed", e.message, "danger");
    }
  };

  // Unsuspend/Renew server from admin table
  const handleAdminRenewServer = async (serverId: string) => {
    try {
      await api.renewServer(serverId);
      onServerNotification("Instance Unsuspend", "Server grace period extended and status set active.", "success");
      await refreshAllAdminData();
    } catch (e: any) {
      onServerNotification("Server extension failed", e.message, "danger");
    }
  };

  // Delete server from admin panel
  const handleAdminDeleteServer = async (serverId: string) => {
    if (!confirm("Are you sure you want to FORCE purge this instruction server? This is destructive!")) return;
    try {
      await api.deleteServer(serverId);
      onServerNotification("Instance Purged", "Minecraft deployment cleaned successfully", "info");
      await refreshAllAdminData();
    } catch (e: any) {
      onServerNotification("Deletion failure", e.message, "danger");
    }
  };

  // Add sponsored ad campaign
  const handleCreateAd = async (e: FormEvent) => {
    e.preventDefault();
    if (!newAdTitle.trim()) return;

    const rewardNum = parseFloat(newAdReward);
    const durationNum = parseInt(newAdDuration);

    const nextAds = [
      ...adsInventory,
      {
        id: "ad_" + Math.random().toString(36).substring(7),
        title: newAdTitle.trim(),
        reward: isNaN(rewardNum) ? 0.1 : rewardNum,
        duration: isNaN(durationNum) ? 15 : durationNum,
        embedUrl: newAdUrl.trim() || undefined,
        type: "video" as const
      }
    ];

    try {
      const res = await api.saveAdminAds(nextAds);
      onServerNotification("Sponsor Ad Published", res.message, "success");
      setNewAdTitle("");
      setNewAdUrl("");
      await refreshAllAdminData();
    } catch (e: any) {
      onServerNotification("Ad addition status failure", e.message, "danger");
    }
  };

  // Delete an ad campaign representation
  const handleDeleteAd = async (adId: string) => {
    const nextAds = adsInventory.filter(a => a.id !== adId);
    try {
      await api.saveAdminAds(nextAds);
      onServerNotification("Inventory Cleaned", "Sponsored campaign expired.", "info");
      await refreshAllAdminData();
    } catch (e: any) {
      onServerNotification("Ad elimination failed", e.message, "danger");
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 md:px-8 py-8 space-y-8">
      {/* Back button */}
      <div className="flex items-center justify-between">
        <button
          onClick={onBackToDashboard}
          className="flex items-center space-x-1.5 text-slate-400 hover:text-white text-sm transition"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Back to Dashboard</span>
        </button>

        <div className="flex items-center space-x-2 text-amber-500 font-bold text-sm bg-amber-950/20 border border-amber-900/60 px-4 py-1.5 rounded-full uppercase tracking-wider">
          <Shield className="h-4 w-4 text-amber-500" />
          <span>Admin Authorization Active</span>
        </div>
      </div>

      <div className="flex items-center justify-between border-b border-blue-950 pb-4">
        <div>
          <h1 className="text-3xl font-black text-white">ThunderHost Admin Panel</h1>
          <p className="text-slate-400 text-sm mt-1">
            System overview and settings for teamthunderofficialyt@gmail.com and freefiregtamcpe@gmail.com
          </p>
        </div>
      </div>

      {/* Stats row precisely matching Screenshot 3 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 select-none shadow-lg">
          <span className="text-xs text-slate-400 block uppercase font-medium">Total Registered Users</span>
          <span className="text-3xl font-black text-white block mt-2">
            {stats ? stats.totalUsers : usersList.length}
          </span>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 select-none shadow-lg">
          <span className="text-xs text-slate-400 block uppercase font-medium">Active Servers</span>
          <span className="text-3xl font-black text-emerald-400 block mt-2">
            {stats ? stats.activeServers : servers.filter(s => s.status === "running").length}
          </span>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 select-none shadow-lg">
          <span className="text-xs text-slate-400 block uppercase font-medium">Suspended Grace Days</span>
          <span className="text-3xl font-black text-red-400 block mt-2">
            {stats ? stats.suspendedServers : servers.filter(s => s.status === "suspended").length}
          </span>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 select-none shadow-lg">
          <span className="text-xs text-slate-400 block uppercase font-medium">Simulated Monthly Revenue</span>
          <span className="text-3xl font-black text-sky-400 block mt-2">
            ₹0 <span className="text-xs font-semibold text-slate-400">(Free-Only Model)</span>
          </span>
        </div>
      </div>

      {/* Secondary Sub-tabs precisely matching Screenshot 3 options */}
      <div className="flex flex-wrap border-b border-slate-800 pb-0 gap-2">
        <button
          onClick={() => setActiveTab("servers")}
          className={`px-4 py-2.5 rounded-t-xl text-xs sm:text-sm font-bold flex items-center space-x-2 transition ${activeTab === "servers" ? "bg-blue-500/12 border-t border-r border-l border-slate-800 text-blue-405 font-black" : "text-slate-400 hover:text-slate-200"}`}
        >
          <Server className="h-4 w-4" />
          <span>Active Slots ({servers.length})</span>
        </button>

        <button
          onClick={() => setActiveTab("users")}
          className={`px-4 py-2.5 rounded-t-xl text-xs sm:text-sm font-bold flex items-center space-x-2 transition ${activeTab === "users" ? "bg-blue-500/12 border-t border-r border-l border-slate-800 text-blue-405 font-black" : "text-slate-400 hover:text-slate-200"}`}
        >
          <Users className="h-4 w-4" />
          <span>Users list ({usersList.length})</span>
        </button>

        <button
          onClick={() => setActiveTab("settings")}
          className={`px-4 py-2.5 rounded-t-xl text-xs sm:text-sm font-bold flex items-center space-x-2 transition ${activeTab === "settings" ? "bg-blue-500/12 border-t border-r border-l border-slate-800 text-blue-405 font-black" : "text-slate-400 hover:text-slate-200"}`}
        >
          <Settings className="h-4 w-4" />
          <span>Pterodactyl setup api</span>
        </button>

        <button
          onClick={() => setActiveTab("ad-settings")}
          className={`px-4 py-2.5 rounded-t-xl text-xs sm:text-sm font-bold flex items-center space-x-2 transition ${activeTab === "ad-settings" ? "bg-blue-500/12 border-t border-r border-l border-slate-800 text-blue-405 font-black" : "text-slate-400 hover:text-slate-200"}`}
        >
          <Shield className="h-4 w-4 text-amber-500" />
          <span>Banner Ad Networks</span>
        </button>

        <button
          onClick={() => setActiveTab("shorteners")}
          className={`px-4 py-2.5 rounded-t-xl text-xs sm:text-sm font-bold flex items-center space-x-2 transition ${activeTab === "shorteners" ? "bg-blue-500/12 border-t border-r border-l border-slate-800 text-blue-405 font-black" : "text-slate-400 hover:text-slate-200"}`}
        >
          <Plus className="h-4 w-4 text-emerald-500" />
          <span>Config Shorteners ({shorteners.length})</span>
        </button>
      </div>

      {loading ? (
        <div className="py-16 text-center text-slate-500 text-sm">
          Fetching admin settings ...
        </div>
      ) : (
        <div className="space-y-6">
          
          {/* TAB 1: SERVERS TABLE LISTING (Screenshot 3 alignment) */}
          {activeTab === "servers" && (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
              <div className="p-5 border-b border-slate-800">
                <h3 className="text-md font-bold text-white uppercase tracking-wide">Allocated Server Deployments</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs md:text-sm select-none">
                  <thead>
                    <tr className="border-b border-slate-800 text-slate-500 font-semibold bg-slate-950/20">
                      <th className="p-4 uppercase text-[10px] tracking-wide">Owner info</th>
                      <th className="p-4 uppercase text-[10px] tracking-wide">Plan settings</th>
                      <th className="p-4 uppercase text-[10px] tracking-wide">Cost share</th>
                      <th className="p-4 uppercase text-[10px] tracking-wide text-center">Status</th>
                      <th className="p-4 uppercase text-[10px] tracking-wide">Grace / Expiry</th>
                      <th className="p-4 uppercase text-[10px] tracking-wide text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-blue-950/50">
                    {servers.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="p-8 text-center text-slate-500 text-xs">
                          No active server slots in system database yet.
                        </td>
                      </tr>
                    ) : (
                      servers.map(server => {
                        const isExpired = server.status === "suspended" || (new Date(server.expiresAt) < new Date());
                        return (
                      <tr key={server.id} className="hover:bg-slate-950/30 transition-colors">
                            <td className="p-4">
                              <span className="font-bold text-white block">{server.name}</span>
                              <span className="text-slate-500 text-xs mt-0.5 block">{server.ownerEmail}</span>
                            </td>
                            <td className="p-4">
                              <span className="text-slate-300 font-semibold">Starter (Free)</span>
                              <span className="text-slate-500 block text-[11px] mt-0.5">
                                {server.ram / 1024}GB RAM / {server.cpu}% CPU
                              </span>
                            </td>
                            <td className="p-4 text-yellow-400 font-bold">
                              1 ⚡/day
                            </td>
                            <td className="p-4 text-center">
                              {isExpired ? (
                                <span className="bg-red-500/10 text-red-400 border border-red-500/30 font-bold rounded px-2 py-0.5 text-[11px] uppercase">
                                  EXPIRED
                                </span>
                              ) : server.status === "running" ? (
                                <span className="bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 font-bold rounded px-2 py-0.5 text-[11px] uppercase">
                                  Running
                                </span>
                              ) : (
                                <span className="bg-slate-800 text-slate-400 rounded px-2 py-0.5 text-[11px] uppercase">
                                  Stopped
                                </span>
                              )}
                            </td>
                            <td className="p-4 font-mono text-slate-400 text-xs">
                              {new Date(server.expiresAt).toLocaleDateString()}
                            </td>
                            <td className="p-4 text-right">
                              <div className="flex items-center justify-end space-x-2">
                                {isExpired && (
                                  <button
                                    onClick={() => handleAdminRenewServer(server.id)}
                                    className="bg-emerald-600/15 border border-emerald-500/30 hover:bg-emerald-600 text-emerald-300 hover:text-white px-2.5 py-1.5 rounded-lg text-xs font-bold transition flex items-center space-x-1 cursor-pointer"
                                  >
                                    <CheckCircle className="h-3 w-3" />
                                    <span>Unsuspend</span>
                                  </button>
                                )}
                                <button
                                  onClick={() => handleAdminDeleteServer(server.id)}
                                  className="bg-red-950/30 border border-red-900/60 hover:bg-red-600 text-red-400 hover:text-white px-2.5 py-1.5 rounded-lg text-xs font-semibold transition flex items-center space-x-1 cursor-pointer"
                                >
                                  <Trash2 className="h-3 w-3" />
                                  <span>Delete</span>
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 2: USERS LIST ACCOUNT SUSPENSION TOOL */}
          {activeTab === "users" && (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
              <div className="p-5 border-b border-slate-800">
                <h3 className="text-md font-bold text-white uppercase tracking-wide">Registered Cloud Accounts</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs md:text-sm">
                  <thead>
                    <tr className="border-b border-slate-800 text-slate-500 font-semibold bg-slate-950/20">
                      <th className="p-4 uppercase text-[10px] tracking-wide">Profile</th>
                      <th className="p-4 uppercase text-[10px] tracking-wide">Identity</th>
                      <th className="p-4 uppercase text-[10px] tracking-wide">Wallet Balance</th>
                      <th className="p-4 uppercase text-[10px] tracking-wide">Claims Logs</th>
                      <th className="p-4 uppercase text-[10px] tracking-wide">Status state</th>
                      <th className="p-4 uppercase text-[10px] tracking-wide text-right">Moderations</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-blue-950/50">
                    {usersList.map(currUser => (
                      <tr key={currUser.email} className={`hover:bg-slate-950/30 transition-colors ${currUser.isSuspended ? "bg-red-955/5" : ""}`}>
                        <td className="p-4">
                          <span className="font-bold text-white block">{currUser.username}</span>
                          <span className="text-slate-500 text-xs mt-0.5 block">{currUser.email}</span>
                        </td>
                        <td className="p-4">
                          {currUser.role === "admin" ? (
                            <span className="bg-amber-500/10 text-amber-500 border border-amber-500/30 text-[9px] px-2 py-0.5 rounded uppercase font-bold tracking-wider">
                              OFFICIAL ADMIN
                            </span>
                          ) : (
                            <span className="bg-slate-800 text-slate-400 text-[9px] px-2 py-0.5 rounded uppercase font-bold tracking-wider">
                              STANDARD HOST USER
                            </span>
                          )}
                        </td>
                        <td className="p-4 text-yellow-400 font-mono font-bold">
                          {currUser.coins} ⚡
                        </td>
                        <td className="p-4 text-slate-400">
                          <span className="font-medium text-slate-300">{currUser.claimsToday}</span> / 25 clicks today
                        </td>
                        <td className="p-4">
                          {currUser.isSuspended ? (
                            <span className="bg-red-500/10 text-red-500 border border-red-500/30 text-[10px] font-bold px-2 py-0.5 rounded uppercase">
                              SUSPENDED
                            </span>
                          ) : (
                            <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 text-[10px] font-bold px-2 py-0.5 rounded uppercase">
                              Active
                            </span>
                          )}
                        </td>
                        <td className="p-4 text-right">
                          <div className="flex items-center justify-end space-x-2">
                            <button
                              onClick={() => handleAwardCoins(currUser.email)}
                              className="bg-yellow-500/10 border border-yellow-500/30 hover:bg-yellow-500 text-yellow-400 hover:text-slate-950 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer"
                              title="Gift custom amount of THUNDERS"
                            >
                              Add Coins
                            </button>
                            
                            <button
                              disabled={currUser.email === user.email}
                              onClick={() => handleToggleUserSuspension(currUser.email)}
                              className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold border transition cursor-pointer flex items-center space-x-1 ${currUser.isSuspended ? "bg-emerald-950/40 border-emerald-900/60 text-emerald-400 hover:bg-emerald-600 hover:text-white" : "bg-red-950/40 border-red-900/60 text-red-400 hover:bg-red-600 hover:text-white disabled:opacity-30"}`}
                            >
                              <Ban className="h-3.5 w-3.5" />
                              <span>{currUser.isSuspended ? "Activate" : "Suspend"}</span>
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 4: PTERODACTYL INTEGRATION SETUP SCREEN (All setup from admin panel) */}
          {activeTab === "settings" && (
            <div className="max-w-2xl bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-6 shadow-xl">
              <div>
                <h3 className="text-md font-bold text-white uppercase tracking-wide">Pterodactyl Panel Link API Settings</h3>
                <p className="text-slate-400 text-xs mt-1 leading-relaxed">
                  Supply Pterodactyl access tokens here. If keys are missing or unconfigured, ThunderHost automatically defaults to safe isolated sandbox configurations so gameplay is fully simulated in preview.
                </p>
              </div>

              <form onSubmit={handleSaveSettings} className="space-y-4">
                <div className="flex items-center justify-between bg-slate-950 border border-slate-800 p-4 rounded-xl mb-4 text-xs">
                  <div className="space-y-0.5">
                    <span className="font-bold text-slate-200 block uppercase text-[10px] tracking-wide">Real-API Connection Status</span>
                    <p className="text-slate-400">
                      {isConfigured ? "🟢 Active genuine Pterodactyl execution" : "🟡 Simulated Demo Mode Enabled (No keys required)"}
                    </p>
                  </div>
                  <input
                    type="checkbox"
                    checked={isConfigured}
                    onChange={(e) => setIsConfigured(e.target.checked)}
                    className="h-5 w-5 rounded border-slate-800 bg-slate-950 text-blue-600 focus:ring-blue-500 cursor-pointer"
                  />
                </div>

                <div>
                  <label className="block text-xs text-slate-400 font-semibold mb-2">Pterodactyl Panel Base URL</label>
                  <input
                    type="text"
                    placeholder="https://panel.my-minecraft-host.com"
                    value={panelUrl}
                    onChange={(e) => setPanelUrl(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 focus:border-blue-500 rounded-xl py-3 px-4 text-xs text-white focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs text-slate-400 font-semibold mb-2 flex items-center space-x-1">
                    <Key className="h-3 w-3 text-sky-400" />
                    <span>Application API Key (PTERO_APP)</span>
                  </label>
                  <input
                    type="password"
                    placeholder="ptla_xxxxxxxxxxxxxxxxxxxxxxxxxxx"
                    value={applicationApiKey}
                    onChange={(e) => setApplicationApiKey(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 focus:border-blue-500 rounded-xl py-3 px-4 text-xs text-white focus:outline-none"
                  />
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs text-slate-400 font-semibold mb-2 font-semibold">Minecraft Egg ID</label>
                    <input
                      type="text"
                      placeholder="15"
                      value={eggId}
                      onChange={(e) => setEggId(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 focus:border-blue-500 rounded-xl py-2.5 px-3.5 text-xs text-white focus:outline-none text-center"
                    />
                  </div>

                  <div>
                    <label className="block text-xs text-slate-400 font-semibold mb-2">Nest ID</label>
                    <input
                      type="text"
                      placeholder="1"
                      value={nestId}
                      onChange={(e) => setNestId(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 focus:border-blue-500 rounded-xl py-2.5 px-3.5 text-xs text-white focus:outline-none text-center"
                    />
                  </div>

                  <div>
                    <label className="block text-xs text-slate-400 font-semibold mb-2">Location ID</label>
                    <input
                      type="text"
                      placeholder="1"
                      value={locationId}
                      onChange={(e) => setLocationId(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 focus:border-blue-500 rounded-xl py-2.5 px-3.5 text-xs text-white focus:outline-none text-center"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs text-slate-400 font-semibold mb-2">Default Docker Container Image path</label>
                  <input
                    type="text"
                    placeholder="ghcr.io/pterodactyl/yolks:java_17"
                    value={dockerImage}
                    onChange={(e) => setDockerImage(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 focus:border-blue-500 rounded-xl py-3 px-4 text-xs text-white focus:outline-none"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3.5 rounded-xl text-xs flex items-center justify-center space-x-2 cursor-pointer shadow-md shadow-blue-500/20"
                >
                  <Save className="h-4 w-4" />
                  <span>Commit Pterodactyl Access parameters</span>
                </button>
              </form>
            </div>
          )}

          {/* TAB 5: BANNER AD NETWORKS & VERIFICATION CODE SETUP */}
          {activeTab === "ad-settings" && (
            <div className="max-w-3xl bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-6 shadow-xl">
              <div>
                <h3 className="text-md font-bold text-white uppercase tracking-wide">Banner Ad Networks & Website Verification</h3>
                <p className="text-slate-400 text-xs mt-1 leading-relaxed">
                  Integrate third-party ad networks like <b>Google AdSense</b>, <b>Adsterra</b>, or <b>PropellerAds</b>. Paste the HTML and JavaScript tags from your ad manager below to show banners in appropriate slots and verify your domain ownership.
                </p>
              </div>

              <form onSubmit={handleSaveAdSettings} className="space-y-6">
                <div className="space-y-4">
                  <div className="bg-slate-950 border border-slate-800 p-4 rounded-xl space-y-2">
                    <label className="block text-xs text-slate-300 font-bold flex items-center space-x-1.5 uppercase tracking-wide">
                      <Shield className="h-4 w-4 text-emerald-400" />
                      <span>Global Head Injection Code</span>
                    </label>
                    <p className="text-[10px] text-slate-550 leading-relaxed font-sans">
                      This code is injected into the HTML <code className="text-blue-400">&lt;head&gt;</code> globally on every page block (e.g. site ownership verification tags, Google Search Console, or global trackers).
                    </p>
                    <textarea
                      rows={3}
                      placeholder="<!-- Paste global validation / domain verification tags here -->&#10;<meta name='google-site-verification' content='...' />"
                      value={adGlobalHeaderCode}
                      onChange={(e) => setAdGlobalHeaderCode(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-800 focus:border-blue-500 rounded-xl p-3 text-xs text-white focus:outline-none font-mono"
                    />
                  </div>

                  <div className="bg-slate-950 border border-slate-800 p-4 rounded-xl space-y-2">
                    <label className="block text-xs text-slate-300 font-bold flex items-center space-x-1.5 uppercase tracking-wide">
                      <Coins className="h-4 w-4 text-amber-400" />
                      <span>Banner Ads Page Head Injection Code</span>
                    </label>
                    <p className="text-[10px] text-slate-550 leading-relaxed font-sans">
                      This code gets injected into the HTML <code className="text-blue-400">&lt;head&gt;</code> <b>only</b> when an active user navigates to the <b>Earn Coins tab</b> (e.g. PropellerAds, Popunder codes, or specific tracking tags for banner-only earning mechanics).
                    </p>
                    <textarea
                      rows={3}
                      placeholder="<!-- Paste head codes for the banner ads page only -->&#10;<script type='text/javascript' src='...'></script>"
                      value={adAdsHeaderCode}
                      onChange={(e) => setAdAdsHeaderCode(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-800 focus:border-blue-500 rounded-xl p-3 text-xs text-white focus:outline-none font-mono"
                    />
                  </div>
                </div>

                <div className="space-y-4">
                  <h4 className="text-xs font-bold text-slate-350 uppercase tracking-wide border-b border-slate-850 pb-2">Banner Ad Slots</h4>
                  
                  <div className="space-y-4">
                    {/* Size 1: 728x90 */}
                    <div className="bg-slate-950 border border-slate-800 p-4 rounded-xl space-y-2">
                      <div className="flex justify-between items-center">
                        <label className="text-xs font-semibold text-slate-300">Leaderboard Banner (728x90)</label>
                        <span className="text-[9px] font-mono bg-blue-900/40 text-blue-300 px-2 py-0.5 rounded border border-blue-500/10">728 × 90 px</span>
                      </div>
                      <textarea
                        rows={3}
                        placeholder="Paste network HTML banner script..."
                        value={adBanner728x90}
                        onChange={(e) => setAdBanner728x90(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-800 focus:border-blue-500 rounded-xl p-3 text-xs text-white focus:outline-none font-mono"
                      />
                    </div>

                    {/* Size 2: 300x250 */}
                    <div className="bg-slate-950 border border-slate-800 p-4 rounded-xl space-y-2">
                      <div className="flex justify-between items-center">
                        <label className="text-xs font-semibold text-slate-300">Medium Rectangle (300x250)</label>
                        <span className="text-[9px] font-mono bg-blue-900/40 text-blue-300 px-2 py-0.5 rounded border border-blue-500/10">300 × 250 px</span>
                      </div>
                      <textarea
                        rows={3}
                        placeholder="Paste network HTML banner script..."
                        value={adBanner300x250}
                        onChange={(e) => setAdBanner300x250(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-800 focus:border-blue-500 rounded-xl p-3 text-xs text-white focus:outline-none font-mono"
                      />
                    </div>

                    {/* Size 3: 320x50 */}
                    <div className="bg-slate-950 border border-slate-800 p-4 rounded-xl space-y-2">
                      <div className="flex justify-between items-center">
                        <label className="text-xs font-semibold text-slate-300">Mobile Anchor Banner (320x50)</label>
                        <span className="text-[9px] font-mono bg-blue-900/40 text-blue-300 px-2 py-0.5 rounded border border-blue-500/10">320 × 50 px</span>
                      </div>
                      <textarea
                        rows={2}
                        placeholder="Paste network HTML banner script..."
                        value={adBanner320x50}
                        onChange={(e) => setAdBanner320x50(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-800 focus:border-blue-500 rounded-xl p-3 text-xs text-white focus:outline-none font-mono"
                      />
                    </div>

                    {/* Size 4: 160x600 */}
                    <div className="bg-slate-950 border border-slate-800 p-4 rounded-xl space-y-2">
                      <div className="flex justify-between items-center">
                        <label className="text-xs font-semibold text-slate-300">Wide Skyscraper (160x600)</label>
                        <span className="text-[9px] font-mono bg-blue-900/40 text-blue-300 px-2 py-0.5 rounded border border-blue-500/10">160 × 600 px</span>
                      </div>
                      <textarea
                        rows={3}
                        placeholder="Paste network HTML banner script..."
                        value={adBanner160x600}
                        onChange={(e) => setAdBanner160x600(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-800 focus:border-blue-500 rounded-xl p-3 text-xs text-white focus:outline-none font-mono"
                      />
                    </div>
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3.5 rounded-xl text-xs flex items-center justify-center space-x-2 cursor-pointer shadow-md shadow-blue-500/20"
                >
                  <Save className="h-4 w-4" />
                  <span>Save Ad Network Configurations & Sync Codes</span>
                </button>
              </form>
            </div>
          )}

          {/* TAB 5: SHORTENERS SETUP PANEL */}
          {activeTab === "shorteners" && (
            <div className="space-y-6">
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl">
                <h3 className="text-lg font-bold text-white mb-4 flex items-center space-x-2">
                  <Plus className="h-5 w-5 text-blue-500" />
                  <span>Register Multi-Vendor URL Shortener (AdLinkFly, etc.)</span>
                </h3>
                <form onSubmit={async (e) => {
                  e.preventDefault();
                  if (!newShortenerName.trim() || !newShortenerUrl.trim() || !newShortenerApi.trim()) {
                    onServerNotification("Required Fields", "Please enter a friendly name, base API URL, and the corresponding API Token/Credential Key.", "warning");
                    return;
                  }
                  try {
                    setIsShortenerSubmitting(true);
                    const parsedReward = parseFloat(newShortenerReward) || 1.0;
                    const parsedViews = parseInt(newShortenerViewsLimit) || 1;
                    const res = await api.addAdminShortener(newShortenerName, newShortenerUrl, newShortenerApi, parsedReward, parsedViews);
                    onServerNotification("Shortener Added", res.message, "success");
                    setNewShortenerName("");
                    setNewShortenerUrl("");
                    setNewShortenerApi("");
                    setNewShortenerReward("1.0");
                    setNewShortenerViewsLimit("1");
                    // Refresh data
                    const fetchedShorteners = await api.getAdminShorteners();
                    setShorteners(fetchedShorteners);
                  } catch (err: any) {
                    onServerNotification("Failed to add shortener", err.message, "danger");
                  } finally {
                    setIsShortenerSubmitting(false);
                  }
                }} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <label className="text-xs font-semibold text-slate-300">Shortener Name</label>
                      <input
                        type="text"
                        placeholder="e.g. ShrinkMe, Adrinolinks"
                        value={newShortenerName}
                        onChange={(e) => setNewShortenerName(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 focus:border-blue-500 rounded-xl p-3 text-xs text-white focus:outline-none"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-semibold text-slate-300">Shortener Website URL</label>
                      <input
                        type="text"
                        placeholder="e.g. https://adrinolinks.in/ or https://shrinkme.io/"
                        value={newShortenerUrl}
                        onChange={(e) => setNewShortenerUrl(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 focus:border-blue-500 rounded-xl p-3 text-xs text-white focus:outline-none font-sans"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-semibold text-slate-300">API Token / Credential Key</label>
                      <input
                        type="password"
                        placeholder="e.g. 926f21a10f32..."
                        value={newShortenerApi}
                        onChange={(e) => setNewShortenerApi(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 focus:border-blue-500 rounded-xl p-3 text-xs text-white focus:outline-none font-mono"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-xs font-semibold text-slate-300">Coins Reward per Successful Bypass</label>
                      <input
                        type="number"
                        step="0.1"
                        min="0.1"
                        placeholder="e.g. 1.0 or 2.5"
                        value={newShortenerReward}
                        onChange={(e) => setNewShortenerReward(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 focus:border-blue-500 rounded-xl p-3 text-xs text-white focus:outline-none font-mono"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-semibold text-slate-300">Maximum Views per User (24 Hours Limit)</label>
                      <input
                        type="number"
                        min="1"
                        placeholder="e.g. 1, 2, or 3"
                        value={newShortenerViewsLimit}
                        onChange={(e) => setNewShortenerViewsLimit(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 focus:border-blue-500 rounded-xl p-3 text-xs text-white focus:outline-none font-mono"
                      />
                    </div>
                  </div>
                  <div>
                    <span className="text-[11px] text-slate-400 block mb-4">
                      Configure custom coin rewards and session completion boundaries. Enter the main shortener website URL (e.g. <code>https://adrinolinks.in/</code>) & we will automatically handle the AdLinkFly / standard shortened API endpoint translation.
                    </span>
                    <button
                      type="submit"
                      disabled={isShortenerSubmitting}
                      className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-xl text-xs flex items-center justify-center space-x-2 cursor-pointer shadow-md shadow-blue-500/20 disabled:opacity-50"
                    >
                      <Plus className="h-4 w-4" />
                      <span>{isShortenerSubmitting ? "Adding Shortener..." : "Deploy New Shortener Option"}</span>
                    </button>
                  </div>
                </form>
              </div>

              <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
                <div className="p-5 border-b border-slate-800">
                  <h3 className="text-md font-bold text-white uppercase tracking-wide">Configured Ad Link Shorteners</h3>
                </div>
                {shorteners.length === 0 ? (
                  <div className="py-12 text-center text-slate-500 text-sm">
                    No partner URL shorteners are configured. Complete the form above to add some!
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse text-xs md:text-sm select-none">
                      <thead>
                        <tr className="border-b border-slate-800 text-slate-500 font-semibold bg-slate-950/20">
                          <th className="p-4 uppercase text-[10px] tracking-wide">ID / Shortener Name</th>
                          <th className="p-4 uppercase text-[10px] tracking-wide">Shortener Domain URL</th>
                          <th className="p-4 uppercase text-[10px] tracking-wide">API Key</th>
                          <th className="p-4 uppercase text-[10px] tracking-wide">Configured Reward</th>
                          <th className="p-4 uppercase text-[10px] tracking-wide">Views Limit / 24h</th>
                          <th className="p-4 uppercase text-[10px] tracking-wide text-right">Delete Operations</th>
                        </tr>
                      </thead>
                      <tbody>
                        {shorteners.map((sh) => (
                          <tr key={sh.id} className="border-b border-slate-800/60 hover:bg-slate-950/20 transition">
                            <td className="p-4">
                              <span className="font-bold text-white block">{sh.name}</span>
                              <span className="text-[10px] font-mono text-slate-500 block mt-0.5">{sh.id}</span>
                            </td>
                            <td className="p-4 font-mono text-slate-400 max-w-[200px] truncate">
                              {sh.apiUrl || "https://adrinolinks.in/api"}
                            </td>
                            <td className="p-4 font-mono text-slate-405">
                              {sh.apiToken.substring(0, 6)}••••••••••••••••{sh.apiToken.substring(sh.apiToken.length - 4)}
                            </td>
                            <td className="p-4 font-bold text-emerald-400">
                              {sh.reward || "1.0"} THUNDERS
                            </td>
                            <td className="p-4 font-bold text-amber-500">
                              {sh.viewsLimit || 1} view(s)
                            </td>
                            <td className="p-4 text-right">
                              <button
                                onClick={async () => {
                                  if (!confirm(`Are you sure you want to remove the shortener "${sh.name}"?`)) return;
                                  try {
                                    await api.deleteAdminShortener(sh.id);
                                    onServerNotification("Shortener Removed", "The url shortener was deleted.", "info");
                                    // Refresh data
                                    const fetchedShorteners = await api.getAdminShorteners();
                                    setShorteners(fetchedShorteners);
                                  } catch (err: any) {
                                    onServerNotification("Deletion failed", err.message, "danger");
                                  }
                                }}
                                className="text-red-400 hover:text-red-300 font-semibold bg-red-950/30 hover:bg-red-900/30 p-2 rounded-xl transition cursor-pointer inline-flex items-center space-x-1"
                              >
                                <Trash2 className="h-4 w-4" />
                                <span className="text-xs">Remove</span>
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}

        </div>
      )}

    </div>
  );
}
