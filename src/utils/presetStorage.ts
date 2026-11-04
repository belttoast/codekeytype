import type { Snippet, Language } from '../types';
import { BUILT_IN_SNIPPETS } from '../data/builtInSnippets';

const STORAGE_KEY_PRESETS = 'codekeytype_custom_presets_v1';

export function getCustomPresets(): Snippet[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_PRESETS);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch (e) {
    console.error('Failed to load presets from localStorage', e);
    return [];
  }
}

export function saveCustomPreset(preset: Omit<Snippet, 'id' | 'createdAt' | 'isCustom'> & { id?: string }): Snippet {
  const current = getCustomPresets();
  const id = preset.id || `custom-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
  
  const newSnippet: Snippet = {
    ...preset,
    id,
    isCustom: true,
    createdAt: Date.now(),
    category: 'custom'
  };

  const existingIndex = current.findIndex(p => p.id === id);
  let updated: Snippet[];

  if (existingIndex >= 0) {
    newSnippet.bestWpm = current[existingIndex].bestWpm;
    newSnippet.bestAccuracy = current[existingIndex].bestAccuracy;
    newSnippet.completedCount = current[existingIndex].completedCount;
    updated = [...current];
    updated[existingIndex] = newSnippet;
  } else {
    updated = [newSnippet, ...current];
  }

  localStorage.setItem(STORAGE_KEY_PRESETS, JSON.stringify(updated));
  return newSnippet;
}

export function deleteCustomPreset(id: string): boolean {
  const current = getCustomPresets();
  const filtered = current.filter(p => p.id !== id);
  if (filtered.length !== current.length) {
    localStorage.setItem(STORAGE_KEY_PRESETS, JSON.stringify(filtered));
    return true;
  }
  return false;
}

export function updatePresetScore(id: string, wpm: number, accuracy: number): void {
  const customPresets = getCustomPresets();
  const index = customPresets.findIndex(p => p.id === id);

  if (index >= 0) {
    const preset = customPresets[index];
    const bestWpm = Math.max(preset.bestWpm || 0, wpm);
    const bestAcc = Math.max(preset.bestAccuracy || 0, accuracy);
    const completedCount = (preset.completedCount || 0) + 1;

    customPresets[index] = {
      ...preset,
      bestWpm,
      bestAccuracy: bestAcc,
      completedCount,
    };
    localStorage.setItem(STORAGE_KEY_PRESETS, JSON.stringify(customPresets));
  } else {
    try {
      const statsKey = `codekeytype_builtin_stats_${id}`;
      const saved = JSON.parse(localStorage.getItem(statsKey) || '{}');
      saved.bestWpm = Math.max(saved.bestWpm || 0, wpm);
      saved.bestAccuracy = Math.max(saved.bestAccuracy || 0, accuracy);
      saved.completedCount = (saved.completedCount || 0) + 1;
      localStorage.setItem(statsKey, JSON.stringify(saved));
    } catch {}
  }
}

export function getBuiltInPresetStats(id: string): { bestWpm?: number; bestAccuracy?: number; completedCount?: number } {
  try {
    const statsKey = `codekeytype_builtin_stats_${id}`;
    return JSON.parse(localStorage.getItem(statsKey) || '{}');
  } catch {
    return {};
  }
}

export function getAllSnippets(): Snippet[] {
  const custom = getCustomPresets();
  const builtInWithStats = BUILT_IN_SNIPPETS.map(snippet => {
    const stats = getBuiltInPresetStats(snippet.id);
    return {
      ...snippet,
      bestWpm: stats.bestWpm,
      bestAccuracy: stats.bestAccuracy,
      completedCount: stats.completedCount
    };
  });
  return [...custom, ...builtInWithStats];
}

export function detectLanguage(code: string): Language {
  const trimmed = code.trim();
  
  if (/^<(!DOCTYPE|html|div|span|h[1-6]|p|body|head)/i.test(trimmed)) return 'html';
  if (/(\.[\w-]+\s*\{|@media|@keyframes|\b(margin|padding|background|display):\s*)/.test(trimmed)) return 'css';
  if (/^(SELECT|INSERT|UPDATE|DELETE|CREATE|ALTER|DROP)\s/i.test(trimmed) || /FROM\s+\w+/i.test(trimmed)) return 'sql';
  if (/^(\{[\s\S]*\}|\[[\s\S]*\])$/.test(trimmed) && (trimmed.startsWith('{') || trimmed.startsWith('['))) {
    try {
      JSON.parse(trimmed);
      return 'json';
    } catch {}
  }
  if (/^#!\/bin\/(bash|sh)|echo\s+"|grep\s|curl\s/m.test(trimmed)) return 'bash';
  if (/\bdef\s+\w+\s*\(|\belif\b|\bimport\s+[\w_]+\b|\bprint\s*\(/.test(trimmed)) return 'python';
  if (/\bfn\s+\w+\s*\(|\blet\s+mut\b|\bimpl\b|\bmatch\s+\w+\s*\{|\bpub\s+struct\b/.test(trimmed)) return 'rust';
  if (/\bfunc\s+\w+\s*\(|\bpackage\s+\w+|\bchan\s+\w+/.test(trimmed)) return 'go';
  if (/#include\s+<|\bstd::|\btemplate\s*<|\bcout\s*<</.test(trimmed)) return 'cpp';
  if (/\bpublic\s+class\b|\bSystem\.out\.println|\bprivate\s+final\b/.test(trimmed)) return 'java';
  if (/\b(interface|type\s+\w+\s*=|as\s+\w+|:\s*(string|number|boolean|any)\[?\]?)\b/.test(trimmed)) return 'typescript';
  
  return 'javascript';
}

export function exportPresetsToJson(): string {
  const presets = getCustomPresets();
  return JSON.stringify(presets, null, 2);
}

export function importPresetsFromJson(jsonString: string): { success: boolean; count: number; error?: string } {
  try {
    const data = JSON.parse(jsonString);
    if (!Array.isArray(data)) {
      return { success: false, count: 0, error: 'JSON must be an array of preset objects' };
    }

    const current = getCustomPresets();
    let importedCount = 0;

    for (const item of data) {
      if (item && item.code && item.title) {
        const id = item.id || `custom-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
        const exists = current.findIndex(p => p.id === id);
        const snippet: Snippet = {
          id,
          title: String(item.title).substring(0, 80),
          description: item.description ? String(item.description).substring(0, 150) : undefined,
          language: (item.language as Language) || detectLanguage(item.code),
          code: String(item.code),
          category: 'custom',
          isCustom: true,
          createdAt: item.createdAt || Date.now(),
        };

        if (exists >= 0) {
          current[exists] = snippet;
        } else {
          current.push(snippet);
        }
        importedCount++;
      }
    }

    localStorage.setItem(STORAGE_KEY_PRESETS, JSON.stringify(current));
    return { success: true, count: importedCount };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return { success: false, count: 0, error: msg };
  }
}
