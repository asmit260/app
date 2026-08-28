import React, { useMemo, useState } from 'react';
import { Flame, Clock, Film, CheckCircle2, BarChart2, TrendingUp, Activity } from 'lucide-react';
import { groupWatchlistByFranchise } from '../../utils/franchise';

const STATUS_COLORS = { watching: '#06b6d4', completed: '#10b981', plan_to_watch: '#7c3aed', on_hold: '#eab308', dropped: '#ef4444' };
const STATUS_LABELS = { watching: 'Watching', completed: 'Completed', plan_to_watch: 'Plan to Watch', on_hold: 'On Hold', dropped: 'Dropped' };

function getLocalDateKey(d) {
  if (!d) return '';
  const date = typeof d === 'string' || typeof d === 'number' ? new Date(d) : d;
  if (isNaN(date.getTime())) return '';
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export default function StatsView({ watchlist = [], history = [] }) {
  const [historyPage, setHistoryPage] = useState(1);
  const [activeTooltip, setActiveTooltip] = useState(null);
  const [pinnedTooltip, setPinnedTooltip] = useState(false);
  const HISTORY_PAGE_SIZE = 15;

  // ── HERO STATS ──────────────────────────────────────────────
  const heroStats = useMemo(() => {
    const total = watchlist.length;
    const franchiseGroups = groupWatchlistByFranchise(watchlist);
    const totalSeries = franchiseGroups.length;

    let totalEps = 0, totalMinutes = 0, completedCount = 0, completedFranchises = 0, ratedCount = 0, ratedSum = 0;
    watchlist.forEach(item => {
      let eps = Number(item.episodes_watched) || 0;
      if (item.status === 'completed' && eps === 0) {
        eps = Number(item.total_episodes || item.episodes || 12);
      }
      totalEps += eps;
      totalMinutes += eps * (Number(item.duration) || 24);
      if (item.status === 'completed') completedCount++;
      if (item.score) { ratedSum += Number(item.score); ratedCount++; }
    });

    // Count fully completed franchises
    franchiseGroups.forEach(f => {
      if (f.overallStatus === 'completed') {
        completedFranchises++;
      }
    });

    const completionRate = totalSeries > 0 ? Math.round((completedFranchises / totalSeries) * 100) : 0;
    return {
      total,
      totalSeries,
      completedFranchises,
      totalEps,
      hours: Math.floor(totalMinutes / 60),
      days: (totalMinutes / 1440).toFixed(1),
      completedCount,
      completionRate,
      avgScore: ratedCount > 0 ? (ratedSum / ratedCount).toFixed(1) : null
    };
  }, [watchlist]);

  // ── DATES & ACTIVITY AGGREGATION ────────────────────────────
  // 100% accurate real user activity aggregation from episode_progress logs & watchlist timestamps
  const { allActivityDates, dayCounts } = useMemo(() => {
    const counts = {};
    const dates = [];

    // 1. Process all real history (episode_progress) entries
    (history || []).forEach(l => {
      if (!l.watched_at) return;
      const d = getLocalDateKey(l.watched_at);
      if (d) {
        counts[d] = (counts[d] || 0) + 1;
        dates.push(d);
      }
    });

    // 2. Incorporate actual watchlist update/completion timestamps
    (watchlist || []).forEach(item => {
      const dSource = item.finish_date || item.start_date || item.updated_at || item.created_at;
      if (dSource) {
        const d = getLocalDateKey(dSource);
        if (d && !counts[d]) {
          const eps = Number(item.episodes_watched) || (item.status === 'completed' ? Number(item.total_episodes || 1) : 1);
          counts[d] = eps;
          dates.push(d);
        }
      }
    });

    return { allActivityDates: dates, dayCounts: counts };
  }, [history, watchlist]);

  // ── STREAK ──────────────────────────────────────────────────
  const streak = useMemo(() => {
    const uniqueDays = Object.keys(dayCounts).sort().reverse();
    if (uniqueDays.length === 0) return { current: 0, longest: 0 };

    let current = 0;
    const today = getLocalDateKey(new Date());
    const yesterday = getLocalDateKey(new Date(Date.now() - 86400000));

    if (uniqueDays[0] === today || uniqueDays[0] === yesterday) {
      current = 1;
      for (let i = 1; i < uniqueDays.length; i++) {
        const prev = new Date(uniqueDays[i-1] + 'T00:00:00');
        const curr = new Date(uniqueDays[i] + 'T00:00:00');
        const diffDays = Math.round((prev - curr) / 86400000);
        if (diffDays === 1) current++; else break;
      }
    }

    const asc = [...uniqueDays].sort();
    let longest = asc.length > 0 ? 1 : 0, run = 1;
    for (let i = 1; i < asc.length; i++) {
      const prev = new Date(asc[i-1] + 'T00:00:00');
      const curr = new Date(asc[i] + 'T00:00:00');
      const diffDays = Math.round((curr - prev) / 86400000);
      if (diffDays === 1) { run++; longest = Math.max(longest, run); }
      else run = 1;
    }
    return { 
      current, 
      longest: Math.max(longest, current) 
    };
  }, [dayCounts]);

  // ── STATUS BREAKDOWN ────────────────────────────────────────
  const statusBreakdown = useMemo(() => {
    const c = { watching: 0, completed: 0, plan_to_watch: 0, on_hold: 0, dropped: 0 };
    watchlist.forEach(i => { if (c[i.status] !== undefined) c[i.status]++; });
    return c;
  }, [watchlist]);

  // ── GENRE STATS ─────────────────────────────────────────────
  const genreStats = useMemo(() => {
    const c = {};
    watchlist.forEach(i => {
      let gArray = i.genres;
      if (typeof gArray === 'string') {
        try { gArray = JSON.parse(gArray); } catch (_) { gArray = []; }
      }
      if (gArray && Array.isArray(gArray)) {
        gArray.forEach(g => { c[g] = (c[g] || 0) + 1; });
      }
    });
    return Object.entries(c).sort((a, b) => b[1] - a[1]);
  }, [watchlist]);

  // ── DAILY ACTIVITY (30 days) ────────────────────────────────
  const dailyActivity = useMemo(() => {
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    const days = [];
    for (let i = 29; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const key = getLocalDateKey(d);
      const count = dayCounts[key] || 0;
      days.push({ 
        key, 
        label: d.getDate().toString(), 
        count,
        fullDate: d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
      });
    }
    return days;
  }, [dayCounts]);

  // ── BINGE STATS ─────────────────────────────────────────────
  const bingeStats = useMemo(() => {
    let maxDay = null, maxCount = 0;
    for (const [d, c] of Object.entries(dayCounts)) {
      if (c > maxCount) { maxCount = c; maxDay = d; }
    }
    const droppedShows = watchlist.filter(i => i.status === 'dropped');
    let droppedAt3 = 0;
    droppedShows.forEach(s => { 
      const eps = Number(s.episodes_watched) || 0;
      if (eps >= 1 && eps <= 4) droppedAt3++; 
    });
    const dropRate = droppedShows.length > 0 ? Math.round((droppedAt3 / droppedShows.length) * 100) : 0;
    return {
      longestBinge: maxCount || 0,
      longestBingeDate: maxDay ? new Date(maxDay + 'T00:00:00').toLocaleDateString(undefined, {month:'short', day:'numeric'}) : 'No activity',
      droppedAt3Rate: dropRate,
    };
  }, [dayCounts, watchlist]);

  // ── TIMELINE LOGS (History with fallback) ───────────────────
  const timelineLogs = useMemo(() => {
    if (history && history.length > 0) return history;
    return []; // Don't synthesize fake entries — show empty state instead
  }, [history]);

  const paginatedHistory = timelineLogs.slice(0, historyPage * HISTORY_PAGE_SIZE);
  const hasMoreHistory = timelineLogs.length > historyPage * HISTORY_PAGE_SIZE;

  // ── SVG: STATUS DONUT ───────────────────────────────────────
  const renderStatusDonut = () => {
    const s = statusBreakdown;
    const total = Object.values(s).reduce((a, b) => a + b, 0);
    if (total === 0) return <p className="text-center text-xs font-bold text-stone-500 py-12">No data yet</p>;
    const r = 70, circ = 2 * Math.PI * r;
    const entries = Object.entries(s).filter(([,v]) => v > 0);
    let acc = 0;
    return (
      <svg viewBox="0 0 200 200" className="w-full max-w-[170px] mx-auto block overflow-visible">
        <circle cx="100" cy="100" r={r} fill="none" stroke="var(--sand-300)" strokeWidth="20" />
        {entries.map(([k, v]) => {
          const len = (v / total) * circ;
          const o = acc; acc += len;
          return (
            <circle 
              key={k} 
              cx="100" 
              cy="100" 
              r={r} 
              fill="none" 
              stroke={STATUS_COLORS[k]} 
              strokeWidth="20" 
              strokeDasharray={`${len} ${circ}`} 
              strokeDashoffset={-o} 
              transform="rotate(-90 100 100)" 
              className="transition-all duration-300 hover:stroke-[24] cursor-pointer" 
            />
          );
        })}
        <text x="100" y="96" textAnchor="middle" fill="var(--ink-900)" style={{font: "900 28px 'Lora',serif"}}>{total}</text>
        <text x="100" y="114" textAnchor="middle" fill="var(--stone-600)" style={{font: "900 9px 'DM Sans',sans-serif", letterSpacing: '0.1em'}}>SHOWS</text>
      </svg>
    );
  };

  // ── SVG: GENRE RADAR ────────────────────────────────────────
  const renderGenreRadar = () => {
    const top = genreStats.slice(0, 6);
    if (top.length === 0) return <p className="text-center text-xs font-bold text-stone-500 py-12">No genre data</p>;
    
    if (top.length < 3) {
      const totalCount = top.reduce((a, b) => a + b[1], 0);
      return (
        <div className="w-full py-4 space-y-2.5">
          {top.map(([name, count]) => (
            <div key={name} className="space-y-1">
              <div className="flex justify-between text-xs font-bold text-ink-900">
                <span>{name}</span>
                <span>{count} shows ({Math.round((count/totalCount)*100)}%)</span>
              </div>
              <div className="h-3 bg-sand-200 rounded-full overflow-hidden border border-stone-900/20">
                <div className="h-full bg-amber-500 transition-all duration-700" style={{ width: `${(count/totalCount)*100}%` }} />
              </div>
            </div>
          ))}
        </div>
      );
    }

    const maxVal = Math.max(...top.map(d => d[1]), 1);
    const cx = 140, cy = 140, r = 80, N = top.length;
    const levels = [0.25, 0.5, 0.75, 1];
    return (
      <svg viewBox="0 0 280 280" className="w-full max-w-[240px] mx-auto block overflow-visible">
        {/* Web rings */}
        {levels.map((level, idx) => {
          const pts = top.map((_, i) => {
            const theta = i * (2 * Math.PI) / N - Math.PI / 2;
            return `${(cx + r * level * Math.cos(theta)).toFixed(1)},${(cy + r * level * Math.sin(theta)).toFixed(1)}`;
          }).join(' ');
          return <polygon key={idx} points={pts} fill={idx === levels.length - 1 ? 'rgba(128,128,128,0.06)' : 'none'} stroke="var(--stone-500)" strokeWidth="1" strokeDasharray="2 3" strokeOpacity="0.3" />;
        })}
        {/* Axes */}
        {top.map((_, i) => {
          const theta = i * (2 * Math.PI) / N - Math.PI / 2;
          return <line key={i} x1={cx} y1={cy} x2={cx + r * Math.cos(theta)} y2={cy + r * Math.sin(theta)} stroke="var(--stone-500)" strokeWidth="1" strokeOpacity="0.4" />;
        })}
        {/* Data polygon */}
        <polygon
          points={top.map(([,count], i) => {
            const theta = i * (2 * Math.PI) / N - Math.PI / 2;
            const valR = r * (count / maxVal);
            return `${(cx + valR * Math.cos(theta)).toFixed(1)},${(cy + valR * Math.sin(theta)).toFixed(1)}`;
          }).join(' ')}
          fill="rgba(245,158,11,0.3)" stroke="#f59e0b" strokeWidth="2.5" strokeLinejoin="round"
        />
        {/* Data dots */}
        {top.map(([name, count], i) => {
          const theta = i * (2 * Math.PI) / N - Math.PI / 2;
          const valR = r * (count / maxVal);
          return <circle key={name} cx={cx + valR * Math.cos(theta)} cy={cy + valR * Math.sin(theta)} r="4" fill="#f59e0b" stroke="#fff" strokeWidth="2" />;
        })}
        {/* Labels */}
        {top.map(([name], i) => {
          const theta = i * (2 * Math.PI) / N - Math.PI / 2;
          const lx = cx + (r + 20) * Math.cos(theta);
          const ly = cy + (r + 16) * Math.sin(theta);
          const anchor = lx < cx - 10 ? 'end' : (lx > cx + 10 ? 'start' : 'middle');
          const shortName = name.length > 10 ? name.slice(0, 9) + '…' : name;
          return <text key={name} x={lx} y={ly + 3} textAnchor={anchor} fill="var(--ink-900)" style={{font: "800 9px 'DM Sans',sans-serif"}}>{shortName}</text>;
        })}
      </svg>
    );
  };

  // ── SVG: DAILY TREND (30 DAYS) ──────────────────────────────
  const renderDailyTrend = () => {
    const data = dailyActivity;
    const maxVal = Math.max(...data.map(d => d.count), 1);
    const W = 600, H = 160, padL = 25, padR = 15, padT = 15, padB = 25;
    const cW = W - padL - padR, cH = H - padT - padB;
    const pts = data.map((d, i) => ({
      x: padL + (i / 29) * cW,
      y: padT + cH - (d.count / maxVal) * cH,
      ...d
    }));
    const linePath = pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');
    const areaPath = linePath + ` L${pts[pts.length-1].x.toFixed(1)},${padT + cH} L${pts[0].x.toFixed(1)},${padT + cH} Z`;
    return (
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full max-w-[700px] mx-auto block" preserveAspectRatio="xMidYMid meet">
        {/* Grid lines */}
        {[0, 0.33, 0.66, 1].map(f => {
          const y = padT + cH - f * cH;
          return (
            <g key={f}>
              <line x1={padL} y1={y} x2={W - padR} y2={y} stroke="var(--stone-500)" strokeOpacity="0.15" strokeDasharray="3 3" />
              <text x={padL - 4} y={y + 3} textAnchor="end" fill="var(--stone-500)" style={{font: "700 8px 'DM Sans',sans-serif"}}>{Math.round(f * maxVal)}</text>
            </g>
          );
        })}
        <path d={areaPath} fill="rgba(124,58,237,0.12)" />
        <path d={linePath} fill="none" stroke="#7c3aed" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
        {pts.map((p, i) => (
          <circle 
            key={i} 
            cx={p.x} 
            cy={p.y} 
            r={p.count > 0 ? 4 : 2} 
            fill={p.count > 0 ? '#7c3aed' : 'var(--sand-300)'} 
            stroke={p.count > 0 ? 'var(--sand-50)' : 'var(--sand-400)'} 
            strokeWidth="1.5"
            className="cursor-pointer hover:scale-150 transition-transform"
            onMouseEnter={() => setActiveTooltip(`${p.count} episodes on ${p.fullDate}`)}
            onMouseLeave={() => setActiveTooltip(null)}
          />
        ))}
        {pts.filter((_, i) => i % 5 === 0 || i === 29).map(p => (
          <text key={p.key} x={p.x} y={H - 6} textAnchor="middle" fill="var(--stone-500)" style={{font: "700 8px 'DM Sans',sans-serif"}}>{p.label}</text>
        ))}
      </svg>
    );
  };

  // ── SVG: ACTIVITY HEATMAP (Full 6 Months: 1 Month Prior Through Future) ─────
  const renderHeatmap = () => {
    const numWeeks = 24; // Full 6-month GitHub-style view (24 weeks)
    const cellSize = 11, cellGap = 3;
    const W = (numWeeks * (cellSize + cellGap)) + 30;
    const H = (7 * (cellSize + cellGap)) + 25;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Start date is exactly the 1st of the previous month (e.g. July if present is August)
    const startOfPrevMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1);
    const startDate = new Date(startOfPrevMonth);
    startDate.setDate(startOfPrevMonth.getDate() - startOfPrevMonth.getDay()); // align to Sunday

    const dailyData = [];
    for (let w = 0; w < numWeeks; w++) {
      for (let d = 0; d < 7; d++) {
        const cellDate = new Date(startDate);
        cellDate.setDate(startDate.getDate() + (w * 7 + d));
        const dateStr = getLocalDateKey(cellDate);
        const count = dayCounts[dateStr] || 0;
        const isFuture = cellDate > today;
        dailyData.push({ w, d, dateStr, count, cellDate, isFuture });
      }
    }

    // Month headers calculation (Jul, Aug, Sep, Oct, Nov, Dec)
    const monthHeaders = [];
    let lastMonth = -1;
    let lastMonthX = -100;

    for (let w = 0; w < numWeeks; w++) {
      const weekDate = new Date(startDate);
      weekDate.setDate(startDate.getDate() + (w * 7 + 3)); // check mid-week
      const m = weekDate.getMonth();
      const x = 30 + w * (cellSize + cellGap);
      if (m !== lastMonth && (x - lastMonthX > 22)) {
        monthHeaders.push(
          <text 
            key={`m_${w}`} 
            x={x} 
            y={12} 
            fill="var(--stone-600)" 
            style={{ font: "700 9px 'DM Sans',sans-serif" }}
          >
            {weekDate.toLocaleString('default', { month: 'short' })}
          </text>
        );
        lastMonth = m;
        lastMonthX = x;
      }
    }

    return (
      <svg viewBox={`0 0 ${W} ${H}`} width={W} height={H} className="block mx-auto overflow-visible">
        {monthHeaders}

        {/* Day of week labels */}
        <text x="22" y={20 + 1 * (cellSize + cellGap) + 8} textAnchor="end" fill="var(--stone-600)" style={{font: "700 8.5px 'DM Sans',sans-serif"}}>M</text>
        <text x="22" y={20 + 3 * (cellSize + cellGap) + 8} textAnchor="end" fill="var(--stone-600)" style={{font: "700 8.5px 'DM Sans',sans-serif"}}>W</text>
        <text x="22" y={20 + 5 * (cellSize + cellGap) + 8} textAnchor="end" fill="var(--stone-600)" style={{font: "700 8.5px 'DM Sans',sans-serif"}}>F</text>

        {/* Heatmap Rectangles */}
        {dailyData.map(({ w, d, dateStr, count, isFuture, cellDate }) => {
          let fill = 'var(--sand-300)';
          if (!isFuture && count > 0) {
            if (count <= 2) fill = '#fde68a';
            else if (count <= 5) fill = '#f59e0b';
            else if (count <= 9) fill = '#d97706';
            else fill = '#ea580c';
          }
          const formattedDate = cellDate.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
          const isToday = getLocalDateKey(today) === dateStr;
          const tooltipText = isFuture 
            ? `Upcoming • ${formattedDate}` 
            : `${count} episode${count === 1 ? '' : 's'} on ${formattedDate}`;

          return (
            <rect 
              key={dateStr + w + d} 
              x={30 + w * (cellSize + cellGap)} 
              y={20 + d * (cellSize + cellGap)} 
              width={cellSize} 
              height={cellSize} 
              rx="2.5" 
              fill={fill}
              opacity={isFuture ? 0.35 : 1}
              stroke={isToday ? 'var(--ink-900)' : 'none'}
              strokeWidth={isToday ? 1.5 : 0}
              className="cursor-pointer hover:stroke-ink-900 hover:stroke-[2] transition-all"
              onMouseEnter={() => { if (!pinnedTooltip) setActiveTooltip(tooltipText); }}
              onMouseLeave={() => { if (!pinnedTooltip) setActiveTooltip(null); }}
              onClick={() => {
                if (pinnedTooltip && activeTooltip === tooltipText) {
                  setPinnedTooltip(false);
                  setActiveTooltip(null);
                } else {
                  setPinnedTooltip(true);
                  setActiveTooltip(tooltipText);
                }
              }}
            />
          );
        })}
      </svg>
    );
  };

  if (!watchlist || watchlist.length === 0) {
    return (
      <div className="text-center py-16 space-y-4">
        <div className="card-manga-panel p-8 max-w-md mx-auto bg-sand-50 dark:bg-sand-200">
          <BarChart2 className="w-12 h-12 text-stone-400 mx-auto mb-4" />
          <h3 className="font-display font-black text-lg text-ink-900 uppercase mb-2">No Stats Yet</h3>
          <p className="font-sans text-sm font-bold text-stone-500">Start tracking anime in the Schedule tab to generate live statistics.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 pb-20">
      {/* Header */}
      <div className="card-manga-panel p-4 bg-sand-50 dark:bg-sand-200">
        <h1 className="font-display font-black text-xl text-ink-900 uppercase tracking-tight">Anime Analytics</h1>
        <p className="text-xs text-stone-500 font-sans mt-0.5">Live real-time statistics synced with your watchlist</p>
      </div>

      {/* ═══ HERO STAT CARDS ═══ */}
      <div className="grid grid-cols-2 gap-3">
        <div className="card-manga-panel p-3.5 bg-sand-50 dark:bg-sand-200">
          <div className="flex items-center justify-between text-stone-500">
            <span className="text-[10px] font-black uppercase">Total Series</span>
            <Film className="w-4 h-4 text-amber-500" />
          </div>
          <p className="font-mono font-black text-2xl text-ink-900 mt-1">
            {heroStats.totalSeries}
            {heroStats.totalSeries !== heroStats.total && (
              <span className="text-xs font-bold text-stone-500 ml-1.5 font-sans">
                ({heroStats.total} seasons)
              </span>
            )}
          </p>
          <span className="text-[10px] text-stone-500 font-mono">{heroStats.totalEps} episodes</span>
        </div>
        <div className="card-manga-panel p-3.5 bg-sand-50 dark:bg-sand-200">
          <div className="flex items-center justify-between text-stone-500">
            <span className="text-[10px] font-black uppercase">Completion</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
          </div>
          <p className="font-mono font-black text-2xl text-ink-900 mt-1">{heroStats.completionRate}%</p>
          <div className="mt-1.5 h-2.5 bg-sand-200 dark:bg-sand-300 rounded-full border border-stone-900/20 overflow-hidden p-0.5">
            <div className="h-full rounded-full bg-emerald-500 transition-all duration-700" style={{ width: `${heroStats.completionRate}%`, minWidth: heroStats.completionRate > 0 ? '4px' : '0' }} />
          </div>
          <span className="text-[10px] text-stone-500 font-mono mt-0.5 block">{heroStats.completedFranchises} / {heroStats.totalSeries} series finished</span>
        </div>
        <div className="card-manga-panel p-3.5 bg-sand-50 dark:bg-sand-200">
          <div className="flex items-center justify-between text-stone-500">
            <span className="text-[10px] font-black uppercase">Time</span>
            <Clock className="w-4 h-4 text-navy-700" />
          </div>
          <p className="font-mono font-black text-2xl text-ink-900 mt-1">{heroStats.days}d</p>
          <span className="text-[10px] text-stone-500 font-mono">~{heroStats.hours} hours</span>
        </div>
        <div className="card-manga-panel p-3.5 bg-sand-50 dark:bg-sand-200">
          <div className="flex items-center justify-between text-stone-500">
            <span className="text-[10px] font-black uppercase">Streak</span>
            <Flame className={`w-4 h-4 ${streak.current > 0 ? 'animate-flame-glow text-amber-500' : 'text-stone-400'}`} />
          </div>
          <p className="font-mono font-black text-2xl text-ink-900 mt-1 flex items-center gap-1.5">
            <span className={streak.current > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-stone-400'}>{streak.current}d</span>
            {streak.current > 0 && <Flame className="w-5 h-5 text-amber-500 fill-amber-500 animate-flame-glow" />}
          </p>
          <span className="text-[10px] text-stone-500 font-mono">Best: {streak.longest}d streak</span>
        </div>
      </div>

      {/* ═══ BINGE STATS + HEATMAP ═══ */}
      <div className="card-manga-panel p-4 bg-sand-50 dark:bg-sand-200 relative">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b-2 border-stone-900 pb-2 mb-3">
          <h3 className="font-display font-black text-sm uppercase text-ink-900 flex items-center gap-1.5">
            <Activity className="w-4 h-4" /> Activity Heatmap
          </h3>
          <div className="flex gap-2 text-[10px] font-bold">
            <span className="bg-amber-100 text-amber-800 px-1.5 py-0.5 rounded border border-amber-300 flex items-center gap-1">
              <Flame className="w-3 h-3 text-amber-600 fill-amber-500" />
              <span>Best: {bingeStats.longestBinge} eps ({bingeStats.longestBingeDate})</span>
            </span>
          </div>
        </div>

        {/* Scrollable Heatmap View */}
        <div className="w-full overflow-x-auto pb-2 hide-scrollbar">
          <div className="min-w-fit flex items-center justify-center pt-1 px-1">
            {renderHeatmap()}
          </div>
        </div>

        {/* Tooltip feedback bar */}
        {activeTooltip ? (
          <div className="text-center text-xs font-mono font-black text-amber-800 dark:text-amber-300 mt-1 py-1 bg-amber-100/80 dark:bg-amber-950/40 rounded border border-amber-300 dark:border-amber-800 animate-fade-in">
            {activeTooltip}
          </div>
        ) : (
          <div className="text-center text-[10px] font-sans text-stone-400 mt-1">
            Tap or hover any square to see episode activity
          </div>
        )}

        {/* Enhanced Heatmap Legend */}
        <div className="flex flex-wrap items-center justify-between gap-2 text-[9px] font-bold text-stone-500 mt-2.5 pt-2 border-t border-stone-900/10">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-xs bg-[#E6E0D4] opacity-40 border border-stone-400" />
            <span className="font-mono text-stone-500">Upcoming Season (Jul–Dec)</span>
          </div>

          <div className="flex items-center gap-1">
            <span>Less</span>
            {['#E6E0D4','#fde68a','#f59e0b','#d97706','#ea580c'].map(c => (
              <span key={c} className="w-2.5 h-2.5 rounded-xs border border-stone-300" style={{background: c}} />
            ))}
            <span>More Activity</span>
          </div>
        </div>
      </div>

      {/* ═══ STATUS DONUT + GENRE RADAR (side by side) ═══ */}
      <div className="grid grid-cols-2 gap-3">
        <div className="card-manga-panel p-3 bg-sand-50 dark:bg-sand-200 flex flex-col">
          <h3 className="font-display font-black text-xs uppercase text-ink-900 border-b-2 border-stone-900 pb-1.5 mb-3">Watch Status</h3>
          <div className="flex-grow flex items-center justify-center py-1">
            {renderStatusDonut()}
          </div>
          <div className="flex flex-wrap gap-x-3 gap-y-1 mt-2 justify-center">
            {Object.entries(statusBreakdown).filter(([,v]) => v > 0).map(([k, v]) => (
              <div key={k} className="flex items-center gap-1">
                <span className="w-2 h-2 flex-shrink-0 border border-stone-900/20" style={{background: STATUS_COLORS[k]}} />
                <span className="text-[9px] font-bold text-stone-600">{STATUS_LABELS[k]} {v}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="card-manga-panel p-3 bg-sand-50 dark:bg-sand-200 flex flex-col">
          <h3 className="font-display font-black text-xs uppercase text-ink-900 border-b-2 border-stone-900 pb-1.5 mb-3">Genre Breakdown</h3>
          <div className="flex-grow flex items-center justify-center py-1">
            {renderGenreRadar()}
          </div>
        </div>
      </div>

      {/* ═══ WATCH TREND (30 DAYS) ═══ */}
      <div className="card-manga-panel p-4 bg-sand-50 dark:bg-sand-200">
        <h3 className="font-display font-black text-sm uppercase text-ink-900 border-b-2 border-stone-900 pb-2 mb-3 flex items-center gap-1.5">
          <TrendingUp className="w-4 h-4" /> Watch Trend (30 Days)
        </h3>
        <div className="flex items-center justify-center w-full">
          {renderDailyTrend()}
        </div>
      </div>

      {/* ═══ ANIME PROGRESS STREAM ═══ */}
      <div className="card-manga-panel p-4 bg-sand-50 dark:bg-sand-200">
        <div className="flex items-center justify-between border-b-2 border-stone-900 pb-2 mb-4">
          <h3 className="font-display font-black text-sm uppercase text-ink-900 flex items-center gap-1.5">
            <Activity className="w-4 h-4 text-amber-500" />
            <span>Anime Progress Stream</span>
          </h3>
          <span className="text-[10px] font-mono font-bold text-stone-500">
            {history.length} Event{history.length === 1 ? '' : 's'}
          </span>
        </div>

        {paginatedHistory.length > 0 ? (
          <div className="relative pl-5 border-l-[3px] border-stone-900/40 dark:border-stone-700/40 space-y-3.5 ml-1.5">
            {paginatedHistory.map((log, idx) => {
              const matchedItem = watchlist.find(i => parseInt(i.anime_id || i.id) === parseInt(log.anime_id));
              const title = log.anime_title || matchedItem?.anime_title || 'Anime';
              const rawNote = log.note || '';

              // Visual badge/color config per action
              const getBadgeConfig = () => {
                const noteLower = rawNote.toLowerCase();
                const type = log.action_type || '';

                if (type === 'completed' || noteLower.includes('completed')) {
                  return { dot: 'bg-lime-500', badgeBg: 'bg-lime-500/20 border-lime-500/40 text-lime-800 dark:text-lime-300' };
                }
                if (type === 'plan_to_watch' || noteLower.includes('plan')) {
                  return { dot: 'bg-sky-500', badgeBg: 'bg-sky-500/20 border-sky-500/40 text-sky-800 dark:text-sky-300' };
                }
                if (type === 'on_hold' || noteLower.includes('hold')) {
                  return { dot: 'bg-amber-500', badgeBg: 'bg-amber-500/20 border-amber-500/40 text-amber-800 dark:text-amber-300' };
                }
                if (type === 'dropped' || noteLower.includes('dropped')) {
                  return { dot: 'bg-rose-500', badgeBg: 'bg-rose-500/20 border-rose-500/40 text-rose-800 dark:text-rose-300' };
                }
                if (type === 'rewatch' || noteLower.includes('rewatch')) {
                  return { dot: 'bg-purple-500', badgeBg: 'bg-purple-500/20 border-purple-500/40 text-purple-800 dark:text-purple-300' };
                }
                if (type === 'removed' || noteLower.includes('removed')) {
                  return { dot: 'bg-stone-500', badgeBg: 'bg-stone-500/20 border-stone-500/40 text-stone-700 dark:text-stone-300' };
                }
                return { dot: 'bg-emerald-500', badgeBg: 'bg-emerald-500/20 border-emerald-500/40 text-emerald-800 dark:text-emerald-300' };
              };

              const badge = getBadgeConfig();

              return (
                <div key={log.id || idx} className="relative">
                  <div className={`absolute -left-[23px] top-1 w-3 h-3 ${badge.dot} border-[2.5px] border-stone-900 rounded-full shadow-2xs`} />
                  <time className="block font-mono text-[9px] font-bold text-stone-500 mb-0.5">
                    {new Date(log.watched_at).toLocaleString()}
                  </time>
                  <div className="font-sans text-xs font-bold text-stone-700 dark:text-stone-300 flex flex-wrap items-center gap-1.5">
                    <span className="font-black text-ink-900">
                      {title}
                    </span>
                    {log.episode_number > 0 && (
                      <span className="font-mono font-black text-stone-900 dark:text-stone-100 bg-sand-200 dark:bg-stone-800 px-1.5 py-0.2 rounded border border-stone-900/30 dark:border-stone-600 text-[11px]">
                        Ep {log.episode_number}
                      </span>
                    )}
                    {rawNote && (
                      <span className={`text-[11px] font-bold px-2 py-0.5 rounded border ${badge.badgeBg}`}>
                        {rawNote}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-6">
            <p className="text-xs font-bold text-stone-500">No anime updates yet.</p>
            <p className="text-[10px] text-stone-400 font-sans mt-1">Add anime to your watchlist or log episodes to see your activity timeline here.</p>
          </div>
        )}
        {hasMoreHistory && (
          <div className="mt-4 text-center">
            <button
              onClick={() => setHistoryPage(p => p + 1)}
              className="btn-manga bg-amber-400 hover:bg-amber-300 text-ink-900 text-xs px-4 py-2 font-black"
            >
              Load More History
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
