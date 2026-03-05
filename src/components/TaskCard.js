/**
 * Планарий — Компонент карточки задачи
 */

import { createElement, svgIcon, Icons } from '../utils/dom.js';
import { extractTags, stripTags } from '../utils/tagParser.js';
import { tagService } from '../services/tagService.js';
import { makeDraggable } from '../utils/dragDrop.js';
import { taskService } from '../services/taskService.js';
import { reminderService } from '../services/reminderService.js';
import { openNoteModal } from './NoteModal.js';
import { focusTimer } from './FocusTimer.js';
import { truncateNote } from '../utils/markdown.js';
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
        style: { viewTransitionName: `task-${task.id}` }
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

    // Двойной клик по всей карточке (кроме чекбокса) открывает редактирование
    card.addEventListener('dblclick', (e) => {
        if (e.target.closest('.task-card__checkbox') || e.target.closest('.task-card__title')) return;
        const currentTitle = card.querySelector('.task-card__title');
        if (currentTitle) startInlineEdit(card, task, currentTitle);
    });

    // Note icon (if has note)
    if (task.note) {
        const noteIcon = createElement('span', {
            className: 'task-card__note-icon',
            text: '📝',
            attrs: { title: truncateNote(task.note) },
        });
        noteIcon.addEventListener('click', (e) => {
            e.stopPropagation();
            openNoteModal(task);
        });
        body.appendChild(noteIcon);
    }

    // Recurrence icon
    if (task.recurrence) {
        const recLabels = { daily: 'Ежедневно', weekly: 'Еженедельно', monthly: 'Ежемесячно' };
        body.appendChild(createElement('span', {
            className: 'task-card__note-icon',
            text: '🔁',
            attrs: { title: recLabels[task.recurrence] || 'Повторяется' },
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

                // Кнопка удаления тега
                const removeBtn = createElement('span', {
                    className: 'tag-badge__remove',
                    html: svgIcon(Icons.x, 8),
                    attrs: { title: 'Открепить тег' }
                });
                removeBtn.addEventListener('click', async (e) => {
                    e.stopPropagation();
                    const newTags = task.tags.filter(id => id !== tagId);
                    await taskService.update(task.id, { tags: newTags });
                });
                badge.appendChild(removeBtn);

                tagsContainer.appendChild(badge);
            }
        }

        body.appendChild(tagsContainer);
    }

    // Menu (правый клик)
    card.addEventListener('contextmenu', (e) => {
        e.preventDefault();
        showTaskContextMenu(e, task, allTags);
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
    input.selectionStart = input.selectionEnd = input.value.length;

    const save = async () => {
        const rawValue = input.value.trim();
        if (rawValue && rawValue !== task.title) {
            // Парсим теги из нового текста
            const tagNames = extractTags(rawValue);
            const newTitle = stripTags(rawValue) || rawValue;

            // Создаём/находим теги и собираем их ID
            const tagIds = [];
            for (const name of tagNames) {
                const tag = await tagService.getOrCreate(name);
                tagIds.push(tag.id);
            }

            // Если в тексте есть теги — они заменяют/дополняют текущие
            // Синхронизация: если в тексте нет тега, который там БЫЛ (через #), мы его убираем?
            // Для простоты: всегда объединяем. Но если пользователь удалил #тег из текста, 
            // он ожидает что он исчезнет.
            const mergedTags = [...new Set([...(task.tags || []), ...tagIds])];

            await taskService.update(task.id, { title: newTitle, tags: mergedTags });
        } else {
            // Возвращаем оригинал
            const titleEl2 = createElement('div', {
                className: 'task-card__title',
                text: task.title,
            });
            titleEl2.addEventListener('dblclick', () => startInlineEdit(card, task, titleEl2));
            input.replaceWith(titleEl2);
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
function showTaskContextMenu(e, task, allTags = []) {
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

    // Заметка
    const noteItem = createElement('div', {
        className: 'context-menu__item',
        text: `📝 ${task.note ? 'Редактировать заметку' : 'Добавить заметку'}`,
    });
    noteItem.addEventListener('click', () => {
        menu.remove();
        openNoteModal(task);
    });
    menu.appendChild(noteItem);

    // Фокус (Pomodoro)
    const focusItem = createElement('div', {
        className: 'context-menu__item',
        text: '🍅 Фокус',
    });
    focusItem.addEventListener('click', () => {
        menu.remove();
        focusTimer.toggle(task.title);
    });
    menu.appendChild(focusItem);

    // Повторять
    const recurrenceOptions = [
        { label: '📅 Ежедневно', value: 'daily' },
        { label: '📆 Еженедельно', value: 'weekly' },
        { label: '🗓️ Ежемесячно', value: 'monthly' },
    ];

    const recLabel = createElement('div', {
        className: 'context-menu__item context-menu__has-submenu',
        text: `🔁 ${task.recurrence ? 'Повторяется' : 'Повторять'}`,
    });

    const recSubmenu = createElement('div', { className: 'context-menu__submenu' });
    recLabel.appendChild(recSubmenu);
    menu.appendChild(recLabel);

    recLabel.addEventListener('mouseenter', () => {
        recSubmenu.style.top = '-1px';
        recSubmenu.style.bottom = 'auto';
        recSubmenu.style.left = 'calc(100% - 4px)';
        recSubmenu.style.right = 'auto';
        const rect = recSubmenu.getBoundingClientRect();
        if (rect.bottom > window.innerHeight) {
            recSubmenu.style.top = 'auto';
            recSubmenu.style.bottom = '-1px';
        }
        if (rect.right > window.innerWidth) {
            recSubmenu.style.left = 'auto';
            recSubmenu.style.right = 'calc(100% - 4px)';
        }
    });

    for (const opt of recurrenceOptions) {
        const item = createElement('div', {
            className: `context-menu__item${task.recurrence === opt.value ? ' context-menu__item--active' : ''}`,
            style: { fontSize: 'var(--font-size-xs)' },
            text: `${opt.label}${task.recurrence === opt.value ? ' ✓' : ''}`,
        });
        item.addEventListener('click', async (e) => {
            e.stopPropagation();
            await taskService.update(task.id, { recurrence: opt.value });
            menu.remove();
        });
        recSubmenu.appendChild(item);
    }

    if (task.recurrence) {
        const clearRec = createElement('div', {
            className: 'context-menu__item context-menu__item--danger',
            style: { fontSize: 'var(--font-size-xs)' },
            text: '❌ Не повторять',
        });
        clearRec.addEventListener('click', async (e) => {
            e.stopPropagation();
            await taskService.update(task.id, { recurrence: null });
            menu.remove();
        });
        recSubmenu.appendChild(clearRec);
    }

    // Разделитель
    menu.appendChild(createElement('div', { className: 'context-menu__divider' }));

    // В корзину (soft delete)
    const deleteItem = createElement('div', {
        className: 'context-menu__item context-menu__item--danger',
        html: `<span>${svgIcon(Icons.trash, 14)}</span> <span>В корзину</span>`,
    });
    deleteItem.addEventListener('click', async () => {
        await taskService.softDelete(task.id);
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
        className: 'context-menu__item context-menu__has-submenu',
        text: '⏰ Напомнить',
    });

    const reminderSubmenu = createElement('div', { className: 'context-menu__submenu' });
    reminderLabel.appendChild(reminderSubmenu);
    menu.appendChild(reminderLabel);

    reminderLabel.addEventListener('mouseenter', () => {
        reminderSubmenu.style.top = '-1px';
        reminderSubmenu.style.bottom = 'auto';
        reminderSubmenu.style.left = 'calc(100% - 4px)';
        reminderSubmenu.style.right = 'auto';
        const rect = reminderSubmenu.getBoundingClientRect();
        if (rect.bottom > window.innerHeight) {
            reminderSubmenu.style.top = 'auto';
            reminderSubmenu.style.bottom = '-1px';
        }
        if (rect.right > window.innerWidth) {
            reminderSubmenu.style.left = 'auto';
            reminderSubmenu.style.right = 'calc(100% - 4px)';
        }
    });

    for (const opt of reminderOptions) {
        const item = createElement('div', {
            className: 'context-menu__item',
            style: { fontSize: 'var(--font-size-xs)' },
            text: opt.label,
        });
        item.addEventListener('click', async (e) => {
            e.stopPropagation();
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
        reminderSubmenu.appendChild(item);
    }

    if (task.reminderAt) {
        const clearItem = createElement('div', {
            className: 'context-menu__item context-menu__item--danger',
            style: { fontSize: 'var(--font-size-xs)' },
            text: '❌ Убрать напоминание',
        });
        clearItem.addEventListener('click', async (e) => {
            e.stopPropagation();
            await reminderService.clearReminder(task.id);
            menu.remove();
        });
        reminderSubmenu.appendChild(clearItem);
    }

    // Теги
    const tagsLabel = createElement('div', {
        className: 'context-menu__item context-menu__has-submenu',
        text: '🏷️ Теги',
    });

    const tagsSubmenu = createElement('div', { className: 'context-menu__submenu' });
    tagsLabel.appendChild(tagsSubmenu);
    menu.appendChild(tagsLabel);

    if (allTags.length === 0) {
        tagsSubmenu.appendChild(createElement('div', {
            className: 'context-menu__item',
            style: { fontSize: 'var(--font-size-xs)', opacity: 0.5 },
            text: 'Нет созданных тегов',
        }));
    } else {
        for (const tag of allTags) {
            const isActive = task.tags && task.tags.includes(tag.id);
            const item = createElement('div', {
                className: `context-menu__item${isActive ? ' context-menu__item--active' : ''}`,
                style: { fontSize: 'var(--font-size-xs)' },
                html: `<span style="color: ${tag.color || 'inherit'}">#${tag.name}</span>${isActive ? ' ✓' : ''}`,
            });
            item.addEventListener('click', async (e) => {
                e.stopPropagation();
                const newTags = isActive
                    ? task.tags.filter(id => id !== tag.id)
                    : [...(task.tags || []), tag.id];
                await taskService.update(task.id, { tags: newTags });
                menu.remove();
            });
            tagsSubmenu.appendChild(item);
        }
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
