/**
 * Планарий — Сервис архива и статистики
 */

import db from '../core/db.js';

class ArchiveService {
    /**
     * Получить завершённые задачи (с пагинацией и фильтром)
     * @param {Object} options — { tagId, search, limit, offset }
     */
    async getCompleted({ tagId = null, search = '', limit = 50, offset = 0 } = {}) {
        let allTasks = await db.tasks.toArray();
        let tasks = allTasks.filter(t => t.completed);
        tasks.sort((a, b) => {
            const dateA = a.completedAt ? new Date(a.completedAt).getTime() : 0;
            const dateB = b.completedAt ? new Date(b.completedAt).getTime() : 0;
            return dateB - dateA;
        });

        // Фильтр по тегу
        if (tagId) {
            tasks = tasks.filter(t => t.tags && t.tags.includes(tagId));
        }

        // Поиск по названию
        if (search.trim()) {
            const q = search.trim().toLowerCase();
            tasks = tasks.filter(t => t.title.toLowerCase().includes(q));
        }

        const total = tasks.length;
        const items = tasks.slice(offset, offset + limit);

        return { items, total };
    }

    /**
     * Количество завершённых задач за период
     */
    async getCompletedCount(since = null) {
        let allTasks = await db.tasks.toArray();
        let tasks = allTasks.filter(t => t.completed);

        if (since) {
            tasks = tasks.filter(t => t.completedAt && new Date(t.completedAt) >= since);
        }
        return tasks.length;
    }

    /**
     * Статистика: сегодня / неделя / месяц / всего
     */
    async getStats() {
        const now = new Date();
        const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const weekStart = new Date(todayStart);
        weekStart.setDate(weekStart.getDate() - 7);
        const monthStart = new Date(todayStart);
        monthStart.setDate(monthStart.getDate() - 30);

        const [today, week, month, total] = await Promise.all([
            this.getCompletedCount(todayStart),
            this.getCompletedCount(weekStart),
            this.getCompletedCount(monthStart),
            this.getCompletedCount(),
        ]);

        return { today, week, month, total };
    }

    /**
     * Подсчёт серии продуктивных дней (streak)
     * Дни, в каждом из которых хотя бы 1 завершённая задача
     */
    async getStreakDays() {
        const allTasks = await db.tasks.toArray();
        const allCompleted = allTasks.filter(t => t.completed);

        if (allCompleted.length === 0) return 0;

        // Собираем уникальные дни
        const days = new Set();
        for (const t of allCompleted) {
            if (t.completedAt) {
                const d = new Date(t.completedAt);
                days.add(`${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`);
            }
        }

        // Считаем streak от сегодняшнего дня назад
        const now = new Date();
        let streak = 0;
        const check = new Date(now.getFullYear(), now.getMonth(), now.getDate());

        while (true) {
            const key = `${check.getFullYear()}-${check.getMonth()}-${check.getDate()}`;
            if (days.has(key)) {
                streak++;
                check.setDate(check.getDate() - 1);
            } else {
                break;
            }
        }

        return streak;
    }

    /**
     * Данные для тепловой карты (последние N дней)
     * @returns {Array<{date: string, count: number}>}
     */
    async getHeatmap(daysBack = 90) {
        const allTasks = await db.tasks.toArray();
        const allCompleted = allTasks.filter(t => t.completed);

        // Подсчёт по дням
        const countByDay = {};
        for (const t of allCompleted) {
            if (t.completedAt) {
                const d = new Date(t.completedAt);
                const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
                countByDay[key] = (countByDay[key] || 0) + 1;
            }
        }

        // Генерируем массив за последние N дней
        const result = [];
        const now = new Date();
        for (let i = daysBack - 1; i >= 0; i--) {
            const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i);
            const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
            result.push({ date: key, count: countByDay[key] || 0 });
        }

        return result;
    }
}

export const archiveService = new ArchiveService();
