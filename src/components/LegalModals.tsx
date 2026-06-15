import { X } from "lucide-react";

interface LegalModalProps {
  type: "tos" | "privacy" | "about" | null;
  onClose: () => void;
}

export default function LegalModal({ type, onClose }: LegalModalProps) {
  if (!type) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md overflow-y-auto">
      <div className="relative bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-3xl max-h-[85vh] overflow-hidden flex flex-col shadow-2xl animate-in fade-in scaling-up duration-200">
        
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-800">
          <h2 className="text-lg font-black text-white flex items-center space-x-2">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500 shrink-0"></span>
            <span>
              {type === "tos" && "Terms of Service - ThunderHost"}
              {type === "privacy" && "Privacy Policy - ThunderHost"}
              {type === "about" && "About Us - ThunderHost"}
            </span>
          </h2>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg bg-slate-800/60 hover:bg-slate-700 text-slate-400 hover:text-white transition cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 md:p-8 space-y-6 text-sm text-slate-300 leading-relaxed font-sans">
          {type === "tos" && (
            <>
              <p className="text-xs text-slate-400">Last updated: June 15, 2026</p>
              
              <section className="space-y-2">
                <h3 className="font-bold text-white text-md">1. Acceptance of Terms</h3>
                <p>
                  Welcome to ThunderHost. By accessing our platform, registering an account, or deploying our 
                  Minecraft and Discord bot storage container slots, you agree to comply with and be bound by 
                  these Terms of Service. If you do not agree to these terms, please do not use our services.
                </p>
              </section>

              <section className="space-y-2">
                <h3 className="font-bold text-white text-md">2. Free Allocation & Thunder Coins</h3>
                <p>
                  ThunderHost provides high-performance servers through our system of Thunder Coins rewards. 
                  Users can generate Thunder Coins by completing optional ad-supported shorteners and tasks. 
                  These Coins are consumed proportionally based on your server tier. Thunder Coins hold no 
                  monetary value, cannot be redeemed for legal tender, and are strictly non-transferable.
                </p>
              </section>

              <section className="space-y-2">
                <h3 className="font-bold text-white text-md">3. Server Lifecycles & Suspension</h3>
                <p>
                  All containers have expiration intervals based on allocated time periods. If a user's wallet 
                  has insufficient coins at the billing tick, the server is suspended for 72 hours. Users must 
                  replenish their coins to reactivate the server. If a suspended server is not renewed within 72 
                  hours, the server, along with all internal files and databases, is permanently and irreversibly purged.
                </p>
              </section>

              <section className="space-y-2">
                <h3 className="font-bold text-white text-md">4. Prohibited Content and Conduct</h3>
                <p>
                  You agree that you will not host games or scripts that:
                </p>
                <ul className="list-disc pl-5 space-y-1 text-slate-400">
                  <li>Involves cryptomining, DDoS nodes, or scanning malicious ports</li>
                  <li>Infringes on intellectual property rights of third parties</li>
                  <li>Compromises the security of other virtual resource containers</li>
                  <li>Overloads our physical hardware (AMD Ryzen CPUs) through intentional exploits</li>
                </ul>
              </section>

              <section className="space-y-2">
                <h3 className="font-bold text-white text-md">5. Limitation of Liability</h3>
                <p>
                  All services are provided on an "as-is" and "as-available" basis. ThunderHost makes no warranties, 
                  expressed or implied, regarding uptime, data security, or file retention. Backups are the 
                  sole responsibility of the end-user.
                </p>
              </section>

              <section className="space-y-2">
                <h3 className="font-bold text-white text-md">6. Modifications to Service</h3>
                <p>
                  We reserve the right to modify or discontinue any part of our service, including pricing tiers, 
                  coin accrual rates, and Pterodactyl nodes configuration, at our sole discretion with or without notice.
                </p>
              </section>
            </>
          )}

          {type === "privacy" && (
            <>
              <p className="text-xs text-slate-400">Last updated: June 15, 2026</p>

              <section className="space-y-2">
                <h3 className="font-bold text-white text-md">1. Information We Collect</h3>
                <p>
                  ThunderHost collects minimal user data required for the operation of the platform. This includes:
                </p>
                <ul className="list-disc pl-5 space-y-1 text-slate-400">
                  <li>Your user email address and selected username.</li>
                  <li>Encrypted password hashes to protect authentication access.</li>
                  <li>Your registration IP address to prevent systematic abuse or double claims.</li>
                  <li>Performance statistics on any deployed Minecraft servers or Discord bots.</li>
                </ul>
              </section>

              <section className="space-y-2">
                <h3 className="font-bold text-white text-md">2. Use of Information</h3>
                <p>
                  Collected data is strictly used to manage your server containers, authenticate panels access, 
                  communicate notifications regarding server suspension, and improve our services. We do not sell or 
                  distribute your personal details to outside analytics platforms.
                </p>
              </section>

              <section className="space-y-2">
                <h3 className="font-bold text-white text-md">3. Cookies and Google AdSense Third-Party Advertising</h3>
                <p>
                  ThunderHost uses cookies to maintain active login sessions. Additionally, this site may implement 
                  Google AdSense or other third-party advertising vendors to display relevant sponsor ads.
                </p>
                <p className="text-slate-400 mt-2">
                  Please review the following mandated vendor disclosures:
                </p>
                <ul className="list-disc pl-5 space-y-1.5 text-slate-400">
                  <li>Third-party vendors, including Google, use cookies to serve ads based on a user's prior visits to our or other websites.</li>
                  <li>Google's use of advertising cookies enables it and its partners to serve ads to our users based on their visit to our sites and/or other sites on the Internet.</li>
                  <li>Users may opt-out of personalized advertising by visiting external settings pages such as <a href="https://www.google.com/settings/ads" target="_blank" rel="noopener noreferrer" className="text-blue-400 underline">Google Ad Settings</a>.</li>
                </ul>
              </section>

              <section className="space-y-2">
                <h3 className="font-bold text-white text-md">4. Data Security</h3>
                <p>
                  We implement robust industry-standard secure hashing procedures and HTTPS encryption transport layers 
                  to guard your private credentials against unauthorized access, loss, or disclosure.
                </p>
              </section>

              <section className="space-y-2">
                <h3 className="font-bold text-white text-md">5. User Choices</h3>
                <p>
                  You are entitled to export your saved files from your Pterodactyl configuration panel or request a 
                  permanent deletion of your ThunderHost registered user account by contacting support.
                </p>
              </section>
            </>
          )}

          {type === "about" && (
            <>
              <section className="space-y-3">
                <h3 className="font-bold text-white text-md">Who We Are</h3>
                <p>
                  ThunderHost is a community-driven, ultra-high-performance server hosting provider designed for gaming enthusiasts 
                  and Discord developer communities. Our core mission is simple: to make robust, lag-free server infrastructure 
                  accessible to everyone entirely free of charge.
                </p>
              </section>

              <section className="space-y-3">
                <h3 className="font-bold text-white text-md">High-Performance Infrastructure</h3>
                <p>
                  We do not compromise on hardware specifications. Every single client container we spin up is powered by 
                  top-tier physical processors, featuring **AMD Ryzen 9900X CPUs** accompanied by lightning-fast DDR5 RAM and enterprise 
                  NVMe SSD storage arrays. This ensures your gameplay experiences remain ultra-smooth, with reliable ticks per second 
                  (TPS) regardless of player count is reached.
                </p>
              </section>

              <section className="space-y-3">
                <h3 className="font-bold text-white text-md">Sustainable Ad-Supported Rewards</h3>
                <p>
                  By utilizing a lightweight, user-friendly ad-supported system, we form direct monetization channels representing 
                  sponsor clicks. This allows us to fund enterprise data centers directly without demanding monthly payments from 
                  young players or indie bot devs. You spend a few seconds completing shorteners, and we reward you with full Pterodactyl 
                  keys to deploy your custom worlds!
                </p>
              </section>

              <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 flex items-center space-x-3">
                <span className="text-amber-500 font-extrabold text-lg">⚡</span>
                <span className="text-xs text-slate-400 font-semibold">
                  ThunderHost is built by gamers, for gamers. Thank you for keeping our independent servers hosting alive!
                </span>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="p-5 border-t border-slate-800 bg-slate-950/40 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-blue-600 text-white hover:bg-blue-700 text-xs font-bold transition cursor-pointer"
          >
            Got it, thanks!
          </button>
        </div>

      </div>
    </div>
  );
}
