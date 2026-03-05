/**
 * Планарий — IndexedDB через Dexie.js
 * Локальное хранение всех данных (privacy-first)
 */

import Dexie from 'dexie';

const db = new Dexie('PlanaryDB');

// Версия 1 — MVP
db.version(1).stores({
    tasks: '++id, areaId, order, completed, createdAt, updatedAt, *tags',
    tags: '++id, &name, color, createdAt',
    areas: '&id, order',
    settings: '&key',
});

// Версия 2 — Подзадачи + заготовка
db.version(2).stores({
    tasks: '++id, areaId, parentId, order, completed, completedAt, createdAt, updatedAt, *tags',
    tags: '++id, &name, color, createdAt',
    areas: '&id, order',
    settings: '&key',
    achievements: '++id, type, unlockedAt',
});

// Версия 3 — Мягкое удаление (soft delete)
db.version(3).stores({
    tasks: '++id, areaId, parentId, order, completed, completedAt, deleted, deletedAt, createdAt, updatedAt, *tags',
    tags: '++id, &name, color, createdAt',
    areas: '&id, order',
    settings: '&key',
    achievements: '++id, type, unlockedAt',
});

/**
 * Инициализация области по умолчанию
 */
export async function initDefaultAreas() {
    const count = await db.areas.count();
    if (count === 0) {
        await db.areas.bulkPut([
            { id: 'today', title: 'Сегодня', icon: '📅', flexGrow: 1, order: 0 },
            { id: 'tomorrow', title: 'Завтра', icon: '📋', flexGrow: 1, order: 1 },
            { id: 'chaos', title: 'Хаос', icon: '🌀', flexGrow: 1, order: 2 },
            { id: 'future', title: 'На будущее', icon: '📦', flexGrow: 1, order: 3 },
        ]);
    }
}

/**
 * Получение настройки
 */
export async function getSetting(key, defaultValue = null) {
    const row = await db.settings.get(key);
    return row ? row.value : defaultValue;
}

/**
 * Установка настройки
 */
export async function setSetting(key, value) {
    await db.settings.put({ key, value });
}

export default db;
