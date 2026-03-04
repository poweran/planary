/**
 * Планарий — Сервис тегов
 */

import db from '../core/db.js';
import { events, Events } from '../core/events.js';
import { createTag } from '../models/tag.js';

class TagService {
    /**
     * Все теги
     */
    async getAll() {
        return db.tags.toArray();
    }

    /**
     * Получить или создать тег по имени
     */
    async getOrCreate(name) {
        const normalized = name.toLowerCase().trim();
        let tag = await db.tags.where('name').equals(normalized).first();

        if (!tag) {
            const newTag = createTag({ name: normalized });
            const id = await db.tags.add(newTag);
            tag = await db.tags.get(id);
            events.emit(Events.TAG_CREATED, tag);
        }

        return tag;
    }

    /**
     * Получить тег по ID
     */
    async getById(id) {
        return db.tags.get(id);
    }

    /**
     * Обновить цвет тега
     */
    async updateColor(id, color) {
        await db.tags.update(id, { color });
        const tag = await db.tags.get(id);
        events.emit(Events.TAG_UPDATED, tag);
        return tag;
    }

    /**
     * Удалить тег
     */
    async delete(id) {
        const tag = await db.tags.get(id);
        await db.tags.delete(id);

        // Убираем тег из всех задач
        const tasks = await db.tasks.toArray();
        await db.transaction('rw', db.tasks, async () => {
            for (const task of tasks) {
                if (task.tags && task.tags.includes(id)) {
                    await db.tasks.update(task.id, {
                        tags: task.tags.filter(t => t !== id),
                    });
                }
            }
        });

        events.emit(Events.TAG_DELETED, tag);
    }

    /**
     * Карта имя→цвет для подсветки
     */
    async getColorMap() {
        const tags = await this.getAll();
        const map = new Map();
        for (const tag of tags) {
            map.set(tag.name, tag.color);
        }
        return map;
    }
}

export const tagService = new TagService();
