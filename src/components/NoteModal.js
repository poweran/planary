/**
 * Планарий — Заметка к задаче (встроенная расширяемая панель)
 */

import { createElement } from '../utils/dom.js';
import { parseMarkdown } from '../utils/markdown.js';
import { taskService } from '../services/taskService.js';
import { events, Events } from '../core/events.js';

/**
 * Открыть панель заметки к задаче
 * @param {Object} task
 */
export function openNoteModal(task) {
    // Убираем предыдущую
    const old = document.querySelector('.note-modal-overlay');
    if (old) old.remove();

    const overlay = createElement('div', { className: 'note-modal-overlay' });

    const modal = createElement('div', { className: 'note-modal' });

    // Header — компактный
    const header = createElement('div', { className: 'note-modal__header' });

    const titleEl = createElement('div', {
        className: 'note-modal__title',
        text: task.title,
    });
    header.appendChild(titleEl);

    const closeBtn = createElement('button', {
        className: 'note-modal__close',
        text: '✕',
    });
    closeBtn.addEventListener('click', () => overlay.remove());
    header.appendChild(closeBtn);

    modal.appendChild(header);

    // Текстовое поле
    const textarea = createElement('textarea', {
        className: 'note-modal__editor',
        attrs: {
            placeholder: 'Заметка… (поддерживается Markdown), например:\n' +
                '  **жирный** *курсив* `код`\n' +
                '  - пункт1\n' +
                '  - пункт2\n' +
                '  [название ссылки](адрес ссылки)',
        },
    });
    textarea.value = task.note || '';
    modal.appendChild(textarea);

    // Превью под полем (живое)
    const preview = createElement('div', {
        className: 'note-modal__preview markdown-body',
    });

    function updatePreview() {
        const val = textarea.value.trim();
        if (val) {
            preview.innerHTML = parseMarkdown(val);
            preview.style.display = '';
        } else {
            preview.style.display = 'none';
        }
    }

    textarea.addEventListener('input', updatePreview);
    updatePreview();
    modal.appendChild(preview);

    // Подсказка + кнопки
    const footer = createElement('div', { className: 'note-modal__footer' });

    const actions = createElement('div', { className: 'note-modal__actions' });

    // Удалить заметку
    if (task.note) {
        const clearBtn = createElement('button', {
            className: 'note-modal__btn note-modal__btn--ghost',
            text: 'Очистить',
        });
        clearBtn.addEventListener('click', async () => {
            textarea.value = '';
            await taskService.update(task.id, { note: '' });
            events.emit(Events.TASK_UPDATED, { ...task, note: '' });
            overlay.remove();
        });
        actions.appendChild(clearBtn);
    }

    const saveBtn = createElement('button', {
        className: 'note-modal__btn note-modal__btn--primary',
        text: 'Сохранить',
    });
    saveBtn.addEventListener('click', async () => {
        await taskService.update(task.id, { note: textarea.value });
        events.emit(Events.TASK_UPDATED, { ...task, note: textarea.value });
        overlay.remove();
    });
    actions.appendChild(saveBtn);

    footer.appendChild(actions);
    modal.appendChild(footer);

    overlay.appendChild(modal);
    document.body.appendChild(overlay);

    // Закрытие по оверлею
    overlay.addEventListener('click', (e) => {
        if (e.target === overlay) overlay.remove();
    });

    // ESC
    const escHandler = (e) => {
        if (e.key === 'Escape') {
            overlay.remove();
            document.removeEventListener('keydown', escHandler);
        }
    };
    document.addEventListener('keydown', escHandler);

    // Ctrl/Cmd+Enter = сохранить
    textarea.addEventListener('keydown', async (e) => {
        if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
            e.preventDefault();
            await taskService.update(task.id, { note: textarea.value });
            events.emit(Events.TASK_UPDATED, { ...task, note: textarea.value });
            overlay.remove();
        }
    });

    setTimeout(() => textarea.focus(), 50);
}
