/**
 * Планарий — Обзор Pomodoro Таймера
 */

import { createElement } from '../utils/dom.js';
import { focusTimer } from './FocusTimer.js';

export class PomodoroView {
    constructor(containerEl) {
        this.container = containerEl;
    }

    async init() {
        await this.render();
    }

    async render() {
        this.container.innerHTML = '';
        this.container.appendChild(focusTimer.renderView());
    }
}
