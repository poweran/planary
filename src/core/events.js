/**
 * Планарий — Event Bus (pub/sub)
 */

class EventBus {
    constructor() {
        this._handlers = new Map();
    }

    /**
     * Подписка на событие
     * @param {string} event
     * @param {Function} handler
     * @returns {Function} unsubscribe
     */
    on(event, handler) {
        if (!this._handlers.has(event)) {
            this._handlers.set(event, new Set());
        }
        this._handlers.get(event).add(handler);
        return () => this.off(event, handler);
    }

    /**
     * Отписка
     */
    off(event, handler) {
        const handlers = this._handlers.get(event);
        if (handlers) {
            handlers.delete(handler);
        }
    }

    /**
     * Одноразовая подписка
     */
    once(event, handler) {
        const wrapper = (...args) => {
            handler(...args);
            this.off(event, wrapper);
        };
        return this.on(event, wrapper);
    }

    /**
     * Публикация события
     */
    emit(event, ...args) {
        const handlers = this._handlers.get(event);
        if (handlers) {
            for (const handler of handlers) {
                handler(...args);
            }
        }
    }
}

// Глобальный экземпляр
export const events = new EventBus();

// Константы событий
export const Events = {
    TASK_CREATED: 'task:created',
    TASK_UPDATED: 'task:updated',
    TASK_COMPLETED: 'task:completed',
    TASK_DELETED: 'task:deleted',
    TASK_MOVED: 'task:moved',
    TASK_REORDERED: 'task:reordered',
    TASKS_SHUFFLED: 'tasks:shuffled',

    TAG_CREATED: 'tag:created',
    TAG_UPDATED: 'tag:updated',
    TAG_DELETED: 'tag:deleted',

    FILTER_CHANGED: 'filter:changed',
    THEME_CHANGED: 'theme:changed',
    AREA_TOGGLED: 'area:toggled',
    AREA_RESIZED: 'area:resized',

    ACHIEVEMENT_UNLOCKED: 'achievement:unlocked',

    MIDNIGHT: 'midnight',
    TOAST: 'toast:show',
};
