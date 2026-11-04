import React, { useState } from 'react';
import type { WpmSample } from '../types';

interface WpmChartProps {
  samples: WpmSample[];
  duration: number;
}

export const WpmChart: React.FC<WpmChartProps> = ({ samples, duration }) => {
  const [hoveredPoint, setHoveredPoint] = useState<WpmSample | null>(null);

  if (!samples || samples.length === 0) {
    return (
      <div className="h-44 flex items-center justify-center text-theme-sub text-sm border border-theme-border/40 rounded-xl bg-theme-surface/50">
        Snippet completed quickly!
      </div>
    );
  }

  const maxWpm = Math.max(80, ...samples.map(s => Math.max(s.wpm, s.rawWpm))) * 1.15;
  const maxTime = Math.max(duration, samples[samples.length - 1]?.time || 1);

  const width = 680;
  const height = 180;
  const padding = { top: 20, right: 30, bottom: 25, left: 40 };
  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;

  const getX = (time: number) => padding.left + (time / maxTime) * chartWidth;
  const getY = (wpm: number) => padding.top + chartHeight - (wpm / maxWpm) * chartHeight;

  const wpmPoints = samples.map(s => `${getX(s.time)},${getY(s.wpm)}`).join(' ');
  const rawPoints = samples.map(s => `${getX(s.time)},${getY(s.rawWpm)}`).join(' ');

  const areaPath = `M ${getX(samples[0].time)},${getY(0)} ` +
    samples.map(s => `L ${getX(s.time)},${getY(s.wpm)}`).join(' ') +
    ` L ${getX(samples[samples.length - 1].time)},${getY(0)} Z`;

  const yTicks = [0, Math.round(maxWpm * 0.33), Math.round(maxWpm * 0.66), Math.round(maxWpm)];

  return (
    <div className="relative w-full bg-theme-surface/60 rounded-xl p-4 border border-theme-border/50">
      <div className="flex items-center justify-between text-xs text-theme-sub mb-2 px-2">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-theme-accent"></span>
            <span>WPM</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-0.5 bg-theme-sub"></span>
            <span>Raw WPM</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-theme-error"></span>
            <span>Errors</span>
          </div>
        </div>
        {hoveredPoint && (
          <div className="text-theme-main font-mono">
            {hoveredPoint.time}s: <span className="text-theme-accent">{hoveredPoint.wpm} WPM</span> (raw: {hoveredPoint.rawWpm}, err: {hoveredPoint.errors})
          </div>
        )}
      </div>

      <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto overflow-visible font-mono">
        <defs>
          <linearGradient id="wpmGradient" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="var(--color-accent)" stopOpacity="0.25" />
            <stop offset="100%" stopColor="var(--color-accent)" stopOpacity="0.0" />
          </linearGradient>
        </defs>

        {yTicks.map((val, idx) => (
          <g key={idx}>
            <line
              x1={padding.left}
              y1={getY(val)}
              x2={width - padding.right}
              y2={getY(val)}
              stroke="var(--color-border)"
              strokeDasharray="4 4"
              strokeOpacity="0.6"
            />
            <text
              x={padding.left - 8}
              y={getY(val) + 4}
              fontSize="10"
              fill="var(--color-text-sub)"
              textAnchor="end"
            >
              {val}
            </text>
          </g>
        ))}

        <path d={areaPath} fill="url(#wpmGradient)" />

        <polyline
          fill="none"
          stroke="var(--color-text-sub)"
          strokeWidth="1.5"
          strokeDasharray="3 3"
          strokeOpacity="0.8"
          points={rawPoints}
        />

        <polyline
          fill="none"
          stroke="var(--color-accent)"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          points={wpmPoints}
        />

        {samples.map((s, idx) => {
          const x = getX(s.time);
          const y = getY(s.wpm);
          const hasError = s.errors > 0 && (idx === 0 || s.errors > samples[idx - 1].errors);

          return (
            <g
              key={idx}
              onMouseEnter={() => setHoveredPoint(s)}
              onMouseLeave={() => setHoveredPoint(null)}
              className="cursor-pointer"
            >
              {hasError && (
                <circle
                  cx={x}
                  cy={padding.top + 8}
                  r="3.5"
                  fill="var(--color-error)"
                />
              )}
              <circle
                cx={x}
                cy={y}
                r="3"
                fill="var(--color-accent)"
                className="hover:scale-150 transition-transform duration-100"
              />
            </g>
          );
        })}
      </svg>
    </div>
  );
};
