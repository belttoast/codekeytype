import Prism from 'prismjs';

// Import language grammars
import 'prismjs/components/prism-clike';
import 'prismjs/components/prism-javascript';
import 'prismjs/components/prism-typescript';
import 'prismjs/components/prism-python';
import 'prismjs/components/prism-c';
import 'prismjs/components/prism-cpp';
import 'prismjs/components/prism-rust';
import 'prismjs/components/prism-go';
import 'prismjs/components/prism-java';
import 'prismjs/components/prism-sql';
import 'prismjs/components/prism-bash';
import 'prismjs/components/prism-json';
import 'prismjs/components/prism-css';
import 'prismjs/components/prism-markup';

import type { CodeChar, Language } from '../types';

export function getPrismGrammar(lang: Language) {
  switch (lang) {
    case 'typescript':
      return Prism.languages.typescript || Prism.languages.javascript;
    case 'javascript':
      return Prism.languages.javascript;
    case 'python':
      return Prism.languages.python;
    case 'cpp':
      return Prism.languages.cpp || Prism.languages.clike;
    case 'rust':
      return Prism.languages.rust;
    case 'go':
      return Prism.languages.go;
    case 'java':
      return Prism.languages.java;
    case 'sql':
      return Prism.languages.sql;
    case 'bash':
      return Prism.languages.bash;
    case 'json':
      return Prism.languages.json;
    case 'css':
      return Prism.languages.css;
    case 'html':
      return Prism.languages.markup;
    default:
      return Prism.languages.javascript || Prism.languages.clike;
  }
}

export function tokenizeCodeToChars(code: string, language: Language): CodeChar[] {
  const normalized = code.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  const grammar = getPrismGrammar(language);
  
  let prismTokens: (string | Prism.Token)[];
  try {
    prismTokens = Prism.tokenize(normalized, grammar);
  } catch (err) {
    console.warn('Prism tokenize error, fallback to plain text', err);
    prismTokens = [normalized];
  }

  const chars: CodeChar[] = [];
  let lineIndex = 0;
  let colIndex = 0;
  let globalIndex = 0;

  function processToken(token: string | Prism.Token, parentType = 'plain') {
    if (typeof token === 'string') {
      for (let i = 0; i < token.length; i++) {
        const char = token[i];
        chars.push({
          char,
          tokenType: parentType,
          lineIndex,
          colIndex,
          globalIndex: globalIndex++,
        });
        if (char === '\n') {
          lineIndex++;
          colIndex = 0;
        } else {
          colIndex++;
        }
      }
    } else if (Array.isArray(token.content)) {
      for (const sub of token.content) {
        processToken(sub, token.type || parentType);
      }
    } else if (typeof token.content === 'string') {
      const type = token.type || parentType;
      for (let i = 0; i < token.content.length; i++) {
        const char = token.content[i];
        chars.push({
          char,
          tokenType: type,
          lineIndex,
          colIndex,
          globalIndex: globalIndex++,
        });
        if (char === '\n') {
          lineIndex++;
          colIndex = 0;
        } else {
          colIndex++;
        }
      }
    } else {
      processToken(token.content as Prism.Token, token.type || parentType);
    }
  }

  for (const token of prismTokens) {
    processToken(token);
  }

  return chars;
}

export function getTokenColor(tokenType: string): string {
  switch (tokenType) {
    case 'keyword':
      return 'text-[var(--syntax-keyword)]';
    case 'string':
      return 'text-[var(--syntax-string)]';
    case 'function':
      return 'text-[var(--syntax-function)]';
    case 'comment':
      return 'text-[var(--syntax-comment)] italic';
    case 'number':
    case 'boolean':
      return 'text-[var(--syntax-number)]';
    case 'operator':
      return 'text-[var(--syntax-operator)]';
    case 'punctuation':
      return 'text-[var(--syntax-punctuation)]';
    case 'class-name':
      return 'text-[var(--syntax-class)]';
    case 'builtin':
      return 'text-[var(--syntax-builtin)]';
    default:
      return 'text-white';
  }
}
