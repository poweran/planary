/**
 * Планарий — Управление тегами (отдельный раздел)
 */

import { createElement } from '../utils/dom.js';
import { tagService } from '../services/tagService.js';
import { getTagStyles } from '../models/tag.js';
import { events, Events } from '../core/events.js';

const TAG_COLORS = [
    '#E74C3C', '#F39C12', '#3498DB', '#27AE60',
    '#9B59B6', '#E91E63', '#00BCD4', '#FF5722',
    '#795548', '#607D8B',
];

export class TagsView {
    constructor(containerEl) {
        this.container = containerEl;
    }

    async init() {
        await this.render();
    }

    async render() {
        this.container.innerHTML = '';

        const wrapper = createElement('div', { className: 'tags-view' });

        // Заголовок
        const title = createElement('h1', {
            className: 'tags-view__title',
            text: '🏷️ Управление тегами',
        });
        wrapper.appendChild(title);

        // Форма создания нового тега
        const formSection = createElement('div', { className: 'tags-view__form-section' });

        const formLabel = createElement('div', {
            className: 'tags-view__label',
            text: 'Новый тег',
        });

        const form = createElement('div', { className: 'tags-view__form' });
        const input = createElement('input', {
            className: 'tags-view__input',
            attrs: {
                type: 'text',
                placeholder: 'Введите название тега…',
                maxlength: '32',
                id: 'tags-view-input',
            },
        });
        const addBtn = createElement('button', {
            className: 'tags-view__add-btn btn btn--primary',
            text: '+ Добавить',
            attrs: { id: 'tags-view-add-btn' },
        });

        const createTag = async () => {
            const name = input.value.trim();
            if (!name) {
                input.classList.add('tags-view__input--error');
                input.focus();
                setTimeout(() => input.classList.remove('tags-view__input--error'), 600);
                return;
            }
            await tagService.getOrCreate(name);
            input.value = '';
            input.focus();
            await this.render();
        };

        addBtn.addEventListener('click', createTag);
        input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') createTag();
        });

        form.appendChild(input);
        form.appendChild(addBtn);
        formSection.appendChild(formLabel);
        formSection.appendChild(form);
        wrapper.appendChild(formSection);

        // Список тегов
        const tags = await tagService.getAll();

        const listSection = createElement('div', { className: 'tags-view__list-section' });

        const listLabel = createElement('div', {
            className: 'tags-view__label',
            text: `Все теги (${tags.length})`,
        });
        listSection.appendChild(listLabel);

        if (tags.length === 0) {
            const empty = createElement('div', {
                className: 'tags-view__empty',
                children: [
                    createElement('div', { className: 'tags-view__empty-icon', text: '🏷️' }),
                    createElement('div', { text: 'Тегов пока нет — добавьте первый выше' }),
                ],
            });
            listSection.appendChild(empty);
        } else {
            const grid = createElement('div', { className: 'tags-view__grid' });

            for (const tag of tags) {
                grid.appendChild(this._buildTagCard(tag));
            }

            listSection.appendChild(grid);
        }

        wrapper.appendChild(listSection);
        this.container.appendChild(wrapper);

        // Фокус на инпут
        input.focus();
    }

    _buildTagCard(tag) {
        const styles = getTagStyles(tag.color);
        const card = createElement('div', { className: 'tags-view__card' });

        // Бейдж с именем
        const badge = createElement('div', { className: 'tags-view__badge-row' });
        const tagBadge = createElement('span', {
            className: 'tags-view__tag-name',
            text: `#${tag.name}`,
        });
        Object.assign(tagBadge.style, {
            color: styles.color,
            background: styles.backgroundColor,
            borderColor: styles.borderColor,
        });
        badge.appendChild(tagBadge);

        // Кнопка удаления
        const delBtn = createElement('button', {
            className: 'tags-view__del-btn',
            attrs: { title: 'Удалить тег' },
            text: '✕',
        });
        delBtn.addEventListener('click', async () => {
            if (confirm(`Удалить тег «#${tag.name}»?\nОн будет убран из всех задач.`)) {
                await tagService.delete(tag.id);
                await this.render();
            }
        });
        badge.appendChild(delBtn);
        card.appendChild(badge);

        // Палитра цветов
        const colorsLabel = createElement('div', {
            className: 'tags-view__colors-label',
            text: 'Цвет:',
        });
        card.appendChild(colorsLabel);

        const palette = createElement('div', { className: 'tags-view__palette' });
        for (const color of TAG_COLORS) {
            const dot = createElement('button', {
                className: `tags-view__color-dot${tag.color === color ? ' tags-view__color-dot--active' : ''}`,
                attrs: { title: color },
            });
            dot.style.background = color;
            dot.addEventListener('click', async () => {
                await tagService.updateColor(tag.id, color);
                await this.render();
            });
            palette.appendChild(dot);
        }
        card.appendChild(palette);

        return card;
    }
}
