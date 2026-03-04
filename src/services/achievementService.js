/**
 * Планарий — Сервис достижений
 */

import db, { getSetting, setSetting } from '../core/db.js';
import { events, Events } from '../core/events.js';
import { ACHIEVEMENT_TYPES, ACHIEVEMENT_DEFS } from '../models/achievement.js';

class AchievementService {
    constructor() {
        this._listening = false;
    }

    /**
     * Привязать к событиям
     */
    startListening() {
        if (this._listening) return;
        this._listening = true;

        events.on(Events.TASK_COMPLETED, () => this.check());
        events.on(Events.TASK_CREATED, () => this.check());
        events.on(Events.TASKS_SHUFFLED, () => this._checkChaos());
    }

    /**
     * Все достижения + статус
     */
    async getAll() {
        const unlocked = await db.achievements.toArray();
        const unlockedTypes = new Set(unlocked.map(a => a.type));

        return Object.entries(ACHIEVEMENT_DEFS).map(([type, def]) => ({
            type,
            ...def,
            unlocked: unlockedTypes.has(type),
            unlockedAt: unlocked.find(a => a.type === type)?.unlockedAt || null,
        }));
    }

    /**
     * Разблокированные
     */
    async getUnlocked() {
        return db.achievements.toArray();
    }

    /**
     * Проверка и разблокировка достижений
     */
    async check() {
        const allTasks = await db.tasks.toArray();
        const completedTasks = allTasks.filter(t => t.completed);

        const totalCompleted = completedTasks.length;
        const totalCreated = await db.tasks.count();

        // Первая задача создана
        if (totalCreated >= 1) {
            await this._unlock(ACHIEVEMENT_TYPES.FIRST_TASK);
        }

        // 10 завершено
        if (totalCompleted >= 10) {
            await this._unlock(ACHIEVEMENT_TYPES.TEN_TASKS);
        }

        // 100 завершено
        if (totalCompleted >= 100) {
            await this._unlock(ACHIEVEMENT_TYPES.HUNDRED_TASKS);
        }

        // Streak
        const streak = await this._getStreakDays(completedTasks);

        if (streak >= 7) {
            await this._unlock(ACHIEVEMENT_TYPES.WEEK_STREAK);
        }
        if (streak >= 30) {
            await this._unlock(ACHIEVEMENT_TYPES.MONTH_STREAK);
        }

        // Все лягушки — задачи с тегом «лягушки» и все завершены
        await this._checkFrogs();
    }

    async _checkFrogs() {
        const frogTag = await db.tags.where('name').equalsIgnoreCase('лягушки').first();
        if (!frogTag) return;

        const allWithFrogTag = await db.tasks.toArray();
        const frogTasks = allWithFrogTag.filter(t => t.tags && t.tags.includes(frogTag.id));

        if (frogTasks.length > 0 && frogTasks.every(t => t.completed)) {
            await this._unlock(ACHIEVEMENT_TYPES.ALL_FROGS);
        }
    }

    async _checkChaos() {
        const count = (await getSetting('chaos_shuffle_count', 0)) + 1;
        await setSetting('chaos_shuffle_count', count);

        if (count >= 50) {
            await this._unlock(ACHIEVEMENT_TYPES.CHAOS_MASTER);
        }
    }

    _getStreakDays(completedTasks) {
        if (completedTasks.length === 0) return 0;

        const days = new Set();
        for (const t of completedTasks) {
            if (t.completedAt) {
                const d = new Date(t.completedAt);
                days.add(`${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`);
            }
        }

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

    async _unlock(type) {
        const existing = await db.achievements.where('type').equals(type).first();
        if (existing) return; // Уже разблокировано

        await db.achievements.add({
            type,
            unlockedAt: new Date(),
        });

        const def = ACHIEVEMENT_DEFS[type];
        events.emit(Events.ACHIEVEMENT_UNLOCKED, { type, ...def });
        events.emit(Events.TOAST, `${def.icon} ${def.title} — достижение разблокировано!`);
    }
}

export const achievementService = new AchievementService();
