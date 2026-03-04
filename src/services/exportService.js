/**
 * Планарий — Сервис экспорта/импорта
 */

import db from '../core/db.js';

class ExportService {
    /**
     * Экспортировать все данные в JSON
     */
    async exportJSON() {
        const tasks = await db.tasks.toArray();
        const tags = await db.tags.toArray();
        const areas = await db.areas.toArray();
        const achievements = await db.achievements.toArray();
        const settings = await db.settings.toArray();

        const data = {
            version: 2,
            exportedAt: new Date().toISOString(),
            tasks,
            tags,
            areas,
            achievements,
            settings,
        };

        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);

        const a = document.createElement('a');
        a.href = url;
        a.download = `planary-backup-${new Date().toISOString().slice(0, 10)}.json`;
        a.click();

        URL.revokeObjectURL(url);
    }

    /**
     * Экспортировать задачи в CSV
     */
    async exportCSV() {
        const tasks = await db.tasks.toArray();
        const tags = await db.tags.toArray();
        const areas = await db.areas.toArray();

        const tagMap = {};
        for (const t of tags) tagMap[t.id] = t.name;
        const areaMap = {};
        for (const a of areas) areaMap[a.id] = a.title;

        const header = ['Название', 'Область', 'Теги', 'Статус', 'Цвет', 'Создана', 'Завершена'];
        const rows = [header.join(',')];

        for (const task of tasks) {
            const taskTags = (task.tags || []).map(id => tagMap[id] || '').filter(Boolean).join('; ');
            const row = [
                this._csvEscape(task.title),
                this._csvEscape(areaMap[task.areaId] || ''),
                this._csvEscape(taskTags),
                task.completed ? 'Завершена' : 'Активна',
                task.color || '',
                task.createdAt ? new Date(task.createdAt).toLocaleDateString('ru-RU') : '',
                task.completedAt ? new Date(task.completedAt).toLocaleDateString('ru-RU') : '',
            ];
            rows.push(row.join(','));
        }

        // BOM для корректного отображения UTF-8 в Excel
        const bom = '\uFEFF';
        const blob = new Blob([bom + rows.join('\n')], { type: 'text/csv;charset=utf-8' });
        const url = URL.createObjectURL(blob);

        const a = document.createElement('a');
        a.href = url;
        a.download = `planary-${new Date().toISOString().slice(0, 10)}.csv`;
        a.click();

        URL.revokeObjectURL(url);
    }

    /**
     * Импортировать данные из JSON
     */
    async importJSON(file) {
        const text = await file.text();
        const data = JSON.parse(text);

        if (data.version !== 1 && data.version !== 2) {
            throw new Error('Неподдерживаемая версия формата');
        }

        await db.transaction('rw', [db.tasks, db.tags, db.areas, db.achievements, db.settings], async () => {
            if (data.tags) {
                await db.tags.clear();
                await db.tags.bulkAdd(data.tags);
            }
            if (data.areas) {
                await db.areas.clear();
                await db.areas.bulkAdd(data.areas);
            }
            if (data.tasks) {
                await db.tasks.clear();
                await db.tasks.bulkAdd(data.tasks);
            }
            if (data.achievements) {
                await db.achievements.clear();
                await db.achievements.bulkAdd(data.achievements);
            }
            if (data.settings) {
                await db.settings.clear();
                await db.settings.bulkAdd(data.settings);
            }
        });
    }

    /**
     * Очистить все данные
     */
    async clearAll() {
        await db.transaction('rw', [db.tasks, db.tags, db.areas, db.achievements, db.settings], async () => {
            await db.tasks.clear();
            await db.tags.clear();
            await db.areas.clear();
            await db.achievements.clear();
            await db.settings.clear();
        });
    }

    _csvEscape(value) {
        if (!value) return '';
        const str = String(value);
        if (str.includes(',') || str.includes('"') || str.includes('\n')) {
            return `"${str.replace(/"/g, '""')}"`;
        }
        return str;
    }
}

export const exportService = new ExportService();
