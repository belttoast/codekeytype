import React from 'react';
import type { UserSettings, ThemeId, CaretStyle, IndentMode, SoundType, BlindModeType } from '../types';
import { X, Sliders, Volume2, Palette, Terminal, Type, EyeOff } from 'lucide-react';
import { playKeySound } from '../utils/soundEffects';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: UserSettings;
  onUpdateSettings: (settings: Partial<UserSettings>) => void;
}

const THEMES: { id: ThemeId; name: string; bg: string; accent: string }[] = [
  { id: 'serika-dark', name: 'Serika Dark', bg: '#212328', accent: '#facc15' },
  { id: 'carbon', name: 'Carbon', bg: '#141414', accent: '#f59e0b' },
  { id: 'dracula', name: 'Dracula', bg: '#1e1f29', accent: '#bd93f9' },
  { id: 'nord', name: 'Nord', bg: '#242933', accent: '#38bdf8' },
  { id: 'catppuccin', name: 'Catppuccin Mocha', bg: '#181825', accent: '#cba6f7' },
  { id: 'matrix', name: 'Matrix', bg: '#070b09', accent: '#00ff66' },
  { id: 'monokai', name: 'Monokai Pro', bg: '#1c1d1a', accent: '#a6e22e' },
  { id: 'cyberpunk', name: 'Cyberpunk Neon', bg: '#080811', accent: '#00f0ff' },
];

const FONTS = [
  { id: '"JetBrains Mono", monospace', name: 'JetBrains Mono' },
  { id: '"Fira Code", monospace', name: 'Fira Code' },
  { id: '"Source Code Pro", monospace', name: 'Source Code Pro' },
  { id: 'Consolas, monospace', name: 'Consolas' },
  { id: 'monospace', name: 'System Monospace' },
];

const BLIND_OPTIONS: { id: BlindModeType; title: string; desc: string }[] = [
  { 
    id: 'off', 
    title: 'Normal (Visible)', 
    desc: 'Standard mode: all code is visible while typing.' 
  },
  { 
    id: 'semi-blind', 
    title: 'Semi-Blind', 
    desc: 'Random parts/tokens of code disappear. Tune difficulty up or down.' 
  },
  { 
    id: 'blind', 
    title: 'Line Flash Blind', 
    desc: 'Code flashes briefly on start & each new line, then disappears.' 
  },
  { 
    id: 'fully-blind', 
    title: 'Fully Blind', 
    desc: 'Only code comments are visible. Code reveals as you type it.' 
  },
];

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  settings,
  onUpdateSettings,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fade-in">
      <div 
        className="w-full max-w-2xl bg-theme-surface border border-theme-border rounded-2xl shadow-2xl flex flex-col max-h-[85vh] overflow-hidden animate-scale-in"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-theme-border bg-theme-card/60">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-theme-accent/15 text-theme-accent">
              <Sliders className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-theme-main">Settings</h2>
              <p className="text-xs text-theme-sub">Configure your code typing environment</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg text-theme-sub hover:text-theme-main hover:bg-theme-border/30 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-6 overflow-y-auto">
          {/* Blind Training Modes Section */}
          <section className="space-y-3">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-theme-sub">
              <EyeOff className="w-4 h-4 text-theme-accent" />
              <span>Blind Training Modes</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {BLIND_OPTIONS.map(opt => (
                <button
                  key={opt.id}
                  onClick={() => onUpdateSettings({ blindModeType: opt.id })}
                  className={`p-3.5 rounded-xl border text-left transition-all flex flex-col justify-between ${
                    settings.blindModeType === opt.id
                      ? 'border-theme-accent ring-1 ring-theme-accent bg-theme-card'
                      : 'border-theme-border/80 hover:border-theme-sub bg-theme-bg'
                  }`}
                >
                  <div className="flex items-center justify-between w-full">
                    <span className="text-xs font-bold text-theme-main">{opt.title}</span>
                    {settings.blindModeType === opt.id && (
                      <span className="w-2 h-2 rounded-full bg-theme-accent" />
                    )}
                  </div>
                  <p className="text-[11px] text-theme-sub mt-1.5 leading-normal">
                    {opt.desc}
                  </p>
                </button>
              ))}
            </div>

            {/* Tuning for Semi-Blind */}
            {settings.blindModeType === 'semi-blind' && (
              <div className="p-4 rounded-xl bg-theme-bg border border-theme-border/80 space-y-2 mt-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-theme-main">Semi-Blind Intensity (Hidden Code)</span>
                  <span className="text-xs font-mono font-bold text-theme-accent">
                    {settings.semiBlindIntensity}% hidden
                  </span>
                </div>
                <input
                  type="range"
                  min="15"
                  max="85"
                  step="5"
                  value={settings.semiBlindIntensity}
                  onChange={(e) => onUpdateSettings({ semiBlindIntensity: parseInt(e.target.value) })}
                  className="w-full accent-theme-accent cursor-pointer h-1.5 bg-theme-surface rounded-lg"
                />
                <div className="flex justify-between text-[10px] text-theme-sub font-mono">
                  <span>Easy (15%)</span>
                  <span>Moderate (35%)</span>
                  <span>Extreme (85%)</span>
                </div>
              </div>
            )}

            {/* Tuning for Line Flash Blind */}
            {settings.blindModeType === 'blind' && (
              <div className="p-4 rounded-xl bg-theme-bg border border-theme-border/80 space-y-3 mt-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-theme-main">Line Flash Duration (includes &lt; 1 sec)</span>
                  <span className="text-xs font-mono font-bold text-theme-accent">
                    {settings.blindFlashDuration < 1 
                      ? `${Math.round(settings.blindFlashDuration * 1000)}ms (${settings.blindFlashDuration}s)` 
                      : `${settings.blindFlashDuration}s`}
                  </span>
                </div>

                {/* Slider from 0.1s to 3.0s */}
                <input
                  type="range"
                  min="0.1"
                  max="3.0"
                  step="0.1"
                  value={settings.blindFlashDuration}
                  onChange={(e) => onUpdateSettings({ blindFlashDuration: parseFloat(e.target.value) })}
                  className="w-full accent-theme-accent cursor-pointer h-1.5 bg-theme-surface rounded-lg"
                />

                {/* Quick buttons with options lower than 1 sec */}
                <div className="grid grid-cols-7 gap-1.5 pt-1">
                  {[0.2, 0.4, 0.6, 0.8, 1.0, 1.5, 2.0].map(dur => (
                    <button
                      key={dur}
                      onClick={() => onUpdateSettings({ blindFlashDuration: dur })}
                      className={`py-1.5 rounded-lg text-xs font-mono font-medium transition-all ${
                        settings.blindFlashDuration === dur
                          ? 'bg-theme-accent text-theme-bg font-bold shadow-sm'
                          : 'bg-theme-surface text-theme-sub hover:text-theme-main'
                      }`}
                    >
                      {dur < 1 ? `${Math.round(dur * 1000)}ms` : `${dur}s`}
                    </button>
                  ))}
                </div>
                <div className="flex justify-between text-[10px] text-theme-sub font-mono">
                  <span>Sub-second (0.1s - 0.8s)</span>
                  <span>Normal (1.0s)</span>
                  <span>Relaxed (2.0s+)</span>
                </div>
              </div>
            )}
          </section>

          {/* Theme Selector */}
          <section className="space-y-3 pt-2 border-t border-theme-border/60">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-theme-sub">
              <Palette className="w-4 h-4 text-theme-accent" />
              <span>Color Themes</span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              {THEMES.map(t => (
                <button
                  key={t.id}
                  onClick={() => onUpdateSettings({ theme: t.id })}
                  className={`p-3 rounded-xl border text-left transition-all flex items-center justify-between ${
                    settings.theme === t.id
                      ? 'border-theme-accent ring-1 ring-theme-accent bg-theme-card'
                      : 'border-theme-border/80 hover:border-theme-sub bg-theme-bg'
                  }`}
                >
                  <span className="text-xs font-medium text-theme-main">{t.name}</span>
                  <div className="flex items-center gap-1.5">
                    <span className="w-3 h-3 rounded-full border border-black/30" style={{ backgroundColor: t.bg }} />
                    <span className="w-3 h-3 rounded-full border border-black/30" style={{ backgroundColor: t.accent }} />
                  </div>
                </button>
              ))}
            </div>
          </section>

          {/* Code Indentation & Behavior */}
          <section className="space-y-3 pt-2 border-t border-theme-border/60">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-theme-sub">
              <Terminal className="w-4 h-4 text-theme-accent" />
              <span>IDE Code Behavior</span>
            </div>

            {/* Auto-closing brackets & quotes feature */}
            <label className="flex items-center justify-between p-4 rounded-xl bg-theme-bg border border-theme-accent/40 shadow-sm cursor-pointer">
              <div className="space-y-0.5">
                <span className="text-xs font-bold text-theme-main flex items-center gap-2">
                  <span>Auto-close Brackets & Quotes</span>
                  <span className="text-[10px] px-1.5 py-0.2 rounded bg-theme-accent/20 text-theme-accent font-mono">
                    Tab to Exit
                  </span>
                </span>
                <p className="text-[11px] text-theme-sub leading-normal">
                  Typing ( or ' spawns matching ) or '. Type text inside, press Tab to exit pair, then type semicolon ; (never skipped).
                </p>
              </div>
              <input
                type="checkbox"
                checked={settings.autoClosePairs}
                onChange={(e) => onUpdateSettings({ autoClosePairs: e.target.checked })}
                className="w-4 h-4 accent-theme-accent rounded cursor-pointer ml-3"
              />
            </label>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="p-4 rounded-xl bg-theme-bg border border-theme-border/80 space-y-2">
                <span className="text-xs font-semibold text-theme-main block">Indentation Mode</span>
                <p className="text-[11px] text-theme-sub leading-normal">
                  Smart auto-indent jumps directly to code on each indented line when pressing Enter.
                </p>
                <div className="flex gap-2 pt-1">
                  {(['smart', 'manual'] as IndentMode[]).map(mode => (
                    <button
                      key={mode}
                      onClick={() => onUpdateSettings({ indentMode: mode })}
                      className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-medium capitalize transition-all ${
                        settings.indentMode === mode
                          ? 'bg-theme-accent text-theme-bg font-bold'
                          : 'bg-theme-surface text-theme-sub hover:text-theme-main'
                      }`}
                    >
                      {mode === 'smart' ? 'Smart (Auto)' : 'Manual (Purist)'}
                    </button>
                  ))}
                </div>
              </div>

              <div className="p-4 rounded-xl bg-theme-bg border border-theme-border/80 space-y-2">
                <span className="text-xs font-semibold text-theme-main block">Tab Width</span>
                <p className="text-[11px] text-theme-sub leading-normal">
                  Number of spaces per indentation level.
                </p>
                <div className="flex gap-2 pt-1">
                  {[2, 4].map(size => (
                    <button
                      key={size}
                      onClick={() => onUpdateSettings({ tabSize: size })}
                      className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-mono font-medium transition-all ${
                        settings.tabSize === size
                          ? 'bg-theme-accent text-theme-bg font-bold'
                          : 'bg-theme-surface text-theme-sub hover:text-theme-main'
                      }`}
                    >
                      {size} Spaces
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
              <label className="flex items-center justify-between p-3 rounded-xl bg-theme-bg border border-theme-border/80 cursor-pointer">
                <div>
                  <span className="text-xs font-medium text-theme-main block">Strict Mode</span>
                  <span className="text-[11px] text-theme-sub">Must correct mistakes before advancing</span>
                </div>
                <input
                  type="checkbox"
                  checked={settings.strictMode}
                  onChange={(e) => onUpdateSettings({ strictMode: e.target.checked })}
                  className="w-4 h-4 accent-theme-accent rounded cursor-pointer"
                />
              </label>

              <label className="flex items-center justify-between p-3 rounded-xl bg-theme-bg border border-theme-border/80 cursor-pointer">
                <div>
                  <span className="text-xs font-medium text-theme-main block">Line Numbers</span>
                  <span className="text-[11px] text-theme-sub">Display gutter line numbers</span>
                </div>
                <input
                  type="checkbox"
                  checked={settings.showLineNumbers}
                  onChange={(e) => onUpdateSettings({ showLineNumbers: e.target.checked })}
                  className="w-4 h-4 accent-theme-accent rounded cursor-pointer"
                />
              </label>
            </div>
          </section>

          {/* Sound Synthesizer */}
          <section className="space-y-3 pt-2 border-t border-theme-border/60">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-theme-sub">
                <Volume2 className="w-4 h-4 text-theme-accent" />
                <span>Typing Sound FX</span>
              </div>
              <span className="text-xs font-mono text-theme-sub">
                {Math.round(settings.soundVolume * 100)}%
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
              {(
                [
                  { id: 'mech-click', label: 'Cherry Blue' },
                  { id: 'thock', label: 'Linear Thock' },
                  { id: 'typewriter', label: 'Typewriter' },
                  { id: 'beep', label: 'Terminal Beep' },
                  { id: 'off', label: 'Muted' },
                ] as { id: SoundType; label: string }[]
              ).map(sound => (
                <button
                  key={sound.id}
                  onClick={() => {
                    onUpdateSettings({ soundType: sound.id });
                    playKeySound(sound.id, settings.soundVolume, 'a');
                  }}
                  className={`py-2 px-3 rounded-xl text-xs font-medium border text-center transition-all ${
                    settings.soundType === sound.id
                      ? 'border-theme-accent bg-theme-accent text-theme-bg font-bold shadow-sm'
                      : 'border-theme-border/80 bg-theme-bg text-theme-sub hover:text-theme-main'
                  }`}
                >
                  {sound.label}
                </button>
              ))}
            </div>

            {settings.soundType !== 'off' && (
              <div className="flex items-center gap-4 pt-1">
                <span className="text-xs text-theme-sub">Volume:</span>
                <input
                  type="range"
                  min="0.05"
                  max="1"
                  step="0.05"
                  value={settings.soundVolume}
                  onChange={(e) => onUpdateSettings({ soundVolume: parseFloat(e.target.value) })}
                  className="flex-1 accent-theme-accent cursor-pointer h-1.5 bg-theme-bg rounded-lg"
                />
              </div>
            )}
          </section>

          {/* Typography & Caret */}
          <section className="space-y-3 pt-2 border-t border-theme-border/60">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-theme-sub">
              <Type className="w-4 h-4 text-theme-accent" />
              <span>Typography & Caret</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-theme-sub mb-1.5">Font Family</label>
                <select
                  value={settings.fontFamily}
                  onChange={(e) => onUpdateSettings({ fontFamily: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-theme-bg border border-theme-border text-theme-main text-xs font-mono focus:border-theme-accent focus:outline-none"
                >
                  {FONTS.map(f => (
                    <option key={f.id} value={f.id} className="bg-theme-surface">
                      {f.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-theme-sub mb-1.5">Font Size ({settings.fontSize}px)</label>
                <div className="flex gap-2">
                  {[16, 18, 20, 24].map(sz => (
                    <button
                      key={sz}
                      onClick={() => onUpdateSettings({ fontSize: sz })}
                      className={`flex-1 py-1.5 rounded-lg text-xs font-mono font-medium transition-all ${
                        settings.fontSize === sz
                          ? 'bg-theme-accent text-theme-bg font-bold'
                          : 'bg-theme-bg text-theme-sub hover:text-theme-main border border-theme-border'
                      }`}
                    >
                      {sz}px
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-theme-sub mb-1.5">Caret Style</label>
              <div className="grid grid-cols-4 gap-2">
                {(['line', 'block', 'underline', 'off'] as CaretStyle[]).map(style => (
                  <button
                    key={style}
                    onClick={() => onUpdateSettings({ caretStyle: style })}
                    className={`py-1.5 px-2 rounded-lg text-xs capitalize transition-all border ${
                      settings.caretStyle === style
                        ? 'border-theme-accent bg-theme-accent text-theme-bg font-bold'
                        : 'border-theme-border bg-theme-bg text-theme-sub hover:text-theme-main'
                    }`}
                  >
                    {style}
                  </button>
                ))}
              </div>
            </div>
          </section>
        </div>

        <div className="px-6 py-4 border-t border-theme-border bg-theme-card/60 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-theme-accent hover:bg-theme-accentHover text-theme-bg font-bold text-xs shadow-md transition-all"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
