/**
 * Планарий — Главный контроллер приложения
 */

import { initDefaultAreas } from './core/db.js';
import { router } from './core/router.js';
import { Header } from './components/Header.js';
import { PlanningBoard } from './components/PlanningBoard.js';
import { ArchiveView } from './components/ArchiveView.js';
import { AchievementsView } from './components/AchievementsView.js';
import { SettingsView } from './components/SettingsView.js';
import { StreakView } from './components/StreakView.js';
import { PomodoroView } from './components/PomodoroView.js';
import { TagsView } from './components/TagsView.js';
import { initToasts } from './components/Toast.js';
import { midnightService } from './services/midnightService.js';
import { achievementService } from './services/achievementService.js';
import { reminderService } from './services/reminderService.js';
import { keyboardService } from './services/keyboardService.js';
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
        main.style.minHeight = '0';
        main.style.minWidth = '0';
        main.style.width = '100%';
        main.style.height = '100%';
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
            .route('#/settings', async () => {
                main.innerHTML = '';
                const settingsView = new SettingsView(main);
                await settingsView.init();
            })
            .route('#/streak', async () => {
                main.innerHTML = '';
                const streakView = new StreakView(main);
                await streakView.init();
            })
            .route('#/pomodoro', async () => {
                main.innerHTML = '';
                const pomodoroView = new PomodoroView(main);
                await pomodoroView.init();
            })
            .route('#/tags', async () => {
                main.innerHTML = '';
                const tagsView = new TagsView(main);
                await tagsView.init();
            });

        // Тосты
        initToasts();

        // Достижения
        achievementService.startListening();

        // Напоминания
        await reminderService.start();

        // Клавиатурные шорткаты
        keyboardService.start();

        // Midnight service
        await midnightService.start();

        // Запуск роутера
        router.start();
    }
}
