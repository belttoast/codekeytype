import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import type { Snippet, UserSettings, TestResult, CharStatus, WpmSample, TestMode, TimeDuration } from '../types';
import { tokenizeCodeToChars } from '../utils/syntaxHighlighter';
import { playKeySound, playErrorSound } from '../utils/soundEffects';
import { computeCodePairs } from '../utils/pairMatcher';

interface UseTypingEngineProps {
  snippet: Snippet;
  settings: UserSettings;
  mode: TestMode;
  timeDuration: TimeDuration;
  onComplete: (result: TestResult) => void;
}

export function useTypingEngine({
  snippet,
  settings,
  mode,
  timeDuration,
  onComplete,
}: UseTypingEngineProps) {
  // Normalize code
  const code = useMemo(() => {
    return snippet.code.replace(/\r\n/g, '\n').replace(/\r/g, '\n').trimEnd();
  }, [snippet.code]);

  // Tokenized target characters
  const targetChars = useMemo(() => {
    return tokenizeCodeToChars(code, snippet.language);
  }, [code, snippet.language]);

  // Precompute bracket and quote pairs
  const { openToClose } = useMemo(() => {
    return computeCodePairs(targetChars);
  }, [targetChars]);

  // Engine state
  const [status, setStatus] = useState<'idle' | 'typing' | 'completed'>('idle');
  const [cursorIndex, setCursorIndex] = useState<number>(0);
  const [charStates, setCharStates] = useState<CharStatus[]>(() => 
    new Array(targetChars.length).fill('untouched')
  );
  
  // Extra characters typed at specific positions
  const [extraCharsMap, setExtraCharsMap] = useState<Record<number, string>>({});

  // Auto-spawned closing pair indices
  const [spawnedCloseIndices, setSpawnedCloseIndices] = useState<Set<number>>(() => new Set());

  // Stats tracking
  const [startTime, setStartTime] = useState<number | null>(null);
  const [elapsedTime, setElapsedTime] = useState<number>(0);
  const [remainingTime, setRemainingTime] = useState<number>(timeDuration);
  const [totalKeypresses, setTotalKeypresses] = useState<number>(0);
  const [errorCount, setErrorCount] = useState<number>(0);

  // WPM sample history for graph
  const [wpmHistory, setWpmHistory] = useState<WpmSample[]>([]);

  // Keep ref up to date using an effect
  const stateRef = useRef({
    status,
    cursorIndex,
    charStates,
    extraCharsMap,
    spawnedCloseIndices,
    openToClose,
    startTime,
    elapsedTime,
    totalKeypresses,
    errorCount,
    targetChars,
    settings,
    mode,
    timeDuration,
    wpmHistory,
  });

  useEffect(() => {
    stateRef.current = {
      status,
      cursorIndex,
      charStates,
      extraCharsMap,
      spawnedCloseIndices,
      openToClose,
      startTime,
      elapsedTime,
      totalKeypresses,
      errorCount,
      targetChars,
      settings,
      mode,
      timeDuration,
      wpmHistory,
    };
  });

  // Reset engine when snippet or mode changes
  const resetTest = useCallback(() => {
    setStatus('idle');
    setCursorIndex(0);
    setCharStates(new Array(targetChars.length).fill('untouched'));
    setExtraCharsMap({});
    setSpawnedCloseIndices(new Set());
    setStartTime(null);
    setElapsedTime(0);
    setRemainingTime(timeDuration);
    setTotalKeypresses(0);
    setErrorCount(0);
    setWpmHistory([]);
  }, [targetChars.length, timeDuration]);

  // Reset when snippet.id changes
  const lastSnippetIdRef = useRef(snippet.id);
  useEffect(() => {
    if (lastSnippetIdRef.current !== snippet.id) {
      lastSnippetIdRef.current = snippet.id;
      resetTest();
    }
  }, [snippet.id, resetTest]);

  // Handle smart auto-indent: advance past leading whitespace on line
  const autoAdvanceWhitespace = useCallback((fromIndex: number, currentStates: CharStatus[]) => {
    if (settings.indentMode !== 'smart') return fromIndex;
    
    let idx = fromIndex;
    const states = [...currentStates];
    
    while (idx < targetChars.length && (targetChars[idx].char === ' ' || targetChars[idx].char === '\t')) {
      states[idx] = 'correct';
      idx++;
    }
    
    setCharStates(states);
    return idx;
  }, [settings.indentMode, targetChars]);

  // Handle completion
  const handleTestComplete = useCallback(() => {
    if (stateRef.current.status === 'completed') return;
    setStatus('completed');

    const durationSeconds = stateRef.current.startTime 
      ? Math.max(1, (Date.now() - stateRef.current.startTime) / 1000)
      : Math.max(1, stateRef.current.elapsedTime);

    const states = stateRef.current.charStates;
    const correctCount = states.filter(s => s === 'correct').length;
    const incorrectCount = states.filter(s => s === 'incorrect').length;
    const totalTyped = stateRef.current.totalKeypresses || (correctCount + incorrectCount);
    
    let extraCount = 0;
    Object.values(stateRef.current.extraCharsMap).forEach(extra => {
      extraCount += extra.length;
    });

    const missedCount = targetChars.length - correctCount - incorrectCount;

    const minutes = durationSeconds / 60;
    const wpm = Math.max(0, Math.round((correctCount / 5) / minutes));
    const rawWpm = Math.max(0, Math.round((totalTyped / 5) / minutes));
    const cpm = Math.max(0, Math.round(correctCount / minutes));
    const accuracy = totalTyped > 0 
      ? Math.max(0, Math.min(100, Math.round((correctCount / totalTyped) * 100)))
      : 100;

    const samples = stateRef.current.wpmHistory;
    let consistency = 100;
    if (samples.length > 2) {
      const wpms = samples.map(s => s.wpm);
      const mean = wpms.reduce((a, b) => a + b, 0) / wpms.length;
      if (mean > 0) {
        const variance = wpms.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / wpms.length;
        const stdDev = Math.sqrt(variance);
        consistency = Math.max(0, Math.min(100, Math.round(100 - (stdDev / mean) * 100)));
      }
    }

    const result: TestResult = {
      id: `result-${Date.now()}`,
      wpm,
      rawWpm,
      cpm,
      accuracy,
      timeSeconds: Math.round(durationSeconds),
      totalChars: totalTyped,
      correctChars: correctCount,
      incorrectChars: incorrectCount,
      extraChars: extraCount,
      missedChars: Math.max(0, missedCount),
      consistency,
      wpmOverTime: stateRef.current.wpmHistory,
      snippetTitle: snippet.title,
      language: snippet.language,
      date: Date.now(),
    };

    onComplete(result);
  }, [targetChars.length, snippet.title, snippet.language, onComplete]);

  // Interval timer for stats and time mode
  useEffect(() => {
    if (status !== 'typing') return;

    const timer = setInterval(() => {
      const { startTime: st, totalKeypresses: tk, charStates: cs, errorCount: ec } = stateRef.current;
      if (!st) return;

      const now = Date.now();
      const elapsedSec = (now - st) / 1000;
      setElapsedTime(elapsedSec);

      if (mode === 'time') {
        const left = Math.max(0, timeDuration - Math.floor(elapsedSec));
        setRemainingTime(left);
        if (left <= 0) {
          handleTestComplete();
          return;
        }
      }

      const minutes = elapsedSec / 60;
      if (minutes > 0) {
        const correctCount = cs.filter(s => s === 'correct').length;
        const curWpm = Math.max(0, Math.round((correctCount / 5) / minutes));
        const curRaw = Math.max(0, Math.round((tk / 5) / minutes));
        setWpmHistory(prev => [
          ...prev,
          {
            time: Math.round(elapsedSec),
            wpm: curWpm,
            rawWpm: curRaw,
            errors: ec,
          }
        ]);
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [status, mode, timeDuration, handleTestComplete]);

  // Handle keydown input
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      resetTest();
      return;
    }

    if (e.ctrlKey || e.metaKey || e.altKey) {
      return;
    }

    const {
      status: curStatus,
      cursorIndex: curIdx,
      charStates: curStates,
      extraCharsMap: curExtra,
      spawnedCloseIndices: curSpawned,
      openToClose: curOpenToClose,
      targetChars: chars,
      settings: curSettings,
    } = stateRef.current;

    if (curStatus === 'completed') return;

    if (e.key === 'Tab' || e.key === 'Backspace' || e.key === ' ' || e.key === 'Enter') {
      e.preventDefault();
    }

    if (curStatus === 'idle') {
      if (e.key.length > 1 && e.key !== 'Enter' && e.key !== 'Tab') {
        return;
      }
      setStatus('typing');
      setStartTime(Date.now());
      setElapsedTime(0);
    }

    if (curSettings.strictMode && curIdx > 0 && curStates[curIdx - 1] === 'incorrect' && e.key !== 'Backspace') {
      playErrorSound(curSettings.soundVolume);
      return;
    }

    // --- BACKSPACE HANDLING ---
    if (e.key === 'Backspace') {
      playKeySound(curSettings.soundType, curSettings.soundVolume, 'Backspace');

      if (curExtra[curIdx] && curExtra[curIdx].length > 0) {
        const updated = { ...curExtra };
        updated[curIdx] = updated[curIdx].slice(0, -1);
        if (!updated[curIdx]) delete updated[curIdx];
        setExtraCharsMap(updated);
        return;
      }

      if (curIdx > 0) {
        let prevIdx = curIdx - 1;
        const newStates = [...curStates];

        // If backspacing an opening pair, unspawn its matching closing pair
        if (curSettings.autoClosePairs && curOpenToClose.has(prevIdx)) {
          const matchingClose = curOpenToClose.get(prevIdx)!;
          if (curSpawned.has(matchingClose)) {
            const nextSpawned = new Set(curSpawned);
            nextSpawned.delete(matchingClose);
            setSpawnedCloseIndices(nextSpawned);
          }
        }

        if (curSettings.indentMode === 'smart') {
          while (
            prevIdx > 0 &&
            (chars[prevIdx].char === ' ' || chars[prevIdx].char === '\t') &&
            chars[prevIdx - 1].char !== '\n'
          ) {
            newStates[prevIdx] = 'untouched';
            prevIdx--;
          }
        }

        newStates[prevIdx] = 'untouched';
        setCharStates(newStates);
        setCursorIndex(prevIdx);
      }
      return;
    }

    // --- TAB HANDLING: JUMP OUT OF AUTO-PAIRS (NEVER SKIP ;) ---
    if (e.key === 'Tab') {
      playKeySound(curSettings.soundType, curSettings.soundVolume, 'Tab');

      // Check if there are spawned closing pairs (e.g. ' or ) or ]) on the current line ahead
      if (curSettings.autoClosePairs && curSpawned.size > 0 && curIdx < chars.length) {
        const currentLine = chars[curIdx].lineIndex;
        const lineSpawnedIndices: number[] = [];

        // Scan ahead on current line for spawned indices
        let scan = curIdx;
        while (scan < chars.length && chars[scan].lineIndex === currentLine) {
          if (curSpawned.has(scan)) {
            lineSpawnedIndices.push(scan);
          }
          scan++;
        }

        if (lineSpawnedIndices.length > 0) {
          const lastSpawned = Math.max(...lineSpawnedIndices);

          // Ensure all characters between cursor and lastSpawned are either spawned pairs or whitespace
          // (User must have typed the text inside the quotes/brackets!)
          let canJump = true;
          for (let i = curIdx; i <= lastSpawned; i++) {
            if (!curSpawned.has(i) && chars[i].char !== ' ' && chars[i].char !== '\t') {
              canJump = false;
              break;
            }
          }

          if (canJump) {
            setTotalKeypresses(prev => prev + lineSpawnedIndices.length);
            const newStates = [...curStates];
            const nextSpawned = new Set(curSpawned);

            for (const sIdx of lineSpawnedIndices) {
              newStates[sIdx] = 'correct';
              nextSpawned.delete(sIdx);
            }

            // CRITICAL: Next cursor position is IMMEDIATELY after the last spawned closing bracket/quote!
            // In `require('express');`, after `')` the next character is `;`!
            // `;` is NOT touched, marked correct, or skipped! The user MUST type `;`!
            const nextCursor = lastSpawned + 1;

            setSpawnedCloseIndices(nextSpawned);
            setCharStates(newStates);
            setCursorIndex(nextCursor);

            if (nextCursor >= chars.length) {
              handleTestComplete();
            }
            return;
          }
        }
      }

      // If not jumping auto-pairs, handle normal Tab indentation
      setTotalKeypresses(prev => prev + 1);
      if (curIdx < chars.length) {
        const target = chars[curIdx].char;
        if (target === '\t' || target === ' ') {
          let nextIdx = curIdx;
          const newStates = [...curStates];
          const tabLength = curSettings.tabSize || 4;
          let count = 0;

          while (
            nextIdx < chars.length &&
            (chars[nextIdx].char === ' ' || chars[nextIdx].char === '\t') &&
            count < tabLength
          ) {
            newStates[nextIdx] = 'correct';
            nextIdx++;
            count++;
          }

          setCharStates(newStates);
          setCursorIndex(nextIdx);

          if (nextIdx >= chars.length) {
            handleTestComplete();
          }
          return;
        }
      }
      return;
    }

    // --- REGULAR TYPING / ENTER HANDLING ---
    if (curIdx >= chars.length) {
      handleTestComplete();
      return;
    }

    const expectedChar = chars[curIdx].char;
    let inputChar = e.key;

    if (e.key === 'Enter') {
      inputChar = '\n';
      // User pressed Enter: NEVER skip ';' or closing pairs!
      // Enter is ONLY accepted if expectedChar is literally '\n'.
      // If expectedChar is ';' or anything else, inputChar '\n' will not match expectedChar,
      // correctly preventing the user from skipping the semicolon!
    }

    if (e.key.length > 1 && e.key !== 'Enter') {
      return;
    }

    setTotalKeypresses(prev => prev + 1);

    // Overtyping check for closing pair characters
    const isMatchingCloseOvertype = 
      curSettings.autoClosePairs &&
      curSpawned.has(curIdx) &&
      inputChar === expectedChar;

    const isMatch = inputChar === expectedChar;

    if (isMatch || isMatchingCloseOvertype) {
      playKeySound(curSettings.soundType, curSettings.soundVolume, inputChar);
      const newStates = [...curStates];
      newStates[curIdx] = 'correct';

      const nextSpawned = new Set(curSpawned);

      // If user typed opening pair (like `(` or `'`), spawn its matching closing pair!
      if (curSettings.autoClosePairs && curOpenToClose.has(curIdx)) {
        const matchingCloseIdx = curOpenToClose.get(curIdx)!;
        nextSpawned.add(matchingCloseIdx);
      }

      // If user overtyped a closing pair, remove from spawned set
      if (curSpawned.has(curIdx)) {
        nextSpawned.delete(curIdx);
      }

      setSpawnedCloseIndices(nextSpawned);

      let nextIndex = curIdx + 1;

      // When user types newline, smart auto-indent to next line's code
      if (inputChar === '\n' && curSettings.indentMode === 'smart') {
        while (nextIndex < chars.length && (chars[nextIndex].char === ' ' || chars[nextIndex].char === '\t')) {
          newStates[nextIndex] = 'correct';
          nextIndex++;
        }
      }

      setCharStates(newStates);
      setCursorIndex(nextIndex);

      if (nextIndex >= chars.length) {
        handleTestComplete();
      }
    } else {
      playErrorSound(curSettings.soundVolume);
      setErrorCount(prev => prev + 1);

      const newStates = [...curStates];
      
      if (expectedChar === '\n') {
        const curExtraStr = curExtra[curIdx] || '';
        if (curExtraStr.length < 15) {
          setExtraCharsMap({
            ...curExtra,
            [curIdx]: curExtraStr + inputChar,
          });
        }
      } else {
        newStates[curIdx] = 'incorrect';
        setCharStates(newStates);
        setCursorIndex(curIdx + 1);
        if (curIdx + 1 >= chars.length) {
          handleTestComplete();
        }
      }
    }
  }, [resetTest, handleTestComplete]);

  // Global key listener
  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  // Calculate live metrics
  const liveMetrics = useMemo(() => {
    const elapsedMinutes = elapsedTime / 60;
    const correctCount = charStates.filter(s => s === 'correct').length;
    const incorrectCount = charStates.filter(s => s === 'incorrect').length;
    const totalTyped = totalKeypresses || (correctCount + incorrectCount);

    const wpm = elapsedMinutes > 0 ? Math.max(0, Math.round((correctCount / 5) / elapsedMinutes)) : 0;
    const rawWpm = elapsedMinutes > 0 ? Math.max(0, Math.round((totalTyped / 5) / elapsedMinutes)) : 0;
    const cpm = elapsedMinutes > 0 ? Math.max(0, Math.round(correctCount / elapsedMinutes)) : 0;
    const accuracy = totalTyped > 0 
      ? Math.max(0, Math.min(100, Math.round((correctCount / totalTyped) * 100)))
      : 100;
    const progress = targetChars.length > 0 ? Math.min(100, Math.round((cursorIndex / targetChars.length) * 100)) : 0;

    return {
      wpm,
      rawWpm,
      cpm,
      accuracy,
      progress,
      elapsedTime: Math.floor(elapsedTime),
      remainingTime,
      correctCount,
      incorrectCount,
      errorCount,
    };
  }, [elapsedTime, charStates, totalKeypresses, cursorIndex, targetChars.length, remainingTime, errorCount]);

  return {
    status,
    cursorIndex,
    charStates,
    extraCharsMap,
    spawnedCloseIndices,
    targetChars,
    liveMetrics,
    resetTest,
    autoAdvanceWhitespace,
  };
}
