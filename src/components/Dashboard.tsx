import { useState, useEffect, useRef, FormEvent } from "react";
import { Zap, Play, Square, RotateCw, Trash2, Calendar, HardDrive, Cpu, Plus, Gamepad2, Layers, Clock, AlertTriangle, MonitorPlay, Check, Loader2, Gift, Link, ExternalLink, Copy, Eye, EyeOff, Key } from "lucide-react";
import { api } from "../api";
import { MCServer, SponsoredAd, User, UrlShortener } from "../types";

function AdCodeRenderer({ html, sizeLabel }: { html: string; sizeLabel: string }) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;
    containerRef.current.innerHTML = "";
    if (!html) return;

    try {
      const parser = new DOMParser();
      const doc = parser.parseFromString(html, "text/html");
      const nodes = Array.from(doc.body.childNodes);

      nodes.forEach(node => {
        if (node.nodeName === "SCRIPT") {
          const script = document.createElement("script");
          Array.from((node as HTMLScriptElement).attributes).forEach(attr => {
            script.setAttribute(attr.name, attr.value);
          });
          if ((node as HTMLScriptElement).innerHTML) {
            script.innerHTML = (node as HTMLScriptElement).innerHTML;
          }
          containerRef.current?.appendChild(script);
        } else {
          const importedNode = document.importNode(node, true);
          containerRef.current?.appendChild(importedNode);
        }
      });
    } catch (e) {
      console.error("Failed to parse ad script:", e);
    }
  }, [html]);

  if (!html) {
    return (
      <div className="flex flex-col items-center justify-center p-4 border border-dashed border-slate-800 bg-slate-950/40 rounded-2xl text-slate-500 font-mono text-[10px] min-h-[40px] w-full text-center">
        <span>[Ad Unit Placeholder - {sizeLabel}]</span>
      </div>
    );
  }

  return <div ref={containerRef} className="flex justify-center items-center overflow-auto max-w-full mx-auto" />;
}

interface DashboardProps {
  user: User;
  onRefreshUser: () => Promise<void>;
  onServerNotification: (title: string, message: string, type: "success" | "warning" | "danger" | "info") => void;
}

export default function Dashboard({ user, onRefreshUser, onServerNotification }: DashboardProps) {
  const [servers, setServers] = useState<MCServer[]>([]);
  const [ads, setAds] = useState<SponsoredAd[]>([]);
  const [loading, setLoading] = useState(true);
  const [deployName, setDeployName] = useState("");
  const [deployType, setDeployType] = useState<"minecraft" | "bot">("minecraft");
  const [botLang, setBotLang] = useState<"nodejs" | "python">("nodejs");
  const [upgradeServerId, setUpgradeServerId] = useState<string | null>(null);
  const [renewServerId, setRenewServerId] = useState<string | null>(null);
  const [isDeploying, setIsDeploying] = useState(false);
  const [activeTab, setActiveTabState] = useState<"servers" | "earn" | "shorteners">(() => {
    try {
      const saved = localStorage.getItem("dashboard_tab");
      if (saved === "servers" || saved === "earn" || saved === "shorteners") return saved as any;
    } catch (e) {
      console.error("Failed to read tab from localStorage", e);
    }
    return "servers";
  });

  const setActiveTab = (tab: "servers" | "earn" | "shorteners") => {
    setActiveTabState(tab);
    try {
      localStorage.setItem("dashboard_tab", tab);
    } catch (e) {
      console.error("Failed to write tab to localStorage", e);
    }
  };

  // Custom Banner Ads States loaded dynamically
  const [banner728x90, setBanner728x90] = useState("");
  const [banner300x250, setBanner300x250] = useState("");
  const [banner320x50, setBanner320x50] = useState("");
  const [banner160x600, setBanner160x600] = useState("");

  // Ad Watching local states
  const [selectedAd, setSelectedAd] = useState<SponsoredAd | null>(null);
  const [isWatching, setIsWatching] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(15);
  const [canClaim, setCanClaim] = useState(false);
  const [claiming, setClaiming] = useState(false);

  // URL Shorteners local states
  const [shorteners, setShorteners] = useState<(UrlShortener & { completedToday: boolean; completedTodayCount?: number; viewsLimit?: number })[]>([]);
  const [generatingShortenerId, setGeneratingShortenerId] = useState<string | null>(null);
  const [activePromoShortener, setActivePromoShortener] = useState<(UrlShortener & { shortenedUrl: string }) | null>(null);

  // Server stats monitoring states
  const [serverStats, setServerStats] = useState<Record<string, { cpuUsage: number, ramUsage: number, realStatus?: string }>>({});

  // Credentials visibility and copy states
  const [copiedMap, setCopiedMap] = useState<Record<string, boolean>>({});
  const [visiblePasswords, setVisiblePasswords] = useState<Record<string, boolean>>({});
  const [lastDeployedCredentials, setLastDeployedCredentials] = useState<{
    name: string;
    username: string;
    password?: string;
    panelUrl: string;
  } | null>(null);

  const handleCopyText = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedMap(prev => ({ ...prev, [key]: true }));
    setTimeout(() => {
      setCopiedMap(prev => ({ ...prev, [key]: false }));
    }, 1500);
  };

  const togglePasswordConceal = (serverId: string) => {
    setVisiblePasswords(prev => ({ ...prev, [serverId]: !prev[serverId] }));
  };

  // Fetch servers and ads
  const loadDashboardData = async () => {
    try {
      const serverList = await api.getServers();
      setServers(serverList);
      
      try {
        const res = await fetch("/api/ads/banners");
        const bData = await res.json();
        setBanner728x90(bData.banner728x90 || "");
        setBanner300x250(bData.banner300x250 || "");
        setBanner320x50(bData.banner320x50 || "");
        setBanner160x600(bData.banner160x600 || "");
      } catch (err) {
        console.error("Failed to fetch custom banner integrations", err);
      }

      try {
        const userShorteners = await api.getShorteners();
        // Sort by higher reward coins (descending)
        const sortedShorteners = [...userShorteners].sort((a, b) => {
          const rewardA = typeof a.reward === 'number' ? a.reward : 1.0;
          const rewardB = typeof b.reward === 'number' ? b.reward : 1.0;
          return rewardB - rewardA;
        });
        setShorteners(sortedShorteners);
      } catch (err) {
        console.error("Failed to log shorteners metadata", err);
      }

      const appAds = await api.getAds();
      setAds(appAds);
      if (appAds.length > 0 && !selectedAd) {
        setSelectedAd(appAds[0]);
      }
    } catch (err: any) {
      console.error("Failed to load dashboard parameters:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    try {
      const isClaimSuccess = localStorage.getItem("shortener_success");
      if (isClaimSuccess === "true") {
        localStorage.removeItem("shortener_success");
        onRefreshUser();
        onServerNotification(
          "Claim Successful! 🎉",
          "Your reward coins have been successfully credited to your wallet balance.",
          "success"
        );
      }
    } catch (e) {
      console.error(e);
    }
  }, []);

  useEffect(() => {
    loadDashboardData();
    // Refresh servers lists every 15 seconds
    const interval = setInterval(loadDashboardData, 15000);
    return () => clearInterval(interval);
  }, []);

  // Dynamic ad verification/tracking head code injector for the banner ads (Earn tab) page only
  useEffect(() => {
    let injectedElements: HTMLElement[] = [];
    
    const loadAndInjectAdHeader = async () => {
      try {
        const res = await fetch("/api/ads/header");
        const data = await res.json();
        // If adsHeaderCode exists, dynamically inject it on the earn tab.
        if (activeTab === "earn" && data.adsHeaderCode) {
          const parser = new DOMParser();
          const doc = parser.parseFromString(`<div>${data.adsHeaderCode}</div>`, "text/html");
          const children = Array.from(doc.body.firstChild?.childNodes || []);
          
          children.forEach(node => {
            if (node.nodeType === Node.ELEMENT_NODE) {
              const el = node as HTMLElement;
              let newEl: HTMLElement;
              if (el.tagName === "SCRIPT") {
                newEl = document.createElement("script");
                Array.from(el.attributes).forEach(attr => newEl.setAttribute(attr.name, attr.value));
                newEl.innerHTML = el.innerHTML;
              } else if (el.tagName === "STYLE") {
                newEl = document.createElement("style");
                newEl.innerHTML = el.innerHTML;
              } else if (el.tagName === "META") {
                newEl = document.createElement("meta");
                Array.from(el.attributes).forEach(attr => newEl.setAttribute(attr.name, attr.value));
              } else if (el.tagName === "LINK") {
                newEl = document.createElement("link");
                Array.from(el.attributes).forEach(attr => newEl.setAttribute(attr.name, attr.value));
              } else {
                newEl = document.createElement(el.tagName.toLowerCase());
                Array.from(el.attributes).forEach(attr => newEl.setAttribute(attr.name, attr.value));
                newEl.innerHTML = el.innerHTML;
              }
              document.head.appendChild(newEl);
              injectedElements.push(newEl);
            }
          });
        }
      } catch (e) {
        console.error("Failed to inject banner-ads head code dynamically:", e);
      }
    };

    loadAndInjectAdHeader();

    return () => {
      injectedElements.forEach(el => {
        if (el && el.parentNode) {
          el.parentNode.removeChild(el);
        }
      });
      injectedElements = [];
    };
  }, [activeTab]);

  // Real-time server resource monitoring loop
  useEffect(() => {
    if (servers.length === 0) return;

    const runningServers = servers.filter(s => s.status === "running");
    if (runningServers.length === 0) return;

    const fetchStats = async () => {
      const nextStats = { ...serverStats };
      for (const s of runningServers) {
        try {
          const stats = await api.getServerStatus(s.id);
          nextStats[s.id] = {
            cpuUsage: stats.cpuUsage,
            ramUsage: stats.ramUsage,
            realStatus: stats.status
          };
        } catch (_) {}
      }
      setServerStats(nextStats);
    };

    fetchStats();
    const interval = setInterval(fetchStats, 6000);
    return () => clearInterval(interval);
  }, [servers]);

  // Handle Deploy
  const handleDeploy = async (e: FormEvent) => {
    e.preventDefault();
    if (!deployName.trim()) return;

    if (user.coins < 1.0) {
      onServerNotification(
        "Deploy Failed",
        "Insufficient THUNDERS. Earn or refill THUNDERS first!",
        "danger"
      );
      return;
    }

    setIsDeploying(true);
    try {
      const res = await api.createServer(deployName, deployType, deployType === "bot" ? botLang : undefined);
      onServerNotification(
        "⚡ Node Initialised",
        res.message || `Your instance "${deployName}" is initiating deployment.`,
        "success"
      );
      if (res.server) {
        setLastDeployedCredentials({
          name: res.server.name,
          username: res.server.pteroUsername || user.email,
          password: res.server.pteroPassword,
          panelUrl: res.server.panelUrl || "https://panel.thunderhost.club"
        });
      }
      setDeployName("");
      await onRefreshUser();
      await loadDashboardData();
    } catch (err: any) {
      onServerNotification("Deployment Failed", err.message || "An error occurred during build creation.", "danger");
    } finally {
      setIsDeploying(false);
    }
  };

  // Handle Power Control
  const handlePower = async (serverId: string, action: "start" | "stop" | "restart") => {
    try {
      // Optimiztic update
      setServers(prev => prev.map(s => s.id === serverId ? { ...s, status: action === "start" ? "running" : action === "stop" ? "stopped" : "running" } : s));
      await api.controlServer(serverId, action);
      onServerNotification(
        "⚡ Shell Signal Sent",
        `Requested instance status modification: ${action.toUpperCase()}`,
        "info"
      );
      await loadDashboardData();
    } catch (e: any) {
      onServerNotification("Power Event Failed", e.message, "danger");
    }
  };

  // Handle Extension/Renewal
  const handleRenew = async (serverId: string, renewType: "upgraded" | "default" = "default", bypassUpgradeCheck = false) => {
    const tgtServer = servers.find(s => s.id === serverId);
    if (!tgtServer) return;

    // Check if upgraded and we haven't prompted the user yet
    if (tgtServer.planId && tgtServer.planId > 1 && !bypassUpgradeCheck) {
      setRenewServerId(serverId);
      return;
    }

    const currentPlanId = tgtServer.planId || 1;
    let cost = 1.0;
    if (renewType === "upgraded" && currentPlanId > 1) {
      cost = currentPlanId === 2 ? 2.0 : 3.0;
    }

    if (user.coins < cost) {
      onServerNotification(
        "Insufficient Balance", 
        `You must have at least ${cost} THUNDERS to complete renewal preserving upgraded specifications.`, 
        "danger"
      );
      return;
    }

    try {
      const res = await api.renewServer(serverId, renewType);
      const timeName = tgtServer.serverType === "bot" ? "3 days" : "24 hours";
      const planMsg = renewType === "upgraded" 
        ? `Server renewed successfully maintaining your upgraded resources specifications.` 
        : `Server renewed for another ${timeName} on the standard plan. Original active upgrades remain active until their original 24h expires.`;

      onServerNotification("⚡ Renewal Complete", planMsg, "success");
      setRenewServerId(null); // close selection prompt modal
      await onRefreshUser();
      await loadDashboardData();
    } catch (e: any) {
      onServerNotification("Extension Failed", e.message, "danger");
    }
  };

  const [isUpgradeLoading, setIsUpgradeLoading] = useState(false);

  // Handle Upgrade Plan
  const handleUpgrade = async (serverId: string, targetPlanId: number) => {
    setIsUpgradeLoading(true);
    try {
      const res = await api.upgradeServer(serverId, targetPlanId);
      onServerNotification(
        "⚡ Profile Upgraded",
        res.message || `Server boosted to Tier ${targetPlanId} successfully!`,
        "success"
      );
      setUpgradeServerId(null);
      await onRefreshUser();
      await loadDashboardData();
    } catch (err: any) {
      onServerNotification("Upgrade Failed", err.message || "An error occurred while upgrading.", "danger");
    } finally {
      setIsUpgradeLoading(false);
    }
  };

  // Handle Delete
  const handleDelete = async (serverId: string) => {
    if (!confirm("Are you absolutely sure you want to permanently delete this server and delete all configuration file maps? This action cannot be reversed!")) return;

    try {
      await api.deleteServer(serverId);
      onServerNotification("🗑️ Server Cleared", "Minecraft allocation and data successfully deleted.", "info");
      await loadDashboardData();
    } catch (e: any) {
      onServerNotification("Purge Failed", e.message, "danger");
    }
  };

  // Watch Ads System Ticker
  useEffect(() => {
    let t: NodeJS.Timeout;
    if (isWatching && secondsLeft > 0) {
      t = setTimeout(() => {
        setSecondsLeft(prev => prev - 1);
      }, 1000);
    } else if (isWatching && secondsLeft === 0) {
      setCanClaim(true);
    }
    return () => clearTimeout(t);
  }, [isWatching, secondsLeft]);

  const startWatchingAd = (ad: SponsoredAd) => {
    if (user.claimsToday >= 25) {
      onServerNotification("Daily limit reached", "You have claimed the maximum 2.5 coins reward for today. Come back tomorrow!", "warning");
      return;
    }
    setSelectedAd(ad);
    setIsWatching(true);
    setSecondsLeft(ad.duration);
    setCanClaim(false);
  };

  const claimAdGold = async () => {
    if (!selectedAd || claiming) return;

    setClaiming(true);
    try {
      const res = await api.claimAd(selectedAd.id);
      onServerNotification("⚡ THUNDERS Claimed!", res.message, "success");
      setIsWatching(false);
      setCanClaim(false);
      setSecondsLeft(15);
      await onRefreshUser();
      setTimeout(() => {
        window.location.reload();
      }, 1200);
    } catch (e: any) {
      onServerNotification("Claim Failed", e.message, "danger");
    } finally {
      setClaiming(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 md:px-8 py-8">
      {/* Tab controls */}
      <div className="flex overflow-x-auto whitespace-nowrap scrollbar-none border-b border-slate-800 mb-8 space-x-6 text-xs sm:text-sm font-bold">
        <button
          onClick={() => setActiveTab("servers")}
          className={`pb-3 transition flex items-center space-x-2 border-b-2 shrink-0 ${activeTab === "servers" ? "border-blue-500 text-blue-450" : "border-transparent text-slate-400 hover:text-slate-350"}`}
        >
          <Layers className="h-4 w-4 shrink-0" />
          <span>Active Instances</span>
        </button>
        <button
          onClick={() => setActiveTab("earn")}
          className={`pb-3 transition flex items-center space-x-2 border-b-2 shrink-0 ${activeTab === "earn" ? "border-b-2 border-blue-500 text-blue-450" : "border-transparent text-slate-400 hover:text-slate-350"}`}
        >
          <Zap className="h-4 w-4 text-blue-400 shrink-0" />
          <span className="hidden sm:inline">Earn Coins (Watch Ads) 💰</span>
          <span className="sm:hidden">Earn Coins 💰</span>
        </button>
        <button
          onClick={() => setActiveTab("shorteners")}
          className={`pb-3 transition flex items-center space-x-2 border-b-2 shrink-0 ${activeTab === "shorteners" ? "border-b-2 border-blue-500 text-blue-450" : "border-transparent text-slate-400 hover:text-slate-350"}`}
        >
          <Link className="h-4 w-4 text-emerald-400 shrink-0" />
          <span className="hidden sm:inline">Shortener Tasks (Sponsors) 🔗</span>
          <span className="sm:hidden">Shorteners 🔗</span>
        </button>
      </div>

      {activeTab === "servers" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main List Section */}
          <div className="lg:col-span-2 space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold text-white flex items-center space-x-2">
                <span>Your Active Instances</span>
                <span className="text-xs bg-slate-900 text-slate-300 border border-slate-800 ml-2 rounded-md px-2 py-0.5 font-semibold">
                  {servers.length} slots
                </span>
              </h2>
            </div>

            {loading ? (
              <div className="py-16 text-center text-slate-500 text-sm flex flex-col items-center justify-center space-y-3">
                <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
                <span>Loading active server nodes...</span>
              </div>
            ) : servers.length === 0 ? (
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-12 text-center text-slate-400 text-sm leading-relaxed shadow-lg">
                <Gamepad2 className="h-10 w-10 text-slate-600 block mx-auto mb-4 animate-pulse" />
                No active Minecraft server nodes deployed yet.<br />
                Create one now in the panel on the right! (Requires 1.0 THUNDERS wallet balance)
              </div>
            ) : (
              <div className="space-y-4 font-sans">
                {servers.map(server => {
                  const stat = serverStats[server.id];
                  const liveStatus = stat?.realStatus || server.status;
                  const isExpired = server.status === "suspended" || (new Date(server.expiresAt) < new Date());

                  return (
                    <div 
                      key={server.id}
                      className="bg-slate-900 border border-slate-800 rounded-3xl p-6 relative overflow-hidden flex flex-col md:flex-row justify-between items-start md:items-center gap-6 shadow-xl transition-all duration-300"
                    >
                      {/* Status Tag aligned precisely in the top right corner */}
                      {isExpired ? (
                        <div className="absolute top-0 right-0 px-6 py-2 bg-red-500/10 text-red-400 text-xs font-bold border-b border-l border-slate-800 rounded-bl-xl uppercase select-none">Suspended</div>
                      ) : liveStatus === "running" ? (
                        <div className="absolute top-0 right-0 px-6 py-2 bg-emerald-500/10 text-emerald-400 text-xs font-bold border-b border-l border-slate-800 rounded-bl-xl uppercase select-none animate-pulse">Running</div>
                      ) : liveStatus === "starting" ? (
                        <div className="absolute top-0 right-0 px-6 py-2 bg-blue-500/10 text-blue-400 text-xs font-bold border-b border-l border-slate-800 rounded-bl-xl uppercase select-none">Starting</div>
                      ) : (
                        <div className="absolute top-0 right-0 px-6 py-2 bg-slate-800 text-slate-400 text-xs font-bold border-b border-l border-slate-800 rounded-bl-xl uppercase select-none">Stopped</div>
                      )}

                      {/* Left: Metadata with beautiful ⛏️ graphics container */}
                      <div className="flex-1 flex items-start gap-4 min-w-0 pr-8">
                        <div className="w-12 h-12 bg-slate-800 rounded-2xl flex items-center justify-center text-2xl border border-slate-700 shadow-inner shrink-0 mt-0.5 select-none text-center">
                          {server.serverType === "bot" ? "🤖" : "⛏️"}
                        </div>
                        <div className="space-y-1.5 min-w-0 flex-1">
                          <div className="flex items-center space-x-2 flex-wrap">
                            <span className="text-xl font-bold text-white block truncate">
                              {server.name}
                            </span>
                            <span className="bg-slate-950 border border-slate-800 text-[10px] font-mono font-bold text-slate-400 px-2 py-0.5 rounded-full select-none">
                              {server.serverType === "bot" ? `${server.botType === "python" ? "Python" : "Node.js"} Bot` : "Minecraft"}
                            </span>
                            {server.planId && server.planId > 1 && (
                              <span className="bg-gradient-to-r from-amber-600 to-yellow-500 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-md select-none animate-pulse">
                                Tier {server.planId} Upgraded
                              </span>
                            )}
                          </div>
                          
                          {/* Specifications allocations banner */}
                          <div className="flex items-center gap-1.5 text-[11px] text-slate-300 flex-wrap pt-1 font-mono font-bold select-none">
                            <span className="bg-slate-950/70 px-2.5 py-1 rounded-xl border border-slate-800/80 tracking-tight">{server.ram / 1024} GB RAM</span>
                            <span className="bg-slate-950/70 px-2.5 py-1 rounded-xl border border-slate-800/80 tracking-tight">{server.cpu}% CPU</span>
                            <span className="bg-slate-950/70 px-2.5 py-1 rounded-xl border border-slate-800/80 tracking-tight">{server.disk / 1024} GB SSD</span>
                          </div>
                        </div>
                      </div>

                      {/* Middle: Panel credentials details block */}
                      {!isExpired && (
                        <div className="flex-1 min-w-0 w-full md:min-w-[280px] bg-slate-950/70 p-4 rounded-2xl border border-slate-800 space-y-2.5 shadow-inner">
                          <div className="flex items-center justify-between border-b border-slate-800/80 pb-1.5">
                            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider flex items-center gap-1">
                              <Key className="h-3 w-3 text-blue-400" /> Control Panel Login
                            </span>
                            <a
                              href={server.panelUrl || "https://panel.thunderhost.club"}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-[11px] text-blue-450 hover:text-blue-300 font-medium flex items-center gap-1 transition bg-blue-500/10 px-2 py-0.5 rounded-md border border-blue-500/15"
                            >
                              <span>Open Panel</span>
                              <ExternalLink className="h-3 w-3" />
                            </a>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-2 text-xs font-mono">
                            {/* Email / Username */}
                            <div className="space-y-1">
                              <span className="text-[9px] text-slate-500 uppercase block select-none">Username / Email</span>
                              <div className="flex items-center justify-between bg-slate-900 border border-slate-800/60 rounded-lg px-2 py-1 gap-1">
                                <span className="text-[11px] text-slate-200 truncate pr-1" title={server.pteroUsername || server.ownerEmail}>
                                  {server.pteroUsername || server.ownerEmail}
                                </span>
                                <button
                                  type="button"
                                  onClick={() => handleCopyText(server.pteroUsername || server.ownerEmail, `${server.id}_username`)}
                                  className="text-slate-500 hover:text-slate-350 transition p-0.5 cursor-pointer"
                                  title="Copy username"
                                >
                                  {copiedMap[`${server.id}_username`] ? (
                                    <Check className="h-3 w-3 text-emerald-400" />
                                  ) : (
                                    <Copy className="h-3 w-3" />
                                  )}
                                </button>
                              </div>
                            </div>

                            {/* Password */}
                            <div className="space-y-1">
                              <span className="text-[9px] text-slate-500 uppercase block select-none">Account Password</span>
                              <div className="flex items-center justify-between bg-slate-900 border border-slate-800/60 rounded-lg px-2 py-1 gap-1">
                                <span className="text-[11px] text-slate-200 truncate pr-1">
                                  {visiblePasswords[server.id] 
                                    ? (server.pteroPassword || "(use your existing password)") 
                                    : "••••••••••••"}
                                </span>
                                <div className="flex items-center gap-0.5">
                                  {server.pteroPassword && (
                                    <button
                                      type="button"
                                      onClick={() => togglePasswordConceal(server.id)}
                                      className="text-slate-500 hover:text-slate-350 transition p-0.5 cursor-pointer"
                                      title={visiblePasswords[server.id] ? "Hide password" : "Show password"}
                                    >
                                      {visiblePasswords[server.id] ? (
                                        <EyeOff className="h-3 w-3" />
                                      ) : (
                                        <Eye className="h-3 w-3" />
                                      )}
                                    </button>
                                  )}
                                  {server.pteroPassword && server.pteroPassword !== "(Use your existing panel password)" && (
                                    <button
                                      type="button"
                                      onClick={() => handleCopyText(server.pteroPassword || "", `${server.id}_password`)}
                                      className="text-slate-500 hover:text-slate-350 transition p-0.5 cursor-pointer"
                                      title="Copy password"
                                    >
                                      {copiedMap[`${server.id}_password`] ? (
                                        <Check className="h-3 w-3 text-emerald-400" />
                                      ) : (
                                        <Copy className="h-3 w-3" />
                                      )}
                                    </button>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Right: Controls Stack */}
                      <div className="flex flex-col items-end gap-2.5 w-full md:w-auto shrink-0 z-10 pt-4 md:pt-0">
                        {isExpired ? (
                          <div className="flex items-center space-x-3 w-full md:w-auto justify-end font-sans">
                            <div className="text-right text-xs">
                              <span className="text-red-500 font-bold block uppercase text-[10px] tracking-wide">EXPIRED</span>
                              <span className="text-slate-500">{server.serverType === "bot" ? "1 Coin/3 days" : "1 Coin/day"}</span>
                            </div>
                            <button
                              onClick={() => handleRenew(server.id)}
                              className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold px-4 py-2.5 rounded-xl transition flex items-center space-x-1.5 shrink-0 grow md:grow-0 justify-center cursor-pointer shadow-md shadow-blue-505/25"
                            >
                              <RotateCw className="h-3.5 w-3.5" />
                              <span>Pay 1 Coin & Renew</span>
                            </button>
                          </div>
                        ) : (
                          <div className="flex flex-col md:items-end w-full space-y-2 font-sans">
                            <div className="flex items-center space-x-1 text-slate-500 text-[11px] justify-end">
                              <Calendar className="h-3.5 w-3.5 text-blue-500" />
                              <span>Expires: {new Date(server.expiresAt).toLocaleDateString()}</span>
                            </div>

                            <div className="flex items-center space-x-2 gap-1 justify-end w-full md:w-auto">
                              <button
                                onClick={() => setUpgradeServerId(server.id)}
                                className="bg-gradient-to-r from-amber-600 to-yellow-500 hover:from-amber-500 hover:to-yellow-400 text-white px-3.5 py-2.5 rounded-xl text-xs font-bold flex items-center space-x-1 text-center cursor-pointer transition shadow-md shadow-amber-505/25"
                                title="Upgrade server resources specs"
                              >
                                <Zap className="h-3.5 w-3.5 text-amber-100 animate-pulse fill-current" />
                                <span>Upgrade</span>
                              </button>

                              <button
                                onClick={() => handleRenew(server.id)}
                                className="bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 px-3.5 py-2.5 rounded-xl text-xs font-bold flex items-center space-x-1 cursor-pointer transition"
                                title={server.serverType === "bot" ? "Renew Bot for another 3 days (+72h)" : "Renew Server for another day (+24h)"}
                              >
                                <Plus className="h-3.5 w-3.5" />
                                <span>Extend</span>
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Sidebar Area: Provision New Server Form */}
          <div className="space-y-6">
            <div className="bg-slate-900 border border-slate-805 rounded-3xl p-6 relative">
              <div className="absolute top-0 right-10 w-24 h-24 bg-blue-500/5 blur-[50px] rounded-full pointer-events-none" />
              <h3 className="text-md font-bold text-white mb-1 uppercase tracking-wide">
                Launch Free Slot
              </h3>
              <p className="text-xs text-slate-400 mb-6 leading-relaxed">
                Choose your instance type and name below. Starting deployment immediately consumes **1.0 THUNDERS** from your wallet balance.
              </p>

              <form onSubmit={handleDeploy} className="space-y-4 font-sans">
                {/* Segmented type selector */}
                <div>
                  <label className="block text-xs text-slate-400 font-semibold mb-2">Service Type</label>
                  <div className="grid grid-cols-2 gap-2 bg-slate-950 p-1 rounded-xl border border-slate-800">
                    <button
                      type="button"
                      onClick={() => setDeployType("minecraft")}
                      className={`py-2 text-[11px] font-bold rounded-lg transition-all cursor-pointer ${
                        deployType === "minecraft"
                          ? "bg-blue-600 text-white shadow-sm font-bold"
                          : "text-slate-400 hover:text-slate-200"
                      }`}
                    >
                      ⛏️ Minecraft
                    </button>
                    <button
                      type="button"
                      onClick={() => setDeployType("bot")}
                      className={`py-2 text-[11px] font-bold rounded-lg transition-all cursor-pointer ${
                        deployType === "bot"
                          ? "bg-blue-600 text-white shadow-sm font-bold"
                          : "text-slate-400 hover:text-slate-200"
                      }`}
                    >
                      🤖 Bot Hosting
                    </button>
                  </div>
                </div>

                {/* Optional English/Python bot language selectors */}
                {deployType === "bot" && (
                  <div>
                    <label className="block text-xs text-slate-400 font-semibold mb-2">Bot Runtime (Egg)</label>
                    <div className="grid grid-cols-2 gap-2 bg-slate-950 p-1 rounded-xl border border-slate-800">
                      <button
                        type="button"
                        onClick={() => setBotLang("nodejs")}
                        className={`py-2 text-[11px] font-mono rounded-lg transition-all cursor-pointer ${
                          botLang === "nodejs"
                            ? "bg-slate-800 text-white font-bold border border-slate-700"
                            : "text-slate-400 hover:text-slate-200"
                        }`}
                      >
                        Node.js Egg
                      </button>
                      <button
                        type="button"
                        onClick={() => setBotLang("python")}
                        className={`py-2 text-[11px] font-mono rounded-lg transition-all cursor-pointer ${
                          botLang === "python"
                            ? "bg-slate-800 text-white font-bold border border-slate-700"
                            : "text-slate-400 hover:text-slate-200"
                        }`}
                      >
                        Python Egg
                      </button>
                    </div>
                  </div>
                )}

                <div>
                  <label className="block text-xs text-slate-400 font-semibold mb-2">Instance Name</label>
                  <input
                    type="text"
                    required
                    placeholder={deployType === "bot" ? "e.g. DiscordMusicBot" : "e.g. SurvivalSMP"}
                    value={deployName}
                    onChange={(e) => setDeployName(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 focus:border-blue-500 rounded-xl py-3 px-4 text-xs text-white focus:outline-none"
                  />
                </div>

                {/* Plan static properties summary */}
                <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 space-y-2 select-none font-mono">
                  <div className="flex justify-between text-xs font-medium">
                    <span className="text-slate-500">Memory Allocation</span>
                    <span className="text-slate-300 font-bold">{deployType === "bot" ? "1.0 GB DDR4" : "4.0 GB DDR4"}</span>
                  </div>
                  <div className="flex justify-between text-xs font-medium">
                    <span className="text-slate-500">Computational CPU</span>
                    <span className="text-slate-300 font-bold">{deployType === "bot" ? "25% Shared AMD" : "100% Shared AMD"}</span>
                  </div>
                  <div className="flex justify-between text-xs font-medium">
                    <span className="text-slate-500">Fast Solid Disk</span>
                    <span className="text-slate-300 font-bold">{deployType === "bot" ? "2 GB NVMe Storage" : "10 GB NVMe Storage"}</span>
                  </div>
                  <div className="flex justify-between text-xs font-medium">
                    <span className="text-slate-500">Node Duration</span>
                    <span className="text-slate-300 font-bold">{deployType === "bot" ? "3 Days (72 Hours)" : "1 Day (24 Hours)"}</span>
                  </div>
                  <div className="flex justify-between border-t border-slate-800 pt-2 text-xs font-semibold">
                    <span className="text-slate-405 font-medium">Launch Cost</span>
                    <span className="text-yellow-400 flex items-center space-x-1">
                      <Zap className="h-3 w-3 fill-current" />
                      <span>1.0 Coin</span>
                    </span>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isDeploying}
                  className="w-full bg-blue-600 hover:bg-blue-500 disabled:bg-slate-800 disabled:text-slate-500 hover:scale-[1.01] transition duration-200 text-white font-bold py-3 px-4 rounded-xl text-xs flex items-center justify-center space-x-2 cursor-pointer shadow-md shadow-blue-500/20"
                >
                  {isDeploying ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      <span>Deploying machine...</span>
                    </>
                  ) : (
                    <>
                      <Plus className="h-4 w-4" />
                      <span>Set Up Server Node</span>
                    </>
                  )}
                </button>
              </form>
            </div>

            {/* Quick specifications reminder */}
            <div className="bg-slate-900 border border-slate-805 rounded-3xl p-6 text-xs text-slate-400 leading-relaxed leading-5">
              <span className="font-bold text-slate-350 uppercase text-[10px] tracking-wider block mb-2">Billing Policy Notice</span>
              Every active Minecraft server consumes <b className="text-yellow-450">1 THUNDERS</b> daily at renewal checks, whereas Bots consume <b className="text-yellow-450">1 THUNDERS</b> every 3 days. Upgraded plans will remain upgraded for 24 hours. If your wallet balance drops below 1, your server status toggles to <b className="text-red-400">Suspended</b>. You'll have exactly <b className="text-red-400">3 days</b> to watch ads and click renew, otherwise files and maps are automatically deleted.
            </div>
          </div>
        </div>
      )}

      {activeTab === "earn" && (
        <div className="max-w-[1500px] mx-auto px-4 w-full">
          <div className="grid grid-cols-1 xl:grid-cols-12 gap-8 items-start">
            
            {/* LEFT SIDEBAR AD TOWERS (Desktop XL+) */}
            <div className="hidden xl:flex xl:col-span-2 flex-col space-y-6 sticky top-24 select-none">
              <div className="bg-slate-900 border border-slate-800 p-4 rounded-3xl text-center space-y-3 shadow-xl">
                <span className="text-[9px] text-slate-500 font-bold uppercase tracking-wider block">Sponsor Sky Left</span>
                <div className="bg-slate-950/50 p-2 rounded-2xl border border-slate-850/60 overflow-hidden flex flex-col items-center">
                  <AdCodeRenderer html={banner160x600} sizeLabel="Skyscraper 160x600 Left" />
                </div>
              </div>
              
              <div className="bg-slate-900 border border-slate-800 p-4 rounded-3xl text-center space-y-3 shadow-xl">
                <span className="text-[9px] text-slate-500 font-bold uppercase tracking-wider block">Media Unit Left</span>
                <div className="bg-slate-950/50 p-2 rounded-2xl border border-slate-850/60 overflow-hidden flex flex-col items-center">
                  <AdCodeRenderer html={banner300x250} sizeLabel="Rectangle 300x250 Left" />
                </div>
              </div>
            </div>

            {/* CENTRAL MAIN DASHBOARD FOR WATCHING */}
            <div className="col-span-12 xl:col-span-8 space-y-8">
              {/* Coin Balance Dashboard Panel Header */}
              <div className="bg-slate-900 border border-slate-800 p-6 rounded-3xl flex items-center justify-between gap-4 shadow-xl select-none">
                <div className="flex items-center space-x-4">
                  <div className="bg-slate-950/60 p-4 rounded-2xl flex items-center justify-center border border-slate-800/80">
                    <Zap className="h-6 w-6 text-amber-500 fill-amber-500 animate-pulse" />
                  </div>
                  <div className="space-y-0.5">
                    <span className="text-xs text-slate-400 block uppercase tracking-wider font-semibold">Your THUNDERS</span>
                    <div className="flex items-end space-x-1.5 mt-0.5">
                      <span className="text-3xl font-black text-amber-500 leading-none">{user.coins}</span>
                      <span className="text-xl leading-none text-red-500 select-none">⚡</span>
                    </div>
                  </div>
                </div>

                <div className="text-right">
                  <span className="text-xs text-slate-400 block font-semibold uppercase tracking-wider">Earning limit check</span>
                  <span className="text-sm font-bold text-slate-200 mt-1 block">
                    Claims today: <span className="text-amber-500">{user.claimsToday}</span> / 25
                  </span>
                  <span className="text-[10px] text-slate-500 block mt-0.5">Clears at midnight UTC</span>
                </div>
              </div>

              {/* Sponsoring ad horizontal wrapper block */}
              <div className="w-full bg-slate-900/60 border border-slate-805/80 p-5 rounded-3xl select-none relative overflow-hidden">
                <span className="absolute top-0 left-0 w-24 h-24 bg-blue-500/5 blur-[50px] rounded-full pointer-events-none" />
                
                <div className="text-center mb-4 flex items-center justify-center space-x-2">
                  <span className="h-px bg-slate-805 w-12" />
                  <span className="text-[10px] text-slate-450 font-bold tracking-[0.15em] uppercase font-sans">ADVERTISEMENT</span>
                  <span className="h-px bg-slate-850 w-12" />
                </div>

                {/* Render top leaderboard banner */}
                <div className="flex flex-col items-center justify-center">
                  <div className="hidden sm:block">
                    <AdCodeRenderer html={banner728x90} sizeLabel="Leaderboard 728x90" />
                  </div>
                  <div className="block sm:hidden">
                    <AdCodeRenderer html={banner320x50} sizeLabel="Mobile Anchor 320x50" />
                  </div>
                </div>
              </div>

              {/* MAIN PLAYER/CARD CONTAINER */}
              <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 md:p-12 text-center relative overflow-hidden shadow-2xl">
                <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/5 blur-[60px] rounded-full pointer-events-none" />

                {!isWatching ? (
                  <div className="py-10 space-y-6 max-w-lg mx-auto">
                    <div className="bg-amber-500/10 h-20 w-20 rounded-full flex items-center justify-center mx-auto text-amber-500 border border-amber-500/20 shadow-inner relative">
                      <div className="absolute inset-0 bg-amber-500/5 rounded-full animate-pulse" />
                      <Zap className="h-9 w-9 text-amber-400 fill-amber-400" />
                    </div>

                    <div className="space-y-3">
                      <h3 className="text-2xl font-black text-white tracking-wide font-sans">Ready to Earn?</h3>
                      <p className="text-slate-400 text-sm leading-relaxed font-medium">
                        Watch an ad for 15 seconds and earn 0.1 THUNDERS ⚡
                      </p>
                    </div>

                    <button
                      onClick={() => startWatchingAd({ id: "standard_banner_ad", title: "Standard Banner Stream", duration: 15, reward: 0.1, type: "video" })}
                      disabled={user.claimsToday >= 25}
                      className="w-full sm:w-auto bg-amber-500 hover:bg-amber-400 disabled:bg-slate-850 disabled:text-slate-500 hover:scale-[1.02] active:scale-[0.98] transition-all font-black px-10 py-4 rounded-xl text-sm flex items-center justify-center space-x-2.5 mx-auto cursor-pointer shadow-lg shadow-amber-500/10 text-slate-950"
                    >
                      <Zap className="h-4 w-4 fill-current text-slate-950" />
                      <span>Start Watching</span>
                    </button>
                    
                    {/* Multi-ad promo display when idle */}
                    <div className="border-t border-slate-800/80 pt-8 mt-6">
                      <span className="text-[9px] text-slate-500 font-bold uppercase tracking-wider mb-3 block select-none">Supported Sponsor Media Platforms</span>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
                        <div className="bg-slate-950/40 p-4 rounded-2xl border border-slate-800/60 flex flex-col justify-center items-center min-h-[200px]">
                          <span className="text-[8px] text-slate-500 font-bold uppercase tracking-wider mb-2 select-none">AdSense Banner unit</span>
                          <AdCodeRenderer html={banner300x250} sizeLabel="Rectangle 300x250" />
                        </div>
                        <div className="bg-slate-950/40 p-4 rounded-2xl border border-slate-800/60 flex flex-col justify-center items-center min-h-[200px]">
                          <span className="text-[8px] text-slate-500 font-bold uppercase tracking-wider mb-2 select-none">Broadcaster Tower Unit</span>
                          <AdCodeRenderer html={banner160x600} sizeLabel="Skyscraper 160x600" />
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  // ACTIVE AD WATCHER SECTION OR COMPLETED TASK
                  <div className="py-10 max-w-xl mx-auto space-y-10 relative">
                    {secondsLeft > 0 && (
                      /* Floating Advertisement Capsule Timer pill */
                      <div className="absolute top-[-24px] right-2 sm:right-4 bg-slate-950/80 border border-slate-800 px-3.5 py-1.5 rounded-full flex items-center space-x-2 text-[10px] uppercase font-black tracking-widest text-slate-400 select-none backdrop-blur-md shadow-md">
                        <span>ADVERTISEMENT</span>
                        <span className="w-5 h-5 bg-slate-900 border border-slate-855 rounded-full flex items-center justify-center font-mono text-amber-500 text-[11px] font-black">{secondsLeft}</span>
                      </div>
                    )}

                    <div className="space-y-6">
                      {secondsLeft > 0 ? (
                        // Watch with circular progress countdown
                        <div className="flex flex-col items-center justify-center space-y-6">
                          {/* Circle Progress Timer */}
                          <div className="relative h-24 w-24 flex items-center justify-center select-none">
                            <svg className="w-full h-full transform -rotate-90" viewBox="0 0 96 96">
                              {/* Track */}
                              <circle
                                cx="48"
                                cy="48"
                                r="42"
                                className="stroke-slate-800"
                                strokeWidth="5"
                                fill="transparent"
                              />
                              {/* Progress arc */}
                              <circle
                                cx="48"
                                cy="48"
                                r="42"
                                className="stroke-amber-500 transition-all duration-1000 ease-linear"
                                strokeWidth="5"
                                fill="transparent"
                                strokeDasharray={2 * Math.PI * 42}
                                strokeDashoffset={((15 - secondsLeft) / 15) * 2 * Math.PI * 42}
                                strokeLinecap="round"
                              />
                            </svg>
                            {/* Countdown numeral in absolute center */}
                            <div className="absolute inset-0 flex items-center justify-center">
                              <span className="text-3xl font-black font-sans text-amber-500">{secondsLeft}</span>
                            </div>
                          </div>

                          <div className="space-y-2">
                            <h4 className="text-lg font-extrabold text-white tracking-wide">Watching Ad...</h4>
                            <p className="text-xs text-slate-400 font-medium">
                              Please wait for the timer to complete
                            </p>
                          </div>
                        </div>
                      ) : (
                        // Reward Completed successfully state
                        <div className="flex flex-col items-center justify-center space-y-6">
                          <div className="bg-amber-500/10 p-5 rounded-full border border-amber-500/20 max-w-max mx-auto shadow-lg shadow-amber-500/5">
                            <div className="relative">
                              <div className="absolute inset-0 bg-amber-500/30 rounded-full blur-md animate-pulse" />
                              <Gift className="h-10 w-10 text-amber-400 animate-bounce relative z-10" />
                            </div>
                          </div>

                          <div className="space-y-2">
                            <h4 className="text-lg font-black text-white tracking-wide">Reward Ready! 🎉</h4>
                            <p className="text-xs text-slate-400 font-medium">
                              Claim your 0.1 THUNDERS now!
                            </p>
                          </div>

                          <div className="pt-2 w-full">
                            <button
                              onClick={claimAdGold}
                              disabled={claiming}
                              className="w-full sm:w-64 bg-amber-500 hover:bg-amber-400 text-slate-950 hover:scale-[1.02] active:scale-[0.98] transition-all font-black py-4 rounded-xl text-xs flex items-center justify-center space-x-2.5 mx-auto cursor-pointer shadow-lg shadow-amber-500/15"
                            >
                              {claiming ? (
                                <>
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                  <span>Crediting wallet...</span>
                                </>
                              ) : (
                                <>
                                  <Zap className="h-4 w-4 fill-current text-slate-950" />
                                  <span>Claim 0.1 ⚡</span>
                                </>
                              )}
                            </button>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Additional banners container beneath active ad viewing screen */}
                    {secondsLeft > 0 && (
                      <div className="border-t border-slate-800/60 pt-8 mt-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
                          <div className="bg-slate-950/40 p-4 rounded-2xl border border-slate-800/60 flex flex-col justify-center items-center min-h-[250px]">
                            <span className="text-[9px] text-slate-500 font-bold uppercase tracking-wider mb-2 select-none">Medium Box ad Unit</span>
                            <AdCodeRenderer html={banner300x250} sizeLabel="Rectangle 300x250" />
                          </div>
                          
                          <div className="bg-slate-950/40 p-4 rounded-2xl border border-slate-800/60 flex flex-col justify-center items-center min-h-[250px]">
                            <span className="text-[9px] text-slate-500 font-bold uppercase tracking-wider mb-2 select-none">Wide Skyscraper Unit</span>
                            <AdCodeRenderer html={banner160x600} sizeLabel="Skyscraper 160x600" />
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* RIGHT SIDEBAR AD TOWERS (Desktop XL+) */}
            <div className="hidden xl:flex xl:col-span-2 flex-col space-y-6 sticky top-24 select-none">
              <div className="bg-slate-900 border border-slate-800 p-4 rounded-3xl text-center space-y-3 shadow-xl">
                <span className="text-[9px] text-slate-500 font-bold uppercase tracking-wider block">Sponsor Sky Right</span>
                <div className="bg-slate-950/50 p-2 rounded-2xl border border-slate-855/60 overflow-hidden flex flex-col items-center">
                  <AdCodeRenderer html={banner160x600} sizeLabel="Skyscraper 160x600 Right" />
                </div>
              </div>

              <div className="bg-slate-900 border border-slate-800 p-4 rounded-3xl text-center space-y-3 shadow-xl">
                <span className="text-[9px] text-slate-500 font-bold uppercase tracking-wider block">Media Unit Right</span>
                <div className="bg-slate-950/50 p-2 rounded-2xl border border-slate-855/60 overflow-hidden flex flex-col items-center">
                  <AdCodeRenderer html={banner300x250} sizeLabel="Rectangle 300x250 Right" />
                </div>
              </div>
            </div>

          </div>
        </div>
      )}

      {activeTab === "shorteners" && (
        <div className="max-w-[1500px] mx-auto px-4 w-full">
          <div className="grid grid-cols-1 xl:grid-cols-12 gap-8 items-start">
            
            {/* LEFT SIDEBAR AD TOWERS */}
            <div className="hidden xl:flex xl:col-span-2 flex-col space-y-6 sticky top-24 select-none">
              <div className="bg-slate-900 border border-slate-800 p-4 rounded-3xl text-center space-y-3 shadow-xl">
                <span className="text-[9px] text-slate-500 font-bold uppercase tracking-wider block">Sponsor Sky Left</span>
                <div className="bg-slate-950/50 p-2 rounded-2xl border border-slate-850/60 overflow-hidden flex flex-col items-center">
                  <AdCodeRenderer html={banner160x600} sizeLabel="Skyscraper 160x600 Left" />
                </div>
              </div>
              
              <div className="bg-slate-900 border border-slate-800 p-4 rounded-3xl text-center space-y-3 shadow-xl">
                <span className="text-[9px] text-slate-500 font-bold uppercase tracking-wider block">Media Unit Left</span>
                <div className="bg-slate-950/50 p-2 rounded-2xl border border-slate-850/60 overflow-hidden flex flex-col items-center">
                  <AdCodeRenderer html={banner300x250} sizeLabel="Rectangle 300x250 Left" />
                </div>
              </div>
            </div>

            {/* CENTRAL MAIN SHORTENERS LIST */}
            <div className="col-span-12 xl:col-span-8 space-y-8">
              {/* Coin Balance Panel */}
              <div className="bg-slate-900 border border-slate-800 p-6 rounded-3xl flex items-center justify-between gap-4 shadow-xl select-none">
                <div className="flex items-center space-x-4">
                  <div className="bg-slate-950/60 p-4 rounded-2xl flex items-center justify-center border border-slate-800/80">
                    <Zap className="h-6 w-6 text-emerald-400 fill-current" />
                  </div>
                  <div>
                    <span className="text-xs text-slate-400 block uppercase font-mono tracking-wider">Your Balance</span>
                    <span className="text-2xl font-black text-white block mt-0.5">{user.coins} THUNDERS</span>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-xs text-slate-400 block uppercase font-mono tracking-wider">Claim Type</span>
                  <span className="text-xs font-bold text-amber-500 uppercase tracking-wide bg-amber-950/20 border border-amber-900/60 px-3 py-1 rounded-full inline-block mt-1">Unlimited Shorteners</span>
                </div>
              </div>

              <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 md:p-8 space-y-6 shadow-xl relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 blur-[60px] rounded-full pointer-events-none" />
                <div>
                  <h2 className="text-xl md:text-2xl font-black text-white flex items-center space-x-2">
                    <Link className="h-5 w-5 text-emerald-400" />
                    <span>Shortlinks Tasks</span>
                  </h2>
                  <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                    Instantly load and complete URL shortener bypass campaigns to credit your dashboard wallet. Look out for different reward values and maximum daily complete limits per shortener!
                  </p>
                </div>

                {shorteners.length === 0 ? (
                  <div className="bg-slate-950/40 border border-slate-800/60 rounded-2xl p-12 text-center text-slate-500 text-sm">
                    ⚠️ Support teams haven't registered any URL Shortener options yet. Admins can configure these in the Admin Panel.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {shorteners.map((sh) => (
                      <div
                        key={sh.id}
                        className="bg-slate-950 border border-slate-850/80 p-5 rounded-2xl flex flex-col justify-between space-y-4 hover:border-slate-700/60 transition"
                      >
                        <div className="space-y-1">
                          <span className="text-xs text-slate-500 block">Sponsor Offer</span>
                          <h4 className="font-bold text-md text-white">{sh.name}</h4>
                          <div className="flex flex-wrap gap-1.5 mt-2">
                            <span className="text-[11px] font-semibold text-emerald-400 bg-emerald-950/30 border border-emerald-900/30 px-2 py-0.5 rounded inline-block">
                              Reward: {sh.reward !== undefined ? sh.reward.toFixed(1) : "1.0"} THUNDERS
                            </span>
                            <span className="text-[11px] font-semibold text-amber-500 bg-amber-950/30 border border-amber-900/30 px-2 py-0.5 rounded inline-block">
                              Views: {sh.completedTodayCount || 0} / {sh.viewsLimit || 1} Used
                            </span>
                          </div>
                        </div>

                        {sh.completedToday ? (
                          <div className="bg-slate-900 border border-slate-800/80 py-3 px-4 rounded-xl text-center select-none">
                            <span className="text-xs text-slate-500 font-bold flex items-center justify-center space-x-1.5">
                              <Check className="h-4 w-4 text-emerald-500" />
                              <span>Completed (Wait Daily Refresh)</span>
                            </span>
                          </div>
                        ) : (
                          <button
                            onClick={async () => {
                              try {
                                setGeneratingShortenerId(sh.id);
                                const res = await api.generateShortenerLink(sh.id);
                                setActivePromoShortener({
                                  ...sh,
                                  shortenedUrl: res.shortenedUrl
                                });
                              } catch (err: any) {
                                onServerNotification("Failed to generate link", err.message, "danger");
                              } finally {
                                setGeneratingShortenerId(null);
                              }
                            }}
                            disabled={generatingShortenerId !== null}
                            className="w-full bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-xs font-bold py-3 rounded-xl transition cursor-pointer flex items-center justify-center space-x-2"
                          >
                            {generatingShortenerId === sh.id ? (
                              <>
                                <Loader2 className="h-4.5 w-4.5 animate-spin" />
                                <span>Securing Adrino Link...</span>
                              </>
                            ) : (
                              <>
                                <Link className="h-4 w-4" />
                                <span>Complete Earning Shortener</span>
                              </>
                            )}
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* RIGHT SIDEBAR AD TOWERS */}
            <div className="hidden xl:flex xl:col-span-2 flex-col space-y-6 sticky top-24 select-none">
              <div className="bg-slate-900 border border-slate-800 p-4 rounded-3xl text-center space-y-3 shadow-xl">
                <span className="text-[9px] text-slate-500 font-bold uppercase tracking-wider block">Sponsor Sky Right</span>
                <div className="bg-slate-950/50 p-2 rounded-2xl border border-slate-855/60 overflow-hidden flex flex-col items-center">
                  <AdCodeRenderer html={banner160x600} sizeLabel="Skyscraper 160x600 Right" />
                </div>
              </div>

              <div className="bg-slate-900 border border-slate-800 p-4 rounded-3xl text-center space-y-3 shadow-xl">
                <span className="text-[9px] text-slate-500 font-bold uppercase tracking-wider block">Media Unit Right</span>
                <div className="bg-slate-950/50 p-2 rounded-2xl border border-slate-855/60 overflow-hidden flex flex-col items-center">
                  <AdCodeRenderer html={banner300x250} sizeLabel="Rectangle 300x250 Right" />
                </div>
              </div>
            </div>

          </div>
        </div>
      )}

      {upgradeServerId && (() => {
        const tgtServer = servers.find(s => s.id === upgradeServerId);
        if (!tgtServer) return null;
        const isBot = tgtServer.serverType === "bot";
        const currentPlanId = tgtServer.planId || 1;

        const getUpgradePriceDiff = (targetPlanId: number) => {
          let currentPrice = 1;
          if (currentPlanId === 2) currentPrice = 2;
          if (currentPlanId === 3) currentPrice = 3;
          if (currentPlanId === 4) currentPrice = 4;

          let targetPrice = 1;
          if (targetPlanId === 2) targetPrice = 2;
          if (targetPlanId === 3) targetPrice = 3;
          if (targetPlanId === 4) targetPrice = 4;

          return Math.max(0, targetPrice - currentPrice);
        };

        const minecraftPlans = [
          { planId: 2, name: "Plan 2 (Ultra)", ram: "8 GB", cpu: "200%", disk: "20 GB" },
          { planId: 3, name: "Plan 3 (Extreme)", ram: "12 GB", cpu: "300%", disk: "30 GB" },
        ];

        const botPlans = [
          { planId: 2, name: "Plan 2 (Advanced)", ram: "2 GB", cpu: "50%", disk: "4 GB" },
          { planId: 3, name: "Plan 3 (Pro)", ram: "3 GB", cpu: "75%", disk: "6 GB" },
          { planId: 4, name: "Plan 4 (Max Power)", ram: "4 GB", cpu: "100%", disk: "8 GB" },
        ];

        const availablePlans = isBot ? botPlans : minecraftPlans;

        return (
          <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in select-none">
            <div className="bg-slate-900 border border-slate-800 p-6 md:p-8 rounded-3xl max-w-lg w-full space-y-6 shadow-2xl relative">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-black text-white uppercase tracking-wide flex items-center gap-2">
                    <Zap className="h-5 w-5 text-yellow-500 fill-current animate-pulse" />
                    <span>Boost Specifications</span>
                  </h3>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Upgrade machine allocations for "{tgtServer.name}" (Active: Tier {currentPlanId}) for 24 hours.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setUpgradeServerId(null)}
                  className="bg-slate-950/50 hover:bg-slate-855 p-2 rounded-xl border border-slate-800 text-slate-405 hover:text-slate-100 transition cursor-pointer"
                >
                  ✕
                </button>
              </div>

              <div className="space-y-4">
                {availablePlans.map((plan) => {
                  const coinCost = getUpgradePriceDiff(plan.planId);
                  const isCurrent = currentPlanId === plan.planId;
                  const canUpgrade = plan.planId > currentPlanId || (isBot && currentPlanId === 3 && plan.planId === 4);

                  return (
                    <div
                      key={plan.planId}
                      className={`flex items-center justify-between border p-4 rounded-2xl transition ${
                        isCurrent
                          ? "bg-blue-950/20 border-blue-500/30"
                          : !canUpgrade
                          ? "bg-slate-950/20 border-slate-900 opacity-40 select-none"
                          : "bg-slate-950 border-slate-850 hover:border-slate-700"
                      }`}
                    >
                      <div className="space-y-1 text-left">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-black text-white">{plan.name}</span>
                          {isCurrent && (
                            <span className="bg-blue-600/10 text-blue-400 text-[9px] px-1.5 py-0.5 rounded border border-blue-500/20 font-bold uppercase">Running</span>
                          )}
                        </div>
                        <div className="flex items-center space-x-2 text-[11px] text-slate-400 font-mono">
                          <span>{plan.ram} Ram</span>
                          <span>•</span>
                          <span>{plan.cpu} Cpu</span>
                          <span>•</span>
                          <span>{plan.disk} Disk</span>
                        </div>
                      </div>

                      <div>
                        {isCurrent ? (
                          <span className="text-xs text-blue-400 font-bold">Active</span>
                        ) : !canUpgrade ? (
                          <span className="text-xs text-slate-500 uppercase tracking-wide">Included</span>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleUpgrade(tgtServer.id, plan.planId)}
                            disabled={isUpgradeLoading}
                            className="bg-gradient-to-r from-amber-600 to-yellow-500 hover:from-amber-500 hover:to-yellow-400 text-white font-bold px-4 py-2 rounded-xl text-xs flex items-center gap-1.5 transition cursor-pointer shadow-md shadow-amber-500/10"
                          >
                            {isUpgradeLoading ? (
                              <Loader2 className="h-3 w-3 animate-spin" />
                            ) : (
                              <Zap className="h-3 w-3 fill-current animate-bounce" />
                            )}
                            <span>{coinCost === 0 ? "Upgrade Free" : `${coinCost} Coin${coinCost !== 1 ? "s" : ""}`}</span>
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="bg-slate-950 border border-slate-855/70 p-4 rounded-xl text-xs space-y-1.5 text-slate-400 text-left font-medium">
                <p className="leading-relaxed leading-5">
                  💡 <strong>How plan upgrade logic works:</strong> Upgrades are charged based on the coin difference between your current specifications tier and the targeted tier. The upgraded specifications remain active until the node's next manual renew or daily renewal cycle, which resets specs back to Tier 1 default specs.
                </p>
              </div>
            </div>
          </div>
        );
      })()}

      {renewServerId && (() => {
        const tgtServer = servers.find(s => s.id === renewServerId);
        if (!tgtServer) return null;
        const currentPlanId = tgtServer.planId || 1;
        const upgradedPrice = currentPlanId === 2 ? 2.0 : 3.0;
        const isBot = tgtServer.serverType === "bot";
        const renewTimeText = isBot ? "3 days" : "24 hours";

        return (
          <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in select-none">
            <div className="bg-slate-900 border border-slate-800 p-6 md:p-8 rounded-3xl max-w-lg w-full space-y-6 shadow-2xl relative">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-black text-white uppercase tracking-wide flex items-center gap-2">
                    <RotateCw className="h-5 w-5 text-blue-500 animate-spin" style={{ animationDuration: "3s" }} />
                    <span>Choose Renewal Option</span>
                  </h3>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Your server "{tgtServer.name}" is currently on an upgraded resource plan (Tier {currentPlanId}).
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setRenewServerId(null)}
                  className="bg-slate-950/50 hover:bg-slate-800 p-2 rounded-xl border border-slate-800 text-slate-400 hover:text-white transition cursor-pointer"
                >
                  ✕
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Option 1: Renew with Upgraded Specs */}
                <div className="border border-slate-800 bg-slate-950 p-5 rounded-2xl flex flex-col justify-between space-y-4">
                  <div className="space-y-2 text-left">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-black text-yellow-400 uppercase tracking-wider">Keep Upgraded</span>
                      <span className="bg-yellow-500/10 text-yellow-500 text-[9px] px-1.5 py-0.5 rounded border border-yellow-505/20 font-mono font-bold">{upgradedPrice} Coins</span>
                    </div>
                    <p className="text-[11.5px] text-slate-300 leading-relaxed font-sans">
                      Renew your slot for {renewTimeText} preserving the current boosted specifications. Your active tier (Tier {currentPlanId}) specs will be fully maintained.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleRenew(tgtServer.id, "upgraded", true)}
                    className="w-full bg-gradient-to-r from-amber-600 to-yellow-500 hover:from-amber-500 hover:to-yellow-400 text-white font-bold py-2.5 rounded-xl text-xs transition cursor-pointer flex items-center justify-center gap-1"
                  >
                    <Zap className="h-3 w-3 fill-current animate-pulse" />
                    <span>Maintain Upgrade</span>
                  </button>
                </div>

                {/* Option 2: Renew on Default Plan */}
                <div className="border border-slate-800 bg-slate-950/45 p-5 rounded-2xl flex flex-col justify-between space-y-4">
                  <div className="space-y-2 text-left">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-black text-slate-450 uppercase tracking-wider">Revert to Default</span>
                      <span className="bg-blue-500/10 text-blue-400 text-[9px] px-1.5 py-0.5 rounded border border-blue-500/20 font-mono font-bold">1.0 Coin</span>
                    </div>
                    <p className="text-[11.5px] text-slate-400 leading-relaxed font-sans">
                      Deduct standard 1.0 Coin. The server will stay on upgraded specifications until the current 24-hour upgrade expires, then revert back to default specs.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleRenew(tgtServer.id, "default", true)}
                    className="w-full bg-slate-800 hover:bg-slate-700 text-white font-bold py-2.5 rounded-xl text-xs transition cursor-pointer flex items-center justify-center gap-1"
                  >
                    <RotateCw className="h-3 w-3" />
                    <span>Renew Default specs</span>
                  </button>
                </div>
              </div>

              <div className="bg-slate-950 border border-slate-800/70 p-4 rounded-xl text-xs text-left leading-relaxed leading-5 text-slate-400">
                💡 <strong>Under the Hood:</strong> Choosing to renew as standard default allows you to enjoy upgraded specifications for the remainder of their original 24-hour duration without paying the upgraded slot renewal price for tomorrow!
              </div>
            </div>
          </div>
        );
      })()}

      {/* SECURE SHORTENER PROPOSAL IFRAME popup-blocker BYPASS MODAL */}
      {activePromoShortener && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in select-none">
          <div className="bg-slate-900 border border-slate-800 p-6 md:p-8 rounded-3xl max-w-md w-full space-y-6 shadow-2xl relative">
            <span className="absolute -top-3 -right-3 text-3xl animate-bounce">🔗</span>
            <div className="space-y-4 text-center">
              <h3 className="text-xl font-black text-white uppercase tracking-wide">
                Your Link is Ready!
              </h3>
              <p className="text-xs text-slate-400 leading-relaxed leading-5">
                We've generated your secure offer key via our partnered verification system. Click the link button below to complete the shortener captcha challenge tasks. Once successfully bypassed, you'll be redirected instantly to redeem your <strong>{activePromoShortener.reward !== undefined ? activePromoShortener.reward.toFixed(1) : "1.0"} THUNDERS</strong>!
              </p>
            </div>

            <div className="bg-slate-950 border border-slate-855/70 p-4 rounded-xl text-xs space-y-2 select-none text-left">
              <div className="flex items-center space-x-2 text-slate-400">
                <span className="text-blue-500 font-bold">1.</span>
                <span>Click the green "Open Redirect Link" button.</span>
              </div>
              <div className="flex items-center space-x-2 text-slate-400">
                <span className="text-blue-500 font-bold">2.</span>
                <span>Pass Captcha challenges or popups on partner page.</span>
              </div>
              <div className="flex items-center space-x-2 text-slate-400">
                <span className="text-blue-500 font-bold">3.</span>
                <span>Wait to automatically load and return back fully credited!</span>
              </div>
            </div>

            <div className="flex gap-4">
              <button
                onClick={() => setActivePromoShortener(null)}
                className="flex-1 bg-slate-800 hover:bg-slate-700 text-slate-350 text-xs font-bold py-3.5 rounded-xl cursor-pointer"
              >
                Cancel Task
              </button>
              <a
                href={activePromoShortener.shortenedUrl}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => setActivePromoShortener(null)}
                className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold py-3.5 rounded-xl text-center block cursor-pointer flex items-center justify-center space-x-2"
              >
                <span>Open Redirect Link</span>
              </a>
            </div>
          </div>
        </div>
      )}

      {/* SUCCESS DEPLOYMENT CREDENTIALS MODAL */}
      {lastDeployedCredentials && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-lg p-6 md:p-8 shadow-2xl relative overflow-hidden font-sans">
            {/* Background decor */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 blur-[60px] rounded-full pointer-events-none" />
            <div className="absolute bottom-0 left-0 w-32 h-32 bg-amber-500/5 blur-[60px] rounded-full pointer-events-none" />

            <div className="flex flex-col items-center text-center space-y-4">
              <div className="h-14 w-14 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                <Check className="h-7 w-7 text-emerald-400" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-white uppercase tracking-normal">
                  🚀 Provision Success!
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                  Your node <strong className="text-slate-200">"{lastDeployedCredentials.name}"</strong> is deploying. Use the login details below:
                </p>
              </div>
            </div>

            <div className="space-y-4 mt-6">
              {/* Panel Link */}
              <div className="bg-slate-950/45 border border-slate-850 p-3 rounded-2xl flex flex-col gap-1">
                <div className="flex items-center justify-between text-[10px] text-slate-500 font-bold uppercase tracking-wider">
                  <span>Panel Address</span>
                  <a 
                    href={lastDeployedCredentials.panelUrl} 
                    target="_blank" 
                    rel="noreferrer" 
                    className="text-blue-450 hover:text-blue-400 flex items-center space-x-1"
                  >
                    <span>Open Panel</span>
                    <ExternalLink className="h-2.5 w-2.5" />
                  </a>
                </div>
                <div className="flex items-center justify-between mt-1">
                  <span className="text-[12px] font-mono text-slate-300 break-all select-all truncate">
                    {lastDeployedCredentials.panelUrl}
                  </span>
                  <button
                    onClick={() => handleCopyText(lastDeployedCredentials.panelUrl, "deployed_panel_url")}
                    className="p-1.5 hover:bg-slate-800/80 rounded-lg text-slate-400 hover:text-slate-200 transition cursor-pointer"
                  >
                    {copiedMap["deployed_panel_url"] ? (
                      <Check className="h-3.5 w-3.5 text-emerald-400" />
                    ) : (
                      <Copy className="h-3.5 w-3.5" />
                    )}
                  </button>
                </div>
              </div>

              {/* Username */}
              <div className="bg-slate-950/45 border border-slate-850 p-3 rounded-2xl flex flex-col gap-1">
                <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">Username</span>
                <div className="flex items-center justify-between mt-1">
                  <span className="text-[12px] font-mono text-slate-200 font-bold select-all">
                    {lastDeployedCredentials.username}
                  </span>
                  <button
                    onClick={() => handleCopyText(lastDeployedCredentials.username, "deployed_username")}
                    className="p-1.5 hover:bg-slate-800/80 rounded-lg text-slate-400 hover:text-slate-200 transition cursor-pointer"
                  >
                    {copiedMap["deployed_username"] ? (
                      <Check className="h-3.5 w-3.5 text-emerald-400" />
                    ) : (
                      <Copy className="h-3.5 w-3.5" />
                    )}
                  </button>
                </div>
              </div>

              {/* Password */}
              <div className="bg-slate-950/45 border border-slate-850 p-3 rounded-2xl flex flex-col gap-1 relative bg-gradient-to-r from-slate-950/45 to-amber-950/5">
                <span className="text-[10px] text-amber-400/80 font-bold uppercase tracking-wider block">Password</span>
                <div className="flex items-center justify-between mt-1">
                  <span className="text-[14px] font-mono text-amber-400 font-black tracking-wide select-all">
                    {lastDeployedCredentials.password || "(Use your existing panel password)"}
                  </span>
                  <button
                    onClick={() => handleCopyText(lastDeployedCredentials.password || "", "deployed_password")}
                    className="p-1.5 hover:bg-slate-800/80 rounded-lg text-slate-400 hover:text-slate-200 transition cursor-pointer"
                  >
                    {copiedMap["deployed_password"] ? (
                      <Check className="h-3.5 w-3.5 text-emerald-400" />
                    ) : (
                      <Copy className="h-3.5 w-3.5" />
                    )}
                  </button>
                </div>
              </div>
            </div>

            <div className="bg-amber-950/20 border border-amber-900/30 rounded-2xl p-4 text-[11px] text-slate-400 leading-normal mt-5 flex gap-2">
              <span className="text-sm select-none">💡</span>
              <span>
                <strong>First-time order:</strong> This password has been reset/created for you in the panel! Use it to login.<br/>
                <strong>Subsequent order:</strong> Your password remains unchanged (same password as your previous instances).
              </span>
            </div>

            <button
              onClick={() => setLastDeployedCredentials(null)}
              className="w-full mt-6 bg-slate-800 hover:bg-slate-700 border border-slate-700 hover:border-slate-600 transition py-3 px-4 rounded-2xl text-xs font-bold text-slate-200 cursor-pointer"
            >
              Continue to Dashboard
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
