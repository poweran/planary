/**
 * Планарий — Сервис напоминаний (Notification API)
 */

import db from '../core/db.js';
import { events, Events } from '../core/events.js';

class ReminderService {
    constructor() {
        this._intervalId = null;
        this._notifiedIds = new Set(); // Не уведомлять повторно
    }

    /**
     * Запросить разрешение и начать опрос
     */
    async start() {
        if (!('Notification' in window)) {
            console.warn('Notifications API не поддерживается');
            return;
        }

        if (Notification.permission === 'default') {
            await Notification.requestPermission();
        }

        // Проверка каждые 30 секунд
        this._intervalId = setInterval(() => this._checkReminders(), 30_000);
        // И сразу при запуске
        this._checkReminders();
    }

    stop() {
        if (this._intervalId) {
            clearInterval(this._intervalId);
            this._intervalId = null;
        }
    }

    /**
     * Установить напоминание для задачи
     */
    async setReminder(taskId, date) {
        await db.tasks.update(taskId, {
            reminderAt: date,
            updatedAt: new Date(),
        });
        this._notifiedIds.delete(taskId);
        const task = await db.tasks.get(taskId);
        events.emit(Events.TASK_UPDATED, task);
    }

    /**
     * Убрать напоминание
     */
    async clearReminder(taskId) {
        await db.tasks.update(taskId, {
            reminderAt: null,
            updatedAt: new Date(),
        });
        this._notifiedIds.delete(taskId);
        const task = await db.tasks.get(taskId);
        events.emit(Events.TASK_UPDATED, task);
    }

    /**
     * Отложить напоминание
     */
    async snooze(taskId, minutes) {
        const newTime = new Date(Date.now() + minutes * 60_000);
        await this.setReminder(taskId, newTime);
    }

    async _checkReminders() {
        if (Notification.permission !== 'granted') return;

        const now = new Date();
        const allTasks = await db.tasks.toArray();
        const tasks = allTasks.filter(t => !t.completed);

        for (const task of tasks) {
            if (!task.reminderAt) continue;
            if (this._notifiedIds.has(task.id)) continue;

            const reminderTime = new Date(task.reminderAt);
            if (reminderTime <= now) {
                this._notify(task);
                this._notifiedIds.add(task.id);

                // Очищаем напоминание после уведомления
                await db.tasks.update(task.id, {
                    reminderAt: null,
                    updatedAt: new Date(),
                });
            }
        }
    }

    _notify(task) {
        try {
            const notification = new Notification('🦎 Планарий', {
                body: task.title,
                icon: '/favicon.svg',
                tag: `planary-${task.id}`,
            });

            notification.onclick = () => {
                window.focus();
                notification.close();
            };

            // Также показываем toast
            events.emit(Events.TOAST, `⏰ Напоминание: ${task.title}`);
        } catch (e) {
            console.error('Notification error:', e);
        }
    }
}

export const reminderService = new ReminderService();
