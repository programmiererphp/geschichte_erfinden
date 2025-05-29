
// Winziges Markdown-Snippet (bold, italic, strike, code, Zeilenumbruch)
export function md(text){
  return text
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/_(.+?)_/g,      '<em>$1</em>')
    .replace(/~~(.+?)~~/g,    '<del>$1</del>')
    .replace(/`([^`]+)`/g,    '<code>$1</code>')
    .replace(/\n/g,           '<br>');
}
