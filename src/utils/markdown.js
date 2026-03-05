/**
 * Планарий — Лёгкий Markdown-парсер
 * Поддерживает: **bold**, *italic*, `code`, # headings, - lists, [links](url)
 */

export function parseMarkdown(md) {
    if (!md) return '';

    let html = escapeHtml(md);

    // Headers
    html = html.replace(/^### (.+)$/gm, '<h4>$1</h4>');
    html = html.replace(/^## (.+)$/gm, '<h3>$1</h3>');
    html = html.replace(/^# (.+)$/gm, '<h2>$1</h2>');

    // Bold & Italic
    html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
    html = html.replace(/\*(.+?)\*/g, '<em>$1</em>');

    // Inline code
    html = html.replace(/`(.+?)`/g, '<code>$1</code>');

    // Links
    html = html.replace(/\[(.+?)\]\((.+?)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>');

    // Lists
    html = html.replace(/^- (.+)$/gm, '<li>$1</li>');
    html = html.replace(/(<li>.*<\/li>\n?)+/g, '<ul>$&</ul>');

    // Line breaks (not inside headers or lists)
    html = html.replace(/\n/g, '<br>');

    // Clean up double <br> inside <ul>
    html = html.replace(/<ul><br>/g, '<ul>');
    html = html.replace(/<br><\/ul>/g, '</ul>');
    html = html.replace(/<\/li><br><li>/g, '</li><li>');

    return html;
}

function escapeHtml(str) {
    return str
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
}

/**
 * Обрезать текст для превью
 */
export function truncateNote(text, maxLen = 100) {
    if (!text) return '';
    if (text.length <= maxLen) return text;
    return text.slice(0, maxLen) + '…';
}
