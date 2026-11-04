import React from 'react';
import type { TestMode, TimeDuration, Language, UserSettings, Snippet, BlindModeType } from '../types';
import { 
  Code2, 
  Settings, 
  Volume2, 
  VolumeX, 
  Clock, 
  Code, 
  Zap, 
  Bookmark,
  Eye,
  EyeOff
} from 'lucide-react';

interface HeaderBarProps {
  mode: TestMode;
  onChangeMode: (mode: TestMode) => void;
  timeDuration: TimeDuration;
  onChangeTimeDuration: (duration: TimeDuration) => void;
  selectedLanguage: Language | 'all';
  onChangeLanguage: (lang: Language | 'all') => void;
  blindModeType: BlindModeType;
  onChangeBlindMode: (blind: BlindModeType) => void;
  currentSnippet: Snippet;
  customPresetsCount: number;
  onOpenCustomModal: () => void;
  onOpenSettings: () => void;
  settings: UserSettings;
  onToggleSound: () => void;
  liveStats: {
    wpm: number;
    accuracy: number;
    elapsedTime: number;
    remainingTime: number;
    progress: number;
  };
  testStatus: 'idle' | 'typing' | 'completed';
}

const LANGUAGES_FILTER: { id: Language | 'all'; label: string }[] = [
  { id: 'all', label: 'all' },
  { id: 'typescript', label: 'ts' },
  { id: 'javascript', label: 'js' },
  { id: 'python', label: 'python' },
  { id: 'rust', label: 'rust' },
  { id: 'go', label: 'go' },
  { id: 'cpp', label: 'c++' },
  { id: 'sql', label: 'sql' },
  { id: 'css', label: 'css' },
];

const BLIND_MODES: { id: BlindModeType; label: string; tooltip: string }[] = [
  { id: 'off', label: 'visible', tooltip: 'Normal: Full code visible' },
  { id: 'semi-blind', label: 'semi', tooltip: 'Semi-Blind: Random code parts hidden' },
  { id: 'blind', label: 'flash', tooltip: 'Blind: Code flashes then disappears on each line' },
  { id: 'fully-blind', label: 'comment only', tooltip: 'Fully Blind: Only comments visible, code hidden' },
];

export const HeaderBar: React.FC<HeaderBarProps> = ({
  mode,
  onChangeMode,
  timeDuration,
  onChangeTimeDuration,
  selectedLanguage,
  onChangeLanguage,
  blindModeType,
  onChangeBlindMode,
  currentSnippet,
  customPresetsCount,
  onOpenCustomModal,
  onOpenSettings,
  settings,
  onToggleSound,
  liveStats,
  testStatus,
}) => {
  const isTyping = testStatus === 'typing';

  return (
    <header className="w-full max-w-5xl mx-auto pt-6 pb-4 flex flex-col space-y-4 font-mono select-none">
      {/* Top Navbar */}
      <div className="flex items-center justify-between">
        {/* Brand Logo */}
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-theme-surface border border-theme-border text-theme-accent shadow-inner">
            <Code2 className="w-5 h-5 stroke-[2.2]" />
          </div>
          <div>
            <h1 className="text-lg font-black tracking-tight text-theme-main flex items-center gap-1">
              <span>code</span>
              <span className="text-theme-accent">key</span>
              <span className="text-theme-sub">type</span>
            </h1>
          </div>
        </div>

        {/* Center / Right Control Icons */}
        <div className="flex items-center gap-2">
          {/* Custom Presets / Ctrl+V Button */}
          <button
            onClick={onOpenCustomModal}
            className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-theme-surface hover:bg-theme-card border border-theme-border hover:border-theme-accent/60 text-xs text-theme-main transition-all group shadow-sm"
            title="Paste custom code or manage saved presets (Ctrl+V)"
          >
            <Bookmark className="w-3.5 h-3.5 text-theme-accent group-hover:scale-110 transition-transform" />
            <span className="font-medium">Custom Code</span>
            <span className="px-1.5 py-0.2 rounded-full bg-theme-bg border border-theme-border text-[10px] text-theme-accent font-bold">
              {customPresetsCount}
            </span>
            <kbd className="hidden sm:inline-block text-[10px] px-1 py-0.2 rounded bg-theme-bg/80 text-theme-sub border border-theme-border">
              Ctrl+V
            </kbd>
          </button>

          {/* Sound Toggle */}
          <button
            onClick={onToggleSound}
            className="p-2 rounded-xl bg-theme-surface hover:bg-theme-card border border-theme-border text-theme-sub hover:text-theme-main transition-colors"
            title={`Sound: ${settings.soundType} (Click to toggle)`}
          >
            {settings.soundType === 'off' ? (
              <VolumeX className="w-4 h-4" />
            ) : (
              <Volume2 className="w-4 h-4 text-theme-accent" />
            )}
          </button>

          {/* Settings Button */}
          <button
            onClick={onOpenSettings}
            className="p-2 rounded-xl bg-theme-surface hover:bg-theme-card border border-theme-border text-theme-sub hover:text-theme-main transition-colors"
            title="Settings & Themes"
          >
            <Settings className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Mode, Blind Mode & Filter Bar */}
      <div className={`transition-opacity duration-200 ${isTyping ? 'opacity-30 hover:opacity-100' : 'opacity-100'}`}>
        <div className="flex flex-wrap items-center justify-between gap-3 p-1.5 rounded-2xl bg-theme-surface/60 border border-theme-border/60 text-xs text-theme-sub">
          {/* Mode Switcher */}
          <div className="flex items-center gap-1 bg-theme-bg/60 p-1 rounded-xl border border-theme-border/40">
            <button
              onClick={() => onChangeMode('snippet')}
              className={`px-3 py-1 rounded-lg transition-all flex items-center gap-1.5 ${
                mode === 'snippet'
                  ? 'bg-theme-surface text-theme-accent font-bold shadow-sm'
                  : 'hover:text-theme-main'
              }`}
            >
              <Code className="w-3 h-3" />
              <span>snippet</span>
            </button>

            <button
              onClick={() => onChangeMode('time')}
              className={`px-3 py-1 rounded-lg transition-all flex items-center gap-1.5 ${
                mode === 'time'
                  ? 'bg-theme-surface text-theme-accent font-bold shadow-sm'
                  : 'hover:text-theme-main'
              }`}
            >
              <Clock className="w-3 h-3" />
              <span>time</span>
            </button>

            <button
              onClick={() => onChangeMode('zen')}
              className={`px-3 py-1 rounded-lg transition-all flex items-center gap-1.5 ${
                mode === 'zen'
                  ? 'bg-theme-surface text-theme-accent font-bold shadow-sm'
                  : 'hover:text-theme-main'
              }`}
            >
              <Zap className="w-3 h-3" />
              <span>zen</span>
            </button>
          </div>

          {/* Center: Blind Mode Switcher */}
          <div className="flex items-center gap-1 bg-theme-bg/60 p-1 rounded-xl border border-theme-border/40">
            <span className="px-1 text-theme-dim">
              {blindModeType === 'off' ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3 text-theme-accent" />}
            </span>
            {BLIND_MODES.map(bm => (
              <button
                key={bm.id}
                onClick={() => onChangeBlindMode(bm.id)}
                className={`px-2 py-0.5 rounded-lg text-[11px] capitalize transition-all ${
                  blindModeType === bm.id
                    ? 'bg-theme-surface text-theme-accent font-bold shadow-sm'
                    : 'hover:text-theme-main'
                }`}
                title={bm.tooltip}
              >
                {bm.label}
              </button>
            ))}
          </div>

          {/* Time options if in time mode */}
          {mode === 'time' && (
            <div className="flex items-center gap-1 bg-theme-bg/60 p-1 rounded-xl border border-theme-border/40">
              {([15, 30, 60, 120] as TimeDuration[]).map(dur => (
                <button
                  key={dur}
                  onClick={() => onChangeTimeDuration(dur)}
                  className={`px-2 py-0.5 rounded-lg transition-all ${
                    timeDuration === dur
                      ? 'bg-theme-surface text-theme-accent font-bold'
                      : 'hover:text-theme-main'
                  }`}
                >
                  {dur}s
                </button>
              ))}
            </div>
          )}

          {/* Language Filter */}
          <div className="flex items-center gap-1 overflow-x-auto py-0.5">
            {LANGUAGES_FILTER.map(l => (
              <button
                key={l.id}
                onClick={() => onChangeLanguage(l.id)}
                className={`px-2 py-0.5 rounded-lg uppercase text-[11px] font-semibold transition-all ${
                  selectedLanguage === l.id
                    ? 'text-theme-accent bg-theme-accent/15'
                    : 'hover:text-theme-main'
                }`}
              >
                {l.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Active Snippet Header & Live Metrics */}
      <div className="flex items-center justify-between pt-1 px-1 min-h-[36px]">
        <div className="flex items-center gap-2">
          <span className="text-xs uppercase font-mono px-2 py-0.5 rounded bg-theme-surface border border-theme-border text-theme-accent font-bold">
            {currentSnippet.language}
          </span>
          <span className="text-xs font-semibold text-theme-main truncate max-w-[280px] sm:max-w-md">
            {currentSnippet.title}
          </span>
          {blindModeType !== 'off' && (
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-theme-accent/20 text-theme-accent font-mono font-bold capitalize">
              {blindModeType.replace('-', ' ')}
            </span>
          )}
        </div>

        <div className="flex items-center gap-5 text-xs font-mono">
          {settings.showLiveWpm && isTyping && (
            <div className="flex items-baseline gap-1">
              <span className="text-xl font-black text-theme-accent">{liveStats.wpm}</span>
              <span className="text-theme-sub text-[10px]">wpm</span>
            </div>
          )}

          {settings.showLiveAccuracy && isTyping && (
            <div className="flex items-baseline gap-1">
              <span className="text-xl font-bold text-theme-main">{liveStats.accuracy}%</span>
              <span className="text-theme-sub text-[10px]">acc</span>
            </div>
          )}

          {settings.showLiveTimer && (
            <div className="flex items-baseline gap-1 text-theme-sub">
              {mode === 'time' ? (
                <>
                  <span className="text-xl font-bold text-theme-accent">
                    {liveStats.remainingTime}
                  </span>
                  <span className="text-[10px]">s</span>
                </>
              ) : (
                <>
                  <span className="text-sm font-medium text-theme-sub">
                    {liveStats.elapsedTime}
                  </span>
                  <span className="text-[10px]">s</span>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
