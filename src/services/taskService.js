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
     * Загрузить все задачи (без удалённых)
     */
    async getAll() {
        const all = await db.tasks.orderBy('order').toArray();
        return all.filter(t => !t.deleted);
    }

    /**
     * Загрузить задачи области (без удалённых)
     */
    async getByArea(areaId) {
        const all = await db.tasks
            .where('areaId')
            .equals(areaId)
            .sortBy('order');
        return all.filter(t => !t.deleted);
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
        } else if (position === 'top') {
            currentParentId = null;
            areaTasks.unshift(task);
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
     * Мягкое удаление (перемещает в корзину)
     */
    async softDelete(id) {
        const task = await db.tasks.get(id);
        if (!task) return;
        await db.tasks.update(id, {
            deleted: true,
            deletedAt: new Date(),
            updatedAt: new Date(),
        });
        events.emit(Events.TASK_DELETED, task);
    }

    /**
     * Восстановить задачу из корзины
     */
    async restore(id) {
        await db.tasks.update(id, {
            deleted: false,
            deletedAt: null,
            updatedAt: new Date(),
        });
        const task = await db.tasks.get(id);
        events.emit(Events.TASK_RESTORED, task);
        return task;
    }

    /**
     * Физическое удаление (только из корзины)
     */
    async permanentDelete(id) {
        const task = await db.tasks.get(id);
        await db.tasks.delete(id);
        events.emit(Events.TASK_DELETED, task);
    }

    /**
     * Получить все задачи в корзине
     */
    async getDeleted() {
        const all = await db.tasks.toArray();
        return all
            .filter(t => t.deleted)
            .sort((a, b) => new Date(b.deletedAt) - new Date(a.deletedAt));
    }

    /**
     * Очистить корзину (удалить все задачи из неё)
     */
    async clearTrash() {
        const deleted = await this.getDeleted();
        await db.transaction('rw', db.tasks, async () => {
            for (const t of deleted) {
                await db.tasks.delete(t.id);
            }
        });
    }

    /**
     * Удалить задачу (устаревший метод, сохранён для обратной совместимости)
     */
    async delete(id) {
        return this.softDelete(id);
    }

    async shuffleChaos() {
        const allTasks = await this.getByArea('chaos');
        const activeTasks = allTasks.filter(t => !t.completed);

        if (activeTasks.length <= 1) return;

        const originalActiveIds = activeTasks.map(t => t.id);
        let shuffledActive;

        // Перемешиваем только активные задачи, пока не получим новый порядок
        do {
            shuffledActive = [...activeTasks];
            for (let i = shuffledActive.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [shuffledActive[i], shuffledActive[j]] = [shuffledActive[j], shuffledActive[i]];
            }
        } while (shuffledActive.every((t, i) => t.id === originalActiveIds[i]));

        // Собираем список обратно, заменяя места активных задач перемешанными версиями
        let activeIdx = 0;
        const resultTasks = allTasks.map(t => {
            if (!t.completed) {
                return shuffledActive[activeIdx++];
            }
            return t;
        });

        await db.transaction('rw', db.tasks, async () => {
            for (let i = 0; i < resultTasks.length; i++) {
                await db.tasks.update(resultTasks[i].id, { order: i });
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
