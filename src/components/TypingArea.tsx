import React, { useRef, useEffect, useState, useMemo, useCallback } from 'react';
import type { CodeChar, CharStatus, UserSettings } from '../types';
import { getTokenColor } from '../utils/syntaxHighlighter';
import { AlertCircle, RotateCcw, Sparkles, Eye, EyeOff } from 'lucide-react';

interface TypingAreaProps {
  targetChars: CodeChar[];
  charStates: CharStatus[];
  cursorIndex: number;
  extraCharsMap: Record<number, string>;
  spawnedCloseIndices: Set<number>;
  settings: UserSettings;
  status: 'idle' | 'typing' | 'completed';
  onRestart: () => void;
}

export const TypingArea: React.FC<TypingAreaProps> = ({
  targetChars,
  charStates,
  cursorIndex,
  extraCharsMap,
  spawnedCloseIndices,
  settings,
  status,
  onRestart,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const activeCharRef = useRef<HTMLSpanElement>(null);
  const [caretPos, setCaretPos] = useState<{ top: number; left: number; height: number; width: number } | null>(null);
  const [isFocused, setIsFocused] = useState(true);
  const [capsLockActive, setCapsLockActive] = useState(false);

  // Group characters by line
  const lines = useMemo(() => {
    const grouped: CodeChar[][] = [];
    let currentLine: CodeChar[] = [];
    let currentLineIndex = 0;

    for (const c of targetChars) {
      if (c.lineIndex !== currentLineIndex) {
        grouped.push(currentLine);
        currentLine = [];
        currentLineIndex = c.lineIndex;
      }
      currentLine.push(c);
    }
    if (currentLine.length > 0) {
      grouped.push(currentLine);
    }
    return grouped;
  }, [targetChars]);

  // Current active line
  const activeLineIndex = targetChars[cursorIndex]?.lineIndex ?? 0;

  // --- BLIND MODE: Flash on new line entry, test start, and restart ---
  const [prevLine, setPrevLine] = useState(activeLineIndex);
  const [prevStatus, setPrevStatus] = useState(status);
  const [prevTargetChars, setPrevTargetChars] = useState(targetChars);
  const [flashTrigger, setFlashTrigger] = useState(0);
  const [isLineFlashing, setIsLineFlashing] = useState<boolean>(true);

  // Trigger flash on line change
  if (activeLineIndex !== prevLine) {
    setPrevLine(activeLineIndex);
    if (settings.blindModeType === 'blind') {
      setIsLineFlashing(true);
      setFlashTrigger(t => t + 1);
    }
  }

  // Trigger flash on test status change (starting test idle -> typing, or restart -> idle)
  if (status !== prevStatus) {
    setPrevStatus(status);
    if (settings.blindModeType === 'blind') {
      setIsLineFlashing(true);
      setFlashTrigger(t => t + 1);
    }
  }

  // Trigger flash if target snippet changes
  if (targetChars !== prevTargetChars) {
    setPrevTargetChars(targetChars);
    if (settings.blindModeType === 'blind') {
      setIsLineFlashing(true);
      setFlashTrigger(t => t + 1);
    }
  }

  const triggerLineFlash = useCallback(() => {
    setIsLineFlashing(true);
    setFlashTrigger(t => t + 1);
  }, []);

  useEffect(() => {
    if (!isLineFlashing || settings.blindModeType !== 'blind') return;
    const durationMs = Math.max(50, Math.round((settings.blindFlashDuration ?? 0.8) * 1000));
    const timer = setTimeout(() => {
      setIsLineFlashing(false);
    }, durationMs);

    return () => clearTimeout(timer);
  }, [isLineFlashing, flashTrigger, settings.blindModeType, settings.blindFlashDuration]);

  // --- SEMI-BLIND MODE: Pseudorandom masked chunks based on intensity ---
  const semiBlindMask = useMemo(() => {
    if (settings.blindModeType !== 'semi-blind') return new Set<number>();
    const mask = new Set<number>();
    const threshold = (settings.semiBlindIntensity || 35) / 100;
    
    let inHideChunk = false;
    let chunkRemaining = 0;

    for (let i = 0; i < targetChars.length; i++) {
      const c = targetChars[i].char;
      if (c === '\n' || c === ' ' || c === '\t') {
        inHideChunk = false;
        continue;
      }

      if (chunkRemaining <= 0) {
        const seed = Math.sin(i * 12.9898 + (targetChars[i].colIndex || 1) * 78.233) * 43758.5453;
        const rand = seed - Math.floor(seed);
        inHideChunk = rand < threshold;
        chunkRemaining = inHideChunk ? Math.floor(rand * 5) + 2 : Math.floor(rand * 4) + 1;
      }

      if (inHideChunk) {
        mask.add(i);
      }
      chunkRemaining--;
    }

    return mask;
  }, [settings.blindModeType, settings.semiBlindIntensity, targetChars]);

  // Track CapsLock state
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      setCapsLockActive(e.getModifierState('CapsLock'));
    };
    window.addEventListener('keydown', handleKey);
    window.addEventListener('keyup', handleKey);
    return () => {
      window.removeEventListener('keydown', handleKey);
      window.removeEventListener('keyup', handleKey);
    };
  }, []);

  // Update caret coordinates
  useEffect(() => {
    const updateCaret = () => {
      if (!activeCharRef.current || !containerRef.current) return;

      const containerRect = containerRef.current.getBoundingClientRect();
      const charRect = activeCharRef.current.getBoundingClientRect();

      setCaretPos({
        top: charRect.top - containerRect.top + containerRef.current.scrollTop,
        left: charRect.left - containerRect.left + containerRef.current.scrollLeft,
        height: charRect.height,
        width: charRect.width || 10,
      });

      const targetScroll = (charRect.top - containerRect.top + containerRef.current.scrollTop) - 100;
      if (Math.abs(containerRef.current.scrollTop - targetScroll) > 120) {
        containerRef.current.scrollTo({
          top: Math.max(0, targetScroll),
          behavior: 'smooth',
        });
      }
    };

    updateCaret();
    window.addEventListener('resize', updateCaret);
    return () => window.removeEventListener('resize', updateCaret);
  }, [cursorIndex, targetChars]);

  useEffect(() => {
    const handleWindowClick = () => setIsFocused(true);
    window.addEventListener('click', handleWindowClick);
    return () => window.removeEventListener('click', handleWindowClick);
  }, []);

  const hasActiveSpawnedPairs = spawnedCloseIndices.size > 0;

  return (
    <div className="relative w-full max-w-5xl mx-auto my-auto flex flex-col items-center">
      {/* Top Banner: Status & Blind Mode indicators */}
      <div className="flex items-center gap-3 mb-2 min-h-[28px]">
        {capsLockActive && (
          <div className="px-3 py-1 rounded-full bg-theme-accent/20 border border-theme-accent text-theme-accent text-xs font-mono flex items-center gap-1.5 animate-bounce">
            <AlertCircle className="w-3.5 h-3.5" />
            <span>Caps Lock is ON</span>
          </div>
        )}

        {hasActiveSpawnedPairs && (
          <div className="px-3 py-0.5 rounded-full bg-theme-accent/15 border border-theme-accent/40 text-theme-accent text-[11px] font-mono flex items-center gap-1.5 animate-pulse">
            <Sparkles className="w-3 h-3" />
            <span>Auto-pair spawned: press <kbd className="px-1.5 py-0.2 rounded bg-theme-bg border border-theme-border font-bold">Tab</kbd> to exit pair (then type ;)</span>
          </div>
        )}

        {settings.blindModeType === 'blind' && (
          <button
            type="button"
            onClick={triggerLineFlash}
            title="Click to re-flash this line preview"
            className="px-3 py-0.5 rounded-full bg-theme-surface hover:bg-theme-card border border-theme-border hover:border-theme-accent/60 text-theme-main text-[11px] font-mono flex items-center gap-1.5 transition-all cursor-pointer shadow-sm"
          >
            {isLineFlashing ? (
              <>
                <Eye className="w-3 h-3 text-theme-accent animate-pulse" />
                <span className="text-theme-accent font-semibold">
                  Flashing line {activeLineIndex + 1} ({settings.blindFlashDuration < 1 ? `${Math.round(settings.blindFlashDuration * 1000)}ms` : `${settings.blindFlashDuration}s`})... memorize!
                </span>
              </>
            ) : (
              <>
                <EyeOff className="w-3 h-3 text-theme-sub" />
                <span className="text-theme-sub">
                  Line {activeLineIndex + 1} hidden (type from memory &bull; <span className="text-theme-accent underline">click to re-flash</span>)
                </span>
              </>
            )}
          </button>
        )}

        {settings.blindModeType === 'semi-blind' && (
          <div className="px-3 py-0.5 rounded-full bg-theme-surface border border-theme-border text-theme-sub text-[11px] font-mono flex items-center gap-1.5">
            <EyeOff className="w-3 h-3 text-theme-accent" />
            <span>Semi-blind ({settings.semiBlindIntensity}% hidden): Missing parts reveal as you type</span>
          </div>
        )}

        {settings.blindModeType === 'fully-blind' && (
          <div className="px-3 py-0.5 rounded-full bg-theme-surface border border-theme-border text-theme-sub text-[11px] font-mono flex items-center gap-1.5">
            <EyeOff className="w-3 h-3 text-theme-accent" />
            <span>Fully blind: Only comments visible, code reveals as you type</span>
          </div>
        )}
      </div>

      <div
        ref={containerRef}
        onClick={() => setIsFocused(true)}
        className="relative w-full max-h-[58vh] overflow-y-auto rounded-2xl bg-theme-surface/75 border border-theme-border/80 shadow-2xl p-6 md:p-8 select-none transition-all cursor-text focus:outline-none"
        style={{
          fontFamily: settings.fontFamily,
          fontSize: `${settings.fontSize}px`,
          lineHeight: 1.8,
        }}
      >
        {settings.caretStyle !== 'off' && caretPos && isFocused && (
          <div
            className={`absolute pointer-events-none z-10 transition-all duration-75 ease-out ${
              status === 'idle' ? 'animate-cursor-blink' : ''
            }`}
            style={{
              top: `${caretPos.top}px`,
              left: `${caretPos.left}px`,
              height: `${caretPos.height}px`,
              width: settings.caretStyle === 'block' ? `${caretPos.width}px` : '2.5px',
            }}
          >
            {settings.caretStyle === 'line' && (
              <div className="w-[2.5px] h-full bg-theme-accent rounded-full shadow-[0_0_10px_var(--color-accent)]" />
            )}
            {settings.caretStyle === 'block' && (
              <div className="w-full h-full bg-theme-accent/35 rounded-sm border border-theme-accent shadow-[0_0_8px_var(--color-accent)]" />
            )}
            {settings.caretStyle === 'underline' && (
              <div className="w-full h-[2.5px] mt-auto absolute bottom-0 bg-theme-accent shadow-[0_0_10px_var(--color-accent)]" />
            )}
          </div>
        )}

        {!isFocused && (
          <div 
            onClick={() => setIsFocused(true)}
            className="absolute inset-0 z-20 flex items-center justify-center bg-theme-bg/60 backdrop-blur-xs rounded-2xl cursor-pointer"
          >
            <div className="px-5 py-2.5 rounded-xl bg-theme-surface border border-theme-border text-theme-main text-xs font-mono shadow-lg flex items-center gap-2">
              <span>Click or start typing to focus</span>
            </div>
          </div>
        )}

        <div className="flex flex-col space-y-0.5">
          {lines.map((lineChars, lineIdx) => {
            const isCurrentLine = lineIdx === activeLineIndex;
            const isThisLineFlashing = settings.blindModeType === 'blind' && isCurrentLine && isLineFlashing;

            return (
              <div 
                key={lineIdx} 
                className={`flex items-start group transition-opacity duration-300 ${
                  isThisLineFlashing ? 'bg-theme-accent/5 rounded-lg px-1 -mx-1' : ''
                }`}
              >
                {settings.showLineNumbers && (
                  <span className="w-10 shrink-0 text-right pr-4 text-theme-dim select-none font-mono text-xs opacity-60 group-hover:opacity-100 transition-opacity pt-0.5">
                    {lineIdx + 1}
                  </span>
                )}

                <div className="flex-1 whitespace-pre flex flex-wrap items-center">
                  {lineChars.map((codeChar) => {
                    const globalIdx = codeChar.globalIndex;
                    const isCurrent = globalIdx === cursorIndex;
                    const charState = charStates[globalIdx];
                    const extra = extraCharsMap[globalIdx];
                    const isSpawnedPair = spawnedCloseIndices.has(globalIdx);

                    // --- BLIND MODE VISIBILITY ---
                    let isCharHidden = false;
                    let showMaskPlaceholder = false;

                    if (charState === 'untouched') {
                      if (settings.blindModeType === 'fully-blind') {
                        if (codeChar.tokenType !== 'comment') {
                          isCharHidden = true;
                        }
                      } else if (settings.blindModeType === 'blind') {
                        if (!isThisLineFlashing) {
                          isCharHidden = true;
                        }
                      } else if (settings.blindModeType === 'semi-blind') {
                        if (semiBlindMask.has(globalIdx)) {
                          isCharHidden = true;
                          showMaskPlaceholder = true;
                        }
                      }
                    }

                    let charColorClass = '';
                    if (charState === 'correct') {
                      charColorClass = `${getTokenColor(codeChar.tokenType)} font-semibold drop-shadow-[0_0_8px_rgba(255,255,255,0.2)]`;
                    } else if (charState === 'incorrect') {
                      charColorClass = 'text-theme-error bg-theme-errorBg font-semibold rounded-xs underline decoration-theme-error decoration-2';
                    } else if (isSpawnedPair) {
                      charColorClass = 'text-theme-accent bg-theme-accent/20 ring-1 ring-theme-accent/60 font-bold rounded-xs px-0.5 shadow-[0_0_8px_var(--color-accent)] animate-pulse';
                    } else if (isCharHidden) {
                      charColorClass = showMaskPlaceholder 
                        ? 'opacity-0 border-b border-theme-border/40' 
                        : 'opacity-0 select-none';
                    } else {
                      charColorClass = 'text-theme-sub/65 font-normal';
                    }

                    if (codeChar.char === '\n') {
                      return (
                        <React.Fragment key={globalIdx}>
                          {extra && (
                            <span className="text-theme-error bg-theme-errorBg font-bold px-0.5 rounded">
                              {extra}
                            </span>
                          )}
                          <span
                            ref={isCurrent ? activeCharRef : null}
                            className={`inline-block text-xs font-mono select-none px-1 rounded transition-colors ${
                              charState === 'correct' 
                                ? 'text-theme-accent/80 font-bold' 
                                : charState === 'incorrect' 
                                ? 'text-theme-error bg-theme-errorBg' 
                                : isCharHidden
                                ? 'opacity-0'
                                : 'text-theme-sub/40'
                            }`}
                            title="Enter (↵)"
                          >
                            ↵
                          </span>
                        </React.Fragment>
                      );
                    }

                    const isSpace = codeChar.char === ' ';
                    const displayChar = isSpace ? (charState === 'incorrect' ? '·' : ' ') : codeChar.char;

                    return (
                      <React.Fragment key={globalIdx}>
                        <span
                          ref={isCurrent ? activeCharRef : null}
                          className={`relative inline-block transition-all duration-100 ${charColorClass} ${
                            isSpace && charState === 'incorrect' ? 'text-theme-error bg-theme-errorBg px-0.5' : ''
                          } ${isCurrent ? 'scale-[1.05]' : ''}`}
                        >
                          {displayChar}
                        </span>

                        {extra && (
                          <span className="text-theme-error bg-theme-errorBg font-bold px-0.5 rounded">
                            {extra}
                          </span>
                        )}
                      </React.Fragment>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Footer controls & hints */}
      <div className="flex items-center justify-between w-full max-w-5xl px-3 pt-3 text-xs text-theme-sub font-mono">
        <div className="flex items-center gap-2">
          <span>Restart:</span>
          <kbd className="px-1.5 py-0.5 rounded bg-theme-surface border border-theme-border text-[11px] text-theme-main">
            Esc
          </kbd>
        </div>

        <button
          onClick={onRestart}
          className="flex items-center gap-1.5 hover:text-theme-accent transition-colors"
          title="Restart Test"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>restart</span>
        </button>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5">
            <span>Blind:</span>
            <span className="text-theme-accent font-semibold capitalize">
              {settings.blindModeType === 'off' ? 'Visible' : settings.blindModeType.replace('-', ' ')}
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <span>Auto-pairs:</span>
            <span className="text-theme-accent font-semibold">Tab to exit</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span>Indent:</span>
            <span className="text-theme-accent font-semibold uppercase">{settings.indentMode}</span>
          </div>
        </div>
      </div>
    </div>
  );
};
