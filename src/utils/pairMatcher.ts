import type { CodeChar } from '../types';

export interface CodePairsInfo {
  // Map of opening index -> closing index
  openToClose: Map<number, number>;
  // Map of closing index -> opening index
  closeToOpen: Map<number, number>;
}

const QUOTES = new Set(["'", '"', '`']);

/**
 * Computes opening and closing pairs for brackets and quotes in code
 */
export function computeCodePairs(chars: CodeChar[]): CodePairsInfo {
  const openToClose = new Map<number, number>();
  const closeToOpen = new Map<number, number>();

  const parenStack: number[] = [];
  const bracketStack: number[] = [];
  const braceStack: number[] = [];

  // Group characters by line to safely match quotes per line
  const lineIndices: Record<number, number[]> = {};
  for (let i = 0; i < chars.length; i++) {
    const line = chars[i].lineIndex;
    if (!lineIndices[line]) lineIndices[line] = [];
    lineIndices[line].push(i);
  }

  // 1. Match brackets across the code
  for (let i = 0; i < chars.length; i++) {
    const c = chars[i].char;

    if (c === '(') {
      parenStack.push(i);
    } else if (c === ')') {
      const open = parenStack.pop();
      if (open !== undefined) {
        openToClose.set(open, i);
        closeToOpen.set(i, open);
      }
    } else if (c === '[') {
      bracketStack.push(i);
    } else if (c === ']') {
      const open = bracketStack.pop();
      if (open !== undefined) {
        openToClose.set(open, i);
        closeToOpen.set(i, open);
      }
    } else if (c === '{') {
      braceStack.push(i);
    } else if (c === '}') {
      const open = braceStack.pop();
      if (open !== undefined) {
        openToClose.set(open, i);
        closeToOpen.set(i, open);
      }
    }
  }

  // 2. Match quotes per line
  for (const lineIdx in lineIndices) {
    const indicesOnLine = lineIndices[lineIdx];
    
    for (const q of QUOTES) {
      let openQuoteIndex: number | null = null;
      for (const idx of indicesOnLine) {
        const c = chars[idx].char;
        if (c === q) {
          const prevIdx = idx - 1;
          const isEscaped = prevIdx >= 0 && chars[prevIdx].char === '\\';
          if (!isEscaped) {
            if (openQuoteIndex === null) {
              openQuoteIndex = idx;
            } else {
              openToClose.set(openQuoteIndex, idx);
              closeToOpen.set(idx, openQuoteIndex);
              openQuoteIndex = null;
            }
          }
        }
      }
    }
  }

  return { openToClose, closeToOpen };
}

export function isOpenPairChar(char: string): boolean {
  return char === '(' || char === '[' || char === '{' || char === "'" || char === '"' || char === '`';
}

export function isClosePairChar(char: string): boolean {
  return char === ')' || char === ']' || char === '}' || char === "'" || char === '"' || char === '`';
}
