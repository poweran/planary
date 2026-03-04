/**
 * Планарий — Фильтр тегов
 */

import { createElement } from '../utils/dom.js';
import { getTagStyles } from '../models/tag.js';
import { events, Events } from '../core/events.js';
import { appStore } from '../core/store.js';

/**
 * Рендер панели фильтрации по тегам
 * @param {Array} tags — все теги
 * @returns {HTMLElement}
 */
export function renderTagFilter(tags) {
    const container = createElement('div', { className: 'tag-filter' });

    if (tags.length === 0) return container;

    // «Все» кнопка
    const allBtn = createElement('button', {
        className: `tag-filter__item${!appStore.state.activeFilter ? ' tag-filter__item--active' : ''}`,
        text: 'Все',
    });
    allBtn.addEventListener('click', () => {
        appStore.state.activeFilter = null;
        events.emit(Events.FILTER_CHANGED, null);
    });
    container.appendChild(allBtn);

    // Кнопки тегов
    for (const tag of tags) {
        const styles = getTagStyles(tag.color);
        const isActive = appStore.state.activeFilter === tag.id;

        const btn = createElement('button', {
            className: `tag-filter__item${isActive ? ' tag-filter__item--active' : ''}`,
            text: `#${tag.name}`,
        });

        if (isActive) {
            btn.style.backgroundColor = styles.backgroundColor;
            btn.style.borderColor = tag.color;
            btn.style.color = tag.color;
        }

        btn.addEventListener('click', () => {
            appStore.state.activeFilter = isActive ? null : tag.id;
            events.emit(Events.FILTER_CHANGED, appStore.state.activeFilter);
        });

        container.appendChild(btn);
    }

    return container;
}
