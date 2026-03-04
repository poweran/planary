/**
 * Планарий — Вид Архива
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
    }

    async init() {
        await this.render();
    }

    async render() {
        this.container.innerHTML = '';

        const wrapper = createElement('div', { className: 'archive-view' });

        // Панель статистики
        const statsPanel = await renderStatsPanel();
        wrapper.appendChild(statsPanel);

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

        this.container.appendChild(wrapper);
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

        // Заголовок
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

            // Дата завершения
            const dateStr = task.completedAt
                ? new Date(task.completedAt).toLocaleDateString('ru-RU', {
                    day: 'numeric', month: 'short', year: undefined
                })
                : '—';

            const dateEl = createElement('span', {
                className: 'archive-item__date',
                text: dateStr,
            });

            // Название
            const titleEl = createElement('span', {
                className: 'archive-item__title',
                text: task.title,
            });

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

            // Кнопка «Удалить»
            const deleteBtn = createElement('button', {
                className: 'btn btn--ghost btn--small',
                attrs: { title: 'Удалить навсегда' },
                text: '🗑️',
            });
            deleteBtn.addEventListener('click', async () => {
                await taskService.delete(task.id);
                await this.render();
            });

            const actions = createElement('div', {
                className: 'archive-item__actions',
                children: [restoreBtn, deleteBtn],
            });

            row.appendChild(dateEl);
            row.appendChild(titleEl);
            row.appendChild(tagsEl);
            row.appendChild(actions);

            container.appendChild(row);
        }
    }
}
