import React, { useState, useEffect, useMemo, useRef } from 'react';
import { TrendingUp, Star, Award, ChevronLeft, ChevronRight, Check, Eye, Clock } from 'lucide-react';
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
  const [ratingData, setRatingData] = useState({ episodes: [], source: 'MAL Rating', hasData: false });
  const containerRef = useRef(null);

  const episodesWatched = Number(watchlistEntry?.episodes_watched) || 0;

  useEffect(() => {
    let isCurrent = true;
    async function loadRatings() {
      if (!anime) return;
      try {
        const res = await getAccurateEpisodeRatings(anime);
        if (isCurrent) setRatingData(res);
      } catch (err) {
        console.warn('MAL rating fetch notice:', err);
        if (isCurrent) setRatingData({ episodes: [], source: 'MAL Rating', hasData: false });
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

  // Find peak episode strictly from aired episodes with scores
  const peakEpisode = useMemo(() => {
    const airedWithScores = episodeData.filter(ep => ep.isAired && ep.score !== null && ep.score > 0);
    if (!airedWithScores.length) return null;
    let max = airedWithScores[0];
    for (const ep of airedWithScores) {
      if (ep.score > max.score) max = ep;
    }
    return max;
  }, [episodeData]);

  // Average episodic rating strictly across aired episodes with scores
  const avgEpScore = useMemo(() => {
    const airedWithScores = episodeData.filter(ep => ep.isAired && ep.score !== null && ep.score > 0);
    if (!airedWithScores.length) return null;
    const sum = airedWithScores.reduce((acc, ep) => acc + ep.score, 0);
    return (sum / airedWithScores.length).toFixed(1);
  }, [episodeData]);

  // Pagination for shows with > 12 episodes (12 episodes per window)
  const windowSize = 12;
  const totalPages = Math.ceil(episodeData.length / windowSize);
  const currentEpisodes = useMemo(() => {
    const start = pageRange * windowSize;
    return episodeData.slice(start, start + windowSize);
  }, [episodeData, pageRange]);

  // SVG Chart Geometry & Dynamic Scale
  const svgWidth = 600;
  const svgHeight = 175;
  const paddingX = 42;
  const paddingTop = 38;
  const paddingBottom = 34;

  // Compute clean dynamic Y-axis bounds based on actual data
  const { minRating, maxRating, gridScores } = useMemo(() => {
    const validScores = currentEpisodes.filter(e => e.score !== null && e.score > 0).map(e => e.score);
    if (validScores.length === 0) {
      return { minRating: 6.0, maxRating: 10.0, gridScores: [7.0, 8.0, 9.0, 10.0] };
    }
    const rawMin = Math.min(...validScores);
    const rawMax = Math.max(...validScores);
    const minRating = Math.max(0, Math.floor(Math.min(7.0, rawMin - 0.6)));
    const maxRating = Math.min(10.0, Math.ceil(Math.max(9.5, rawMax + 0.4)));
    
    const gridScores = [];
    for (let s = minRating + 1; s <= maxRating; s += 1.0) {
      gridScores.push(s);
    }
    return { minRating, maxRating, gridScores };
  }, [currentEpisodes]);

  const getX = (index, total) => {
    if (total <= 1) return svgWidth / 2;
    return paddingX + (index / (total - 1)) * (svgWidth - paddingX * 2);
  };

  const getY = (score) => {
    const safeScore = score !== null ? score : (minRating + 0.5);
    const clamped = Math.max(minRating, Math.min(maxRating, safeScore));
    const ratio = (clamped - minRating) / (maxRating - minRating);
    return (svgHeight - paddingBottom) - ratio * (svgHeight - paddingTop - paddingBottom);
  };

  // Generate SVG Points
  const baselineY = svgHeight - paddingBottom - 10;
  const points = currentEpisodes.map((ep, idx) => {
    const hasScore = ep.score !== null && ep.score > 0;
    return {
      x: getX(idx, currentEpisodes.length),
      y: hasScore ? getY(ep.score) : baselineY,
      hasScore,
      ...ep
    };
  });

  const scoredPoints = points.filter(p => p.hasScore);
  const unreleasedPoints = points.filter(p => !p.isAired);

  // Solid smooth curve for rated episodes
  const scoredLinePath = scoredPoints.length >= 2 ? scoredPoints.reduce((acc, pt, idx, arr) => {
    if (idx === 0) return `M ${pt.x} ${pt.y}`;
    const prev = arr[idx - 1];
    const cpX1 = prev.x + (pt.x - prev.x) / 2;
    const cpY1 = prev.y;
    const cpX2 = prev.x + (pt.x - prev.x) / 2;
    const cpY2 = pt.y;
    return `${acc} C ${cpX1} ${cpY1}, ${cpX2} ${cpY2}, ${pt.x} ${pt.y}`;
  }, '') : '';

  // Area under the rated curve
  const scoredAreaPath = scoredPoints.length >= 2 ? `
    ${scoredLinePath}
    L ${scoredPoints[scoredPoints.length - 1].x} ${svgHeight - paddingBottom}
    L ${scoredPoints[0].x} ${svgHeight - paddingBottom}
    Z
  ` : '';

  // Subtle dashed connection to unreleased upcoming episodes
  let unreleasedLinePath = '';
  if (unreleasedPoints.length > 0) {
    const lastAiredIdx = points.findIndex(p => !p.isAired) - 1;
    const startPt = lastAiredIdx >= 0 ? points[lastAiredIdx] : unreleasedPoints[0];
    unreleasedLinePath = `M ${startPt.x} ${startPt.y}`;
    unreleasedPoints.forEach(pt => {
      unreleasedLinePath += ` L ${pt.x} ${pt.y}`;
    });
  }

  const handleNodeClick = (ep) => {
    sound.playTab();
    setSelectedEp(selectedEp?.episode === ep.episode ? null : ep);
  };

  // Clean empty state when no MAL episode scores exist
  if (!ratingData.hasData || episodeData.every(e => e.score === null)) {
    return (
      <div className="card-manga-panel p-4 bg-sand-50 dark:bg-sand-200 border-2 border-stone-900 shadow-manga space-y-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded bg-amber-400 border border-stone-900 shadow-[1px_1px_0px_0px_rgba(24,19,13,1)]">
              <TrendingUp className="w-3.5 h-3.5 text-stone-950 stroke-[2.5]" />
            </div>
            <h3 className="font-display font-black text-xs sm:text-sm uppercase tracking-tight text-ink-900 flex items-center gap-1.5">
              <span>Episode Rating Trend</span>
              <span className="text-[9px] font-mono font-black bg-amber-400 text-stone-950 px-1.5 py-0.5 rounded border border-stone-900 shadow-xs uppercase">MAL Rating</span>
            </h3>
          </div>
          <div className="font-mono text-[10px] text-stone-500">
            {ratingData.isAiring ? `Aired ${ratingData.airedCount || 0}/${ratingData.totalCount || '?'} Eps` : `${ratingData.totalCount || episodeData.length} Episodes`}
          </div>
        </div>
        <div className="p-5 rounded-lg border-2 border-dashed border-stone-300 dark:border-stone-700/60 text-center bg-sand-100/50 dark:bg-stone-900/30">
          <p className="text-xs font-mono font-bold text-stone-600 dark:text-stone-300">
            No MAL episode ratings submitted yet for this anime.
          </p>
          <p className="text-[10px] font-sans text-stone-400 dark:text-stone-500 mt-1">
            Episode scores will automatically appear once community members vote on MyAnimeList episode polls.
          </p>
        </div>
      </div>
    );
  }

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
              <span className="text-[9px] font-mono font-black bg-amber-400 text-stone-950 px-1.5 py-0.5 rounded border border-stone-900 shadow-xs uppercase">MAL Rating</span>
            </h3>
          </div>
        </div>

        {/* Highlight Badges */}
        <div className="flex items-center gap-1.5 font-mono text-[10px]">
          {peakEpisode && (
            <span className="px-2 py-0.5 rounded bg-amber-400 text-stone-950 font-black border border-stone-900 shadow-xs flex items-center gap-1">
              <Award className="w-3 h-3 text-stone-950 fill-current" />
              <span>Peak: {peakEpisode.epLabel} ({peakEpisode.score})</span>
            </span>
          )}
          <span className="px-2 py-0.5 rounded bg-sand-200 dark:bg-sand-300 text-stone-700 dark:text-stone-300 font-bold border border-stone-900/30">
            {ratingData.isAiring ? `Aired ${ratingData.airedCount || 0}/${ratingData.totalCount || '?'} Eps` : `${ratingData.totalCount || episodeData.length} Eps`}
            {avgEpScore && ` · Avg ${avgEpScore}/10`}
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
          style={{ minHeight: '140px' }}
        >
          <defs>
            {/* Gradient under trend curve */}
            <linearGradient id="malTrendGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#D4974A" stopOpacity="0.35" />
              <stop offset="100%" stopColor="#D4974A" stopOpacity="0.0" />
            </linearGradient>
          </defs>

          {/* Reference Horizontal Gridlines */}
          {gridScores.map((score) => {
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

          {/* Area Fill for Scored episodes */}
          {scoredAreaPath && (
            <path
              d={scoredAreaPath}
              fill="url(#malTrendGradient)"
            />
          )}

          {/* Scored Curve Line */}
          {scoredLinePath && (
            <path
              d={scoredLinePath}
              fill="none"
              stroke="#D4974A"
              strokeWidth="3"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="filter drop-shadow-[0_2px_4px_rgba(212,151,74,0.3)]"
            />
          )}

          {/* Unreleased Dashed Line */}
          {unreleasedLinePath && (
            <path
              d={unreleasedLinePath}
              fill="none"
              stroke="#857460"
              strokeWidth="1.5"
              strokeDasharray="3 3"
              strokeLinecap="round"
              opacity="0.4"
            />
          )}

          {/* Interactive Episode Nodes */}
          {points.map((pt) => {
            const isPeak = peakEpisode && pt.episode === peakEpisode.episode && pt.isAired && pt.hasScore;
            const isSelected = selectedEp?.episode === pt.episode;
            const isUnreleased = !pt.isAired;
            const isAiredUnrated = pt.isAired && !pt.hasScore;

            return (
              <g 
                key={pt.episode} 
                className="cursor-pointer group"
                onClick={() => handleNodeClick(pt)}
              >
                {/* Vertical hover/selected indicator bar */}
                <line
                  x1={pt.x}
                  y1={paddingTop - 14}
                  x2={pt.x}
                  y2={svgHeight - paddingBottom}
                  stroke={isSelected ? '#D4974A' : 'transparent'}
                  strokeWidth="1.5"
                  strokeDasharray="2 2"
                />

                {/* Score Pill Banner Above Node — Only rendered for points with actual scores! */}
                {pt.hasScore && (
                  <g transform={`translate(${pt.x}, ${pt.y - 12})`}>
                    <rect
                      x="-14"
                      y="-13"
                      width="28"
                      height="14"
                      rx="3"
                      className={
                        isPeak
                          ? "fill-amber-400 stroke-stone-900"
                          : isSelected
                            ? "fill-stone-950 stroke-stone-900 dark:fill-amber-400"
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
                            ? "fill-white dark:fill-stone-950"
                            : "fill-ink-900 dark:fill-sand-100"
                      }`}
                    >
                      {pt.score.toFixed(1)}
                    </text>
                  </g>
                )}

                {/* Node Halo for Peak Episode */}
                {isPeak && (
                  <circle
                    cx={pt.x}
                    cy={pt.y}
                    r="9"
                    fill="none"
                    stroke="#D4974A"
                    strokeWidth="2"
                    strokeDasharray="2 2"
                    opacity="0.85"
                  />
                )}

                {/* Node Circle */}
                <circle
                  cx={pt.x}
                  cy={pt.y}
                  r={isPeak || isSelected ? "5.5" : pt.hasScore ? "4" : "3"}
                  className={`transition-all ${
                    isUnreleased
                      ? "fill-sand-100 dark:fill-stone-900 stroke-stone-400 dark:stroke-stone-600 stroke-[1.5]"
                      : isAiredUnrated
                        ? isSelected
                          ? "fill-amber-400 stroke-stone-950 stroke-2"
                          : "fill-stone-300 dark:fill-stone-600 stroke-stone-600 dark:stroke-stone-400 stroke-1 group-hover:fill-amber-400"
                        : isPeak
                          ? "fill-amber-400 stroke-stone-950 stroke-[2.5]"
                          : isSelected
                            ? "fill-stone-950 dark:fill-amber-400 stroke-amber-400 stroke-2"
                            : pt.isWatched
                              ? "fill-emerald-500 stroke-stone-900 stroke-2"
                              : "fill-sand-50 dark:fill-stone-100 stroke-stone-900 stroke-2 group-hover:fill-amber-400"
                  }`}
                  strokeDasharray={isUnreleased ? "2 2" : "none"}
                />

                {/* X-Axis Episode Label */}
                <text
                  x={pt.x}
                  y={svgHeight - 12}
                  textAnchor="middle"
                  className={`text-[10px] font-mono font-black uppercase transition-colors ${
                    isUnreleased
                      ? "fill-stone-400 dark:fill-stone-600"
                      : isSelected
                        ? "fill-amber-500"
                        : isPeak
                          ? "fill-amber-600 dark:fill-amber-400"
                          : pt.isWatched
                            ? "fill-emerald-600 dark:fill-emerald-400"
                            : "fill-stone-600 dark:fill-stone-300"
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
          <div className="mt-2.5 p-3 bg-sand-50 dark:bg-stone-800 rounded-lg border-2 border-stone-900 flex items-center justify-between animate-fade-in shadow-sm">
            <div className="flex items-center gap-2.5">
              <div className={`w-8 h-8 rounded border-2 border-stone-900 flex items-center justify-center font-mono font-black text-xs shrink-0 shadow-xs ${
                !selectedEp.isAired
                  ? 'bg-sand-200 dark:bg-stone-700 text-stone-500'
                  : selectedEp.score
                    ? 'bg-amber-400 text-stone-950'
                    : 'bg-emerald-400 text-stone-950'
              }`}>
                {selectedEp.epLabel}
              </div>
              <div>
                <p className="text-xs font-black text-ink-900 flex items-center gap-1.5 flex-wrap">
                  <span>Episode {selectedEp.episode}</span>
                  {selectedEp.title && selectedEp.title !== `Episode ${selectedEp.episode}` && (
                    <span className="font-medium text-stone-600 dark:text-stone-400 truncate max-w-[170px] sm:max-w-[240px]">
                      : {selectedEp.title}
                    </span>
                  )}
                  {peakEpisode?.episode === selectedEp.episode && selectedEp.isAired && selectedEp.score && (
                    <span className="px-1.5 py-0.2 bg-amber-400 text-stone-950 text-[9px] font-black uppercase rounded border border-stone-900">
                      Season Peak
                    </span>
                  )}
                  {!selectedEp.isAired && (
                    <span className="px-1.5 py-0.2 bg-sand-200 dark:bg-stone-700 text-stone-600 dark:text-stone-300 text-[9px] font-black uppercase rounded border border-stone-900/30 flex items-center gap-0.5">
                      <Clock className="w-2.5 h-2.5" />
                      <span>Airing Soon</span>
                    </span>
                  )}
                </p>
                <p className="text-[10px] text-stone-500 font-mono flex items-center gap-1.5 mt-0.5">
                  {selectedEp.isAired && selectedEp.score ? (
                    <>
                      <span className="flex items-center gap-0.5 text-amber-600 dark:text-amber-400 font-bold">
                        <Star className="w-3 h-3 fill-current" />
                        <span>MAL Score: {selectedEp.score}/10</span>
                      </span>
                      <span>•</span>
                      <span>{selectedEp.isWatched ? 'Watched' : 'Not watched yet'}</span>
                    </>
                  ) : selectedEp.isAired ? (
                    <>
                      <span className="text-stone-500 dark:text-stone-400">Aired · No MAL rating submitted</span>
                      <span>•</span>
                      <span>{selectedEp.isWatched ? 'Watched' : 'Not watched yet'}</span>
                    </>
                  ) : (
                    <span>This episode has not aired yet.</span>
                  )}
                </p>
              </div>
            </div>

            {/* Quick Step / Mark Watched Button */}
            {onStepToEpisode && selectedEp.isAired && (
              <button
                onClick={() => {
                  onStepToEpisode(selectedEp.episode);
                  sound.playEpisodeStep();
                }}
                className={`btn-manga text-[10px] px-2.5 py-1.5 font-black flex items-center gap-1 ${
                  selectedEp.isWatched
                    ? 'bg-sand-200 dark:bg-sand-300 text-stone-700'
                    : 'bg-emerald-400 text-stone-950'
                }`}
              >
                {selectedEp.isWatched ? <Check className="w-3 h-3 stroke-[3]" /> : <Eye className="w-3 h-3" />}
                <span>{selectedEp.isWatched ? `Watched (${selectedEp.episode})` : `Set Ep ${selectedEp.episode}`}</span>
              </button>
            )}
          </div>
        )}
      </div>

      {/* Multi-Window Range Selector (for 12+ episode series) */}
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
