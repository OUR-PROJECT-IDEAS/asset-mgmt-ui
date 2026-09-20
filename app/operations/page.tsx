
"use client";

import { useEffect, useState } from 'react';
import { Card } from '@tremor/react';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, ComposedChart, Line, Legend, AreaChart, Area } from 'recharts';

const DONUT_COLORS = ['#06b6d4', '#3b82f6', '#8b5cf6', '#f43f5e', '#f59e0b', '#10b981'];

export default function OperationsDashboard() {
  const [loading, setLoading] = useState(true);
  const [selectedRentRoll, setSelectedRentRoll] = useState('latest');
  
  const defaultData = {
    meta: { rentRollId: "N/A", asOfDate: "...", batchId: "...", propertyName: "Loading...", hasData: false, availableRolls: [] },
    kpis: {}, unitMix: [], expirations: [], tenants: [], topDelinquencies: [], moveInTrend: []
  };
  const [dashboardData, setDashboardData] = useState<any>(defaultData);

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      try {
        const response = await fetch(`/api/operations?rentRollId=${selectedRentRoll}`);
        const data = await response.json();
        
        if (data.error || !data.meta?.hasData) {
          setDashboardData(data.meta ? { ...defaultData, meta: data.meta } : defaultData);
        } else {
          setDashboardData(data);
          if (selectedRentRoll === 'latest') setSelectedRentRoll(data.meta.rentRollId.toString());
        }
      } catch (err) {
        setDashboardData(defaultData);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [selectedRentRoll]);

  const formatMoney = (n: number) => n == null || isNaN(n) ? "$0" : (n < 0 ? `-$` : `$`) + Intl.NumberFormat("us").format(Math.abs(n));
  const formatPercent = (n: number) => n == null || isNaN(n) ? "0.0%" : `${n.toFixed(1)}%`;
  const formatAxisMoney = (n: number) => n >= 1000 ? `$${(n / 1000).toFixed(0)}k` : `$${n}`;

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-slate-800 ring-1 ring-slate-700 rounded-lg p-4 shadow-xl z-50 min-w-[150px]">
          {label && <p className="text-slate-400 text-sm mb-3 font-semibold border-b border-slate-700 pb-2">{label}</p>}
          {payload.map((entry: any, index: number) => {
            const isMoney = entry.name.toLowerCase().includes('rent') || entry.name.toLowerCase().includes('balance');
            return (
              <p key={index} style={{ color: entry.color || '#fff' }} className="font-bold text-sm my-1">
                {entry.name}: {isMoney ? formatMoney(entry.value) : entry.value}
              </p>
            );
          })}
        </div>
      );
    }
    return null;
  };

  return (
    <main className="dark p-8 md:p-12 bg-slate-950 min-h-screen font-sans">
      
      {/* HEADER WITH DYNAMIC PROPERTY NAME & DROPDOWN */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10">
        <div>
          <h1 className="text-3xl font-semibold text-slate-50">
            {dashboardData.meta.propertyName} <span className="text-slate-500 font-light">| Rent Roll</span>
          </h1>
          <p className="text-slate-400 mt-2">Advanced Institutional Operational Ledger Analysis.</p>
          
          {!loading && dashboardData.meta.hasData && (
            <div className="flex flex-wrap gap-3 mt-4">
              <span className="bg-cyan-500/10 text-cyan-400 py-1.5 px-3 rounded-lg text-xs font-mono font-medium border border-cyan-500/20">
                RENT ROLL ID: {dashboardData.meta.rentRollId}
              </span>
              <span className="bg-indigo-500/10 text-indigo-400 py-1.5 px-3 rounded-lg text-xs font-mono font-medium border border-indigo-500/20">
                AS OF: {dashboardData.meta.asOfDate}
              </span>
            </div>
          )}
        </div>
        
        {dashboardData.meta.availableRolls?.length > 0 && (
          <select
            value={selectedRentRoll}
            onChange={(e) => setSelectedRentRoll(e.target.value)}
            className="mt-6 md:mt-0 p-3 bg-slate-800 text-slate-200 ring-1 ring-slate-700 rounded-lg outline-none focus:ring-cyan-500 shadow-lg cursor-pointer min-w-[300px]"
          >
            {dashboardData.meta.availableRolls.map((roll: any) => (
              <option key={roll.id} value={roll.id}>🏢 {roll.propertyName} - {roll.date}</option>
            ))}
          </select>
        )}
      </div>
      
      {loading ? (
        <div className="flex items-center space-x-3 text-slate-400 mt-10">
          <div className="w-5 h-5 border-t-2 border-cyan-500 rounded-full animate-spin"></div>
          <p className="text-lg">Calculating Institutional Metrics...</p>
        </div>
      ) : !dashboardData.meta.hasData ? (
        <div className="mt-12 flex flex-col items-center justify-center p-16 ring-1 ring-slate-800 rounded-3xl bg-slate-900/40">
          <h2 className="text-2xl text-slate-200 font-semibold mb-2">No Rent Roll Data Available</h2>
        </div>
      ) : (
        <>
          {/* TOP KPI ROW: OCCUPANCY & RISK */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-4">
            <Card className="p-5 bg-slate-900 ring-1 ring-slate-800 rounded-xl shadow-lg">
              <p className="text-slate-400 text-xs font-semibold uppercase tracking-wider mb-2">Physical Occupancy</p>
              <h2 className="text-cyan-400 text-3xl font-bold m-0">{formatPercent(dashboardData.kpis.occupancyRate)}</h2>
              <p className="text-slate-500 text-xs mt-2">{dashboardData.kpis.vacantUnits} Vacant / {dashboardData.kpis.revenueUnits} Rev Units</p>
            </Card>
            <Card className="p-5 bg-slate-900 ring-1 ring-slate-800 rounded-xl shadow-lg">
              <p className="text-slate-400 text-xs font-semibold uppercase tracking-wider mb-2">Economic Occupancy</p>
              <h2 className="text-emerald-400 text-3xl font-bold m-0">{formatPercent(dashboardData.kpis.economicOccupancy)}</h2>
              <p className="text-slate-500 text-xs mt-2">Rent Collected vs GPR</p>
            </Card>
            <Card className="p-5 bg-slate-900 ring-1 ring-slate-800 rounded-xl shadow-lg">
              <p className="text-slate-400 text-xs font-semibold uppercase tracking-wider mb-2">Loss to Lease</p>
              <h2 className="text-rose-400 text-3xl font-bold m-0">{formatMoney(dashboardData.kpis.lossToLease)}</h2>
              <p className="text-slate-500 text-xs mt-2">Variance to Market Rent</p>
            </Card>
            <Card className="p-5 bg-slate-900 ring-1 ring-slate-800 rounded-xl shadow-lg">
              <p className="text-slate-400 text-xs font-semibold uppercase tracking-wider mb-2">Gross Potential Rent</p>
              <h2 className="text-slate-50 text-3xl font-bold m-0">{formatMoney(dashboardData.kpis.totalMarketRent)}</h2>
              <p className="text-slate-500 text-xs mt-2">Maximum Yield Capacity</p>
            </Card>
            <Card className="p-5 bg-slate-900 ring-1 ring-slate-800 rounded-xl shadow-lg">
              <p className="text-slate-400 text-xs font-semibold uppercase tracking-wider mb-2">Delinquency Ratio</p>
              <h2 className="text-amber-400 text-3xl font-bold m-0">{formatPercent(dashboardData.kpis.delinquencyRatio)}</h2>
              <p className="text-slate-500 text-xs mt-2">{formatMoney(dashboardData.kpis.totalBalance)} Total Arrears</p>
            </Card>
          </div>

          {/* SECOND KPI ROW: EXPOSURE */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-10">
             <Card className="p-4 bg-slate-900/50 ring-1 ring-slate-800 rounded-xl flex items-center justify-between">
              <div>
                <p className="text-slate-400 text-xs font-semibold uppercase tracking-wider">Month-to-Month Exposure</p>
                <p className="text-slate-500 text-xs mt-1">Expired Leases still occupying units</p>
              </div>
              <h2 className="text-rose-400 text-2xl font-bold m-0">{dashboardData.kpis.mtmCount} Units</h2>
            </Card>
            <Card className="p-4 bg-slate-900/50 ring-1 ring-slate-800 rounded-xl flex items-center justify-between">
              <div>
                <p className="text-slate-400 text-xs font-semibold uppercase tracking-wider">Non-Revenue Units</p>
                <p className="text-slate-500 text-xs mt-1">Models, Admin, & Down Units excluded from Occ.</p>
              </div>
              <h2 className="text-slate-300 text-2xl font-bold m-0">{dashboardData.kpis.nonRevCount} Units</h2>
            </Card>
          </div>

          {/* MAIN CHARTS ROW */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
            
            {/* FIXED DONUT CHART */}
            <Card className="p-6 bg-slate-900 ring-1 ring-slate-800 rounded-xl shadow-2xl flex flex-col">
              <h3 className="text-slate-50 text-lg font-semibold mb-2">Unit Mix & Distribution</h3>
              <div className="flex-1 flex flex-col md:flex-row items-center justify-between">
                <div className="w-full md:w-1/2 h-48 md:h-full relative">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart margin={{ top: 0, right: 0, bottom: 0, left: 0 }}>
                      <Pie data={dashboardData.unitMix} cx="50%" cy="50%" innerRadius="55%" outerRadius="80%" paddingAngle={4} dataKey="units" stroke="none">
                        {dashboardData.unitMix.map((entry: any, index: number) => (
                          <Cell key={`cell-${index}`} fill={DONUT_COLORS[index % DONUT_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip content={<CustomTooltip />} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="w-full md:w-1/2 flex flex-col justify-center space-y-3 overflow-y-auto max-h-[220px] md:pl-4 mt-4 md:mt-0 border-t md:border-t-0 md:border-l border-slate-800 custom-scrollbar pr-2 pt-4 md:pt-0">
                   {dashboardData.unitMix.map((entry: any, index: number) => (
                    <div key={index} className="flex items-center">
                      <div className="w-3 h-3 rounded-full mr-3 shrink-0" style={{ backgroundColor: DONUT_COLORS[index % DONUT_COLORS.length] }}></div>
                      <div className="flex-1 min-w-0">
                        <p className="text-slate-300 text-xs font-medium truncate" title={entry.name}>{entry.name}</p>
                      </div>
                      <div className="text-slate-500 font-mono text-xs ml-2 shrink-0">({entry.units})</div>
                    </div>
                  ))}
                </div>
              </div>
            </Card>

            {/* DUAL AXIS LEASE EXPIRY (REVENUE AT RISK) */}
            <Card className="p-6 bg-slate-900 ring-1 ring-slate-800 rounded-xl shadow-2xl lg:col-span-2">
              <h3 className="text-slate-50 text-lg font-semibold mb-2">Revenue at Risk (Lease Expirations)</h3>
              <p className="text-slate-500 text-xs mb-6">Units expiring vs. Total Actual Rent dollars at risk.</p>
              <div className="h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={dashboardData.expirations} margin={{ left: -10, right: -10 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                    <XAxis dataKey="name" stroke="#94a3b8" tick={{ fontSize: 11 }} dy={10} />
                    <YAxis yAxisId="left" stroke="#94a3b8" tick={{ fontSize: 11 }} />
                    <YAxis yAxisId="right" orientation="right" stroke="#0ea5e9" tickFormatter={formatAxisMoney} tick={{ fontSize: 11 }} />
                    <Tooltip content={<CustomTooltip />} cursor={{fill: '#1e293b'}} />
                    <Legend wrapperStyle={{ paddingTop: '15px' }} />
                    <Bar yAxisId="left" dataKey="units" name="Expiring Units" fill="#f43f5e" radius={[4, 4, 0, 0]} maxBarSize={50} />
                    <Line yAxisId="right" type="monotone" dataKey="rentAtRisk" name="$ Rent at Risk" stroke="#0ea5e9" strokeWidth={3} dot={{r: 4, fill: '#0ea5e9'}} />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            </Card>
          </div>

          {/* SECONDARY CHARTS ROW */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            <Card className="p-6 bg-slate-900 ring-1 ring-slate-800 rounded-xl shadow-2xl">
              <h3 className="text-slate-50 text-lg font-semibold mb-6">Top Delinquencies (Aged Receivables)</h3>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={dashboardData.topDelinquencies} layout="vertical" margin={{ left: 10, right: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" horizontal={false} />
                    <XAxis type="number" stroke="#94a3b8" tickFormatter={formatAxisMoney} />
                    <YAxis type="category" dataKey="unit" stroke="#94a3b8" width={60} tick={{ fontSize: 12 }} />
                    <Tooltip content={<CustomTooltip />} cursor={{fill: '#1e293b'}} />
                    <Bar dataKey="balance" name="Outstanding Balance" fill="#f59e0b" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Card>
            
            <Card className="p-6 bg-slate-900 ring-1 ring-slate-800 rounded-xl shadow-2xl">
              <h3 className="text-slate-50 text-lg font-semibold mb-6">Move-In Velocity Trend</h3>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={dashboardData.moveInTrend} margin={{ left: -20, right: 10 }}>
                    <defs>
                      <linearGradient id="colorMoveIns" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                    <XAxis dataKey="name" stroke="#94a3b8" tick={{ fontSize: 10 }} dy={10} />
                    <YAxis stroke="#94a3b8" tick={{ fontSize: 12 }} />
                    <Tooltip content={<CustomTooltip />} />
                    <Area type="monotone" dataKey="moveIns" name="Move-Ins" stroke="#10b981" strokeWidth={3} fillOpacity={1} fill="url(#colorMoveIns)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </Card>
          </div>

          {/* TENANT LEDGER DATA TABLE */}
          <Card className="bg-slate-900 ring-1 ring-slate-800 rounded-xl shadow-2xl overflow-hidden mt-6">
            <div className="p-6 border-b border-slate-800 flex justify-between items-center bg-slate-900/50">
              <h3 className="text-slate-50 text-lg font-semibold">Tenant Ledger Overview</h3>
            </div>
            <div className="overflow-x-auto max-h-[600px] overflow-y-auto custom-scrollbar">
              <table className="w-full text-left border-collapse">
                <thead className="bg-slate-950/80 backdrop-blur-md sticky top-0 z-10 border-b border-slate-800 shadow-sm">
                  <tr>
                    <th className="py-4 px-6 text-xs font-bold text-slate-400 uppercase tracking-widest whitespace-nowrap">Unit</th>
                    <th className="py-4 px-6 text-xs font-bold text-slate-400 uppercase tracking-widest whitespace-nowrap">Tenant Name</th>
                    <th className="py-4 px-6 text-xs font-bold text-slate-400 uppercase tracking-widest whitespace-nowrap">Move-In Date</th>
                    <th className="py-4 px-6 text-xs font-bold text-slate-400 uppercase tracking-widest whitespace-nowrap">Lease End</th>
                    <th className="py-4 px-6 text-xs font-bold text-slate-400 uppercase tracking-widest text-right whitespace-nowrap">Rent</th>
                    <th className="py-4 px-6 text-xs font-bold text-slate-400 uppercase tracking-widest text-right whitespace-nowrap">Balance</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {dashboardData.tenants.map((t: any, i: number) => (
                    <tr key={i} className="hover:bg-slate-800/40 transition-colors group">
                      <td className="py-4 px-6 text-sm text-cyan-400 font-mono font-medium whitespace-nowrap">{t.unit}</td>
                      <td className={`py-4 px-6 text-sm truncate max-w-[250px] transition-colors ${t.tenant.includes('[NON-REV]') ? 'text-slate-500 font-medium' : 'text-slate-300 group-hover:text-white'}`}>{t.tenant}</td>
                      <td className="py-4 px-6 text-sm text-slate-400 whitespace-nowrap">{t.moveIn}</td>
                      <td className="py-4 px-6 text-sm text-slate-400 whitespace-nowrap">{t.leaseEnd}</td>
                      <td className="py-4 px-6 text-sm text-slate-300 text-right whitespace-nowrap font-mono">{formatMoney(t.rent)}</td>
                      <td className={`py-4 px-6 text-sm font-bold text-right whitespace-nowrap ${t.balance > 0 ? 'text-rose-400' : t.balance < 0 ? 'text-emerald-400' : 'text-slate-500'}`}>
                        {formatMoney(t.balance)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </>
      )}
    </main>
  );
}
