/**
 * Планарий — Midnight Service
 * Отслеживание смены дня и автоперенос задач
 */

import { events, Events } from '../core/events.js';
import { getSetting, setSetting } from '../core/db.js';
import { taskService } from './taskService.js';
import { dateKey } from '../utils/dateUtils.js';
import { msUntilMidnight } from '../utils/dateUtils.js';

class MidnightService {
    constructor() {
        this._timer = null;
    }

    /**
     * Запуск сервиса
     */
    async start() {
        // Проверяем, не сменился ли день с последнего визита
        await this._checkDayChange();

        // Ставим таймер на полночь
        this._scheduleMidnight();
    }

    /**
     * Остановка
     */
    stop() {
        if (this._timer) {
            clearTimeout(this._timer);
            this._timer = null;
        }
    }

    async _checkDayChange() {
        const lastDate = await getSetting('lastActiveDate');
        const today = dateKey();

        if (lastDate && lastDate !== today) {
            // День сменился — переносим задачи «Завтра» → «Сегодня»
            await taskService.advanceDay();
        }

        await setSetting('lastActiveDate', today);
    }

    _scheduleMidnight() {
        const ms = msUntilMidnight();

        this._timer = setTimeout(async () => {
            await taskService.advanceDay();
            await setSetting('lastActiveDate', dateKey());
            events.emit(Events.MIDNIGHT);
            events.emit(Events.TOAST, '🌙 Новый день! Задачи перенесены');

            // Пере-планируем на следующую полночь
            this._scheduleMidnight();
        }, ms);
    }
}

export const midnightService = new MidnightService();
