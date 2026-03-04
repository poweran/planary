/**
 * Планарий — Сервис экспорта/импорта (заготовка для Этапа 2)
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

        const data = {
            version: 1,
            exportedAt: new Date().toISOString(),
            tasks,
            tags,
            areas,
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
     * Импортировать данные из JSON
     */
    async importJSON(file) {
        const text = await file.text();
        const data = JSON.parse(text);

        if (data.version !== 1) {
            throw new Error('Неподдерживаемая версия формата');
        }

        await db.transaction('rw', [db.tasks, db.tags, db.areas], async () => {
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
        });
    }
}

export const exportService = new ExportService();
