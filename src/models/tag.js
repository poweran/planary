/**
 * Планарий — Модель тега
 */

const TAG_DEFAULT_COLORS = [
    '#E74C3C', '#F39C12', '#3498DB', '#27AE60',
    '#9B59B6', '#E91E63', '#00BCD4', '#FF5722',
    '#795548', '#607D8B',
];

let colorIndex = 0;

export function createTag({ name, color = null }) {
    if (!color) {
        color = TAG_DEFAULT_COLORS[colorIndex % TAG_DEFAULT_COLORS.length];
        colorIndex++;
    }
    return {
        name: name.toLowerCase().trim(),
        color,
        createdAt: new Date(),
    };
}

export function getTagStyles(color) {
    return {
        backgroundColor: `${color}20`,
        color: color,
        borderColor: `${color}40`,
    };
}
