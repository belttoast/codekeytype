import type { CodeChar } from '../types';

/**
 * Checks if the character at currentIndex is a comment token,
 * or whitespace on a line whose only non-whitespace content is a comment,
 * or trailing whitespace before an inline comment on the current line.
 */
export function isCommentOrCommentWhitespace(
  index: number,
  chars: CodeChar[]
): boolean {
  if (index < 0 || index >= chars.length) return false;

  // Direct comment token
  if (chars[index].tokenType === 'comment') return true;

  const currentLine = chars[index].lineIndex;
  const char = chars[index].char;

  // Check if whitespace belongs to a comment line or trailing comment
  if (char === ' ' || char === '\t' || char === '\n') {
    let hasCommentAhead = false;
    let onlyCommentsAhead = true;

    for (let i = index; i < chars.length && chars[i].lineIndex === currentLine; i++) {
      if (chars[i].tokenType === 'comment') {
        hasCommentAhead = true;
      } else if (chars[i].char !== ' ' && chars[i].char !== '\t' && chars[i].char !== '\n') {
        onlyCommentsAhead = false;
        break;
      }
    }

    if (hasCommentAhead && onlyCommentsAhead) {
      return true;
    }
  }

  return false;
}

/**
 * Given the current cursor index at a comment (or comment whitespace),
 * finds the index of the next non-comment, non-whitespace code character.
 * Returns null if startIndex is NOT at a comment/comment-whitespace.
 * Returns chars.length if all remaining characters in the snippet are comments or whitespace.
 */
export function getSkipCommentDestination(
  startIndex: number,
  chars: CodeChar[]
): number | null {
  if (startIndex < 0 || startIndex >= chars.length) return null;

  if (!isCommentOrCommentWhitespace(startIndex, chars)) {
    return null;
  }

  let i = startIndex;
  while (i < chars.length) {
    if (chars[i].tokenType === 'comment') {
      i++;
      continue;
    }

    const c = chars[i].char;
    if (c === ' ' || c === '\t' || c === '\n') {
      i++;
      continue;
    }

    // Found the first actual non-comment code character!
    return i;
  }

  // All remaining characters in the snippet are comments or whitespace
  return chars.length;
}
