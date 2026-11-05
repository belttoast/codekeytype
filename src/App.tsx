import { useState, useEffect, useCallback, useMemo } from 'react';
import type { 
  Snippet, 
  Language, 
  UserSettings, 
  TestMode, 
  TimeDuration, 
  TestResult,
  BlindModeType
} from './types';
import { getAllSnippets, getCustomPresets, updatePresetScore } from './utils/presetStorage';
import { useTypingEngine } from './hooks/useTypingEngine';
import { HeaderBar } from './components/HeaderBar';
import { TypingArea } from './components/TypingArea';
import { ResultsModal } from './components/ResultsModal';
import { CustomSnippetModal } from './components/CustomSnippetModal';
import { SettingsModal } from './components/SettingsModal';

const DEFAULT_SETTINGS: UserSettings = {
  theme: 'serika-dark',
  caretStyle: 'line',
  indentMode: 'smart',
  autoClosePairs: true,
  optionalComments: true,
  blindModeType: 'off',
  semiBlindIntensity: 35,
  blindFlashDuration: 0.8,
  soundType: 'mech-click',
  soundVolume: 0.45,
  fontFamily: '"JetBrains Mono", monospace',
  fontSize: 18,
  strictMode: false,
  showLiveWpm: true,
  showLiveTimer: true,
  showLiveAccuracy: true,
  showLineNumbers: true,
  tabSize: 2,
};

export function App() {
  const [settings, setSettings] = useState<UserSettings>(() => {
    try {
      const saved = localStorage.getItem('codekeytype_user_settings_v1');
      return saved ? { ...DEFAULT_SETTINGS, ...JSON.parse(saved) } : DEFAULT_SETTINGS;
    } catch {
      return DEFAULT_SETTINGS;
    }
  });

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', settings.theme);
    localStorage.setItem('codekeytype_user_settings_v1', JSON.stringify(settings));
  }, [settings]);

  const [mode, setMode] = useState<TestMode>('snippet');
  const [timeDuration, setTimeDuration] = useState<TimeDuration>(30);
  const [selectedLanguage, setSelectedLanguage] = useState<Language | 'all'>('all');
  const [selectedCategory, setSelectedCategory] = useState<'all' | 'backend' | 'frontend'>('backend');
  const [practiceType, setPracticeType] = useState<'all' | 'commands' | 'code' | 'git'>('all');

  const [allSnippetsList, setAllSnippetsList] = useState<Snippet[]>(() => getAllSnippets());
  const [customPresets, setCustomPresets] = useState<Snippet[]>(() => getCustomPresets());

  const availableSectionSnippets = useMemo(() => {
    let list = allSnippetsList;
    if (selectedCategory !== 'all') {
      list = list.filter(s => s.category === selectedCategory);
    }
    if (practiceType !== 'all') {
      list = list.filter(s => s.practiceType === practiceType);
    }
    return list;
  }, [allSnippetsList, selectedCategory, practiceType]);

  const filteredSnippets = useMemo(() => {
    let list = availableSectionSnippets;
    if (selectedLanguage !== 'all') {
      list = list.filter(s => s.language === selectedLanguage);
    }
    return list;
  }, [availableSectionSnippets, selectedLanguage]);

  const [currentSnippet, setCurrentSnippet] = useState<Snippet>(() => {
    const defaultSnippet = allSnippetsList.find(s => s.category === 'backend') || allSnippetsList[0];
    return defaultSnippet || {
      id: 'fallback',
      title: 'Quick Sort',
      language: 'typescript',
      code: 'function hello() {\n  return "world";\n}',
    };
  });

  const [isCustomModalOpen, setIsCustomModalOpen] = useState(false);
  const [pastedCodeInitial, setPastedCodeInitial] = useState('');
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [testResult, setTestResult] = useState<TestResult | null>(null);

  const handleTestComplete = useCallback((result: TestResult) => {
    updatePresetScore(currentSnippet.id, result.wpm, result.accuracy);
    setTestResult(result);
  }, [currentSnippet.id]);

  const {
    status,
    cursorIndex,
    charStates,
    extraCharsMap,
    spawnedCloseIndices,
    targetChars,
    liveMetrics,
    resetTest,
  } = useTypingEngine({
    snippet: currentSnippet,
    settings,
    mode,
    timeDuration,
    onComplete: handleTestComplete,
  });

  const reloadSnippets = useCallback(() => {
    const list = getAllSnippets();
    setAllSnippetsList(list);
    setCustomPresets(getCustomPresets());
  }, []);

  const handleNextSnippet = useCallback(() => {
    setTestResult(null);
    const pool = filteredSnippets.length > 0 ? filteredSnippets : allSnippetsList;
    const candidates = pool.filter(s => s.id !== currentSnippet.id);
    const next = candidates.length > 0 
      ? candidates[Math.floor(Math.random() * candidates.length)]
      : pool[0];
    
    if (next) {
      setCurrentSnippet(next);
    } else {
      resetTest();
    }
  }, [filteredSnippets, allSnippetsList, currentSnippet.id, resetTest]);

  const handleRestart = useCallback(() => {
    setTestResult(null);
    resetTest();
  }, [resetTest]);

  const handleSelectSnippet = useCallback((snippet: Snippet) => {
    reloadSnippets();
    setCurrentSnippet(snippet);
    if (selectedLanguage !== 'all' && snippet.language !== selectedLanguage) {
      setSelectedLanguage('all');
    }
    setTestResult(null);
  }, [reloadSnippets, selectedLanguage]);

  const handleToggleSound = useCallback(() => {
    setSettings(prev => ({
      ...prev,
      soundType: prev.soundType === 'off' ? 'mech-click' : 'off',
    }));
  }, []);

  const handleUpdateSettings = useCallback((newSettings: Partial<UserSettings>) => {
    setSettings(prev => ({ ...prev, ...newSettings }));
  }, []);

  const handleChangeBlindMode = useCallback((newBlind: BlindModeType) => {
    setSettings(prev => ({ ...prev, blindModeType: newBlind }));
  }, []);

  // Global Ctrl+V / Cmd+V paste handler
  useEffect(() => {
    const handleGlobalPaste = (e: ClipboardEvent) => {
      const activeTag = document.activeElement?.tagName.toLowerCase();
      if (activeTag === 'input' || activeTag === 'textarea' || document.activeElement?.getAttribute('contenteditable') === 'true') {
        return;
      }

      const text = e.clipboardData?.getData('text');
      if (text && text.trim().length > 0) {
        e.preventDefault();
        setPastedCodeInitial(text);
        setIsCustomModalOpen(true);
      }
    };

    window.addEventListener('paste', handleGlobalPaste);
    return () => window.removeEventListener('paste', handleGlobalPaste);
  }, []);

  // Global restart on Tab + Enter
  useEffect(() => {
    let tabPressed = false;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Tab') {
        tabPressed = true;
      } else if (e.key === 'Enter' && tabPressed) {
        e.preventDefault();
        handleRestart();
        tabPressed = false;
      } else {
        tabPressed = false;
      }
    };

    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [handleRestart]);

  return (
    <div className="min-h-screen flex flex-col justify-between px-4 sm:px-8 py-2 md:py-4 transition-colors">
      <HeaderBar
        mode={mode}
        onChangeMode={(newMode) => {
          setMode(newMode);
          handleRestart();
        }}
        timeDuration={timeDuration}
        onChangeTimeDuration={(newDur) => {
          setTimeDuration(newDur);
          handleRestart();
        }}
        selectedLanguage={selectedLanguage}
        onChangeLanguage={(lang) => {
          setSelectedLanguage(lang);
          const pool = lang === 'all' ? availableSectionSnippets : availableSectionSnippets.filter(s => s.language === lang);
          if (pool.length > 0) {
            setCurrentSnippet(pool[0]);
            setTestResult(null);
          }
        }}
        selectedCategory={selectedCategory}
        onChangeCategory={(cat) => {
          setSelectedCategory(cat);
          setPracticeType('all');
          setSelectedLanguage('all');
          const matched = allSnippetsList.filter(s => cat === 'all' || s.category === cat);
          if (matched.length > 0) {
            setCurrentSnippet(matched[0]);
            setTestResult(null);
          }
        }}
        practiceType={practiceType}
        onChangePracticeType={(type) => {
          setPracticeType(type);
          const matched = allSnippetsList.filter(s => 
            (selectedCategory === 'all' || s.category === selectedCategory) &&
            (type === 'all' || s.practiceType === type)
          );
          if (matched.length > 0) {
            setCurrentSnippet(matched[0]);
            setTestResult(null);
          }
        }}
        availableSnippets={availableSectionSnippets}
        onSelectSnippet={(s) => {
          handleSelectSnippet(s);
        }}
        blindModeType={settings.blindModeType}
        onChangeBlindMode={handleChangeBlindMode}
        currentSnippet={currentSnippet}
        customPresetsCount={customPresets.length}
        onOpenCustomModal={() => {
          setPastedCodeInitial('');
          setIsCustomModalOpen(true);
        }}
        onOpenSettings={() => setIsSettingsOpen(true)}
        settings={settings}
        onToggleSound={handleToggleSound}
        liveStats={liveMetrics}
        testStatus={testResult ? 'completed' : status}
      />

      <main className="flex-1 flex items-center justify-center py-4 w-full">
        {testResult ? (
          <ResultsModal
            result={testResult}
            snippet={currentSnippet}
            onRestart={handleRestart}
            onNextSnippet={handleNextSnippet}
            onSaveAsPreset={() => reloadSnippets()}
          />
        ) : (
          <TypingArea
            targetChars={targetChars}
            charStates={charStates}
            cursorIndex={cursorIndex}
            extraCharsMap={extraCharsMap}
            spawnedCloseIndices={spawnedCloseIndices}
            settings={settings}
            status={status}
            onRestart={handleRestart}
          />
        )}
      </main>

      <footer className="w-full max-w-5xl mx-auto py-4 text-xs text-theme-sub flex flex-wrap items-center justify-between gap-4 font-mono border-t border-theme-border/40 select-none">
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1.5">
            <kbd className="px-1.5 py-0.5 rounded bg-theme-surface border border-theme-border text-theme-main text-[11px]">
              Ctrl+V
            </kbd>
            <span>paste code preset</span>
          </span>
          <span className="text-theme-dim">•</span>
          <span className="flex items-center gap-1.5">
            <kbd className="px-1.5 py-0.5 rounded bg-theme-surface border border-theme-border text-theme-main text-[11px]">
              Tab+Enter
            </kbd>
            <span>restart</span>
          </span>
          <span className="text-theme-dim">•</span>
          <span className="flex items-center gap-1.5">
            <kbd className="px-1.5 py-0.5 rounded bg-theme-surface border border-theme-border text-theme-main text-[11px]">
              Esc
            </kbd>
            <span>reset</span>
          </span>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              setPastedCodeInitial('');
              setIsCustomModalOpen(true);
            }}
            className="hover:text-theme-accent transition-colors"
          >
            preset manager ({customPresets.length})
          </button>
          <span>•</span>
          <span className="text-theme-dim">CodeKeyType</span>
        </div>
      </footer>

      <CustomSnippetModal
        isOpen={isCustomModalOpen}
        onClose={() => setIsCustomModalOpen(false)}
        onSelectSnippet={handleSelectSnippet}
        initialCode={pastedCodeInitial}
      />

      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        settings={settings}
        onUpdateSettings={handleUpdateSettings}
      />
    </div>
  );
}
export default App;
