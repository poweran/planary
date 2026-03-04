/**
 * Планарий — Сервис областей
 */

import db from '../core/db.js';
import { events, Events } from '../core/events.js';

class AreaService {
    /**
     * Загрузить все области
     */
    async getAll() {
        return db.areas.orderBy('order').toArray();
    }

    /**
     * Обновить flexGrow области
     */
    async updateSize(id, flexGrow) {
        await db.areas.update(id, { flexGrow });
        events.emit(Events.AREA_RESIZED, { id, flexGrow });
    }
}

export const areaService = new AreaService();
