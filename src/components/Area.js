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
    const el = createElement('div', {
        className: `area${collapsed ? ' area--collapsed' : ''}`,
        dataset: { areaId: area.id },
    });

    // Header
    const header = createElement('div', { className: 'area__header' });

    const titleContainer = createElement('div', { className: 'area__title' });
    titleContainer.appendChild(createElement('span', {
        className: 'area__title-icon',
        text: area.icon,
    }));
    titleContainer.appendChild(createElement('span', { text: area.title }));

    // Count badge
    const activeTasks = tasks.filter(t => !t.completed);
    if (activeTasks.length > 0) {
        titleContainer.appendChild(createElement('span', {
            className: 'area__count',
            text: String(activeTasks.length),
        }));
    }

    header.appendChild(titleContainer);

    // Actions
    const actions = createElement('div', { className: 'area__actions' });

    // Chaos shuffle button
    if (area.id === 'chaos' && activeTasks.length > 1) {
        const shuffleBtn = createElement('button', {
            className: 'chaos-btn',
            html: `${svgIcon(Icons.shuffle, 12)} <span>Перемешать</span>`,
            attrs: { 'aria-label': 'Перемешать хаос' },
        });
        shuffleBtn.addEventListener('click', async (e) => {
            e.stopPropagation();
            await taskService.shuffleChaos();

            // Анимация
            const cards = el.querySelectorAll('.task-card');
            cards.forEach((card, i) => {
                card.classList.remove('task-card--shuffling');
                void card.offsetWidth; // Force reflow
                setTimeout(() => card.classList.add('task-card--shuffling'), i * 30);
                setTimeout(() => card.classList.remove('task-card--shuffling'), 600 + i * 30);
            });
        });
        actions.appendChild(shuffleBtn);

        // Кнопка «Вытащить лягушку»
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

    // Collapse icon (mobile)
    actions.appendChild(createElement('span', {
        className: 'area__collapse-icon',
        html: svgIcon(Icons.chevronDown, 14),
    }));

    header.appendChild(actions);

    // Toggle collapse on mobile
    header.addEventListener('click', () => {
        if (window.innerWidth < 768) {
            el.classList.toggle('area--collapsed');
            events.emit(Events.AREA_TOGGLED, { areaId: area.id, collapsed: el.classList.contains('area--collapsed') });
        }
    });

    el.appendChild(header);

    // 1. FIRST: Замеряем позиции старых элементов
    const positions = new Map();
    const existingAreaEl = document.querySelector(`.area[data-area-id="${area.id}"]`);
    if (existingAreaEl) {
        existingAreaEl.querySelectorAll('.task-node').forEach(node => {
            const id = node.dataset.taskId;
            if (id) positions.set(id, node.getBoundingClientRect());
        });
    }

    // Body (task list)
    const body = createElement('div', { className: 'area__body' });

    if (activeTasks.length === 0) {
        body.appendChild(renderEmptyState(area.id));
    } else {
        const rootTasks = activeTasks.filter(t => !t.parentId || !activeTasks.some(p => p.id === t.parentId));
        for (const task of rootTasks) {
            body.appendChild(renderTaskNode(task, activeTasks, allTags));
        }
    }

    // 2. LAST & INVERT: Применяем FLIP после того, как новые элементы созданы
    if (positions.size > 0) {
        requestAnimationFrame(() => {
            body.querySelectorAll('.task-node').forEach(node => {
                const id = node.dataset.taskId;
                const oldRect = positions.get(id);
                if (!oldRect) return;

                const newRect = node.getBoundingClientRect();
                const dy = oldRect.top - newRect.top;
                const dx = oldRect.left - newRect.left;

                if (dy !== 0 || dx !== 0) {
                    node.style.transition = 'none';
                    node.style.transform = `translate(${dx}px, ${dy}px)`;

                    // Force reflow
                    void node.offsetHeight;

                    node.style.transition = 'transform 450ms cubic-bezier(0.23, 1, 0.32, 1)';
                    node.style.transform = 'translate(0, 0)';

                    setTimeout(() => {
                        node.style.transition = '';
                        node.style.transform = '';
                    }, 500);
                }
            });
        });
    }

    el.appendChild(body);

    // Input
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
