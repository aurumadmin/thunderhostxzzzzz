import { useState, useEffect } from "react";
import { Zap, AlertTriangle, CheckCircle, Info, X } from "lucide-react";
import Navbar from "./components/Navbar";
import HomeHero from "./components/HomeHero";
import AuthModal from "./components/AuthModal";
import Dashboard from "./components/Dashboard";
import AdminPanel from "./components/AdminPanel";
import LegalModal from "./components/LegalModals";
import { api } from "./api";
import { Notification, User } from "./types";

interface Toast {
  id: string;
  title: string;
  message: string;
  type: "success" | "warning" | "danger" | "info";
}

export default function App() {
  // Current user profiles state
  const [user, setUser] = useState<User | null>(null);
  const [legalModal, setLegalModal] = useState<"tos" | "privacy" | "about" | null>(null);
  const [view, setView] = useState<"home" | "dashboard" | "admin">("home");
  const [authModal, setAuthModal] = useState<{ isOpen: boolean; mode: "login" | "register" }>({
    isOpen: false,
    mode: "login"
  });

  // Client notifications and toast lists
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [toasts, setToasts] = useState<Toast[]>([]);

  // Show customized floating toast alerts
  const showToast = (
    title: string,
    message: string,
    type: "success" | "warning" | "danger" | "info" = "info"
  ) => {
    const nextToast: Toast = {
      id: Math.random().toString(36).substring(7),
      title,
      message,
      type
    };
    setToasts(prev => [...prev, nextToast]);
    // Auto erase toast after 5 seconds
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== nextToast.id));
    }, 5000);
  };

  // Sync profile checking on boot
  const verifySession = async () => {
    const savedToken = localStorage.getItem("th_token");
    if (!savedToken) return;

    try {
      const profile = await api.getProfile();
      setUser(profile);
      // Keep dashboard active if they reload
      const prevView = localStorage.getItem("th_view") as "home" | "dashboard" | "admin";
      if (prevView && ["home", "dashboard", "admin"].includes(prevView)) {
        // Enforce admin check for admin page
        if (prevView === "admin" && profile.role !== "admin") {
          setView("dashboard");
        } else {
          setView(prevView);
        }
      }
    } catch (_) {
      // Clear expired token session
      localStorage.removeItem("th_token");
      localStorage.removeItem("th_user");
    }
  };

  // Fetch alerts notifications
  const loadAlerts = async () => {
    if (!user) return;
    try {
      const list = await api.getNotifications();
      setNotifications(list);
    } catch (_) {}
  };

  useEffect(() => {
    verifySession();
  }, []);

  useEffect(() => {
    if (user) {
      loadAlerts();
      const interval = setInterval(loadAlerts, 10000); // Check every 10 seconds
      return () => clearInterval(interval);
    } else {
      setNotifications([]);
    }
  }, [user]);

  // Persist local navigation preference
  const handleNavigate = (targetView: "home" | "dashboard" | "admin") => {
    // block visitor if dashboard is requested
    if ((targetView === "dashboard" || targetView === "admin") && !user) {
      setAuthModal({ isOpen: true, mode: "login" });
      return;
    }
    if (targetView === "admin" && user?.role !== "admin") {
      setView("dashboard");
      return;
    }
    setView(targetView);
    localStorage.setItem("th_view", targetView);
  };

  const handleAuthSuccess = (authenticatedUser: User) => {
    setUser(authenticatedUser);
    showToast(
      "⚡ Welcome Back!",
      `Successfully signed in as ${authenticatedUser.username}`,
      "success"
    );
    // Redirect to management console
    setView("dashboard");
    localStorage.setItem("th_view", "dashboard");
  };

  const handleLogout = () => {
    api.logout();
    setUser(null);
    setView("home");
    localStorage.setItem("th_view", "home");
    showToast("Session Ended", "You have successfully logged out of ThunderHost.", "info");
  };

  const handleNotificationRead = async (id: string) => {
    try {
      await api.markNotificationRead(id);
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, isRead: true } : n));
    } catch (_) {}
  };

  const handleNotificationClear = async () => {
    try {
      await api.clearNotifications();
      setNotifications([]);
    } catch (_) {}
  };

  const handleForceRefreshUser = async () => {
    try {
      const profile = await api.getProfile();
      setUser(profile);
    } catch (_) {}
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-950 relative text-slate-200">
      
      {/* High-quality yellow-theme background video */}
      <div className="absolute inset-0 w-full h-full overflow-hidden pointer-events-none select-none z-0 opacity-[0.08]">
        <video
          autoPlay
          loop
          muted
          playsInline
          className="w-full h-full object-cover"
        >
          <source 
            src="https://assets.mixkit.co/videos/preview/mixkit-abstract-gold-particles-loop-32943-large.mp4" 
            type="video/mp4" 
          />
        </video>
      </div>

      {/* Visual background atmospheric layer - Yellow Theme */}
      <div className="absolute top-0 inset-x-0 h-[600px] bg-gradient-to-b from-amber-500/10 via-yellow-600/5 to-transparent pointer-events-none select-none z-0" />
      <div className="absolute top-[10%] left-[5%] w-[400px] h-[400px] bg-amber-500/5 blur-[120px] rounded-full pointer-events-none select-none z-0" />
      <div className="absolute top-[40%] right-[10%] w-[500px] h-[500px] bg-yellow-500/3 blur-[140px] rounded-full pointer-events-none select-none z-0" />

      {/* Navigation header */}
      <Navbar
        user={user}
        onNavigate={handleNavigate}
        currentView={view}
        onOpenAuth={(mode) => setAuthModal({ isOpen: true, mode })}
        onLogout={handleLogout}
        notifications={notifications}
        onNotificationRead={handleNotificationRead}
        onNotificationClear={handleNotificationClear}
      />

      {/* Main View Router */}
      <main className="flex-1">
        {view === "home" && (
          <HomeHero
            user={user}
            onJoin={() => setAuthModal({ isOpen: true, mode: "register" })}
            onNavigate={handleNavigate}
          />
        )}

        {view === "dashboard" && user && (
          <Dashboard
            user={user}
            onRefreshUser={handleForceRefreshUser}
            onServerNotification={(title, message, type) => showToast(title, message, type)}
          />
        )}

        {view === "admin" && user && user.role === "admin" && (
          <AdminPanel
            user={user}
            onRefreshUser={handleForceRefreshUser}
            onServerNotification={(title, message, type) => showToast(title, message, type)}
            onBackToDashboard={() => handleNavigate("dashboard")}
          />
        )}
      </main>

      {/* Modern High-Performance Footer */}
      <footer className="bg-slate-950 border-t border-slate-900 py-12 text-slate-400 font-sans mt-auto">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="flex flex-col items-center justify-center text-center space-y-6 md:space-y-7">
            
            {/* Logo Section */}
            <div className="flex items-center justify-center space-x-2.5">
              <img 
                src="https://cdn.discordapp.com/avatars/1434488060082393218/9af2e6cc086882c507e21ea03a8bc553.webp?size=100" 
                alt="ThunderHost Logo" 
                className="w-8 h-8 object-cover rounded-lg border border-slate-800 shadow-[0_0_15px_rgba(59,130,246,0.15)]"
                referrerPolicy="no-referrer"
              />
              <span className="text-lg font-extrabold tracking-tight text-white bg-gradient-to-r from-white via-slate-100 to-slate-300 bg-clip-text">
                ThunderHost
              </span>
            </div>
            
            {/* Unique Slogan text */}
            <p className="text-xs md:text-sm text-slate-400 max-w-xl font-medium leading-relaxed">
              Cheapest plans. Best uptime. Lag-free Minecraft server hosting powered by AMD Ryzen 9900X.
            </p>

            {/* Nav Menu Shortcuts */}
            <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-xs md:text-sm text-slate-500 font-semibold mb-2">
              <button 
                onClick={() => handleNavigate("home")} 
                className="hover:text-white transition-colors duration-200 focus:outline-none cursor-pointer"
              >
                Home
              </button>
              <button 
                onClick={() => {
                  handleNavigate("home");
                  setTimeout(() => {
                    const plansSection = document.getElementById("plans-section");
                    if (plansSection) {
                      plansSection.scrollIntoView({ behavior: "smooth" });
                    }
                  }, 100);
                }} 
                className="hover:text-white transition-colors duration-200 focus:outline-none cursor-pointer"
              >
                Plans
              </button>
              <button 
                onClick={() => setLegalModal("tos")} 
                className="hover:text-white transition-colors duration-200 focus:outline-none cursor-pointer"
              >
                Terms of Service
              </button>
              <button 
                onClick={() => setLegalModal("privacy")} 
                className="hover:text-white transition-colors duration-200 focus:outline-none cursor-pointer"
              >
                Privacy Policy
              </button>
              <button 
                onClick={() => setLegalModal("about")} 
                className="hover:text-white transition-colors duration-200 focus:outline-none cursor-pointer"
              >
                About Us
              </button>
              <a 
                href="https://discord.gg/XYZ3EqwrrF" 
                target="_blank" 
                rel="noopener noreferrer" 
                className="hover:text-white transition-colors duration-200 flex items-center space-x-1.5"
              >
                <svg className="w-4 h-4 fill-current text-[#5865F2]" viewBox="0 0 24 24">
                  <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994.021-.041.001-.09-.041-.106a13.094 13.094 0 0 1-1.873-.894.077.077 0 0 1-.008-.128c.126-.093.252-.19.372-.287a.075.075 0 0 1 .077-.011c3.92 1.793 8.18 1.793 12.061 0a.073.073 0 0 1 .078.009c.12.099.246.195.373.289a.075.075 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.894.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.156-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.156 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.156-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.156 2.418z" />
                </svg>
                <span>Discord</span>
              </a>
            </div>

            {/* Copyright */}
            <p className="text-[11px] text-slate-600 font-medium pt-2">
              © 2026 ThunderHost. All rights reserved.
            </p>

          </div>
        </div>
      </footer>

      {/* Dynamic Authorization Dialog Modal */}
      {authModal.isOpen && (
        <AuthModal
          initialMode={authModal.mode}
          onClose={() => setAuthModal({ isOpen: false, mode: "login" })}
          onSuccess={handleAuthSuccess}
        />
      )}

      {/* Sliding Toast Overlay Stack */}
      <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-3.5 max-w-sm w-full">
        {toasts.map(toast => (
          <div 
            key={toast.id}
            className={`p-4 rounded-xl border shadow-xl flex items-start space-x-3 transition-transform duration-300 transform translate-y-0 translate-x-0 ${
              toast.type === "success" ? "bg-emerald-950/90 border-emerald-500/40 text-emerald-300" :
              toast.type === "warning" ? "bg-amber-950/95 border-amber-500/40 text-amber-300" :
              toast.type === "danger" ? "bg-red-950/95 border-red-500/40 text-red-300" :
              "bg-blue-950/90 border-blue-500/40 text-sky-300"
            }`}
          >
            <span className="mt-0.5 shrink-0">
              {toast.type === "success" && <CheckCircle className="h-4 w-4" />}
              {toast.type === "warning" && <AlertTriangle className="h-4 w-4" />}
              {toast.type === "danger" && <AlertTriangle className="h-4 w-4" />}
              {toast.type === "info" && <Info className="h-4 w-4" />}
            </span>
            <div className="flex-1 min-w-0">
              <span className="font-bold text-xs block truncate">{toast.title}</span>
              <p className="text-[11px] leading-relaxed mt-0.5 opacity-90">{toast.message}</p>
            </div>
            <button 
              onClick={() => setToasts(prev => prev.filter(t => t.id !== toast.id))}
              className="text-slate-500 hover:text-white shrink-0 self-center"
            >
              <X className="h-4.5 w-4.5" />
            </button>
          </div>
        ))}
      </div>

      {/* Legal Compliance Modals (Terms, Privacy, About) */}
      <LegalModal type={legalModal} onClose={() => setLegalModal(null)} />

    </div>
  );
}
