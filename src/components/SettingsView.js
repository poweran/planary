/**
 * Планарий — Страница настроек
 */

import { createElement } from '../utils/dom.js';
import { exportService } from '../services/exportService.js';
import { events, Events } from '../core/events.js';
import { initDefaultAreas } from '../core/db.js';

export class SettingsView {
    constructor(containerEl) {
        this.container = containerEl;
    }

    async init() {
        await this.render();
    }

    async render() {
        this.container.innerHTML = '';

        const wrapper = createElement('div', { className: 'settings-view' });

        // Заголовок
        wrapper.appendChild(createElement('h2', {
            className: 'settings-view__title',
            text: '⚙️ Настройки',
        }));

        // ── Секция: Данные ──
        const dataSection = this._createSection('📦 Данные', [
            this._createAction('Экспорт JSON', 'Полный бэкап всех данных (задачи, теги, области, достижения)', '💾', async () => {
                await exportService.exportJSON();
                events.emit(Events.TOAST, '💾 Данные экспортированы в JSON');
            }),
            this._createAction('Экспорт CSV', 'Таблица задач для Excel / Google Sheets', '📊', async () => {
                await exportService.exportCSV();
                events.emit(Events.TOAST, '📊 Задачи экспортированы в CSV');
            }),
            this._createFileAction('Импорт JSON', 'Восстановить данные из бэкапа', '📥', async (file) => {
                try {
                    await exportService.importJSON(file);
                    events.emit(Events.TOAST, '✅ Данные успешно импортированы!');
                    // Перезагрузка для применения
                    setTimeout(() => location.reload(), 1000);
                } catch (e) {
                    events.emit(Events.TOAST, `❌ Ошибка импорта: ${e.message}`);
                }
            }),
        ]);
        wrapper.appendChild(dataSection);

        // ── Секция: Опасная зона ──
        const dangerSection = this._createSection('⚠️ Опасная зона', [
            this._createAction('Очистить все данные', 'Удалить все задачи, теги, достижения и настройки', '🗑️', async () => {
                const confirmed = confirm('Вы уверены? Это действие удалит ВСЕ данные без возможности восстановления.');
                if (!confirmed) return;
                const doubleCheck = confirm('Точно удалить? Рекомендуем сначала сделать бэкап (Экспорт JSON).');
                if (!doubleCheck) return;

                await exportService.clearAll();
                await initDefaultAreas();
                events.emit(Events.TOAST, '🗑️ Все данные удалены');
                setTimeout(() => location.reload(), 1000);
            }, true),
        ]);
        wrapper.appendChild(dangerSection);

        // ── Секция: О приложении ──
        const aboutSection = this._createSection('🦎 О приложении', []);
        const aboutContent = createElement('div', { className: 'settings-about' });
        aboutContent.innerHTML = `
            <p><strong>Планарий</strong> — визуальный планировщик времени</p>
            <p>Версия 2.0 · Privacy-first · Все данные хранятся локально</p>
            <p>
                <a href="https://github.com/poweran/planary" target="_blank" rel="noopener" class="settings-link">
                    GitHub →
                </a>
            </p>
        `;
        aboutSection.appendChild(aboutContent);
        wrapper.appendChild(aboutSection);

        this.container.appendChild(wrapper);
    }

    _createSection(title, actions) {
        const section = createElement('div', { className: 'settings-section' });
        section.appendChild(createElement('h3', {
            className: 'settings-section__title',
            text: title,
        }));

        for (const action of actions) {
            section.appendChild(action);
        }

        return section;
    }

    _createAction(title, description, icon, onClick, isDanger = false) {
        const row = createElement('div', {
            className: `settings-action${isDanger ? ' settings-action--danger' : ''}`,
        });

        const info = createElement('div', { className: 'settings-action__info' });
        info.appendChild(createElement('div', {
            className: 'settings-action__title',
            text: title,
        }));
        info.appendChild(createElement('div', {
            className: 'settings-action__desc',
            text: description,
        }));

        const btn = createElement('button', {
            className: `btn ${isDanger ? 'btn--danger' : 'btn--secondary'}`,
            text: `${icon} ${title}`,
        });
        btn.addEventListener('click', onClick);

        row.appendChild(info);
        row.appendChild(btn);

        return row;
    }

    _createFileAction(title, description, icon, onFile) {
        const row = createElement('div', { className: 'settings-action' });

        const info = createElement('div', { className: 'settings-action__info' });
        info.appendChild(createElement('div', {
            className: 'settings-action__title',
            text: title,
        }));
        info.appendChild(createElement('div', {
            className: 'settings-action__desc',
            text: description,
        }));

        const fileInput = createElement('input', {
            attrs: { type: 'file', accept: '.json' },
            style: { display: 'none' },
        });
        fileInput.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file) onFile(file);
        });

        const btn = createElement('button', {
            className: 'btn btn--secondary',
            text: `${icon} ${title}`,
        });
        btn.addEventListener('click', () => fileInput.click());

        row.appendChild(info);
        row.appendChild(btn);
        row.appendChild(fileInput);

        return row;
    }
}
