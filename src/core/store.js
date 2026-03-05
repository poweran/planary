/**
 * Планарий — Реактивный стор (Proxy-based)
 */

/**
 * Создание реактивного хранилища
 * @param {Object} initialState
 * @returns {{ state: Proxy, subscribe: Function, notify: Function }}
 */
export function createStore(initialState = {}) {
    const listeners = new Set();

    const handler = {
        set(target, property, value) {
            const oldValue = target[property];
            target[property] = value;
            if (oldValue !== value) {
                notify(property, value, oldValue);
            }
            return true;
        },
    };

    const state = new Proxy({ ...initialState }, handler);

    function subscribe(listener) {
        listeners.add(listener);
        return () => listeners.delete(listener);
    }

    function notify(property, newValue, oldValue) {
        for (const listener of listeners) {
            listener(property, newValue, oldValue);
        }
    }

    return { state, subscribe, notify };
}

/**
 * Глобальный стор приложения
 */
export const appStore = createStore({
    tasks: [],
    tags: [],
    areas: [],
    activeFilter: null,      // ID активного тега-фильтра (null = все)
    searchQuery: '',         // Текст глобального поиска
    theme: 'system',         // 'light' | 'dark' | 'system'
    collapsedAreas: {},      // { areaId: boolean } — для мобильных
    dragState: null,         // { taskId, sourceAreaId } при drag-and-drop
});
