/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState } from 'react';
import { MarkReport } from '../types.ts';
import { 
  ResponsiveContainer, 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  BarChart, 
  Bar 
} from 'recharts';
import { 
  TrendingUp, 
  TrendingDown, 
  BookOpen, 
  Award, 
  Layers, 
  Flame 
} from 'lucide-react';

export default function PerformanceVisualization({ reports }: { reports: MarkReport[] }) {
  const [activeChartTab, setActiveChartTab] = useState<'average' | 'subjects'>('average');

  if (!reports || reports.length === 0) {
    return (
      <div className="bg-slate-50 border border-slate-100 rounded-2xl p-6 text-center text-slate-400 text-xs">
        Insufficient term history to plot academic trend evaluation.
      </div>
    );
  }

  // Helper to sort terms chronologically (1st Term, 2nd Term, 3rd/Final Term, etc.)
  const getSortedReports = () => {
    return [...reports].sort((a, b) => {
      const getTermRank = (termStr: string) => {
        const lower = termStr.toLowerCase();
        if (lower.includes('1st')) return 1;
        if (lower.includes('2nd')) return 2;
        if (lower.includes('3rd') || lower.includes('final')) return 3;
        return 4;
      };
      
      // Secondary sort by date
      const rankA = getTermRank(a.term);
      const rankB = getTermRank(b.term);
      if (rankA !== rankB) return rankA - rankB;
      return new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime();
    });
  };

  const sorted = getSortedReports();
  const latestReport = sorted[sorted.length - 1];
  const previousReport = sorted.length > 1 ? sorted[sorted.length - 2] : null;

  // Calculate trends for indicators
  const diffAverage = previousReport 
    ? (latestReport.average - previousReport.average).toFixed(1) 
    : null;
  const isUp = diffAverage ? parseFloat(diffAverage) >= 0 : true;

  // Prepare overall average trend data
  const trendData = sorted.map(r => ({
    term: r.term.replace(' Evaluation', '').replace(' 2026', ''),
    'Average %': r.average,
    'Total Marks': r.total,
    'Maths': r.subjects['Pure Mathematics'] || 0,
    'Science': r.subjects['Science & Technology'] || r.subjects['Science'] || 0,
    'English': r.subjects['English Language'] || r.subjects['English'] || 0,
    'Tamil': r.subjects['Tamil Language'] || r.subjects['Tamil'] || 0,
    'History': r.subjects['Sri Lankan History'] || r.subjects['History'] || 0,
  }));

  // Prepare subject-specific data for the last term vs previous terms
  const currentSubjectsData = Object.entries(latestReport.subjects).map(([subject, score]) => {
    const item: Record<string, any> = {
      subject: subject.split(' ')[0], // abbreviate
      'Current Term %': score,
    };
    if (previousReport) {
      item['Previous Term %'] = previousReport.subjects[subject] || 0;
    }
    return item;
  });

  // Custom tooltips styling for gorgeous elegant look
  const CustomTooltipContent = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-slate-900 text-white p-3.5 rounded-2xl border border-slate-800 shadow-xl font-sans text-xs space-y-2">
          <p className="font-bold text-slate-200">{label}</p>
          <div className="space-y-1">
            {payload.map((entry: any) => (
              <p key={entry.name} className="flex justify-between items-center gap-4">
                <span className="text-slate-400 font-medium" style={{ color: entry.color }}>
                  ● {entry.name}:
                </span>
                <span className="font-mono font-bold text-slate-100">{entry.value}%</span>
              </p>
            ))}
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div id="performance_analytics_container" className="bg-[#FAF9F6] border border-amber-250/35 rounded-3xl p-6 shadow-sm space-y-6">
      
      {/* Analytics Main Header Row */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-rose-900/10 pb-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-amber-50 rounded-2xl border border-amber-200/50">
            <Award className="w-6 h-6 text-[#C59B27]" />
          </div>
          <div>
            <h3 className="font-serif font-bold text-slate-800 text-lg">Sri Lankan Term Progress Analytics</h3>
            <p className="text-slate-500 text-xs">Evaluated academic performance metrics mapped across chronological provincial terms.</p>
          </div>
        </div>

        {/* Chart Selector Mini Tabs */}
        <div className="flex bg-slate-100 p-1 rounded-xl self-end md:self-auto font-sans font-bold text-xs ring-1 ring-slate-200/75">
          <button
            type="button"
            id="chart_tab_average"
            onClick={() => setActiveChartTab('average')}
            className={`px-3.5 py-1.5 rounded-lg transition-all cursor-pointer ${
              activeChartTab === 'average' 
                ? 'bg-[#4E342E] text-white shadow-xs' 
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            Average Course Trend
          </button>
          <button
            type="button"
            id="chart_tab_subjects"
            onClick={() => setActiveChartTab('subjects')}
            className={`px-3.5 py-1.5 rounded-lg transition-all cursor-pointer ${
              activeChartTab === 'subjects' 
                ? 'bg-[#4E342E] text-white shadow-xs' 
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            Subject Breakdown
          </button>
        </div>
      </div>

      {/* Real-time Indicator Badges */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 font-sans text-xs">
        <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Evaluation Path</span>
            <span className="text-slate-800 font-bold block text-sm mt-0.5">{sorted.length} Terms Logged</span>
          </div>
          <Layers className="w-5 h-5 text-slate-400" />
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Current Term Mean</span>
            <span className="text-slate-800 font-bold block text-sm mt-0.5">{latestReport.average}% Average</span>
          </div>
          <Flame className="w-5 h-5 text-amber-500" />
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Provincial Progression</span>
            {diffAverage ? (
              <span className={`inline-flex items-center gap-1 font-bold text-sm mt-0.5 ${isUp ? 'text-emerald-600' : 'text-rose-600'}`}>
                {isUp ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                {isUp ? '+' : ''}{diffAverage}% vs last term
              </span>
            ) : (
              <span className="text-slate-400 font-medium block mt-0.5">Baselined Term</span>
            )}
          </div>
          <BookOpen className="w-5 h-5 text-[#C59B27]" />
        </div>
      </div>

      {/* Main Charts Stage */}
      <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
        {activeChartTab === 'average' ? (
          <div className="space-y-2">
            <div className="flex justify-between items-center px-2">
              <span className="font-serif font-bold text-xs text-slate-700">Chronological Term Performance Trend</span>
              <span className="text-[10px] font-mono text-[#D4AF37] font-bold">Kn/TCC National Registry Standard</span>
            </div>
            
            <div className="h-[250px] w-full font-mono text-[10px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={trendData} margin={{ top: 15, right: 15, left: -25, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                  <XAxis dataKey="term" stroke="#94A3B8" tickMargin={8} />
                  <YAxis domain={[0, 100]} stroke="#94A3B8" tickMargin={4} />
                  <Tooltip content={<CustomTooltipContent />} />
                  <Legend wrapperStyle={{ fontSize: 10, fontFamily: 'sans-serif', paddingTop: 10 }} />
                  <Line 
                    name="Student Average" 
                    type="monotone" 
                    dataKey="Average %" 
                    stroke="#4E342E" 
                    strokeWidth={3} 
                    activeDot={{ r: 6 }} 
                  />
                  <Line 
                    name="Pure Mathematics" 
                    type="monotone" 
                    dataKey="Maths" 
                    stroke="#C59B27" 
                    strokeWidth={1.5} 
                    strokeDasharray="4 4"
                    dot={{ r: 3 }}
                  />
                  <Line 
                    name="Science & Tech" 
                    type="monotone" 
                    dataKey="Science" 
                    stroke="#10B981" 
                    strokeWidth={1.5} 
                    strokeDasharray="4 4"
                    dot={{ r: 3 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            <div className="flex justify-between items-center px-2">
              <span className="font-serif font-bold text-xs text-slate-700">Comparative Subject Evaluation Overview</span>
              <span className="text-[10px] font-mono text-slate-400">{latestReport.term} vs Previous Evaluation</span>
            </div>

            <div className="h-[250px] w-full font-mono text-[10px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={currentSubjectsData} margin={{ top: 15, right: 15, left: -25, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                  <XAxis dataKey="subject" stroke="#94A3B8" />
                  <YAxis domain={[0, 100]} stroke="#94A3B8" />
                  <Tooltip content={<CustomTooltipContent />} />
                  <Legend wrapperStyle={{ fontSize: 10, fontFamily: 'sans-serif', paddingTop: 10 }} />
                  {previousReport && (
                    <Bar 
                      name="Prior Term %" 
                      dataKey="Previous Term %" 
                      fill="#D1CAC4" 
                      radius={[4, 4, 0, 0]} 
                    />
                  )}
                  <Bar 
                    name="Current Term %" 
                    dataKey="Current Term %" 
                    fill="#C59B27" 
                    radius={[4, 4, 0, 0]} 
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}
      </div>

    </div>
  );
}
