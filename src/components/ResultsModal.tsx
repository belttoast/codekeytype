import React, { useEffect, useState } from 'react';
import type { TestResult, Snippet, UiLanguage } from '../types';
import { useTranslation } from '../utils/translations';
import { WpmChart } from './WpmChart';
import confetti from 'canvas-confetti';
import { RotateCcw, ArrowRight, Share2, CheckCircle2, BookmarkPlus, Check } from 'lucide-react';
import { saveCustomPreset } from '../utils/presetStorage';

interface ResultsModalProps {
  result: TestResult;
  snippet: Snippet;
  uiLanguage?: UiLanguage;
  onRestart: () => void;
  onNextSnippet: () => void;
  onSaveAsPreset?: (snippet: Snippet) => void;
}

export const ResultsModal: React.FC<ResultsModalProps> = ({
  result,
  snippet,
  uiLanguage = 'en',
  onRestart,
  onNextSnippet,
  onSaveAsPreset,
}) => {
  const [copied, setCopied] = useState(false);
  const [savedPreset, setSavedPreset] = useState(false);
  const t = useTranslation(uiLanguage);

  useEffect(() => {
    if (result.accuracy >= 95 || result.wpm >= 60) {
      try {
        confetti({
          particleCount: 80,
          spread: 70,
          origin: { y: 0.6 },
          colors: ['#e2b714', '#5ccfe6', '#7eca9c', '#cba6f7'],
        });
      } catch {}
    }
  }, [result]);

  const handleCopyResults = () => {
    const text = `💻 CodeKeyType Results
Snippet: ${result.snippetTitle} (${result.language})
Speed: ${result.wpm} WPM (${result.cpm} CPM)
Accuracy: ${result.accuracy}%
Raw Speed: ${result.rawWpm} WPM
Consistency: ${result.consistency}%
Time: ${result.timeSeconds}s`;
    
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSaveCurrentAsPreset = () => {
    if (savedPreset) return;
    const saved = saveCustomPreset({
      title: snippet.title || 'Custom Snippet',
      language: snippet.language,
      code: snippet.code,
    });
    setSavedPreset(true);
    if (onSaveAsPreset) onSaveAsPreset(saved);
  };

  return (
    <div className="w-full max-w-4xl mx-auto p-6 md:p-8 animate-fade-in flex flex-col space-y-8">
      {/* Top Banner with Snippet Info */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-theme-border/60 pb-4">
        <div>
          <span className="text-xs uppercase tracking-wider font-mono font-semibold text-theme-accent bg-theme-accent/10 px-2.5 py-1 rounded-md">
            {result.language}
          </span>
          <h2 className="text-xl md:text-2xl font-bold text-theme-main mt-2">
            {result.snippetTitle}
          </h2>
        </div>

        {/* Save as preset if one-off */}
        {!snippet.isCustom && (
          <button
            onClick={handleSaveCurrentAsPreset}
            disabled={savedPreset}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-theme-surface hover:bg-theme-card border border-theme-border text-xs text-theme-sub hover:text-theme-main transition-all"
          >
            {savedPreset ? (
              <>
                <Check className="w-3.5 h-3.5 text-theme-accent" />
                <span className="text-theme-accent font-medium">{t.savedToPresets}</span>
              </>
            ) : (
              <>
                <BookmarkPlus className="w-3.5 h-3.5" />
                <span>{t.saveToPresets}</span>
              </>
            )}
          </button>
        )}
      </div>

      {/* Main Metric Cards Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="p-5 rounded-2xl bg-theme-surface border border-theme-border/80 flex flex-col">
          <span className="text-xs font-medium text-theme-sub uppercase tracking-wider font-mono">
            {t.wpm}
          </span>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-4xl md:text-5xl font-black text-theme-accent font-mono">
              {result.wpm}
            </span>
          </div>
          <span className="text-xs text-theme-sub mt-2 font-mono">
            {t.cpm}: {result.cpm}
          </span>
        </div>

        <div className="p-5 rounded-2xl bg-theme-surface border border-theme-border/80 flex flex-col">
          <span className="text-xs font-medium text-theme-sub uppercase tracking-wider font-mono">
            {t.accuracy}
          </span>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-4xl md:text-5xl font-black text-theme-main font-mono">
              {result.accuracy}%
            </span>
          </div>
          <span className="text-xs text-theme-sub mt-2 font-mono">
            {t.errors}: {result.incorrectChars}
          </span>
        </div>

        <div className="p-5 rounded-2xl bg-theme-surface border border-theme-border/80 flex flex-col">
          <span className="text-xs font-medium text-theme-sub uppercase tracking-wider font-mono">
            {t.rawWpm}
          </span>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-4xl md:text-5xl font-black text-theme-sub font-mono">
              {result.rawWpm}
            </span>
          </div>
          <span className="text-xs text-theme-sub mt-2 font-mono">
            {t.withoutPenalty}
          </span>
        </div>

        <div className="p-5 rounded-2xl bg-theme-surface border border-theme-border/80 flex flex-col">
          <span className="text-xs font-medium text-theme-sub uppercase tracking-wider font-mono">
            {t.consistency}
          </span>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-4xl md:text-5xl font-black text-theme-main font-mono">
              {result.consistency}%
            </span>
          </div>
          <span className="text-xs text-theme-sub mt-2 font-mono">
            {t.pacingSmoothness}
          </span>
        </div>
      </div>

      <div>
        <WpmChart samples={result.wpmOverTime} duration={result.timeSeconds} />
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 rounded-xl bg-theme-surface/40 border border-theme-border/40 font-mono text-xs">
        <div>
          <span className="text-theme-sub">{t.time}:</span>{' '}
          <span className="text-theme-main font-bold">{result.timeSeconds}s</span>
        </div>
        <div>
          <span className="text-theme-sub">{t.characters}:</span>{' '}
          <span className="text-theme-correct">{result.correctChars}</span> /{' '}
          <span className="text-theme-error">{result.incorrectChars}</span> /{' '}
          <span className="text-theme-sub">{result.extraChars}</span>
        </div>
        <div>
          <span className="text-theme-sub">{t.totalKeypresses}:</span>{' '}
          <span className="text-theme-main font-bold">{result.totalChars}</span>
        </div>
        <div>
          <span className="text-theme-sub">{t.missedCharacters}:</span>{' '}
          <span className="text-theme-main font-bold">{result.missedChars}</span>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-center gap-4 pt-4">
        <button
          onClick={onRestart}
          className="px-6 py-3 rounded-xl bg-theme-surface hover:bg-theme-card border border-theme-border text-theme-main font-medium text-sm flex items-center gap-2.5 transition-all shadow-sm group"
        >
          <RotateCcw className="w-4 h-4 text-theme-accent group-hover:-rotate-90 transition-transform duration-200" />
          <span>{t.restartTest}</span>
          <kbd className="text-[11px] font-mono px-2 py-0.5 rounded bg-theme-bg text-theme-sub border border-theme-border">
            Tab + Enter
          </kbd>
        </button>

        <button
          onClick={onNextSnippet}
          className="px-6 py-3 rounded-xl bg-theme-accent hover:bg-theme-accentHover text-theme-bg font-bold text-sm flex items-center gap-2 shadow-lg shadow-theme-accent/20 transition-all"
        >
          <span>{t.nextSnippet}</span>
          <ArrowRight className="w-4 h-4" />
        </button>

        <button
          onClick={handleCopyResults}
          className="px-5 py-3 rounded-xl bg-theme-surface hover:bg-theme-card border border-theme-border text-theme-sub hover:text-theme-main text-sm flex items-center gap-2 transition-all"
        >
          {copied ? (
            <>
              <CheckCircle2 className="w-4 h-4 text-theme-accent" />
              <span className="text-theme-accent font-medium">{t.copied}</span>
            </>
          ) : (
            <>
              <Share2 className="w-4 h-4" />
              <span>{t.copyResult}</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
};
