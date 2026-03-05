/**
 * Планарий — Вид Архива (с вкладками: Завершённые + Корзина)
 */

import { createElement, svgIcon, Icons } from '../utils/dom.js';
import { archiveService } from '../services/archiveService.js';
import { taskService } from '../services/taskService.js';
import { tagService } from '../services/tagService.js';
import { renderStatsPanel } from './StatsPanel.js';
import { events, Events } from '../core/events.js';
import { getTagStyles } from '../models/tag.js';

export class ArchiveView {
    constructor(containerEl) {
        this.container = containerEl;
        this.filterTagId = null;
        this.searchQuery = '';
        this.activeTab = 'completed'; // 'completed' | 'trash'
    }

    async init() {
        await this.render();
    }

    async render() {
        this.container.innerHTML = '';

        const wrapper = createElement('div', { className: 'archive-view' });

        // Панель статистики (только на вкладке завершённых)
        if (this.activeTab === 'completed') {
            const statsPanel = await renderStatsPanel();
            wrapper.appendChild(statsPanel);
        }

        // Вкладки
        const tabs = createElement('div', { className: 'archive-tabs' });

        const completedTab = createElement('button', {
            className: `archive-tab${this.activeTab === 'completed' ? ' archive-tab--active' : ''}`,
            text: '📦 Завершённые',
        });
        completedTab.addEventListener('click', () => {
            this.activeTab = 'completed';
            this.render();
        });

        const trashTab = createElement('button', {
            className: `archive-tab${this.activeTab === 'trash' ? ' archive-tab--active' : ''}`,
        });
        // Добавляем счётчик к корзине
        const trashCount = (await taskService.getDeleted()).length;
        trashTab.textContent = trashCount > 0 ? `🗑️ Корзина (${trashCount})` : '🗑️ Корзина';
        trashTab.addEventListener('click', () => {
            this.activeTab = 'trash';
            this.render();
        });

        tabs.appendChild(completedTab);
        tabs.appendChild(trashTab);
        wrapper.appendChild(tabs);

        if (this.activeTab === 'completed') {
            await this._renderCompletedTab(wrapper);
        } else {
            await this._renderTrashTab(wrapper);
        }

        this.container.appendChild(wrapper);
    }

    async _renderCompletedTab(wrapper) {
        // Фильтры
        const filters = createElement('div', { className: 'archive-filters' });

        // Поиск
        const searchInput = createElement('input', {
            className: 'archive-filters__search',
            attrs: {
                type: 'text',
                placeholder: '🔍 Поиск в архиве...',
                value: this.searchQuery,
            },
        });
        searchInput.addEventListener('input', (e) => {
            this.searchQuery = e.target.value;
            this._renderList(listContainer);
        });
        filters.appendChild(searchInput);

        // Фильтр по тегам
        const tags = await tagService.getAll();
        if (tags.length > 0) {
            const tagFilter = createElement('div', { className: 'archive-filters__tags' });

            const allBtn = createElement('button', {
                className: `tag-filter__item${!this.filterTagId ? ' tag-filter__item--active' : ''}`,
                text: 'Все',
            });
            allBtn.addEventListener('click', () => {
                this.filterTagId = null;
                this.render();
            });
            tagFilter.appendChild(allBtn);

            for (const tag of tags) {
                const styles = getTagStyles(tag);
                const tagBtn = createElement('button', {
                    className: `tag-filter__item${this.filterTagId === tag.id ? ' tag-filter__item--active' : ''}`,
                    text: `#${tag.name}`,
                });
                tagBtn.style.borderColor = styles.color;
                if (this.filterTagId === tag.id) {
                    tagBtn.style.background = styles.bg;
                }
                tagBtn.addEventListener('click', () => {
                    this.filterTagId = tag.id;
                    this.render();
                });
                tagFilter.appendChild(tagBtn);
            }

            filters.appendChild(tagFilter);
        }

        wrapper.appendChild(filters);

        // Список завершённых задач
        const listContainer = createElement('div', { className: 'archive-list' });
        await this._renderList(listContainer);
        wrapper.appendChild(listContainer);
    }

    async _renderTrashTab(wrapper) {
        const deleted = await taskService.getDeleted();

        const trashContainer = createElement('div', { className: 'archive-list' });

        if (deleted.length === 0) {
            trashContainer.appendChild(createElement('div', {
                className: 'archive-empty',
                children: [
                    createElement('div', { className: 'archive-empty__icon', text: '🗑️' }),
                    createElement('div', { text: 'Корзина пуста' }),
                ],
            }));
        } else {
            // Кнопка «Очистить корзину»
            const clearBtn = createElement('button', {
                className: 'btn btn--danger btn--small archive-trash__clear-btn',
                text: '🗑️ Очистить корзину',
            });
            clearBtn.addEventListener('click', async () => {
                const ok = confirm(`Удалить ${deleted.length} задач навсегда? Это действие нельзя отменить.`);
                if (!ok) return;
                await taskService.clearTrash();
                await this.render();
            });
            trashContainer.appendChild(clearBtn);

            // Заголовок
            trashContainer.appendChild(createElement('div', {
                className: 'archive-list__header',
                text: `В корзине: ${deleted.length}`,
            }));

            const allTags = await tagService.getAll();
            const tagMap = {};
            for (const tag of allTags) {
                tagMap[tag.id] = tag;
            }

            for (const task of deleted) {
                const row = createElement('div', { className: 'archive-item' });

                const dateStr = task.deletedAt
                    ? new Date(task.deletedAt).toLocaleDateString('ru-RU', {
                        day: 'numeric', month: 'short',
                    })
                    : '—';

                row.appendChild(createElement('span', {
                    className: 'archive-item__date',
                    text: dateStr,
                }));
                row.appendChild(createElement('span', {
                    className: 'archive-item__title',
                    text: task.title,
                }));

                // Теги
                const tagsEl = createElement('span', { className: 'archive-item__tags' });
                if (task.tags) {
                    for (const tId of task.tags) {
                        const tag = tagMap[tId];
                        if (tag) {
                            const styles = getTagStyles(tag);
                            const badge = createElement('span', {
                                className: 'tag-badge tag-badge--small',
                                text: `#${tag.name}`,
                            });
                            badge.style.background = styles.bg;
                            badge.style.color = styles.color;
                            tagsEl.appendChild(badge);
                        }
                    }
                }
                row.appendChild(tagsEl);

                // Кнопки действий
                const restoreBtn = createElement('button', {
                    className: 'btn btn--ghost btn--small',
                    attrs: { title: 'Восстановить на доску' },
                    text: '↩️ Восстановить',
                });
                restoreBtn.addEventListener('click', async () => {
                    await taskService.restore(task.id);
                    events.emit(Events.TOAST, `↩️ «${task.title}» восстановлена`);
                    await this.render();
                });

                const deleteBtn = createElement('button', {
                    className: 'btn btn--ghost btn--small archive-item__delete-forever',
                    attrs: { title: 'Удалить навсегда' },
                    text: '✕',
                });
                deleteBtn.addEventListener('click', async () => {
                    await taskService.permanentDelete(task.id);
                    await this.render();
                });

                row.appendChild(createElement('div', {
                    className: 'archive-item__actions',
                    children: [restoreBtn, deleteBtn],
                }));

                trashContainer.appendChild(row);
            }
        }

        wrapper.appendChild(trashContainer);
    }

    async _renderList(container) {
        container.innerHTML = '';

        const { items, total } = await archiveService.getCompleted({
            tagId: this.filterTagId,
            search: this.searchQuery,
        });

        if (items.length === 0) {
            container.appendChild(createElement('div', {
                className: 'archive-empty',
                children: [
                    createElement('div', { className: 'archive-empty__icon', text: '📦' }),
                    createElement('div', { text: this.searchQuery || this.filterTagId ? 'Ничего не найдено' : 'Архив пуст — завершите первую задачу!' }),
                ],
            }));
            return;
        }

        container.appendChild(createElement('div', {
            className: 'archive-list__header',
            text: `Завершённых задач: ${total}`,
        }));

        const allTags = await tagService.getAll();
        const tagMap = {};
        for (const tag of allTags) {
            tagMap[tag.id] = tag;
        }

        for (const task of items) {
            const row = createElement('div', { className: 'archive-item' });

            const dateStr = task.completedAt
                ? new Date(task.completedAt).toLocaleDateString('ru-RU', {
                    day: 'numeric', month: 'short', year: undefined
                })
                : '—';

            row.appendChild(createElement('span', {
                className: 'archive-item__date',
                text: dateStr,
            }));
            row.appendChild(createElement('span', {
                className: 'archive-item__title',
                text: task.title,
            }));

            // Теги
            const tagsEl = createElement('span', { className: 'archive-item__tags' });
            if (task.tags) {
                for (const tId of task.tags) {
                    const tag = tagMap[tId];
                    if (tag) {
                        const styles = getTagStyles(tag);
                        const badge = createElement('span', {
                            className: 'tag-badge tag-badge--small',
                            text: `#${tag.name}`,
                        });
                        badge.style.background = styles.bg;
                        badge.style.color = styles.color;
                        tagsEl.appendChild(badge);
                    }
                }
            }
            row.appendChild(tagsEl);

            // Кнопка «Вернуть»
            const restoreBtn = createElement('button', {
                className: 'btn btn--ghost btn--small',
                attrs: { title: 'Вернуть на доску' },
                text: '↩️',
            });
            restoreBtn.addEventListener('click', async () => {
                await taskService.uncomplete(task.id);
                await this.render();
            });

            // Кнопка «В корзину» (из архива — физическое удаление)
            const deleteBtn = createElement('button', {
                className: 'btn btn--ghost btn--small',
                attrs: { title: 'Удалить навсегда' },
                text: '🗑️',
            });
            deleteBtn.addEventListener('click', async () => {
                await taskService.permanentDelete(task.id);
                await this.render();
            });

            row.appendChild(createElement('div', {
                className: 'archive-item__actions',
                children: [restoreBtn, deleteBtn],
            }));

            container.appendChild(row);
        }
    }
}
