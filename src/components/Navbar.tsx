import { useState, useEffect } from "react";
import { Zap, Bell, LogIn, LogOut, Terminal, Shield, CheckCircle, AlertTriangle } from "lucide-react";
import { api } from "../api";
import { Notification } from "../types";

interface NavbarProps {
  user: any;
  onNavigate: (view: "home" | "dashboard" | "admin") => void;
  currentView: string;
  onOpenAuth: (mode: "login" | "register") => void;
  onLogout: () => void;
  notifications: Notification[];
  onNotificationRead: (id: string) => void;
  onNotificationClear: () => void;
}

export default function Navbar({
  user,
  onNavigate,
  currentView,
  onOpenAuth,
  onLogout,
  notifications,
  onNotificationRead,
  onNotificationClear
}: NavbarProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    setUnreadCount(notifications.filter(n => !n.isRead).length);
  }, [notifications]);

  return (
    <nav className="sticky top-0 z-50 bg-slate-900/90 backdrop-blur-md border-b border-slate-800 px-4 md:px-8 py-3.5 flex items-center justify-between">
      {/* Brand logo */}
      <div 
        className="flex items-center space-x-3 cursor-pointer group"
        onClick={() => onNavigate("home")}
      >
        <div className="w-9 h-9 rounded-xl overflow-hidden flex items-center justify-center border border-slate-700 bg-slate-850 shadow-[0_0_15px_rgba(59,130,246,0.2)] group-hover:border-blue-500 transition duration-300">
          <img 
            src="https://cdn.discordapp.com/avatars/1434488060082393218/9af2e6cc086882c507e21ea03a8bc553.webp?size=100" 
            alt="ThunderHost Logo" 
            className="w-full h-full object-cover"
            referrerPolicy="no-referrer"
          />
        </div>
        <span className="text-xl font-black tracking-tight text-white group-hover:text-blue-400 transition-colors">
          ThunderHost
        </span>
      </div>

      {/* Main navigation links */}
      <div className="hidden lg:flex items-center space-x-7 text-sm font-medium text-slate-400">
        <button 
          onClick={() => onNavigate("home")}
          className={`hover:text-white transition-colors ${currentView === "home" ? "text-blue-400" : ""}`}
        >
          Home
        </button>
        <a 
          href="https://discord.gg/XYZ3EqwrrF" 
          target="_blank" 
          rel="noreferrer" 
          className="hover:text-[#5865F2] transition-colors flex items-center space-x-1"
        >
          <span>Discord</span>
        </a>
      </div>

      {/* User Session actions & Wallet */}
      <div className="flex items-center space-x-2 sm:space-x-3">
        {user ? (
          <>
            {/* Live Thunder Coin indicator */}
            <div 
              onClick={() => onNavigate("dashboard")}
              className="flex items-center bg-slate-800 px-2.5 py-1.5 sm:px-4 sm:py-2 rounded-full border border-slate-700 shadow-inner text-xs sm:text-sm font-bold text-white cursor-pointer hover:bg-slate-700 transition shrink-0"
            >
              <Zap className="h-3.5 w-3.5 text-blue-400 mr-1 sm:mr-2" />
              <span>{user.coins}</span>
              <span className="ml-1.5 text-[10px] text-slate-400 uppercase tracking-tighter hidden sm:inline">THUNDERS</span>
            </div>

            {/* Admin trigger button if role corresponds */}
            {user.role === "admin" && (
              <button
                onClick={() => onNavigate("admin")}
                className={`bg-red-900/20 text-red-400 hover:bg-red-900/35 border border-red-500/20 px-2 py-1.5 sm:px-3 sm:py-1.5 rounded-xl transition text-xs sm:text-sm font-semibold flex items-center space-x-1 shrink-0 ${currentView === "admin" ? "bg-red-900/40 border-red-500" : ""}`}
              >
                <Shield className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Admin</span>
              </button>
            )}

            {/* Notifications Alert Bell */}
            <div className="relative shrink-0">
              <button 
                onClick={() => setIsOpen(!isOpen)}
                className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors relative"
              >
                <Bell className="h-4 w-4 sm:h-5 sm:w-5" />
                {unreadCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 h-3.5 w-3.5 bg-blue-500 text-white rounded-full flex items-center justify-center text-[9px] font-bold animate-pulse">
                    {unreadCount}
                  </span>
                )}
              </button>

              {/* Notification drop-down panel card */}
              {isOpen && (
                <div className="absolute right-0 mt-3 w-72 sm:w-80 max-h-96 overflow-y-auto bg-slate-900 border border-slate-800 rounded-xl shadow-2xl p-4 z-50 scrollbar-thin">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-2 mb-2">
                    <span className="font-semibold text-xs sm:text-sm text-slate-200">Server Alerts</span>
                    {notifications.length > 0 && (
                      <button 
                        onClick={() => {
                          onNotificationClear();
                          setIsOpen(false);
                        }}
                        className="text-[10px] text-slate-400 hover:text-red-400"
                      >
                        Clear All
                      </button>
                    )}
                  </div>

                  {notifications.length === 0 ? (
                    <div className="py-8 text-center text-xs text-slate-500">
                      No server alerts currently.
                    </div>
                  ) : (
                    <div className="space-y-2.5">
                      {notifications.map(item => (
                        <div 
                          key={item.id} 
                          onClick={() => {
                            onNotificationRead(item.id);
                          }}
                          className={`p-2.5 rounded-lg text-[11px] leading-relaxed transition-colors cursor-pointer border ${
                            item.isRead ? "bg-slate-950/20 border-slate-950" : "bg-blue-500/5 border-l-2 border-blue-500 rounded-r-lg"
                          }`}
                        >
                          <div className="flex items-start space-x-2">
                            <span className="mt-0.5 shrink-0">
                              {item.type === "success" && <CheckCircle className="h-3.5 w-3.5 text-blue-400" />}
                              {item.type === "warning" && <AlertTriangle className="h-3.5 w-3.5 text-amber-400" />}
                              {item.type === "danger" && <AlertTriangle className="h-3.5 w-3.5 text-red-400" />}
                              {item.type === "info" && <Zap className="h-3.5 w-3.5 text-blue-400" />}
                            </span>
                            <div className="flex-1">
                              <span className="font-bold text-slate-200 block">{item.title}</span>
                              <p className="text-slate-450 text-[10px] mt-0.5 leading-snug">{item.message}</p>
                              <span className="text-[8px] text-slate-500 block mt-1">
                                {new Date(item.createdAt).toLocaleTimeString()}
                              </span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* User dashboard navigation trigger */}
            <button
              onClick={() => onNavigate("dashboard")}
              className={`bg-blue-600/10 border border-blue-500/20 text-blue-400 hover:bg-blue-600/20 transition px-2.5 py-1.5 sm:px-3.5 sm:py-1.5 rounded-xl text-xs sm:text-sm font-bold flex items-center space-x-1 shrink-0 ${currentView === "dashboard" ? "bg-blue-600/25 border-blue-500 text-white" : ""}`}
            >
              <Terminal className="h-3.5 w-3.5 text-blue-400" />
              <span className="hidden sm:inline">Dashboard</span>
            </button>

            {/* Logout */}
            <button
              onClick={onLogout}
              title="Logout"
              className="p-1 text-slate-400 hover:text-red-400 rounded-lg hover:bg-slate-800 transition-colors shrink-0"
            >
              <LogOut className="h-4 w-4 sm:h-5 sm:w-5" />
            </button>
          </>
        ) : (
          <div className="flex items-center space-x-3">
            <button
              onClick={() => onOpenAuth("login")}
              className="text-slate-300 hover:text-white text-sm font-medium transition px-1.5 py-1.0"
            >
              Sign In
            </button>
            <button
              onClick={() => onOpenAuth("register")}
              className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-1.5 rounded-xl text-sm font-semibold transition shadow-md shadow-blue-900/20"
            >
              Register Now
            </button>
          </div>
        )}
      </div>
    </nav>
  );
}
