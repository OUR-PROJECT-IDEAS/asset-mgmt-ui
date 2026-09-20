"use client";

import { useEffect, useState } from 'react';
import { Card } from '@tremor/react';
import { 
  PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, 
  ResponsiveContainer, CartesianGrid, Legend, AreaChart, Area, Line 
} from 'recharts';
import { 
  ExclamationTriangleIcon, 
  CheckCircleIcon, 
  ArrowTrendingUpIcon, 
  SparklesIcon, 
  ShieldExclamationIcon 
} from '@heroicons/react/24/solid';

// Hardcoded Hex Colors to ensure safety against Tailwind CSS compilation variations
const DONUT_COLORS = ['#8b5cf6', '#06b6d4', '#f43f5e', '#10b981', '#f59e0b', '#6366f1'];

export default function PropertyDashboard() {
  const [properties, setProperties] = useState<string[]>([]);
  const [selectedProperty, setSelectedProperty] = useState<string>('All Properties');
  const [chartData, setChartData] = useState<any[]>([]);
  const [donutData, setDonutData] = useState<any[]>([]);
  const [leaderboardData, setLeaderboardData] = useState<any[]>([]);
  const [summaryData, setSummaryData] = useState<any>({
    gross_market_rent: 0,
    total_concessions: 0,
    vacancy_losses: 0,
    bad_debt: 0,
    rubs_collected: 0,
    total_utility_expense: 0
  });
  const [totals, setTotals] = useState({ 
    revenue: 0, 
    expenses: 0, 
    noi: 0, 
    capex: 0, 
    netIncome: 0, 
    oerRate: 0, 
    noiMargin: 0 
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchProperties() {
      const res = await fetch('/api/properties');
      const data = await res.json();
      setProperties(data.map((p: any) => p.property_name));
    }
    fetchProperties();
  }, []);

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      const url = selectedProperty === 'All Properties'
        ? '/api/financials'
        : `/api/financials?property=${encodeURIComponent(selectedProperty)}`;

      const response = await fetch(url);
      const data = await response.json();
      
      // FIX: Defensive guard check blocks frontend rendering cycles if the 
      // database connectivity breaks or returns an error payload.
      if (data.error || !data.trend) {
        console.error("API Error Encountered:", data.error || "No trend data array returned");
        setChartData([]);
        setDonutData([]);
        setTotals({ revenue: 0, expenses: 0, noi: 0, capex: 0, netIncome: 0, oerRate: 0, noiMargin: 0 });
        setLoading(false);
        return;
      }

      let totalRev = 0; 
      let totalExp = 0; 
      let totalNoi = 0;
      let totalCapex = 0;

      const formattedTrend = data.trend.map((item: any, index: number, arr: any[]) => {
        const rev = parseFloat(item.revenue) || 0;
        const exp = parseFloat(item.expenses) || 0;
        const noi = parseFloat(item.net_operating_income) || 0;
        const cap = parseFloat(item.capex) || 0;
        const cf = parseFloat(item.net_cash_flow) || 0;
        const anomaly = parseFloat(item.audit_anomaly_delta) || 0;

        totalRev += rev;
        totalExp += exp;
        totalNoi += noi;
        totalCapex += cap;

        // Compute 3-Month Trailing Moving Average for chart smoothing
        const sliceStart = Math.max(0, index - 2);
        const historicalSubset = arr.slice(sliceStart, index + 1);
        const rollingAvgNoi = historicalSubset.reduce((sum, currentItem) => sum + (parseFloat(currentItem.net_operating_income) || 0), 0) / historicalSubset.length;

        const rawDate = item.period_date?.value !== undefined ? item.period_date.value : item.period_date;

        return {
          period_date: new Date(rawDate).toLocaleDateString('en-US', { month: 'short', year: 'numeric', timeZone: 'UTC' }),
          "Revenue": rev,
          "Expenses": exp,
          "NOI": noi,
          "CAPEX Adjustments": cap,
          "Net Cash Flow": cf,
          "NOI Running Avg": rollingAvgNoi,
          "Audit Delta": anomaly
        };
      });

      const calculatedOer = totalRev > 0 ? (totalExp / totalRev) * 100 : 0;
      const calculatedMargin = totalRev > 0 ? (totalNoi / totalRev) * 100 : 0;

      setTotals({ 
        revenue: totalRev, 
        expenses: totalExp, 
        noi: totalNoi,
        capex: totalCapex,
        netIncome: totalNoi - totalCapex,
        oerRate: calculatedOer,
        noiMargin: calculatedMargin
      });
      
      setChartData(formattedTrend);
      setDonutData(data.donut ? data.donut.map((i: any) => ({ name: i.name, value: parseFloat(i.value) })) : []);
      setSummaryData(data.summary || {
        gross_market_rent: 0,
        total_concessions: 0,
        vacancy_losses: 0,
        bad_debt: 0,
        rubs_collected: 0,
        total_utility_expense: 0
      });
      
      if (data.leaderboard) {
        setLeaderboardData(data.leaderboard.map((item: any) => ({
          property_name: item.property_name,
          revenue: parseFloat(item.revenue)
        })));
      }
      setLoading(false);
    }
    fetchData();
  }, [selectedProperty]);

  const formatMoney = (number: number) => {
    const isNegative = number < 0;
    const formatted = Intl.NumberFormat("en-US").format(Math.abs(number));
    return isNegative ? `-$${formatted}` : `$${formatted}`;
  };

  const formatAxis = (number: number) => {
    if (number === 0) return '$0';
    if (Math.abs(number) >= 1000000) return `$${(number / 1000000).toFixed(1)}M`;
    if (Math.abs(number) >= 1000) return `$${(number / 1000).toFixed(0)}k`;
    return `$${number}`;
  };

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-slate-800 ring-1 ring-slate-700 rounded-lg p-3 shadow-xl z-50">
          {label && <p className="text-slate-400 text-sm mb-2">{label}</p>}
          {payload.map((entry: any, index: number) => {
            const solidColor = entry.name === 'NOI' ? '#22d3ee' : entry.name === 'NOI Running Avg' ? '#f59e0b' : (entry.stroke || entry.color || '#f8fafc');
            return (
              <p key={index} style={{ color: solidColor }} className="font-bold text-sm">
                {entry.name}: {formatMoney(entry.value)}
              </p>
            );
          })}
        </div>
      );
    }
    return null;
  };

  const criticalAnomalies = chartData.filter(d => Math.abs(d["Audit Delta"]) > 1.00);

  const safeUtilityExpense = parseFloat(summaryData?.total_utility_expense) || 0;
  const safeRubsCollected = parseFloat(summaryData?.rubs_collected) || 0;
  const safeMarketRent = parseFloat(summaryData?.gross_market_rent) || 0;
  const safeConcessions = parseFloat(summaryData?.total_concessions) || 0;
  const safeVacancyLosses = parseFloat(summaryData?.vacancy_losses) || 0;
  const safeBadDebt = parseFloat(summaryData?.bad_debt) || 0;

  // Client-Side Derivation of Modern Diagnostic Canvas Parameters
  const actualCollectedRent = safeMarketRent - safeConcessions - safeVacancyLosses - safeBadDebt;
  const economicCaptureRate = safeMarketRent > 0 ? (actualCollectedRent / safeMarketRent) * 100 : 0;
  const nonOperatingErosionIndex = totals.noi > 0 ? (totals.capex / totals.noi) * 100 : 0;
  const netUtilityLeakage = safeUtilityExpense - safeRubsCollected;

  const finalMonthData = chartData[chartData.length - 1];
  const finalMonthT3Noi = finalMonthData ? parseFloat(finalMonthData["NOI Running Avg"]) || 0 : 0;
  const avgMonthlyNoi = chartData.length > 0 ? (totals.noi / chartData.length) : 0;
  const noiMomentum = finalMonthT3Noi - avgMonthlyNoi;

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col justify-center items-center text-slate-200 font-sans gap-4">
        <span className="flex h-12 w-12 rounded-full border-4 border-purple-500/30 border-t-purple-400 animate-spin" />
        <p className="text-xs font-bold uppercase tracking-widest text-slate-500">Deconstructing Financial Models...</p>
      </div>
    );
  }

  return (
    <main className="dark p-8 md:p-12 bg-slate-950 min-h-screen font-sans">
      
      {/* Top Controls Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h1 style={{ color: '#f8fafc', fontSize: '1.875rem', fontWeight: '600' }}>Financial Performance Dashboard</h1>
          <p className="text-sm text-slate-400 font-medium">Service 1: Systemic Asset Oversight & Ledger Audit Layer</p>
        </div>
        
        <div className="flex items-center gap-3">
          <label className="text-xs font-bold uppercase tracking-widest text-slate-500">Active Focus:</label>
          <select 
            value={selectedProperty} 
            onChange={(e) => setSelectedProperty(e.target.value)}
            className="bg-slate-900 border border-slate-800 rounded-xl px-4 py-2.5 text-sm font-semibold text-slate-100 shadow-xl focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all"
          >
            <option value="All Properties">Consolidated Portfolio</option>
            {properties.map((p) => (
              <option key={p} value={p}>{p}</option>
            ))}
          </select>
        </div>
      </div>

      {/* AUTOMATED DATA ANOMALY ALERT COMPONENT */}
      {criticalAnomalies.length > 0 ? (
        <div className="mb-8 p-6 bg-red-950/20 border border-red-900/40 rounded-2xl backdrop-blur-md">
          <div className="flex items-center gap-3 mb-3">
            <div className="bg-red-500/10 w-8 h-8 rounded-lg flex items-center justify-center ring-1 ring-red-500/30">
              <ExclamationTriangleIcon className="w-5 h-5 text-red-400" />
            </div>
            <h3 className="text-red-400 font-black text-base uppercase tracking-wider">
              System Audit Alert: Reporting Discrepancies Exposed
            </h3>
          </div>
          <p className="text-slate-300 text-sm mb-4 leading-relaxed font-medium">
            The underlying system transaction ledger entries do not mathematically balance against the high-level summary rows generated by the property management platform.
          </p>
          <div className="bg-slate-950/60 rounded-xl p-4 border border-slate-900 grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">Identified Discrepancy Window</p>
              <p className="text-sm font-semibold text-slate-200">
                Mismatches present in {criticalAnomalies.length} statement period cycles.
              </p>
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">Audit Recommendation</p>
              <p className="text-sm font-semibold text-emerald-400">Review unmapped below-the-line interest codes and adjustments.</p>
            </div>
          </div>
        </div>
      ) : (
        <div className="mb-8 p-4 bg-emerald-950/20 border border-emerald-900/30 rounded-2xl flex items-center gap-3 backdrop-blur-md">
          <CheckCircleIcon className="w-5 h-5 text-emerald-400 shrink-0" />
          <p className="text-emerald-400 text-xs font-bold uppercase tracking-widest">
            Data Integrity Status: 100% Ledger Alignment Confirmed
          </p>
        </div>
      )}

      {/* NEW ASYMMETRIC OPERATIONAL EFFICIENCY DIAGNOSTIC CLUSTER */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        
        {/* WIDE CARD: OPERATING EXPENSE RATIO (OER) */}
        <Card className="p-6 bg-slate-900 border border-slate-800 rounded-2xl shadow-xl flex flex-col justify-between relative overflow-hidden group/oer">
          <div className="flex justify-between items-start">
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-bold uppercase tracking-widest text-slate-400">Operating Expense Ratio</span>
                <div className="group relative inline-block cursor-pointer text-slate-500 hover:text-slate-300">
                  <span className="text-xs font-mono">ⓘ</span>
                  <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:flex flex-col w-72 p-4 bg-slate-950/95 border border-slate-800 rounded-xl shadow-2xl backdrop-blur-md text-slate-300 font-normal text-[11px] leading-relaxed z-50 pointer-events-none">
                    <p className="font-bold text-slate-100 mb-1 border-b border-slate-800 pb-1">Operating Expense Ratio (OER)</p>
                    <p className="mb-2">Evaluates operational cost structural efficiency relative to total incoming revenue cash generation.</p>
                    <p className="font-mono text-cyan-400 mb-1">Formula:</p>
                    <p className="font-mono bg-slate-900 p-1.5 rounded mb-2 text-center text-slate-200">{"$$\\text{OER} = \\left( \\frac{\\text{Total Operating Expenses}}{\\text{Effective Gross Revenue}} \\right) \\times 100$$"}</p>
                    <p className="text-slate-500">*Target benchmark holds between 35%–50%. Ratios exceeding 60% mark significant expense leaks.*</p>
                  </div>
                </div>
              </div>
              <h2 className="text-4xl font-black text-slate-100 tracking-tight mt-1">{totals.oerRate.toFixed(2)}%</h2>
            </div>
            <span className={`text-[10px] font-bold uppercase px-2 py-1 rounded-md tracking-wider ${totals.oerRate > 60 ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20' : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'}`}>
              {totals.oerRate > 60 ? 'Critical Overhead' : 'Optimal Balance'}
            </span>
          </div>
          
          {/* Linear Range Slider Override Box */}
          <div className="mt-6">
            <div className="w-full h-2 bg-slate-800 rounded-full relative">
              <div className="absolute top-0 left-0 h-full w-[50%] bg-emerald-500/40 rounded-l-full" title="Optimal Range" />
              <div className="absolute top-0 left-[50%] h-full w-[10%] bg-amber-500/40" title="Warning Threshold" />
              <div className="absolute top-0 left-[60%] h-full w-[40%] bg-rose-500/40 rounded-r-full" title="Overrun Range" />
              <div 
                className="absolute top-1/2 -translate-y-1/2 w-4 h-4 bg-slate-100 ring-2 ring-purple-600 rounded-full shadow-xl transition-all duration-500 cursor-pointer"
                style={{ left: `${Math.min(96, Math.max(2, totals.oerRate))}%` }}
              />
            </div>
            <div className="flex justify-between items-center text-[10px] text-slate-500 font-mono mt-2">
              <span>35% GPR Baseline</span>
              <span>50% Threshold</span>
              <span>60%+ Limit</span>
            </div>
          </div>
        </Card>

        {/* COMPACT CARD: NET UTILITY LEAKAGE & RECOVERY RATE */}
        <Card className="p-6 bg-slate-900 border border-slate-800 rounded-2xl shadow-xl flex flex-col justify-between group/util">
          <div className="flex justify-between items-start">
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-bold uppercase tracking-widest text-slate-400">Net Utility Subsidy Leak</span>
                <div className="group relative inline-block cursor-pointer text-slate-500 hover:text-slate-300">
                  <span className="text-xs font-mono">ⓘ</span>
                  <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:flex flex-col w-72 p-4 bg-slate-950/95 border border-slate-800 rounded-xl shadow-2xl backdrop-blur-md text-slate-300 font-normal text-[11px] leading-relaxed z-50 pointer-events-none">
                    <p className="font-bold text-slate-100 mb-1 border-b border-slate-800 pb-1">Net Utility Subsidy Leakage</p>
                    <p className="mb-2">Measures absolute structural dollar out-of-pocket costs absorbed by the property owner due to incomplete billing cost clawback recovery maps.</p>
                    <p className="font-mono text-cyan-400 mb-1">Formula:</p>
                    <p className="font-mono bg-slate-900 p-1.5 rounded mb-2 text-center text-slate-200">{"$$\\text{Net Utility Leakage} = \\text{Total Utility Expense} - \\text{RUBS Collected}$$"}</p>
                  </div>
                </div>
              </div>
              <h2 className="text-4xl font-black text-rose-400 tracking-tight mt-1">{formatMoney(netUtilityLeakage)}</h2>
            </div>
            <div className="w-10 h-10 shrink-0">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={[
                      { value: safeRubsCollected },
                      { value: Math.max(0, safeUtilityExpense - safeRubsCollected) }
                    ]}
                    cx="50%"
                    cy="50%"
                    innerRadius={12}
                    outerRadius={20}
                    stroke="none"
                    dataKey="value"
                  >
                    <Cell fill="#22d3ee" />
                    <Cell fill="#1e293b" />
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
          <p className="text-xs font-medium text-slate-400 mt-4 leading-normal">
            Property recaptures <span className="text-cyan-400 font-bold">{safeUtilityExpense > 0 ? ((safeRubsCollected / safeUtilityExpense) * 100).toFixed(1) : "0.0"}%</span> of utility fees via active tenant billing reimbursement pipelines.
          </p>
        </Card>

        {/* COMPACT CARD: NON-OPERATING EROSION INDEX */}
        <Card className="p-6 bg-slate-900 border border-slate-800 rounded-2xl shadow-xl flex flex-col justify-between group/erosion">
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-bold uppercase tracking-widest text-slate-400">Non-Operating Erosion Index</span>
              <div className="group relative inline-block cursor-pointer text-slate-500 hover:text-slate-300">
                <span className="text-xs font-mono">ⓘ</span>
                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:flex flex-col w-72 p-4 bg-slate-950/95 border border-slate-800 rounded-xl shadow-2xl backdrop-blur-md text-slate-300 font-normal text-[11px] leading-relaxed z-50 pointer-events-none">
                  <p className="font-bold text-slate-100 mb-1 border-b border-slate-800 pb-1">Non-Operating Erosion Index</p>
                  <p className="mb-2">Quantifies the percentage slice of fundamental net operating parameters swallowed by below-the-line adjustments before final distribution bounds.</p>
                  <p className="font-mono text-cyan-400 mb-1">Formula:</p>
                  <p className="font-mono bg-slate-900 p-1.5 rounded mb-2 text-center text-slate-200">{"$$\\text{Erosion Index} = \\left( \\frac{\\text{Below-Line Expenses}}{\\text{Net Operating Income}} \\right) \\times 100$$"}</p>
                </div>
              </div>
            </div>
            <h2 className="text-4xl font-black text-purple-400 tracking-tight mt-1">{nonOperatingErosionIndex.toFixed(1)}%</h2>
          </div>
          <div className="flex gap-4 border-t border-slate-800 pt-3 mt-4 text-[10px] text-slate-500 font-mono">
            <div>Stated NOI: <span className="text-slate-300">{formatMoney(totals.noi)}</span></div>
            <div>Adjustments: <span className="text-slate-300">{formatMoney(totals.capex)}</span></div>
          </div>
        </Card>
      </div>

      {/* NOI MOMENTUM ACCENT STRIP */}
      <div className={`w-full p-3 border rounded-xl mb-8 flex items-center justify-between text-xs font-semibold backdrop-blur-sm transition-all shadow-sm ${noiMomentum >= 0 ? 'bg-emerald-950/20 border-emerald-900/40 text-emerald-400' : 'bg-amber-950/20 border-amber-900/40 text-amber-400'}`}>
        <div className="flex items-center gap-2">
          <span className="flex h-2 w-2 rounded-full bg-current relative">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-current opacity-75" />
          </span>
          <span>Asset Vector Velocity Track:</span>
          <span className="text-slate-300 font-medium">
            {noiMomentum >= 0 
              ? 'Short-term operational run rates show positive velocity pacing safely outperforming long term baseline yields.' 
              : 'Trailing operational returns reveal negative variance patterns running cooler than the annualized benchmark.'}
          </span>
        </div>
        <div className="flex items-center gap-1 font-mono">
          <span>Momentum Delta:</span>
          <span className="font-black underline">{formatMoney(noiMomentum)}/mo</span>
        </div>
      </div>

      {/* DYNAMIC REVENUE LEAKAGE CASCADE RIBBON */}
      <Card className="p-6 bg-slate-900 border border-slate-900 rounded-2xl shadow-2xl mb-8">
        <div className="flex justify-between items-center mb-6 border-b border-slate-800 pb-4">
          <div>
            <div className="flex items-center gap-1.5">
              <h3 className="text-slate-50 text-base font-semibold">T12 Gross Capacity Capture Ribbon</h3>
              <div className="group relative inline-block cursor-pointer text-slate-500 hover:text-slate-300">
                <span className="text-xs font-mono">ⓘ</span>
                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:flex flex-col w-72 p-4 bg-slate-950/95 border border-slate-800 rounded-xl shadow-2xl backdrop-blur-md text-slate-300 font-normal text-[11px] leading-relaxed z-50 pointer-events-none">
                  <p className="font-bold text-slate-100 mb-1 border-b border-slate-800 pb-1">Economic Revenue Capture Ratio</p>
                  <p className="mb-2">Traces macro cash conversions mapping full space underwriting bounds to physical collections outcomes.</p>
                  <p className="font-mono text-cyan-400 mb-1">Formula:</p>
                  <p className="font-mono bg-slate-900 p-1.5 rounded mb-2 text-center text-slate-200">{"$$\\text{Revenue Capture} = \\left( \\frac{\\text{Total Rental Income}}{\\text{Gross Potential Rent}} \\right) \\times 100$$"}</p>
                </div>
              </div>
            </div>
            <p className="text-xs text-slate-500 mt-1">Isolates top-line system friction variables cutting down maximum underwriting rental yield bounds.</p>
          </div>
          <div className="text-right">
            <span className="text-xs text-slate-400">Total Net Yield Capture: </span>
            <span className="text-sm font-black text-emerald-400 font-mono">{economicCaptureRate.toFixed(2)}%</span>
          </div>
        </div>

        {/* Cascade Flow Track */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 items-center">
          <div className="p-4 bg-slate-950 rounded-xl border border-slate-800 text-center shadow-inner">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-1">Gross Potential</span>
            <span className="text-sm font-extrabold text-slate-200 font-mono">{formatMoney(safeMarketRent)}</span>
          </div>
          <div className="p-4 bg-slate-950/40 rounded-xl border border-slate-900 text-center relative group">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-1">Concessions Given</span>
            <span className="text-sm font-extrabold text-rose-400 font-mono">-{formatMoney(safeConcessions)}</span>
            <span className="absolute -right-2 top-1/2 -translate-y-1/2 hidden md:inline text-slate-700 text-xs">➔</span>
          </div>
          <div className="p-4 bg-slate-950/40 rounded-xl border border-slate-900 text-center relative group">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-1">Vacancy Losses</span>
            <span className="text-sm font-extrabold text-rose-400 font-mono">-{formatMoney(safeVacancyLosses)}</span>
            <span className="absolute -right-2 top-1/2 -translate-y-1/2 hidden md:inline text-slate-700 text-xs">➔</span>
          </div>
          <div className="p-4 bg-slate-950/40 rounded-xl border border-slate-900 text-center relative group">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-1">Bad Debt Write-offs</span>
            <span className="text-sm font-extrabold text-rose-400 font-mono">-{formatMoney(safeBadDebt)}</span>
            <span className="absolute -right-2 top-1/2 -translate-y-1/2 hidden md:inline text-slate-700 text-xs">➔</span>
          </div>
          <div className="p-4 bg-gradient-to-br from-slate-950 to-slate-900 rounded-xl border border-emerald-500/20 text-center shadow-md">
            <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-widest block mb-1">Effective Receipts</span>
            <span className="text-sm font-black text-emerald-400 font-mono">{formatMoney(totals.revenue)}</span>
          </div>
        </div>
      </Card>

      {/* EXECUTIVE INSIGHTS MODULE (RISKS & ROI GAINS) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        
        {/* INSIGHT 1: UTILITY EXPENSE RECOVERY (ROI POTENTIAL) */}
        <Card className="p-6 bg-slate-900/50 border border-slate-900 rounded-2xl shadow-xl flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 mb-3">
              <ArrowTrendingUpIcon className="w-4 h-4 text-purple-400" />
              <p className="text-xs font-bold uppercase tracking-widest text-purple-400">Top Gain Opportunity (ROI)</p>
            </div>
            <h4 className="text-lg font-extrabold text-slate-100 mb-2">Utility Cost Capture (RUBS)</h4>
            <div className="flex justify-between text-xs font-semibold text-slate-400 mb-3 border-b border-slate-800 pb-3">
              <span>Municipal Spent: {formatMoney(safeUtilityExpense)}</span>
              <span>Reimbursed: {formatMoney(safeRubsCollected)}</span>
            </div>
          </div>
          <div className="p-3 bg-purple-950/30 rounded-xl border border-purple-900/40 text-xs text-purple-300 font-medium leading-relaxed">
            ✨ **RUBS Leakage Evaluation:** Recovering {safeUtilityExpense > 0 ? ((safeRubsCollected / safeUtilityExpense) * 100).toFixed(1) : "0"}% of utility costs. Optimizing billing rules can recapture missing income potential.
          </div>
        </Card>

        {/* INSIGHT 2: CONCESSIONS RENTAL FRICTION */}
        <Card className="p-6 bg-slate-900/50 border border-slate-900 rounded-2xl shadow-xl flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 mb-3">
              <ShieldExclamationIcon className="w-4 h-4 text-amber-400" />
              <p className="text-xs font-bold uppercase tracking-widest text-amber-400">Critical Operating Risk</p>
            </div>
            <h4 className="text-lg font-extrabold text-slate-100 mb-1">Concessions Erosion Rate</h4>
            <div className="text-3xl font-black text-amber-400 mb-1">
              {safeMarketRent > 0 ? ((safeConcessions / safeMarketRent) * 100).toFixed(2) : "0.00"}%
            </div>
            <p className="text-xs text-slate-500 font-semibold mb-3">Total concession loss relative to gross market rent.</p>
          </div>
          { (safeConcessions / (safeMarketRent || 1)) > 0.03 ? (
            <div className="p-3 bg-amber-950/30 rounded-xl border border-amber-900/40 text-xs text-amber-300 font-medium leading-relaxed">
              ⚠️ **Leasing Friction Raised:** High incentive rates point to competitive pressure or submarket softening.
            </div>
          ) : (
            <div className="p-3 bg-emerald-950/20 rounded-xl border border-emerald-900/30 text-xs text-emerald-400 font-medium leading-relaxed">
              ✅ Concessions remain low and safely within historical underwriting bounds.
            </div>
          )}
        </Card>

        {/* INSIGHT 3: LEASE COLLECTION & VACANCY EXPOSURE */}
        <Card className="p-6 bg-slate-900/50 border border-slate-900 rounded-2xl shadow-xl flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 mb-3">
              <SparklesIcon className="w-4 h-4 text-cyan-400" />
              <p className="text-xs font-bold uppercase tracking-widest text-cyan-400">Collection Performance</p>
            </div>
            <h4 className="text-lg font-extrabold text-slate-100 mb-2">Non-Performance Leakage</h4>
            <div className="flex justify-between text-xs font-semibold text-slate-400 mb-3 border-b border-slate-800 pb-3">
              <span>Vacancy Loss: {formatMoney(safeVacancyLosses)}</span>
              <span>Bad Debt Write-Off: {formatMoney(safeBadDebt)}</span>
            </div>
          </div>
          <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 text-xs text-slate-300 font-medium leading-relaxed">
            📋 **Total Revenue Erosion:** Combined portfolio leakage from physical vacancies and tenant write-offs equals **{formatMoney(safeVacancyLosses + safeBadDebt)}**.
          </div>
        </Card>

      </div>

      {/* CORE FINANCIAL MEASUREMENT METRICS CARD ROW */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-5 mb-8">
        <Card className="p-5 bg-slate-900 border border-slate-900 rounded-xl shadow-lg flex flex-col justify-center">
          <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-1">Total Revenue</p>
          <p className="text-xl font-black text-slate-100 tracking-tight">{formatMoney(totals.revenue)}</p>
        </Card>
        <Card className="p-5 bg-slate-900 border border-slate-900 rounded-xl shadow-lg flex flex-col justify-center">
          <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-1">Total Expenses</p>
          <p className="text-xl font-black text-slate-100 tracking-tight">{formatMoney(totals.expenses)}</p>
        </Card>
        <Card className="p-5 bg-slate-900 border border-slate-900 rounded-xl shadow-lg flex flex-col justify-center">
          <p className="text-[10px] font-bold uppercase tracking-widest text-purple-400 mb-1">Stated NOI</p>
          <p className="text-xl font-black text-purple-400 tracking-tight">{formatMoney(totals.noi)}</p>
        </Card>
        <Card className="p-5 bg-slate-900 border border-slate-900 rounded-xl shadow-lg flex flex-col justify-center">
          <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-1">Below Line Adjustments</p>
          <p className="text-xl font-black text-slate-100 tracking-tight">{formatMoney(totals.capex)}</p>
        </Card>
        <Card className="p-5 bg-slate-900 border border-slate-900 rounded-xl shadow-lg flex flex-col justify-center">
          <p className="text-[10px] font-bold uppercase tracking-widest text-emerald-400 mb-1">Net Cash Flow</p>
          <p className="text-xl font-black text-emerald-400 tracking-tight">{formatMoney(totals.netIncome)}</p>
        </Card>
        <Card className="p-5 bg-slate-900 border border-slate-900 rounded-xl shadow-lg flex flex-col justify-center sm:col-span-2 md:col-span-1">
          <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-1">NOI Margin Conversion</p>
          <p className="text-xl font-black text-purple-400 tracking-tight">{totals.noiMargin.toFixed(1)}%</p>
        </Card>
      </div>

      {/* AREA CHART TRAJECTORY SECTIONS */}
      <Card className="p-6 bg-slate-900 border border-slate-900 rounded-2xl shadow-2xl mb-8">
        <h3 style={{ color: '#f8fafc', fontSize: '1.25rem', fontWeight: '600', marginBottom: '1.5rem' }}>NOI Trajectory & Running Smoothness Index</h3>
        <div className="h-80 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 10, right: 30, left: 10, bottom: 0 }}>
              <defs>
                <linearGradient id="colorNoi" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#22d3ee" stopOpacity={0.2}/>
                  <stop offset="95%" stopColor="#22d3ee" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
              <XAxis dataKey="period_date" stroke="#64748b" fontSize={11} tickLine={false} />
              <YAxis stroke="#64748b" fontSize={11} tickLine={false} tickFormatter={formatAxis} />
              <Tooltip content={<CustomTooltip />} />
              <Legend verticalAlign="top" height={36} />
              <Area type="monotone" dataKey="NOI" stroke="#22d3ee" strokeWidth={2.5} fillOpacity={1} fill="url(#colorNoi)" name="NOI" />
              <Line type="monotone" dataKey="NOI Running Avg" stroke="#f59e0b" strokeWidth={2} dot={false} strokeDasharray="4 4" name="NOI Running Avg" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
        {(selectedProperty === 'All Properties' || chartData.length === 0) && (
          <Card className="p-6 bg-slate-900 border border-slate-900 rounded-2xl shadow-2xl">
            <h3 style={{ color: '#f8fafc', fontSize: '1.25rem', fontWeight: '600', marginBottom: '1.5rem' }}>Property Leaderboard (Revenue Performance)</h3>
            <div className="h-80 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={leaderboardData} layout="vertical" margin={{ top: 5, right: 30, left: 40, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" horizontal={false} />
                  <XAxis type="number" stroke="#64748b" fontSize={11} tickLine={false} tickFormatter={formatAxis} />
                  <YAxis type="category" dataKey="property_name" stroke="#f8fafc" fontSize={11} tickLine={false} width={150} />
                  <Tooltip formatter={(value: any) => [formatMoney(value), "Revenue"]} contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', borderRadius: '8px' }} />
                  <Bar dataKey="revenue" fill="#8b5cf6" radius={[0, 4, 4, 0]} maxBarSize={30} name="Gross Revenue" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>
        )}

        <Card className="p-6 bg-slate-900 border border-slate-900 rounded-2xl shadow-2xl">
          <h3 style={{ color: '#f8fafc', fontSize: '1.25rem', fontWeight: '600', marginBottom: '1.5rem' }}>Monthly Financial Cash Evolution</h3>
          <div className="h-80 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="period_date" stroke="#64748b" fontSize={11} tickLine={false} />
                <YAxis stroke="#64748b" fontSize={11} tickLine={false} tickFormatter={formatAxis} />
                <Tooltip formatter={(value: any) => formatMoney(value)} contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', borderRadius: '8px' }} />
                <Legend />
                <Bar dataKey="Revenue" fill="#10b981" radius={[4, 4, 0, 0]} name="Inflow Revenue" />
                <Bar dataKey="Net Cash Flow" fill="#6366f1" radius={[4, 4, 0, 0]} name="Bottom Cash Flow" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card className="p-6 bg-slate-900 border border-slate-900 rounded-2xl shadow-2xl">
          <h3 style={{ color: '#f8fafc', fontSize: '1.25rem', fontWeight: '600', marginBottom: '1.5rem' }}>Operational Expense Bucket Mix</h3>
          <div className="h-80 w-full flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={donutData} cx="50%" cy="50%" innerRadius={60} outerRadius={90} paddingAngle={3} dataKey="value">
                  {donutData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={DONUT_COLORS[index % DONUT_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value: any) => formatMoney(value)} contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', borderRadius: '8px' }} />
                <Legend layout="vertical" verticalAlign="middle" align="right" wrapperStyle={{ fontSize: '12px', color: '#f8fafc' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      {/* MATRIX TABULAR DETAIL FOOTER LEDGER */}
      <Card className="p-6 bg-slate-900 border border-slate-900 rounded-2xl shadow-2xl">
        <h3 style={{ color: '#f8fafc', fontSize: '1.25rem', fontWeight: '600', marginBottom: '1.25rem' }}>Overall Consolidated Financial Matrix</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400 text-xs font-bold uppercase tracking-wider">
                <th className="py-3 px-4">Period</th>
                <th className="py-3 px-4 text-right">Revenue</th>
                <th className="py-3 px-4 text-right">Expenses</th>
                <th className="py-3 px-4 text-right">Stated NOI</th>
                <th className="py-3 px-4 text-right">Adjustments</th>
                <th className="py-3 px-4 text-right">Net Cash Flow</th>
                <th className="py-3 px-4 text-right">Audit Delta</th>
              </tr>
            </thead>
            <tbody className="text-slate-300 text-xs font-medium">
              {chartData.map((row: any, idx: number) => (
                <tr key={idx} className="border-b border-slate-900 hover:bg-slate-900/60 transition-colors">
                  <td className="py-3.5 px-4 font-bold text-slate-200">{row.period_date}</td>
                  <td className="py-3.5 px-4 text-right text-emerald-400">{formatMoney(row.Revenue)}</td>
                  <td className="py-3.5 px-4 text-right text-rose-400">{formatMoney(row.Expenses)}</td>
                  <td className="py-3.5 px-4 text-right font-semibold text-purple-400">{formatMoney(row.NOI)}</td>
                  <td className="py-3.5 px-4 text-right text-slate-400">{formatMoney(row["CAPEX Adjustments"])}</td>
                  <td className="py-3.5 px-4 text-right font-bold text-slate-100">{formatMoney(row["Net Cash Flow"])}</td>
                  <td className={`py-3.5 px-4 text-right font-bold ${Math.abs(row["Audit Delta"]) > 1.00 ? 'text-red-400' : 'text-slate-500'}`}>
                    {formatMoney(row["Audit Delta"])}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* CONVERSATIONAL ANALYTICS ENGINE */}
      <Card className="p-6 bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl mt-8">
        <h3 className="text-slate-100 text-lg font-semibold mb-4 flex items-center gap-2">
          <span className="flex h-2 w-2 rounded-full bg-purple-400 animate-ping" />
          Conversational Analytics Engine (Ask your T12 Ledger)
        </h3>
        
        <div className="bg-slate-950 rounded-xl p-4 h-64 overflow-y-auto mb-4 border border-slate-900 flex flex-col gap-3" id="chat-window">
          <div className="bg-purple-950/20 text-purple-300 text-xs p-3 rounded-xl border border-purple-900/30 self-start max-w-[85%] font-medium">
            👋 **System Grounded.** Ask me anything about collections conversion efficiency, utility cost leakage, concessions, or monthly accounting anomalies across the portfolio assets.
          </div>
        </div>

        <form onSubmit={async (e) => {
          e.preventDefault();
          const input = (e.target as any).elements.chatInput;
          const message = input.value.trim();
          if (!message) return;

          const chatWindow = document.getElementById("chat-window");
          if (chatWindow) {
            chatWindow.innerHTML += `<div class="bg-slate-800 text-slate-100 text-xs p-3 rounded-xl self-end max-w-[85%] font-medium ml-auto">${message}</div>`;
            chatWindow.innerHTML += `<div class="bg-slate-900 text-slate-400 text-xs p-3 rounded-xl self-start max-w-[85%] font-medium animate-pulse" id="loading-bubble">Processing ledger models...</div>`;
            chatWindow.scrollTop = chatWindow.scrollHeight;
          }

          input.value = "";

          try {
            const res = await fetch("/api/chat", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ message }),
            });
            const data = await res.json();
            
            const loader = document.getElementById("loading-bubble");
            if (loader) loader.remove();

            if (chatWindow) {
              chatWindow.innerHTML += `<div class="bg-purple-950/30 text-purple-200 text-xs p-3 rounded-xl border border-purple-900/40 self-start max-w-[85%] font-medium">${data.answer || data.error}</div>`;
              chatWindow.scrollTop = chatWindow.scrollHeight;
            }
          } catch (err) {
            const loader = document.getElementById("loading-bubble");
            if (loader) loader.remove();
          }
        }} className="flex gap-3">
          <input
            name="chatInput"
            type="text"
            placeholder="e.g., Calculate our utility leakage recovery percentage for Elle West Ave..."
            className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-xs font-semibold text-slate-100 focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all placeholder-slate-600"
          />
          <button type="submit" className="bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs px-6 py-3 rounded-xl transition-all shadow-lg shadow-purple-600/20">
            Query Agent
          </button>
        </form>
      </Card>

    </main>
  );
}

