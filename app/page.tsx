
import Link from 'next/link';
import { ChartBarIcon, BuildingOfficeIcon, ArrowRightIcon, CheckCircleIcon } from '@heroicons/react/24/solid';

export default function WelcomePage() {
  return (
    <div className="min-h-screen bg-[#030712] flex flex-col justify-center relative overflow-hidden font-sans Selection:bg-purple-500/30">
      
      {/* Hyper-Vibrant Neon Backlighting */}
      <div className="absolute top-[-15%] right-[-5%] w-[50%] h-[50%] bg-purple-600/25 rounded-full blur-[140px] pointer-events-none animate-pulse duration-[6000ms]" />
      <div className="absolute bottom-[-15%] left-[-5%] w-[50%] h-[50%] bg-emerald-600/20 rounded-full blur-[140px] pointer-events-none animate-pulse duration-[8000ms]" />
      <div className="absolute top-[30%] left-[25%] w-[35%] h-[35%] bg-cyan-600/15 rounded-full blur-[120px] pointer-events-none" />

      <div className="p-6 sm:p-12 md:p-20 relative z-10 w-full max-w-7xl mx-auto">
        
        {/* HERO SECTION */}
        <div className="text-center mb-16 max-w-4xl mx-auto">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-900/80 ring-1 ring-slate-800 text-xs font-semibold text-purple-400 mb-6 backdrop-blur-md shadow-inner">
            <span className="flex h-2 w-2 rounded-full bg-purple-400 animate-ping" />
            Institutional Asset Management OS v2.0
          </div>
          <h1 className="text-5xl sm:text-6xl md:text-8xl font-black text-white mb-6 tracking-tight leading-none">
            Real Estate <br className="hidden sm:inline" />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 via-fuchsia-400 via-cyan-400 to-emerald-400 bg-[size:400%] animate-gradient">
              Intelligence Engine
            </span>
          </h1>
          <p className="text-base sm:text-lg md:text-xl text-slate-400 max-w-2xl mx-auto leading-relaxed font-medium">
            Deconstruct complex T12 accounting models and unpivot unstructured property rent rolls into instantaneous, production-ready diagnostic dashboards.
          </p>
        </div>

        {/* WORKSPACE SELECTION BENTO GRID */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-stretch w-full">
          
          {/* 1. FINANCIAL CONTROLLER WORKSPACE */}
          <div className="group relative rounded-3xl overflow-hidden bg-slate-950 border border-slate-900 hover:border-purple-500/50 transition-all duration-500 shadow-2xl hover:shadow-purple-500/10 flex flex-col justify-between">
            {/* Bright Neon Image Header with Custom Mask */}
            <div className="relative w-full h-52 sm:h-64 overflow-hidden">
              <img
                src="https://images.unsplash.com/photo-1543286386-2e659306cd6c?q=80&w=2070&auto=format&fit=crop"
                alt="Vibrant Data Financial Analytics Visualizer"
                className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-700 brightness-110 saturate-125"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/20 to-transparent" />
              {/* Floating Module Pill */}
              <div className="absolute bottom-4 left-6 px-3 py-1 rounded-md bg-purple-500/20 border border-purple-500/40 backdrop-blur-md text-purple-300 text-xs font-bold tracking-widest uppercase">
                T12 Accounting Layer
              </div>
            </div>

            {/* Core Workspace Information */}
            <div className="p-8 flex-1 flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-4 mb-4">
                  <div className="bg-purple-500/10 w-12 h-12 rounded-xl flex items-center justify-center ring-1 ring-purple-500/30">
                    <ChartBarIcon className="w-6 h-6 text-purple-400" />
                  </div>
                  <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-100">Financial Controller</h2>
                </div>
                <p className="text-slate-400 text-sm sm:text-base leading-relaxed font-medium mb-6">
                  Audits trailing ledger distributions. Automatically isolates and extracts net operational parameters, clearing away structural classification issues to stabilize your model.
                </p>

                {/* What Can Be Explored Breakdown */}
                <div className="border-t border-slate-900/60 pt-6 mb-8">
                  <p className="text-xs font-bold uppercase tracking-wider text-purple-400 mb-3">Available Operational Drills:</p>
                  <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {[
                      "Stabilized NOI Trend Trajectory",
                      "Operating Expense Ratio (OER)",
                      "3-Month Trailing Moving Averages",
                      "Below-the-Line CAPEX Separation",
                      "Granular OPEX Breakdown Donut",
                      "Historical Matrix Cashflow View"
                    ].map((feature, idx) => (
                      <li key={idx} className="flex items-center text-xs font-semibold text-slate-300 gap-2">
                        <CheckCircleIcon className="w-4 h-4 text-purple-500/80 shrink-0" />
                        {feature}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* Action Trigger Button */}
              <Link href="/financials" className="inline-flex items-center justify-center w-full py-4 px-6 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-sm tracking-wide transition-all duration-300 group/btn shadow-lg shadow-purple-600/20">
                Launch Financial Workspace
                <ArrowRightIcon className="w-4 h-4 ml-2 group-hover/btn:translate-x-1 transition-transform" />
              </Link>
            </div>
          </div>

          {/* 2. PROPERTY OPERATIONS WORKSPACE */}
          <div className="group relative rounded-3xl overflow-hidden bg-slate-950 border border-slate-900 hover:border-cyan-500/50 transition-all duration-500 shadow-2xl hover:shadow-cyan-500/10 flex flex-col justify-between">
            {/* Bright Architecture Image Header with Custom Mask */}
            <div className="relative w-full h-52 sm:h-64 overflow-hidden">
              <img
                src="https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?q=80&w=2070&auto=format&fit=crop"
                alt="Bright Modern Architectural Skyscraper High-rise Glass"
                className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-700 brightness-110 saturate-110"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/20 to-transparent" />
              {/* Floating Module Pill */}
              <div className="absolute bottom-4 left-6 px-3 py-1 rounded-md bg-cyan-500/20 border border-cyan-500/40 backdrop-blur-md text-cyan-300 text-xs font-bold tracking-widest uppercase">
                Rent Roll Operational Layer
              </div>
            </div>

            {/* Core Workspace Information */}
            <div className="p-8 flex-1 flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-4 mb-4">
                  <div className="bg-cyan-500/10 w-12 h-12 rounded-xl flex items-center justify-center ring-1 ring-cyan-500/30">
                    <BuildingOfficeIcon className="w-6 h-6 text-cyan-400" />
                  </div>
                  <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-100">Property Operations</h2>
                </div>
                <p className="text-slate-400 text-sm sm:text-base leading-relaxed font-medium mb-6">
                  Pivots individual tenant lease data into asset health signals. Monitors underlying revenue risk, lease-up velocities, and baseline property vacancy parameters.
                </p>

                {/* What Can Be Explored Breakdown */}
                <div className="border-t border-slate-900/60 pt-6 mb-8">
                  <p className="text-xs font-bold uppercase tracking-wider text-cyan-400 mb-3">Available Operational Drills:</p>
                  <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {[
                      "Physical & Economic Occupancy",
                      "Lease Expiration Exposure Ring",
                      "Average Unit Type Rental Mix",
                      "12-Month Move-In Velocity Trends",
                      "Non-Revenue Unit Allocation Logs",
                      "Aged Delinquency Balance Rankings"
                    ].map((feature, idx) => (
                      <li key={idx} className="flex items-center text-xs font-semibold text-slate-300 gap-2">
                        <CheckCircleIcon className="w-4 h-4 text-cyan-500/80 shrink-0" />
                        {feature}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* Action Trigger Button */}
              <Link href="/operations" className="inline-flex items-center justify-center w-full py-4 px-6 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-slate-950 font-black text-sm tracking-wide transition-all duration-300 group/btn shadow-lg shadow-cyan-600/10">
                Launch Operations Workspace
                <ArrowRightIcon className="w-4 h-4 ml-2 group-hover/btn:translate-x-1 transition-transform" />
              </Link>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
