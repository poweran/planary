/**
 * Планарий — Парсер тегов из текста задачи
 * Поддержка: #тег, %тег, кириллица, латиница
 */

// Regex для извлечения тегов: #tag или %tag
const TAG_REGEX = /[#%]([\wа-яёА-ЯЁ][\wа-яёА-ЯЁ0-9_-]*)/gu;

/**
 * Извлечь теги из текста
 * @param {string} text
 * @returns {string[]} массив имён тегов (lowercase)
 */
export function extractTags(text) {
    if (!text) return [];
    const tags = [];
    let match;
    TAG_REGEX.lastIndex = 0;
    while ((match = TAG_REGEX.exec(text)) !== null) {
        const tag = match[1].toLowerCase().trim();
        if (tag && !tags.includes(tag)) {
            tags.push(tag);
        }
    }
    return tags;
}

/**
 * Убрать теги из текста задачи
 * @param {string} text
 * @returns {string} текст без тегов
 */
export function stripTags(text) {
    if (!text) return '';
    return text.replace(TAG_REGEX, '').replace(/\s{2,}/g, ' ').trim();
}

/**
 * Подсветить теги в тексте (вернуть HTML)
 * @param {string} text
 * @param {Map<string, string>} tagColors — карта имя→цвет
 * @returns {string} HTML
 */
export function highlightTags(text, tagColors = new Map()) {
    if (!text) return '';
    return text.replace(TAG_REGEX, (full, tagName) => {
        const name = tagName.toLowerCase();
        const color = tagColors.get(name) || 'var(--color-primary)';
        return `<span class="tag-inline" style="color:${color}">${full}</span>`;
    });
}
