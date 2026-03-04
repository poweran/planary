/**
 * Планарий — Компонент карточки задачи
 */

import { createElement, svgIcon, Icons } from '../utils/dom.js';
import { makeDraggable } from '../utils/dragDrop.js';
import { taskService } from '../services/taskService.js';
import { tagService } from '../services/tagService.js';
import { reminderService } from '../services/reminderService.js';
import { events, Events } from '../core/events.js';
import { TASK_COLORS } from '../models/task.js';
import { getTagStyles } from '../models/tag.js';

/**
 * Рендер карточки задачи
 * @param {Object} task
 * @param {Array} allTags — все теги из БД
 * @returns {HTMLElement}
 */
export function renderTaskCard(task, allTags = []) {
    const colorClass = task.color ? ` task-card--color-${task.color}` : '';
    const completedClass = task.completed ? ' task-card--completed' : '';

    const card = createElement('div', {
        className: `task-card task-card--new${colorClass}${completedClass}`,
        dataset: { taskId: String(task.id), areaId: task.areaId },
    });

    // Pin
    const pin = createElement('div', { className: 'task-card__pin' });
    card.appendChild(pin);

    // Checkbox
    const checkbox = createElement('div', {
        className: `task-card__checkbox${task.completed ? ' task-card__checkbox--checked' : ''}`,
        html: task.completed ? svgIcon(Icons.check, 14) : '',
    });

    checkbox.addEventListener('click', async (e) => {
        e.stopPropagation();
        if (task.completed) {
            await taskService.uncomplete(task.id);
        } else {
            checkbox.classList.add('task-card__checkbox--checked', 'task-card__checkbox--animating');
            checkbox.innerHTML = svgIcon(Icons.check, 14);
            card.classList.add('task-card--completing');

            setTimeout(async () => {
                await taskService.complete(task.id);
            }, 450);
        }
    });

    // Body
    const body = createElement('div', { className: 'task-card__body' });

    // Title
    const title = createElement('div', {
        className: 'task-card__title',
        text: task.title,
    });

    // Двойной клик для редактирования
    title.addEventListener('dblclick', () => startInlineEdit(card, task, title));

    body.appendChild(title);

    // Notes preview
    if (task.note) {
        body.appendChild(createElement('div', {
            className: 'task-card__note-preview',
            text: task.note,
        }));
    }

    // Tags
    if (task.tags && task.tags.length > 0) {
        const tagsContainer = createElement('div', { className: 'task-card__tags' });

        for (const tagId of task.tags) {
            const tagData = allTags.find(t => t.id === tagId);
            if (tagData) {
                const styles = getTagStyles(tagData.color);
                const badge = createElement('span', {
                    className: 'tag-badge tag-badge--small',
                    text: `#${tagData.name}`,
                    style: {
                        backgroundColor: styles.backgroundColor,
                        color: styles.color,
                    },
                });
                tagsContainer.appendChild(badge);
            }
        }

        body.appendChild(tagsContainer);
    }

    // Menu (правый клик)
    card.addEventListener('contextmenu', (e) => {
        e.preventDefault();
        showTaskContextMenu(e, task);
    });

    card.appendChild(checkbox);
    card.appendChild(body);

    // Drag & Drop
    makeDraggable(card, {
        data: { taskId: task.id, sourceAreaId: task.areaId, parentId: task.parentId },
        onDragStart: (data) => {
            events.emit('drag:start', data);
        },
        onDragEnd: async (data, dropTarget) => {
            if (!dropTarget) {
                events.emit('drag:end');
                return;
            }

            const targetData = dropTarget.data;
            if (targetData.type === 'task') {
                if (targetData.taskId === data.taskId) {
                    events.emit('drag:end');
                    return;
                }
                await taskService.reposition(data.taskId, targetData.areaId, targetData.taskId, targetData.position);
            } else if (targetData.type === 'area') {
                await taskService.reposition(data.taskId, targetData.areaId, null, 'bottom');
            }
            events.emit('drag:end');
        },
    });

    return card;
}

/**
 * Inline-редактирование задачи
 */
function startInlineEdit(card, task, titleEl) {
    const input = createElement('input', {
        className: 'task-card__title-input',
        attrs: {
            type: 'text',
            value: task.title,
        },
    });

    titleEl.replaceWith(input);
    input.focus();
    input.select();

    const save = async () => {
        const newTitle = input.value.trim();
        if (newTitle && newTitle !== task.title) {
            await taskService.update(task.id, { title: newTitle });
        } else {
            // Возвращаем оригинал
            const newTitle2 = createElement('div', {
                className: 'task-card__title',
                text: task.title,
            });
            newTitle2.addEventListener('dblclick', () => startInlineEdit(card, task, newTitle2));
            input.replaceWith(newTitle2);
        }
    };

    input.addEventListener('blur', save);
    input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            input.blur();
        }
        if (e.key === 'Escape') {
            input.value = task.title;
            input.blur();
        }
    });
}

/**
 * Контекстное меню задачи
 */
function showTaskContextMenu(e, task) {
    // Убираем предыдущее меню
    const old = document.querySelector('.context-menu');
    if (old) old.remove();

    const menu = createElement('div', { className: 'context-menu' });

    // Палитра цветов
    const colorPicker = createElement('div', { className: 'color-picker' });

    // Кнопка «без цвета»
    const noneBtn = createElement('div', {
        className: `color-picker__swatch color-picker__swatch--none${!task.color ? ' color-picker__swatch--active' : ''}`,
    });
    noneBtn.addEventListener('click', async () => {
        await taskService.update(task.id, { color: null });
        menu.remove();
    });
    colorPicker.appendChild(noneBtn);

    for (const c of TASK_COLORS) {
        const swatch = createElement('div', {
            className: `color-picker__swatch${task.color === c.id ? ' color-picker__swatch--active' : ''}`,
            style: { backgroundColor: c.value },
            attrs: { title: c.label },
        });
        swatch.addEventListener('click', async () => {
            await taskService.update(task.id, { color: c.id });
            menu.remove();
        });
        colorPicker.appendChild(swatch);
    }

    menu.appendChild(colorPicker);

    // Разделитель
    menu.appendChild(createElement('div', { className: 'context-menu__divider' }));

    // Переместить в другие области
    const areas = [
        { id: 'today', icon: '📅', label: 'Сегодня' },
        { id: 'tomorrow', icon: '📋', label: 'Завтра' },
        { id: 'chaos', icon: '🌀', label: 'Хаос' },
        { id: 'future', icon: '📦', label: 'На будущее' },
    ];

    for (const area of areas) {
        if (area.id === task.areaId) continue;
        const item = createElement('div', {
            className: 'context-menu__item',
            html: `<span>${area.icon}</span> <span>→ ${area.label}</span>`,
        });
        item.addEventListener('click', async () => {
            await taskService.reposition(task.id, area.id);
            menu.remove();
        });
        menu.appendChild(item);
    }

    // Разделитель
    menu.appendChild(createElement('div', { className: 'context-menu__divider' }));

    // Удалить
    const deleteItem = createElement('div', {
        className: 'context-menu__item context-menu__item--danger',
        html: `<span>${svgIcon(Icons.trash, 14)}</span> <span>Удалить</span>`,
    });
    deleteItem.addEventListener('click', async () => {
        await taskService.delete(task.id);
        menu.remove();
    });
    menu.appendChild(deleteItem);

    // Разделитель
    menu.appendChild(createElement('div', { className: 'context-menu__divider' }));

    // Напомнить
    const reminderOptions = [
        { label: '⚙️ Через 15 мин', minutes: 15 },
        { label: '⚙️ Через 1 час', minutes: 60 },
        { label: '⚙️ Завтра утром', minutes: null },
    ];

    const reminderLabel = createElement('div', {
        className: 'context-menu__item',
        text: '⏰ Напомнить',
    });
    menu.appendChild(reminderLabel);

    for (const opt of reminderOptions) {
        const item = createElement('div', {
            className: 'context-menu__item',
            style: { paddingLeft: '2rem', fontSize: 'var(--font-size-xs)' },
            text: opt.label,
        });
        item.addEventListener('click', async () => {
            let date;
            if (opt.minutes) {
                date = new Date(Date.now() + opt.minutes * 60_000);
            } else {
                // Завтра утром в 9:00
                const tomorrow = new Date();
                tomorrow.setDate(tomorrow.getDate() + 1);
                tomorrow.setHours(9, 0, 0, 0);
                date = tomorrow;
            }
            await reminderService.setReminder(task.id, date);
            menu.remove();
        });
        menu.appendChild(item);
    }

    if (task.reminderAt) {
        const clearItem = createElement('div', {
            className: 'context-menu__item context-menu__item--danger',
            style: { paddingLeft: '2rem', fontSize: 'var(--font-size-xs)' },
            text: '❌ Убрать напоминание',
        });
        clearItem.addEventListener('click', async () => {
            await reminderService.clearReminder(task.id);
            menu.remove();
        });
        menu.appendChild(clearItem);
    }

    // Позиционирование
    const rect = e.target.getBoundingClientRect();
    menu.style.top = `${rect.bottom + 4}px`;
    menu.style.right = `${window.innerWidth - rect.right}px`;

    // Не выходим за экран
    document.body.appendChild(menu);
    const menuRect = menu.getBoundingClientRect();
    if (menuRect.bottom > window.innerHeight) {
        menu.style.top = `${rect.top - menuRect.height - 4}px`;
    }
    if (menuRect.left < 0) {
        menu.style.right = 'auto';
        menu.style.left = '8px';
    }

    // Закрытие по клику вне
    const closeHandler = (e2) => {
        if (!menu.contains(e2.target)) {
            menu.remove();
            document.removeEventListener('click', closeHandler);
        }
    };
    setTimeout(() => document.addEventListener('click', closeHandler), 10);
}
