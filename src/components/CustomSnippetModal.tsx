import React, { useState } from 'react';
import type { Snippet, Language, UiLanguage } from '../types';
import { useTranslation } from '../utils/translations';
import { detectLanguage, saveCustomPreset, getCustomPresets, deleteCustomPreset, exportPresetsToJson, importPresetsFromJson } from '../utils/presetStorage';
import { X, Clipboard, Save, Play, Trash2, Edit3, Download, Upload, Check, Search, Code, Sparkles } from 'lucide-react';

interface CustomSnippetModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectSnippet: (snippet: Snippet) => void;
  initialCode?: string;
  uiLanguage?: UiLanguage;
}

const LANGUAGES: { id: Language; label: string }[] = [
  { id: 'javascript', label: 'JavaScript' },
  { id: 'typescript', label: 'TypeScript' },
  { id: 'python', label: 'Python' },
  { id: 'cpp', label: 'C++' },
  { id: 'rust', label: 'Rust' },
  { id: 'go', label: 'Go' },
  { id: 'java', label: 'Java' },
  { id: 'html', label: 'HTML' },
  { id: 'css', label: 'CSS' },
  { id: 'sql', label: 'SQL' },
  { id: 'bash', label: 'Bash / Shell' },
  { id: 'json', label: 'JSON' },
];

export const CustomSnippetModal: React.FC<CustomSnippetModalProps> = ({
  isOpen,
  onClose,
  onSelectSnippet,
  initialCode = '',
  uiLanguage = 'en',
}) => {
  const [activeTab, setActiveTab] = useState<'editor' | 'library'>('editor');
  const [editingId, setEditingId] = useState<string | null>(null);
  const t = useTranslation(uiLanguage);

  // Form state
  const [title, setTitle] = useState('');
  const [code, setCode] = useState(initialCode);
  const [language, setLanguage] = useState<Language>('javascript');
  const [description, setDescription] = useState('');

  // Library state
  const [presets, setPresets] = useState<Snippet[]>(() => getCustomPresets());
  const [searchQuery, setSearchQuery] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [importStatus, setImportStatus] = useState<string | null>(null);

  // React-recommended state adjustment when modal opens or initialCode changes
  const [prevIsOpen, setPrevIsOpen] = useState(isOpen);
  const [prevInitialCode, setPrevInitialCode] = useState(initialCode);

  if (isOpen !== prevIsOpen || initialCode !== prevInitialCode) {
    setPrevIsOpen(isOpen);
    setPrevInitialCode(initialCode);
    if (isOpen) {
      setPresets(getCustomPresets());
      if (initialCode) {
        setCode(initialCode);
        const detected = detectLanguage(initialCode);
        setLanguage(detected);
        setTitle(`Custom ${detected.toUpperCase()} Snippet`);
      }
    }
  }

  const handleCodeChange = (newCode: string) => {
    setCode(newCode);
    if (!editingId && newCode.trim().length > 10) {
      const detected = detectLanguage(newCode);
      setLanguage(detected);
    }
  };

  const handlePasteClipboard = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text) {
        handleCodeChange(text);
        if (!title) {
          const firstLine = text.trim().split('\n')[0].slice(0, 30);
          setTitle(firstLine || 'Pasted Snippet');
        }
      }
    } catch {
      alert('Clipboard access denied. Please press Ctrl+V directly into the editor box.');
    }
  };

  const handleSaveAndType = () => {
    if (!code.trim()) return;

    const finalTitle = title.trim() || `Custom ${language.toUpperCase()} Snippet`;
    const saved = saveCustomPreset({
      id: editingId || undefined,
      title: finalTitle,
      description: description.trim() || undefined,
      language,
      code: code.trim(),
    });

    setPresets(getCustomPresets());
    onSelectSnippet(saved);
    onClose();
  };

  const handleTypeImmediatelyWithoutSaving = () => {
    if (!code.trim()) return;
    const tempSnippet: Snippet = {
      id: `temp-${Date.now()}`,
      title: title.trim() || 'Quick Paste Snippet',
      description: 'One-off custom test',
      language,
      code: code.trim(),
      isCustom: true,
    };
    onSelectSnippet(tempSnippet);
    onClose();
  };

  const handleEdit = (snippet: Snippet) => {
    setEditingId(snippet.id);
    setTitle(snippet.title);
    setCode(snippet.code);
    setLanguage(snippet.language);
    setDescription(snippet.description || '');
    setActiveTab('editor');
  };

  const handleDelete = (id: string) => {
    if (confirm('Are you sure you want to delete this preset?')) {
      deleteCustomPreset(id);
      setPresets(getCustomPresets());
    }
  };

  const handleCopyCode = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleExport = () => {
    const json = exportPresetsToJson();
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `codekeytype-presets-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      const res = importPresetsFromJson(content);
      if (res.success) {
        setPresets(getCustomPresets());
        setImportStatus(`Imported ${res.count} presets successfully!`);
      } else {
        setImportStatus(`Import failed: ${res.error}`);
      }
      setTimeout(() => setImportStatus(null), 3500);
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  if (!isOpen) return null;

  const filteredPresets = presets.filter(p => 
    p.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.language.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (p.description && p.description.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const lineCount = code ? code.split('\n').length : 0;
  const charCount = code.length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fade-in">
      <div 
        className="w-full max-w-4xl bg-theme-surface border border-theme-border rounded-2xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden animate-scale-in"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-theme-border bg-theme-card/60">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-theme-accent/15 text-theme-accent">
              <Code className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-theme-main flex items-center gap-2">
                {t.customModalTitle}
                <span className="text-xs px-2 py-0.5 rounded-full bg-theme-accent/20 text-theme-accent font-mono font-medium">
                  {t.ctrlV} ready
                </span>
              </h2>
              <p className="text-xs text-theme-sub">{t.pasteOrWriteDesc}</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex bg-theme-bg p-1 rounded-xl border border-theme-border text-xs font-medium">
              <button
                onClick={() => setActiveTab('editor')}
                className={`px-3 py-1.5 rounded-lg transition-all ${
                  activeTab === 'editor' 
                    ? 'bg-theme-accent text-theme-bg font-bold shadow-sm' 
                    : 'text-theme-sub hover:text-theme-main'
                }`}
              >
                {editingId 
                  ? (uiLanguage === 'th' ? 'แก้ไขโค้ด' : 'Edit Snippet') 
                  : (uiLanguage === 'th' ? 'วางและสร้าง' : 'Paste & Create')}
              </button>
              <button
                onClick={() => setActiveTab('library')}
                className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 ${
                  activeTab === 'library' 
                    ? 'bg-theme-accent text-theme-bg font-bold shadow-sm' 
                    : 'text-theme-sub hover:text-theme-main'
                }`}
              >
                <span>{uiLanguage === 'th' ? 'คลังพรีเซ็ต' : 'My Presets'}</span>
                <span className="px-1.5 py-0.2 rounded-full bg-theme-surface text-[10px]">
                  {presets.length}
                </span>
              </button>
            </div>

            <button
              onClick={onClose}
              className="p-2 rounded-lg text-theme-sub hover:text-theme-main hover:bg-theme-border/30 transition-colors ml-2"
              title="Close (Esc)"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {activeTab === 'editor' && (
          <div className="p-6 flex-1 flex flex-col overflow-y-auto space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="md:col-span-2">
                <label className="block text-xs font-medium text-theme-sub mb-1.5">
                  Snippet Title / Name
                </label>
                <input
                  type="text"
                  placeholder="e.g. Redux Toolkit Slice, LeetCode 42, Rust Raytracer..."
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-theme-bg border border-theme-border text-theme-main text-sm focus:border-theme-accent focus:outline-none transition-colors"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-theme-sub mb-1.5 flex items-center justify-between">
                  <span>Language</span>
                  <span className="text-[10px] text-theme-accent flex items-center gap-1">
                    <Sparkles className="w-3 h-3" /> Auto-detected
                  </span>
                </label>
                <select
                  value={language}
                  onChange={(e) => setLanguage(e.target.value as Language)}
                  className="w-full px-3 py-2.5 rounded-xl bg-theme-bg border border-theme-border text-theme-main text-sm focus:border-theme-accent focus:outline-none transition-colors font-mono"
                >
                  {LANGUAGES.map(lang => (
                    <option key={lang.id} value={lang.id} className="bg-theme-surface text-theme-main">
                      {lang.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex-1 flex flex-col min-h-[260px]">
              <div className="flex items-center justify-between text-xs text-theme-sub mb-1.5">
                <div className="flex items-center gap-2">
                  <span>Code Snippet</span>
                  <span className="text-theme-dim">•</span>
                  <span>{lineCount} lines</span>
                  <span className="text-theme-dim">•</span>
                  <span>{charCount} characters</span>
                </div>
                <button
                  type="button"
                  onClick={handlePasteClipboard}
                  className="flex items-center gap-1.5 text-theme-accent hover:underline text-xs"
                >
                  <Clipboard className="w-3.5 h-3.5" />
                  <span>Paste from Clipboard</span>
                </button>
              </div>

              <textarea
                value={code}
                onChange={(e) => handleCodeChange(e.target.value)}
                placeholder="Paste (Ctrl+V) your code snippet here..."
                rows={12}
                className="w-full flex-1 p-4 rounded-xl bg-theme-bg border border-theme-border text-theme-main font-mono text-sm leading-relaxed focus:border-theme-accent focus:outline-none transition-colors resize-none selection:bg-theme-accent/30 selection:text-white"
                spellCheck={false}
                autoFocus
              />
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-theme-border/60">
              <div className="text-xs text-theme-sub">
                💡 Tip: Indentations and spaces are handled seamlessly during typing.
              </div>

              <div className="flex items-center gap-2">
                {editingId && (
                  <button
                    type="button"
                    onClick={() => {
                      setEditingId(null);
                      setTitle('');
                      setCode('');
                    }}
                    className="px-4 py-2 rounded-xl text-theme-sub hover:text-theme-main text-xs font-medium"
                  >
                    Cancel Edit
                  </button>
                )}

                <button
                  type="button"
                  onClick={handleTypeImmediatelyWithoutSaving}
                  disabled={!code.trim()}
                  className="px-4 py-2.5 rounded-xl border border-theme-border bg-theme-surface hover:bg-theme-card text-theme-main font-medium text-xs flex items-center gap-2 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <Play className="w-4 h-4 text-theme-sub" />
                  <span>Quick Practice (Don't Save)</span>
                </button>

                <button
                  type="button"
                  onClick={handleSaveAndType}
                  disabled={!code.trim()}
                  className="px-5 py-2.5 rounded-xl bg-theme-accent hover:bg-theme-accentHover text-theme-bg font-bold text-xs flex items-center gap-2 shadow-lg shadow-theme-accent/20 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <Save className="w-4 h-4" />
                  <span>{editingId ? 'Update & Start Typing' : 'Save Preset & Start'}</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'library' && (
          <div className="p-6 flex-1 flex flex-col overflow-y-auto space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="relative flex-1 min-w-[200px]">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-theme-sub" />
                <input
                  type="text"
                  placeholder="Search your presets by title or language..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3.5 py-2 rounded-xl bg-theme-bg border border-theme-border text-theme-main text-xs focus:border-theme-accent focus:outline-none"
                />
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={handleExport}
                  disabled={presets.length === 0}
                  className="px-3 py-2 rounded-xl bg-theme-bg border border-theme-border hover:bg-theme-card text-theme-sub hover:text-theme-main text-xs font-medium flex items-center gap-1.5 transition-colors disabled:opacity-40"
                  title="Export presets as JSON backup"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Export</span>
                </button>

                <label className="px-3 py-2 rounded-xl bg-theme-bg border border-theme-border hover:bg-theme-card text-theme-sub hover:text-theme-main text-xs font-medium flex items-center gap-1.5 cursor-pointer transition-colors">
                  <Upload className="w-3.5 h-3.5" />
                  <span>Import</span>
                  <input type="file" accept=".json" onChange={handleImport} className="hidden" />
                </label>
              </div>
            </div>

            {importStatus && (
              <div className="p-2.5 rounded-lg bg-theme-accent/15 border border-theme-accent/30 text-theme-accent text-xs font-medium">
                {importStatus}
              </div>
            )}

            <div className="flex-1 space-y-3 overflow-y-auto pr-1">
              {filteredPresets.length === 0 ? (
                <div className="py-16 text-center text-theme-sub border-2 border-dashed border-theme-border rounded-2xl flex flex-col items-center justify-center space-y-3">
                  <Code className="w-10 h-10 text-theme-sub/40" />
                  <div>
                    <p className="text-sm font-medium text-theme-main">No presets found</p>
                    <p className="text-xs text-theme-sub mt-1">
                      {presets.length === 0 
                        ? 'Paste and save your favorite code snippets to build your personal library!' 
                        : 'No presets match your search query.'}
                    </p>
                  </div>
                  {presets.length === 0 && (
                    <button
                      onClick={() => setActiveTab('editor')}
                      className="px-4 py-2 rounded-xl bg-theme-accent text-theme-bg font-bold text-xs"
                    >
                      Create First Preset
                    </button>
                  )}
                </div>
              ) : (
                filteredPresets.map(preset => {
                  const pLines = preset.code.split('\n').length;
                  return (
                    <div
                      key={preset.id}
                      className="group p-4 rounded-xl bg-theme-bg border border-theme-border/70 hover:border-theme-accent/50 transition-all flex flex-col md:flex-row md:items-center justify-between gap-4"
                    >
                      <div className="space-y-1.5 flex-1 min-w-0">
                        <div className="flex items-center gap-2.5">
                          <h3 className="text-sm font-semibold text-theme-main truncate">
                            {preset.title}
                          </h3>
                          <span className="px-2 py-0.5 rounded text-[10px] font-mono uppercase font-bold bg-theme-surface border border-theme-border text-theme-accent">
                            {preset.language}
                          </span>
                          {preset.bestWpm && preset.bestWpm > 0 && (
                            <span className="text-[11px] font-mono text-theme-accent bg-theme-accent/10 px-2 py-0.5 rounded-full font-medium">
                              Best: {preset.bestWpm} WPM ({preset.bestAccuracy}%)
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-3 text-xs text-theme-sub font-mono">
                          <span>{pLines} lines</span>
                          <span>•</span>
                          <span>{preset.code.length} chars</span>
                          {preset.completedCount && preset.completedCount > 0 ? (
                            <>
                              <span>•</span>
                              <span>Completed {preset.completedCount}x</span>
                            </>
                          ) : null}
                        </div>

                        <p className="text-xs text-theme-sub line-clamp-1 font-mono opacity-60">
                          {preset.code.slice(0, 80).replace(/\n/g, ' ')}...
                        </p>
                      </div>

                      <div className="flex items-center gap-2 self-end md:self-center shrink-0">
                        <button
                          onClick={() => handleCopyCode(preset.id, preset.code)}
                          className="p-2 rounded-lg bg-theme-surface hover:bg-theme-card text-theme-sub hover:text-theme-main transition-colors"
                          title="Copy snippet to clipboard"
                        >
                          {copiedId === preset.id ? (
                            <Check className="w-4 h-4 text-theme-accent" />
                          ) : (
                            <Clipboard className="w-4 h-4" />
                          )}
                        </button>

                        <button
                          onClick={() => handleEdit(preset)}
                          className="p-2 rounded-lg bg-theme-surface hover:bg-theme-card text-theme-sub hover:text-theme-main transition-colors"
                          title="Edit preset"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>

                        <button
                          onClick={() => handleDelete(preset.id)}
                          className="p-2 rounded-lg bg-theme-surface hover:bg-red-500/20 text-theme-sub hover:text-red-400 transition-colors"
                          title="Delete preset"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>

                        <button
                          onClick={() => {
                            onSelectSnippet(preset);
                            onClose();
                          }}
                          className="px-4 py-2 rounded-lg bg-theme-accent hover:bg-theme-accentHover text-theme-bg font-bold text-xs flex items-center gap-1.5 shadow-md shadow-theme-accent/20 transition-all ml-1"
                        >
                          <Play className="w-3.5 h-3.5 fill-current" />
                          <span>Type Preset</span>
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
