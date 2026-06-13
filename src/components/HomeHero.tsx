import { Zap, Cpu, HardDrive, ShieldCheck, Gamepad2 } from "lucide-react";

interface HomeHeroProps {
  onJoin: () => void;
  user: any;
  onNavigate: (view: "home" | "dashboard" | "admin") => void;
}

export default function HomeHero({ onJoin, user, onNavigate }: HomeHeroProps) {
  return (
    <div className="relative min-h-[92vh] flex flex-col items-center justify-between bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-blue-950/20 via-slate-950 to-slate-950 text-center px-4 overflow-hidden">
      
      {/* Background glowing particles/decoratives (avoid slop, keeps it artistic) */}
      <div className="absolute top-10 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-blue-600/10 blur-[130px] rounded-full pointer-events-none" />
      <div className="absolute bottom-20 right-10 w-[300px] h-[150px] bg-cyan-600/5 blur-[100px] rounded-full pointer-events-none" />

      {/* Hero content area */}
      <div className="flex-1 flex flex-col items-center justify-center max-w-4xl pt-16 pb-12 z-10">
        
        {/* Sleek launcher badge */}
        <div className="inline-flex items-center space-x-2 bg-slate-900 border border-slate-800 rounded-full px-4 py-1.5 text-xs text-blue-400 font-semibold mb-6 uppercase tracking-wider shadow-md">
          <Zap className="h-3.5 w-3.5 fill-current text-blue-400" />
          <span>True Multi-Egg Free Hosting</span>
        </div>

        {/* Big Displays Title */}
        <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight text-white leading-tight">
          ThunderHost
          <span className="block mt-2 bg-gradient-to-r from-blue-400 via-sky-400 to-cyan-300 bg-clip-text text-transparent">
            Performance Hosting
          </span>
        </h1>

        {/* Real description text matching screenshot exactly */}
        <p className="mt-6 text-slate-300 text-base md:text-lg max-w-2xl leading-relaxed">
          Cheapest plans. Best uptime. Lag-free performance powered by AMD Ryzen 9900X processors and NVMe SSD storage. A Place Where Performance And Uptime Matters.
        </p>

        {/* Core CTA Actions */}
        <div className="mt-10 flex flex-col sm:flex-row items-center gap-4">
          <button
            onClick={() => {
              if (user) {
                onNavigate("dashboard");
              } else {
                onJoin();
              }
            }}
            className="w-full sm:w-auto bg-blue-600 hover:bg-blue-500 text-white font-bold px-8 py-3.5 rounded-xl transition duration-300 hover:scale-[1.02] shadow-[0_4px_20px_rgba(37,99,235,0.4)]"
          >
            VIEW PLANS
          </button>
          
          <button
            onClick={onJoin}
            className="w-full sm:w-auto bg-slate-900 hover:bg-slate-800 text-white border border-slate-800 hover:border-slate-700 font-bold px-8 py-3.5 rounded-xl transition duration-300"
          >
            REGISTER NOW
          </button>

          <a
            href="https://discord.gg/XYZ3EqwrrF"
            target="_blank"
            rel="noreferrer"
            className="w-full sm:w-auto bg-[#5865F2] hover:bg-[#4752C4] text-white font-bold px-8 py-3.5 rounded-xl transition duration-300 flex items-center justify-center space-x-2"
          >
            <span>DISCORD</span>
          </a>
        </div>
      </div>

      {/* Plan highlight block (Only Free, as requested) */}
      <div id="plans" className="w-full max-w-5xl mx-auto pb-16 z-10 px-4">
        <div className="border-t border-slate-800 pt-10 mb-8">
          <h2 className="text-2xl font-bold text-white mb-2 tracking-wide">Extreme Free Hosting Plan</h2>
          <p className="text-slate-400 text-sm">Powered by ads watched in your dashboard. Zero hidden billing.</p>
        </div>

        <div className="grid grid-cols-1 max-w-md mx-auto bg-slate-900 border border-slate-800 rounded-3xl p-6 relative group shadow-xl transition-all duration-350">
          {/* Active status bar */}
          <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-gradient-to-r from-blue-600 to-cyan-500 text-white text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-wider shadow-[0_0_15px_rgba(37,99,235,0.4)]">
            FREE SERVER PLAN
          </div>

          <div className="text-center mt-3 pb-5 border-b border-slate-800">
            <span className="text-3xl font-extrabold text-white">Starter Free</span>
            <div className="mt-2 text-yellow-550 font-bold flex items-center justify-center space-x-1">
              <Zap className="h-4 w-4 fill-current text-yellow-500" />
              <span>1 THUNDERS / Day</span>
            </div>
            <p className="text-slate-400 text-xs mt-1">Earn coins easily by watching short ads!</p>
          </div>

          {/* Allocation details */}
          <div className="py-6 space-y-4 text-left">
            <div className="flex items-center space-x-3">
              <div className="p-1.5 rounded-lg bg-slate-800 text-blue-400 border border-slate-700 shadow-inner">
                <Cpu className="h-4 w-4" />
              </div>
              <div className="flex-1">
                <span className="text-slate-300 text-sm font-semibold block">100% CPU Share</span>
                <span className="text-slate-500 text-xs">Dedicated AMD Ryzen compute cycle</span>
              </div>
            </div>

            <div className="flex items-center space-x-3">
              <div className="p-1.5 rounded-lg bg-slate-800 text-blue-400 border border-slate-700 shadow-inner">
                <Gamepad2 className="h-4 w-4" />
              </div>
              <div className="flex-1">
                <span className="text-slate-300 text-sm font-semibold block">4 GB DDR4 Ram</span>
                <span className="text-slate-500 text-xs">Sufficient memory space for multiple players</span>
              </div>
            </div>

            <div className="flex items-center space-x-3">
              <div className="p-1.5 rounded-lg bg-slate-800 text-blue-400 border border-slate-700 shadow-inner">
                <HardDrive className="h-4 w-4" />
              </div>
              <div className="flex-1">
                <span className="text-slate-300 text-sm font-semibold block">10 GB NVMe Disk</span>
                <span className="text-slate-500 text-xs">Fast write speeds for heavy chunk generations</span>
              </div>
            </div>

            <div className="flex items-center space-x-3">
              <div className="p-1.5 rounded-lg bg-slate-800 text-blue-400 border border-slate-700 shadow-inner">
                <ShieldCheck className="h-4 w-4" />
              </div>
              <div className="flex-1">
                <span className="text-slate-300 text-sm font-semibold block">DDoS Protection</span>
                <span className="text-slate-500 text-xs">Permanent automated packet filtering</span>
              </div>
            </div>
          </div>

          <button
            onClick={() => {
              if (user) {
                onNavigate("dashboard");
              } else {
                onJoin();
              }
            }}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 rounded-xl transition duration-300 shadow-md shadow-blue-900/20"
          >
            Deploy Server
          </button>
        </div>
      </div>
    </div>
  );
}
