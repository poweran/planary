/**
 * Планарий — Главный контроллер приложения
 */

import { initDefaultAreas } from './core/db.js';
import { router } from './core/router.js';
import { Header } from './components/Header.js';
import { PlanningBoard } from './components/PlanningBoard.js';
import { ArchiveView } from './components/ArchiveView.js';
import { AchievementsView } from './components/AchievementsView.js';
import { initToasts } from './components/Toast.js';
import { midnightService } from './services/midnightService.js';
import { achievementService } from './services/achievementService.js';
import { reminderService } from './services/reminderService.js';
import { $ } from './utils/dom.js';

export class App {
    constructor() {
        this.header = new Header();
        this.board = null;
    }

    async init() {
        const appEl = $('#app');

        // Инициализация области по умолчанию в БД
        await initDefaultAreas();

        // Header
        await this.header.init();
        const headerEl = await this.header.render();
        appEl.appendChild(headerEl);

        // Main content container
        const main = document.createElement('main');
        main.className = 'main-content';
        main.style.flex = '1';
        main.style.display = 'flex';
        main.style.flexDirection = 'column';
        main.style.overflow = 'hidden';
        appEl.appendChild(main);

        // Routing
        router
            .route('#/', async () => {
                main.innerHTML = '';
                this.board = new PlanningBoard(main);
                await this.board.init();
            })
            .route('#/archive', async () => {
                main.innerHTML = '';
                const archiveView = new ArchiveView(main);
                await archiveView.init();
            })
            .route('#/achievements', async () => {
                main.innerHTML = '';
                const achievementsView = new AchievementsView(main);
                await achievementsView.init();
            })
            .route('#/settings', () => {
                main.innerHTML = '<div style="padding: 2rem; text-align: center; color: var(--color-text-tertiary);">⚙️ Настройки — скоро</div>';
            });

        // Тосты
        initToasts();

        // Достижения
        achievementService.startListening();

        // Напоминания
        await reminderService.start();

        // Midnight service
        await midnightService.start();

        // Запуск роутера
        router.start();
    }
}
