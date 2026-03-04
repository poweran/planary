/**
 * Планарий — Компонент поля ввода задачи
 */

import { createElement } from '../utils/dom.js';
import { taskService } from '../services/taskService.js';

/**
 * Рендер поля ввода задачи
 * @param {string} areaId
 * @returns {HTMLElement}
 */
export function renderTaskInput(areaId) {
    const wrapper = createElement('div', { className: 'area__input-wrapper' });

    const input = createElement('input', {
        className: 'area__input',
        attrs: {
            type: 'text',
            placeholder: getPlaceholder(areaId),
            'aria-label': 'Новая задача',
        },
    });

    input.addEventListener('keydown', async (e) => {
        if (e.key === 'Enter' && input.value.trim()) {
            e.preventDefault();
            const text = input.value;
            input.value = '';
            await taskService.createFromText(text, areaId);
        }
    });

    wrapper.appendChild(input);
    return wrapper;
}

function getPlaceholder(areaId) {
    switch (areaId) {
        case 'today': return '+ Добавить на сегодня...';
        case 'tomorrow': return '+ Добавить на завтра...';
        case 'chaos': return '+ Бросить в хаос...';
        case 'future': return '+ Запланировать...';
        default: return '+ Новая задача...';
    }
}
