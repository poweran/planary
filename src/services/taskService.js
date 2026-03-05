/**
 * Планарий — Сервис задач (CRUD)
 */

import db from '../core/db.js';
import { events, Events } from '../core/events.js';
import { createTask } from '../models/task.js';
import { extractTags, stripTags } from '../utils/tagParser.js';
import { tagService } from './tagService.js';

class TaskService {
    /**
     * Загрузить все задачи
     */
    async getAll() {
        return db.tasks.orderBy('order').toArray();
    }

    /**
     * Загрузить задачи области
     */
    async getByArea(areaId) {
        return db.tasks
            .where('areaId')
            .equals(areaId)
            .sortBy('order');
    }

    /**
     * Получить задачу по ID
     */
    async getById(id) {
        return db.tasks.get(id);
    }

    /**
     * Создать задачу из текста (с парсингом тегов)
     */
    async createFromText(rawText, areaId = 'today') {
        const tagNames = extractTags(rawText);
        const title = stripTags(rawText);

        if (!title.trim()) return null;

        // Создаём или находим теги
        const tagIds = [];
        for (const name of tagNames) {
            const tag = await tagService.getOrCreate(name);
            tagIds.push(tag.id);
        }

        // Считаем порядковый номер
        const count = await db.tasks
            .where('areaId')
            .equals(areaId)
            .count();

        const task = createTask({
            title: title.trim(),
            areaId,
            tags: tagIds,
            order: count,
        });

        const id = await db.tasks.add(task);
        const created = await db.tasks.get(id);

        events.emit(Events.TASK_CREATED, created);
        return created;
    }

    /**
     * Обновить задачу
     */
    async update(id, changes) {
        await db.tasks.update(id, {
            ...changes,
            updatedAt: new Date(),
        });
        const updated = await db.tasks.get(id);
        events.emit(Events.TASK_UPDATED, updated);
        return updated;
    }

    /**
     * Завершить задачу
     */
    async complete(id) {
        await db.tasks.update(id, {
            completed: true,
            completedAt: new Date(),
            updatedAt: new Date(),
        });
        const task = await db.tasks.get(id);
        events.emit(Events.TASK_COMPLETED, task);

        // Если задача повторяющаяся — создать копию
        if (task.recurrence) {
            const targetArea = this._getRecurrenceArea(task.recurrence);
            const newTask = createTask({
                title: task.title,
                note: task.note,
                areaId: targetArea,
                color: task.color,
                tags: task.tags || [],
                recurrence: task.recurrence,
            });
            await db.tasks.add(newTask);
            events.emit(Events.TASK_CREATED, newTask);
        }

        return task;
    }

    /**
     * Определить область для повторяющейся задачи
     */
    _getRecurrenceArea(recurrence) {
        switch (recurrence) {
            case 'daily': return 'tomorrow';
            case 'weekly': return 'future';
            case 'monthly': return 'future';
            default: return 'today';
        }
    }

    /**
     * Вернуть задачу из завершённых
     */
    async uncomplete(id) {
        await db.tasks.update(id, {
            completed: false,
            completedAt: null,
            updatedAt: new Date(),
        });
        const task = await db.tasks.get(id);
        events.emit(Events.TASK_UPDATED, task);
        return task;
    }

    /**
     * Изменить порядок и родителя задачи (Drag & Drop)
     */
    async reposition(taskId, targetAreaId, targetId = null, position = 'bottom') {
        const task = await db.tasks.get(Number(taskId));
        if (!task) return;

        // Recursively find all descendants to prevent cyclic parent assignments
        const descendants = [];
        const findDescendants = async (pId) => {
            const children = await db.tasks.where('parentId').equals(pId).toArray();
            for (const child of children) {
                descendants.push(child);
                await findDescendants(child.id);
            }
        };
        await findDescendants(task.id);

        // Fetch all tasks in target area to recalculate orders
        let areaTasks = await db.tasks.where('areaId').equals(targetAreaId).sortBy('order');

        // Remove task from existing position (in case it's same area)
        areaTasks = areaTasks.filter(t => t.id !== Number(taskId));

        let currentParentId = null;

        if (targetId) {
            const targetTask = await db.tasks.get(Number(targetId));
            if (targetTask) {
                const targetIndex = areaTasks.findIndex(t => t.id === targetTask.id);
                if (position === 'inside') {
                    currentParentId = targetTask.id;
                    if (targetIndex !== -1) {
                        areaTasks.splice(targetIndex + 1, 0, task);
                    } else {
                        areaTasks.push(task);
                    }
                } else {
                    currentParentId = targetTask.parentId || null;
                    if (targetIndex !== -1) {
                        if (position === 'before') {
                            areaTasks.splice(targetIndex, 0, task);
                        } else {
                            areaTasks.splice(targetIndex + 1, 0, task);
                        }
                    } else {
                        areaTasks.push(task);
                    }
                }
            }
        } else {
            // position === 'bottom'
            currentParentId = null;
            areaTasks.push(task);
        }

        // Prevent cyclic dependencies (task cannot be made a child of itself or its descendant)
        if (currentParentId === task.id || descendants.some(d => d.id === currentParentId)) {
            console.warn("Drag interaction rejected to prevent cyclic dependency");
            events.emit(Events.TASK_MOVED, task); // Trigger re-render to revert visual position
            return;
        }

        try {
            await db.transaction('rw', db.tasks, async () => {
                // Update parent and its new order in target area
                for (let i = 0; i < areaTasks.length; i++) {
                    const t = areaTasks[i];
                    if (t.id === task.id) {
                        await db.tasks.update(t.id, { areaId: targetAreaId, parentId: currentParentId, order: i, updatedAt: new Date() });
                    } else {
                        await db.tasks.update(t.id, { order: i });
                    }
                }

                // If task moved to a new area, move all its descendants to the new area as well
                if (task.areaId !== targetAreaId) {
                    for (const desc of descendants) {
                        if (desc.areaId !== targetAreaId) {
                            await db.tasks.update(desc.id, { areaId: targetAreaId, updatedAt: new Date() });
                        }
                    }
                }
            });
        } catch (e) {
            console.error('Dexie transaction failed in reposition', e);
        }

        const updatedTask = await db.tasks.get(task.id);
        events.emit(Events.TASK_MOVED, updatedTask);
    }

    /**
     * Удалить задачу
     */
    async delete(id) {
        const task = await db.tasks.get(id);
        await db.tasks.delete(id);
        events.emit(Events.TASK_DELETED, task);
    }

    /**
     * Перемешать задачи в Хаосе
     */
    async shuffleChaos() {
        const tasks = await this.getByArea('chaos');
        const shuffled = [...tasks].sort(() => Math.random() - 0.5);

        await db.transaction('rw', db.tasks, async () => {
            for (let i = 0; i < shuffled.length; i++) {
                await db.tasks.update(shuffled[i].id, { order: i });
            }
        });

        events.emit(Events.TASKS_SHUFFLED);
    }

    /**
     * Перенести задачи «Завтра» → «Сегодня» (при смене дня)
     */
    async advanceDay() {
        const tomorrowTasks = await this.getByArea('tomorrow');
        const todayCount = await db.tasks
            .where('areaId')
            .equals('today')
            .count();

        await db.transaction('rw', db.tasks, async () => {
            for (let i = 0; i < tomorrowTasks.length; i++) {
                await db.tasks.update(tomorrowTasks[i].id, {
                    areaId: 'today',
                    order: todayCount + i,
                    updatedAt: new Date(),
                });
            }
        });

        if (tomorrowTasks.length > 0) {
            events.emit(Events.MIDNIGHT, tomorrowTasks.length);
        }
    }

    /**
     * Фильтровать задачи по тегу
     */
    filterByTag(tasks, tagId) {
        if (!tagId) return tasks;
        return tasks.filter(t => t.tags && t.tags.includes(tagId));
    }
}

export const taskService = new TaskService();
