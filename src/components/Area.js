/**
 * Планарий — Компонент области планирования
 */

import { createElement, svgIcon, Icons } from '../utils/dom.js';
import { renderTaskCard } from './TaskCard.js';
import { renderTaskInput } from './TaskInput.js';
import { taskService } from '../services/taskService.js';
import { tagService } from '../services/tagService.js';
import { events, Events } from '../core/events.js';

/**
 * Рендер области
 * @param {Object} area — { id, title, icon }
 * @param {Array} tasks — задачи этой области
 * @param {Array} allTags — все теги
 * @param {boolean} collapsed — свёрнута ли область (mobile)
 * @returns {HTMLElement}
 */
export function renderArea(area, tasks, allTags, collapsed = false) {
    // Ищем существующую область
    const existingArea = document.querySelector(`.area[data-area-id="${area.id}"]`);

    if (existingArea) {
        const body = existingArea.querySelector('.area__body');

        // Обновляем счетчик
        const activeTasks = tasks.filter(t => !t.completed);
        const countBadge = existingArea.querySelector('.area__count');
        if (activeTasks.length > 0) {
            if (countBadge) countBadge.textContent = String(activeTasks.length);
            else existingArea.querySelector('.area__title').appendChild(createElement('span', { className: 'area__count', text: String(activeTasks.length) }));
        } else if (countBadge) countBadge.remove();

        // Обновляем кнопки действий (например, для Chaos)
        const actions = existingArea.querySelector('.area__actions');
        const existingShuffleBtn = actions.querySelector('.chaos-btn');
        const existingFrogBtn = actions.querySelector('.chaos-btn--frog');

        if (area.id === 'chaos' && activeTasks.length > 1) {
            if (!existingShuffleBtn) {
                const shuffleBtn = createElement('button', {
                    className: 'chaos-btn',
                    html: `${svgIcon(Icons.shuffle, 12)} <span>Перемешать</span>`,
                    attrs: { 'aria-label': 'Перемешать хаос' },
                });
                shuffleBtn.addEventListener('click', async (e) => {
                    e.stopPropagation();
                    await taskService.shuffleChaos();
                });
                actions.insertBefore(shuffleBtn, actions.firstChild); // Add before collapse icon
            }
            if (!existingFrogBtn) {
                const frogBtn = createElement('button', {
                    className: 'chaos-btn chaos-btn--frog',
                    text: '🐸',
                    attrs: { 'aria-label': 'Вытащить лягушку', title: 'Случайная лягушка' },
                });
                frogBtn.addEventListener('click', async (e) => {
                    e.stopPropagation();
                    await highlightFrog(existingArea);
                });
                actions.insertBefore(frogBtn, actions.querySelector('.chaos-btn') ? actions.querySelector('.chaos-btn').nextSibling : actions.firstChild);
            }
        } else {
            if (existingShuffleBtn) existingShuffleBtn.remove();
            if (existingFrogBtn) existingFrogBtn.remove();
        }

        // Рендерим новое тело
        const newBody = createElement('div', { className: 'area__body' });
        if (activeTasks.length === 0) {
            newBody.appendChild(renderEmptyState(area.id));
        } else {
            const rootTasks = activeTasks.filter(t => !t.parentId || !activeTasks.some(p => p.id === t.parentId));
            for (const task of rootTasks) {
                newBody.appendChild(renderTaskNode(task, activeTasks, allTags));
            }
        }

        // Заменяем тело
        body.replaceWith(newBody);
        return existingArea;
    }

    const el = createElement('div', {
        className: `area${collapsed ? ' area--collapsed' : ''}`,
        dataset: { areaId: area.id },
    });

    // Header (только при первом создании)
    const header = createElement('div', { className: 'area__header' });
    const titleContainer = createElement('div', { className: 'area__title' });
    titleContainer.appendChild(createElement('span', { className: 'area__title-icon', text: area.icon }));
    titleContainer.appendChild(createElement('span', { text: area.title }));

    const activeTasksCount = tasks.filter(t => !t.completed).length;
    if (activeTasksCount > 0) {
        titleContainer.appendChild(createElement('span', { className: 'area__count', text: String(activeTasksCount) }));
    }
    header.appendChild(titleContainer);

    const actions = createElement('div', { className: 'area__actions' });
    if (area.id === 'chaos' && tasks.filter(t => !t.completed).length > 1) {
        // ... (код кнопок shuffle и frog без изменений)
        const activeTasksOnly = tasks.filter(t => !t.completed);
        const shuffleBtn = createElement('button', {
            className: 'chaos-btn',
            html: `${svgIcon(Icons.shuffle, 12)} <span>Перемешать</span>`,
            attrs: { 'aria-label': 'Перемешать хаос' },
        });
        shuffleBtn.addEventListener('click', async (e) => {
            e.stopPropagation();
            await taskService.shuffleChaos();
        });
        actions.appendChild(shuffleBtn);

        const frogBtn = createElement('button', {
            className: 'chaos-btn chaos-btn--frog',
            text: '🐸',
            attrs: { 'aria-label': 'Вытащить лягушку', title: 'Случайная лягушка' },
        });
        frogBtn.addEventListener('click', async (e) => {
            e.stopPropagation();
            await highlightFrog(el);
        });
        actions.appendChild(frogBtn);
    }
    actions.appendChild(createElement('span', { className: 'area__collapse-icon', html: svgIcon(Icons.chevronDown, 14) }));
    header.appendChild(actions);

    header.addEventListener('click', () => {
        if (window.innerWidth < 768) {
            el.classList.toggle('area--collapsed');
            events.emit(Events.AREA_TOGGLED, { areaId: area.id, collapsed: el.classList.contains('area--collapsed') });
        }
    });

    el.appendChild(header);
    const body = createElement('div', { className: 'area__body' });
    const activeTasksFinal = tasks.filter(t => !t.completed);
    if (activeTasksFinal.length === 0) {
        body.appendChild(renderEmptyState(area.id));
    } else {
        const rootTasks = activeTasksFinal.filter(t => !t.parentId || !activeTasksFinal.some(p => p.id === t.parentId));
        for (const task of rootTasks) body.appendChild(renderTaskNode(task, activeTasksFinal, allTags));
    }
    el.appendChild(body);
    el.appendChild(renderTaskInput(area.id));
    return el;
}

function renderTaskNode(task, allActiveTasks, allTags) {
    const node = createElement('div', { className: 'task-node', dataset: { taskId: String(task.id) } });

    // The sticky note itself
    const card = renderTaskCard(task, allTags);
    node.appendChild(card);

    // Children
    const children = allActiveTasks.filter(t => t.parentId === task.id).sort((a, b) => a.order - b.order);
    if (children.length > 0) {
        const subtasksContainer = createElement('div', { className: 'task-node__subtasks' });
        for (const child of children) {
            subtasksContainer.appendChild(renderTaskNode(child, allActiveTasks, allTags));
        }
        node.appendChild(subtasksContainer);
    }
    return node;
}

function renderEmptyState(areaId) {
    const emojis = {
        today: '☀️',
        tomorrow: '🌙',
        chaos: '🌀',
        future: '🔮',
    };
    const messages = {
        today: 'Чистый лист — отличное начало!',
        tomorrow: 'Завтрашний день свободен',
        chaos: 'Брось сюда всё, что не имеет даты',
        future: 'Мечтай и планируй',
    };

    return createElement('div', {
        className: 'area__empty',
        children: [
            createElement('div', { className: 'area__empty-icon', text: emojis[areaId] || '📝' }),
            createElement('div', { text: messages[areaId] || 'Пусто' }),
        ],
    });
}

/**
 * Подсветить случайную «лягушку» в области
 */
async function highlightFrog(areaEl) {
    const frogTag = await tagService.findByName('лягушки');
    if (!frogTag) {
        events.emit(Events.TOAST, '🐸 Создайте тег #лягушки и добавьте его к неприятным делам!');
        return;
    }

    const cards = areaEl.querySelectorAll('.task-card');
    const frogCards = [];

    cards.forEach(card => {
        const taskId = Number(card.dataset.taskId);
        if (taskId) frogCards.push(card);
    });

    // Нужно проверить у каких карточек есть тег лягушки
    // Получаем задачи из базы
    const tasks = await taskService.getByArea('chaos');
    const frogTasks = tasks.filter(t => !t.completed && t.tags && t.tags.includes(frogTag.id));

    if (frogTasks.length === 0) {
        events.emit(Events.TOAST, '🐸 Нет лягушек — отлично!');
        return;
    }

    // Случайная лягушка
    const randomFrog = frogTasks[Math.floor(Math.random() * frogTasks.length)];

    // Перемещаем в начало в БД
    await taskService.reposition(randomFrog.id, 'chaos', null, 'top');

    // Находим карточку после рендера и FLIP-анимации
    setTimeout(() => {
        const frogCard = areaEl.querySelector(`.task-card[data-task-id="${randomFrog.id}"]`);
        if (frogCard) {
            frogCard.classList.add('task-card--frog-arrived');
            frogCard.scrollIntoView({ behavior: 'smooth', block: 'center' });
            setTimeout(() => frogCard.classList.remove('task-card--frog-arrived'), 1500);
        }
    }, 550); // Ждем окончания FLIP (450ms) + запас
}
