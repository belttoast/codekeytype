export type Language = 
  | 'javascript' 
  | 'typescript' 
  | 'python' 
  | 'cpp' 
  | 'rust' 
  | 'go' 
  | 'html' 
  | 'css' 
  | 'sql' 
  | 'java' 
  | 'json' 
  | 'bash';

export type ThemeId = 
  | 'serika-dark' 
  | 'carbon' 
  | 'dracula' 
  | 'nord' 
  | 'catppuccin' 
  | 'matrix' 
  | 'monokai' 
  | 'cyberpunk';

export type CaretStyle = 'line' | 'block' | 'underline' | 'off';

export type IndentMode = 'smart' | 'manual';

export type SoundType = 'mech-click' | 'thock' | 'typewriter' | 'beep' | 'off';

export type TestMode = 'snippet' | 'time' | 'zen';

export type TimeDuration = 15 | 30 | 60 | 120;

export type CharStatus = 'untouched' | 'correct' | 'incorrect' | 'extra' | 'skipped';

export type BlindModeType = 'off' | 'semi-blind' | 'blind' | 'fully-blind';

export interface CodeChar {
  char: string;
  tokenType: string;
  lineIndex: number;
  colIndex: number;
  globalIndex: number;
}

export interface Snippet {
  id: string;
  title: string;
  description?: string;
  language: Language;
  code: string;
  category?: 'algorithm' | 'real-world' | 'short' | 'custom' | 'general' | 'frontend' | 'backend' | 'server';
  practiceType?: 'commands' | 'code' | 'git';
  isCustom?: boolean;
  createdAt?: number;
  bestWpm?: number;
  bestAccuracy?: number;
  completedCount?: number;
}

export interface WpmSample {
  time: number;
  wpm: number;
  rawWpm: number;
  errors: number;
}

export interface TestResult {
  id: string;
  wpm: number;
  rawWpm: number;
  cpm: number;
  accuracy: number;
  timeSeconds: number;
  totalChars: number;
  correctChars: number;
  incorrectChars: number;
  extraChars: number;
  missedChars: number;
  consistency: number;
  wpmOverTime: WpmSample[];
  snippetTitle: string;
  language: Language;
  date: number;
  isPersonalBest?: boolean;
}

export interface UserSettings {
  theme: ThemeId;
  caretStyle: CaretStyle;
  indentMode: IndentMode;
  autoClosePairs: boolean;
  optionalComments: boolean;
  blindModeType: BlindModeType;
  semiBlindIntensity: number; // 10 to 90 percentage of code hidden
  blindFlashDuration: number; // seconds line is shown before disappearing
  soundType: SoundType;
  soundVolume: number;
  fontFamily: string;
  fontSize: number;
  strictMode: boolean;
  showLiveWpm: boolean;
  showLiveTimer: boolean;
  showLiveAccuracy: boolean;
  showLineNumbers: boolean;
  tabSize: number;
}
