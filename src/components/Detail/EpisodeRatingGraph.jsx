import React, { useState, useEffect, useMemo, useRef } from 'react';
import { TrendingUp, Star, Award, ChevronLeft, ChevronRight, Check, Eye, ShieldCheck } from 'lucide-react';
import { sound } from '../../services/soundEffects';
import { getAccurateEpisodeRatings } from '../../services/imdbRatingsService';

export default function EpisodeRatingGraph({
  anime,
  watchlistEntry,
  onStepToEpisode,
  titleLanguage = 'english'
}) {
  const [selectedEp, setSelectedEp] = useState(null);
  const [pageRange, setPageRange] = useState(0); // 0 = 1-12, 1 = 13-24, etc.
  const [ratingData, setRatingData] = useState({ episodes: [], source: 'Loading...' });
  const containerRef = useRef(null);

  const episodesWatched = Number(watchlistEntry?.episodes_watched) || 0;

  useEffect(() => {
    let isCurrent = true;
    async function loadRatings() {
      if (!anime) return;
      const res = await getAccurateEpisodeRatings(anime);
      if (isCurrent) {
        setRatingData(res);
      }
    }
    loadRatings();
    return () => { isCurrent = false; };
  }, [anime]);

  const episodeData = useMemo(() => {
    return (ratingData.episodes || []).map(ep => ({
      ...ep,
      isWatched: ep.episode <= episodesWatched
    }));
  }, [ratingData.episodes, episodesWatched]);

  // Find peak episode in the dataset
  const peakEpisode = useMemo(() => {
    if (!episodeData.length) return null;
    let max = episodeData[0];
    for (const ep of episodeData) {
      if (ep.score > max.score) max = ep;
    }
    return max;
  }, [episodeData]);

  // Average episodic rating
  const avgEpScore = useMemo(() => {
    if (!episodeData.length) return '0.0';
    const sum = episodeData.reduce((acc, ep) => acc + ep.score, 0);
    return (sum / episodeData.length).toFixed(1);
  }, [episodeData]);

  // Pagination for shows with > 12 episodes (12 episodes per window)
  const windowSize = 12;
  const totalPages = Math.ceil(episodeData.length / windowSize);
  const currentEpisodes = useMemo(() => {
    const start = pageRange * windowSize;
    return episodeData.slice(start, start + windowSize);
  }, [episodeData, pageRange]);

  // SVG Chart Geometry
  const svgWidth = 600;
  const svgHeight = 170;
  const paddingX = 40;
  const paddingTop = 36;
  const paddingBottom = 34;

  const minRating = 7.0;
  const maxRating = 10.0;

  const getX = (index, total) => {
    if (total <= 1) return svgWidth / 2;
    return paddingX + (index / (total - 1)) * (svgWidth - paddingX * 2);
  };

  const getY = (score) => {
    const ratio = (score - minRating) / (maxRating - minRating);
    return (svgHeight - paddingBottom) - ratio * (svgHeight - paddingTop - paddingBottom);
  };

  // Generate SVG Path
  const points = currentEpisodes.map((ep, idx) => ({
    x: getX(idx, currentEpisodes.length),
    y: getY(ep.score),
    ...ep
  }));

  const linePath = points.reduce((acc, pt, idx, arr) => {
    if (idx === 0) return `M ${pt.x} ${pt.y}`;
    // Smooth Catmull-Rom / Bezier curve
    const prev = arr[idx - 1];
    const cpX1 = prev.x + (pt.x - prev.x) / 2;
    const cpY1 = prev.y;
    const cpX2 = prev.x + (pt.x - prev.x) / 2;
    const cpY2 = pt.y;
    return `${acc} C ${cpX1} ${cpY1}, ${cpX2} ${cpY2}, ${pt.x} ${pt.y}`;
  }, '');

  const areaPath = points.length > 0 ? `
    ${linePath}
    L ${points[points.length - 1].x} ${svgHeight - paddingBottom}
    L ${points[0].x} ${svgHeight - paddingBottom}
    Z
  ` : '';

  const handleNodeClick = (ep) => {
    sound.playTab();
    setSelectedEp(selectedEp?.episode === ep.episode ? null : ep);
  };

  return (
    <div className="card-manga-panel p-4 bg-sand-50 dark:bg-sand-200 border-2 border-stone-900 shadow-manga space-y-3">
      
      {/* Graph Header */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded bg-amber-400 border border-stone-900 shadow-[1px_1px_0px_0px_rgba(24,19,13,1)]">
            <TrendingUp className="w-3.5 h-3.5 text-stone-950 stroke-[2.5]" />
          </div>
          <div>
            <h3 className="font-display font-black text-xs sm:text-sm uppercase tracking-tight text-ink-900 flex items-center gap-1.5">
              <span>Episode Rating Trend</span>
              <span className="text-[9px] font-mono font-black bg-amber-400 text-stone-950 px-1.5 py-0.5 rounded border border-stone-900 shadow-xs uppercase">
                {ratingData.source || 'IMDb Verified'}
              </span>
            </h3>
          </div>
        </div>

        {/* Highlight Pills */}
        <div className="flex items-center gap-1.5 font-mono text-[10px]">
          {peakEpisode && (
            <span className="px-2 py-0.5 rounded bg-amber-400 text-stone-950 font-black border border-stone-900 shadow-sm flex items-center gap-1">
              <Award className="w-3 h-3 text-stone-950 fill-current" />
              <span>Peak: {peakEpisode.epLabel} ({peakEpisode.score})</span>
            </span>
          )}
          <span className="px-2 py-0.5 rounded bg-sand-200 dark:bg-sand-300 text-stone-700 dark:text-stone-300 font-bold border border-stone-900/30">
            Avg {avgEpScore}/10
          </span>
        </div>
      </div>

      {/* Interactive SVG Chart Container */}
      <div 
        ref={containerRef}
        className="relative bg-sand-100/80 dark:bg-[#15120F] rounded-lg border-2 border-stone-900 p-2 overflow-hidden shadow-inner select-none"
      >
        <svg 
          viewBox={`0 0 ${svgWidth} ${svgHeight}`} 
          className="w-full h-auto overflow-visible"
          style={{ minHeight: '135px' }}
        >
          <defs>
            {/* Gradient under trend curve */}
            <linearGradient id="trendGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#D4974A" stopOpacity="0.32" />
              <stop offset="100%" stopColor="#D4974A" stopOpacity="0.0" />
            </linearGradient>
            
            {/* Peak Glow Filter */}
            <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
          </defs>

          {/* Reference Horizontal Gridlines */}
          {[8.0, 9.0, 10.0].map((score) => {
            const y = getY(score);
            return (
              <g key={score}>
                <line
                  x1={paddingX - 10}
                  y1={y}
                  x2={svgWidth - paddingX + 10}
                  y2={y}
                  stroke="currentColor"
                  className="text-stone-300 dark:text-stone-700/60"
                  strokeWidth="1"
                  strokeDasharray="3 3"
                />
                <text
                  x={paddingX - 14}
                  y={y + 3}
                  textAnchor="end"
                  className="text-[9px] font-mono font-bold fill-stone-400 dark:fill-stone-600"
                >
                  {score.toFixed(1)}
                </text>
              </g>
            );
          })}

          {/* Area Fill */}
          <path
            d={areaPath}
            fill="url(#trendGradient)"
          />

          {/* Main Curve Line */}
          <path
            d={linePath}
            fill="none"
            stroke="#D4974A"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="filter drop-shadow-[0_2px_4px_rgba(212,151,74,0.3)]"
          />

          {/* Interactive Episode Nodes */}
          {points.map((pt) => {
            const isPeak = peakEpisode && pt.episode === peakEpisode.episode;
            const isSelected = selectedEp?.episode === pt.episode;

            return (
              <g 
                key={pt.episode} 
                className="cursor-pointer group"
                onClick={() => handleNodeClick(pt)}
              >
                {/* Vertical hover indicator bar */}
                <line
                  x1={pt.x}
                  y1={paddingTop - 12}
                  x2={pt.x}
                  y2={svgHeight - paddingBottom}
                  stroke={isSelected ? '#D4974A' : 'transparent'}
                  strokeWidth="1.5"
                  strokeDasharray="2 2"
                />

                {/* Score Pill Banner Above Node */}
                <g transform={`translate(${pt.x}, ${pt.y - 12})`}>
                  <rect
                    x="-13"
                    y="-13"
                    width="26"
                    height="14"
                    rx="3"
                    className={
                      isPeak
                        ? "fill-amber-400 stroke-stone-900"
                        : isSelected
                          ? "fill-stone-900 stroke-stone-900"
                          : "fill-sand-50 dark:fill-stone-800 stroke-stone-900/60 dark:stroke-stone-600"
                    }
                    strokeWidth="1.2"
                  />
                  <text
                    x="0"
                    y="-3"
                    textAnchor="middle"
                    className={`text-[9px] font-mono font-black ${
                      isPeak
                        ? "fill-stone-950"
                        : isSelected
                          ? "fill-white"
                          : "fill-ink-900 dark:fill-sand-100"
                    }`}
                  >
                    {pt.score.toFixed(1)}
                  </text>
                </g>

                {/* Node Outer Halo for Peak */}
                {isPeak && (
                  <circle
                    cx={pt.x}
                    cy={pt.y}
                    r="8"
                    className="fill-amber-400/40 animate-ping"
                  />
                )}

                {/* Node Circle */}
                <circle
                  cx={pt.x}
                  cy={pt.y}
                  r={isPeak || isSelected ? "5.5" : "4"}
                  className={`transition-all ${
                    isPeak
                      ? "fill-amber-400 stroke-stone-950 stroke-[2.5]"
                      : isSelected
                        ? "fill-stone-950 dark:fill-amber-400 stroke-amber-400 stroke-2"
                        : pt.isWatched
                          ? "fill-emerald-500 stroke-stone-900 stroke-2"
                          : "fill-sand-50 dark:fill-stone-100 stroke-stone-900 stroke-2 group-hover:fill-amber-400"
                  }`}
                />

                {/* X-Axis Episode Label */}
                <text
                  x={pt.x}
                  y={svgHeight - 12}
                  textAnchor="middle"
                  className={`text-[10px] font-mono font-black uppercase transition-colors ${
                    isSelected
                      ? "fill-amber-500"
                      : isPeak
                        ? "fill-amber-600 dark:fill-amber-400"
                        : pt.isWatched
                          ? "fill-emerald-600 dark:fill-emerald-400"
                          : "fill-stone-500 dark:fill-stone-400"
                  }`}
                >
                  {pt.epLabel}
                </text>
              </g>
            );
          })}
        </svg>

        {/* Selected Episode Detail Drawer */}
        {selectedEp && (
          <div className="mt-2 p-2.5 bg-sand-50 dark:bg-stone-800 rounded border-2 border-stone-900 flex items-center justify-between animate-fade-in shadow-sm">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded bg-amber-400 text-stone-950 border border-stone-900 flex items-center justify-center font-mono font-black text-xs shrink-0">
                {selectedEp.epLabel}
              </div>
              <div>
                <p className="text-xs font-black text-ink-900">
                  Episode {selectedEp.episode}{selectedEp.title && selectedEp.title !== `Episode ${selectedEp.episode}` ? `: ${selectedEp.title}` : ''}
                  {peakEpisode?.episode === selectedEp.episode && (
                    <span className="ml-1.5 px-1.5 py-0.2 bg-amber-400 text-stone-950 text-[9px] font-black uppercase rounded">
                      Season Peak
                    </span>
                  )}
                </p>
                <p className="text-[10px] text-stone-500 font-mono flex items-center gap-1">
                  <Star className="w-3 h-3 text-amber-500 fill-amber-500" />
                  <span>Rating: {selectedEp.score}/10</span>
                  <span className="mx-1">•</span>
                  <span>{selectedEp.isWatched ? 'Watched' : 'Not watched yet'}</span>
                </p>
              </div>
            </div>

            {/* Quick Step Button */}
            {onStepToEpisode && (
              <button
                onClick={() => {
                  onStepToEpisode(selectedEp.episode);
                  sound.playEpisodeStep();
                }}
                className={`btn-manga text-[10px] px-2.5 py-1 font-black flex items-center gap-1 ${
                  selectedEp.isWatched
                    ? 'bg-sand-200 dark:bg-sand-300 text-stone-700'
                    : 'bg-emerald-400 text-stone-950'
                }`}
              >
                {selectedEp.isWatched ? <Check className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                <span>{selectedEp.isWatched ? `Watched (${selectedEp.episode})` : `Set Ep ${selectedEp.episode}`}</span>
              </button>
            )}
          </div>
        )}
      </div>

      {/* Multi-Window Range Selector (for 24+ episode series) */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between pt-1 text-xs">
          <span className="text-[10px] font-mono text-stone-500">
            Showing Ep {pageRange * windowSize + 1} - {Math.min((pageRange + 1) * windowSize, episodeData.length)} of {episodeData.length}
          </span>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setPageRange(prev => Math.max(0, prev - 1))}
              disabled={pageRange === 0}
              className="p-1 rounded border border-stone-900 bg-sand-100 dark:bg-sand-300 text-ink-900 disabled:opacity-40"
              title="Previous 12 Episodes"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>
            <span className="font-mono text-[10px] font-bold px-1.5">
              {pageRange + 1}/{totalPages}
            </span>
            <button
              onClick={() => setPageRange(prev => Math.min(totalPages - 1, prev + 1))}
              disabled={pageRange === totalPages - 1}
              className="p-1 rounded border border-stone-900 bg-sand-100 dark:bg-sand-300 text-ink-900 disabled:opacity-40"
              title="Next 12 Episodes"
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

    </div>
  );
}
