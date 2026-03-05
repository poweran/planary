/**
 * Планарий — PlanningBoard (главный компонент)
 */

import { createElement, clearElement } from '../utils/dom.js';
import { renderArea } from './Area.js';
import { clearDropTargets } from '../utils/dragDrop.js';
import { initResizers, restoreGridSizes } from '../utils/resizer.js';
import { taskService } from '../services/taskService.js';
import { tagService } from '../services/tagService.js';
import { areaService } from '../services/areaService.js';
import { events, Events } from '../core/events.js';
import { appStore } from '../core/store.js';

export class PlanningBoard {
    constructor(containerEl) {
        this.container = containerEl;
        this.boardEl = null;
        this._unsubscribers = [];
        this._renderQueue = Promise.resolve();
    }

    async init() {
        this._bindEvents();
        await this.render();
    }

    /**
     * Запрос на перерисовку (с дебаунсингом и очередью)
     */
    render() {
        if (this._debounceTimer) clearTimeout(this._debounceTimer);

        this._debounceTimer = setTimeout(() => {
            this._renderQueue = this._renderQueue.then(() => this._performRender());
        }, 32); // 32ms — баланс между отзывчивостью и стабильностью
    }

    /**
     * Внутренний метод рендеринга
     */
    async _performRender() {
        const updateDOM = async () => {
            // Загружаем данные
            const [tasks, tags, areas] = await Promise.all([
                taskService.getAll(),
                tagService.getAll(),
                areaService.getAll(),
            ]);

            appStore.state.tasks = tasks;
            appStore.state.tags = tags;
            appStore.state.areas = areas;

            // Очищаем drop targets
            clearDropTargets();

            // Создаём board
            if (!this.boardEl) {
                this.boardEl = createElement('div', { className: 'planning-board' });
                this.container.appendChild(this.boardEl);
            }

            clearElement(this.boardEl);
            for (const area of areas) {
                let areaTasks = tasks.filter(t => t.areaId === area.id);
                if (appStore.state.activeFilter) {
                    areaTasks = taskService.filterByTag(areaTasks, appStore.state.activeFilter);
                }
                const searchQuery = appStore.state.searchQuery || '';
                if (searchQuery.trim()) {
                    const q = searchQuery.trim().toLowerCase();
                    areaTasks = areaTasks.filter(t => t.title.toLowerCase().includes(q));
                }
                areaTasks.sort((a, b) => a.order - b.order);
                const collapsed = appStore.state.collapsedAreas[area.id] || false;
                const areaEl = renderArea(area, areaTasks, tags, collapsed);
                this.boardEl.appendChild(areaEl);
            }
            await restoreGridSizes(this.boardEl);
            initResizers(this.boardEl);
        };

        if (document.startViewTransition) {
            let domUpdated = false;
            const wrappedUpdateDOM = async () => {
                domUpdated = true;
                await updateDOM();
            };

            try {
                const transition = document.startViewTransition(wrappedUpdateDOM);

                // Предотвращаем Uncaught ошибки для вспомогательных промисов
                transition.ready.catch(() => { });
                transition.updateCallbackDone.catch(() => { });

                // Ждём завершения всей анимации прежде чем начать следующую задачу в очереди
                await transition.finished;
            } catch (e) {
                if (!domUpdated) await updateDOM();
            }
        } else {
            await updateDOM();
        }
    }

    _bindEvents() {
        // Подписываемся на события для ре-рендера
        const rerender = () => this.render();

        this._unsubscribers.push(
            events.on(Events.TASK_CREATED, rerender),
            events.on(Events.TASK_UPDATED, rerender),
            events.on(Events.TASK_COMPLETED, rerender),
            events.on(Events.TASK_DELETED, rerender),
            events.on(Events.TASK_MOVED, rerender),
            events.on(Events.TASK_RESTORED, rerender),
            events.on(Events.TASKS_SHUFFLED, rerender),
            events.on(Events.TAG_CREATED, rerender),
            events.on(Events.TAG_DELETED, rerender),
            events.on(Events.FILTER_CHANGED, rerender),
            events.on(Events.SEARCH_CHANGED, rerender),
            events.on(Events.MIDNIGHT, rerender),
        );

        // Сохраняем collapsed state
        this._unsubscribers.push(
            events.on(Events.AREA_TOGGLED, ({ areaId, collapsed }) => {
                appStore.state.collapsedAreas = {
                    ...appStore.state.collapsedAreas,
                    [areaId]: collapsed,
                };
            }),
        );
    }

    destroy() {
        for (const unsub of this._unsubscribers) {
            unsub();
        }
        this._unsubscribers = [];
    }
}
