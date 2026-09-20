import './globals.css';
import Link from 'next/link';
import { ChartBarIcon, BuildingOfficeIcon, HomeIcon, ShieldCheckIcon } from '@heroicons/react/24/outline';

export const metadata = {
  title: 'PropTech Dashboard',
  description: 'Intelligent Asset Management',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body className="flex h-screen bg-slate-950 text-slate-200 overflow-hidden font-sans">
       
        {/* SIDEBAR NAVIGATION */}
        <aside className="w-56 bg-slate-900 border-r border-slate-800 flex flex-col hidden md:flex z-50 select-none">
          {/* Platform Branding Header */}
          <div className="p-6 border-b border-slate-800 flex items-center justify-center shrink-0">
            <h1 className="text-2xl font-bold tracking-widest text-white">
              PROP<span className="text-cyan-400">TECH</span>
            </h1>
          </div>
         
          {/* Main Workspace Navigation */}
          <nav className="p-4 space-y-2 mt-2">
            <Link href="/" className="flex items-center space-x-3 p-3 rounded-lg hover:bg-slate-800 text-slate-300 hover:text-white transition-colors group">
              <HomeIcon className="w-5 h-5 text-slate-400 group-hover:text-white transition-colors" />
              <span className="font-medium text-sm">Home</span>
            </Link>
           
            <Link href="/financials" className="flex items-center space-x-3 p-3 rounded-lg hover:bg-slate-800 text-slate-300 hover:text-emerald-400 transition-colors group">
              <ChartBarIcon className="w-5 h-5 text-emerald-500 group-hover:text-emerald-400 transition-colors" />
              <span className="font-medium text-sm">Financials (T12)</span>
            </Link>
           
            <Link href="/operations" className="flex items-center space-x-3 p-3 rounded-lg hover:bg-slate-800 text-slate-300 hover:text-cyan-400 transition-colors group">
              <BuildingOfficeIcon className="w-5 h-5 text-cyan-500 group-hover:text-cyan-400 transition-colors" />
              <span className="font-medium text-sm">Operations (RR)</span>
            </Link>
          </nav>

          {/* UPGRADE: Professional Compliance & Data Governance Widget */}
          <div className="mt-auto p-4 border-t border-slate-800/60 bg-slate-950/40">
            <div className="p-3 rounded-xl bg-slate-950 border border-slate-800/80 shadow-inner">
              
              {/* Header Header */}
              <div className="flex items-center gap-1.5 mb-2">
                <ShieldCheckIcon className="w-3.5 h-3.5 text-cyan-400" />
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Security & Core Scope</span>
              </div>
              
              {/* Core System Offering Text */}
              <p className="text-[10px] text-slate-400 leading-relaxed font-medium mb-2.5">
                Automated parsing engine mapping unstructured financial ledgers and operational rent rolls into atomic, multi-tenant database partitions.
              </p>
              
              {/* Institutional Data Usage & Compliance Parameters */}
              <div className="space-y-1.5 border-t border-slate-900 pt-2 text-[9px] text-slate-500 font-medium">
                <div className="flex items-center justify-between">
                  <span>Data Protection:</span>
                  <span className="text-emerald-400/90 font-semibold bg-emerald-500/10 px-1 rounded">SOC 2 Aligned</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Privacy Policy:</span>
                  <span className="text-slate-400 font-semibold">Zero LLM Training</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Ledger Isolation:</span>
                  <span className="text-slate-400 font-semibold">Row-Level Security</span>
                </div>
              </div>

            </div>
          </div>
         
          {/* Fixed Footer */}
          <div className="p-4 border-t border-slate-800/50 text-[10px] text-slate-500 font-medium text-center shrink-0 tracking-wide bg-slate-900">
            &copy; 2026 PropTech Asset Management OS
          </div>
        </aside>

        {/* MAIN CONTENT AREA */}
        <main className="flex-1 overflow-y-auto relative">
          {children}
        </main>

      </body>
    </html>
  );
}

