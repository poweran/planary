/**
 * Планарий — Pomodoro фокус-таймер
 */

import { createElement } from '../utils/dom.js';
import { events, Events } from '../core/events.js';

const MODES = [
    { id: 'work', label: '🍅 Работа', duration: 25 * 60 },
    { id: 'short', label: '☕ Перерыв', duration: 5 * 60 },
    { id: 'long', label: '😌 Длинный перерыв', duration: 15 * 60 },
];

class FocusTimer {
    constructor() {
        this._interval = null;
        this._remaining = 0;
        this._mode = MODES[0];
        this._running = false;
        this._widget = null;
        this._taskTitle = null;
        this._audioCtx = null;
    }

    _initAudio() {
        try {
            if (!this._audioCtx) {
                const AudioContext = window.AudioContext || window.webkitAudioContext;
                if (AudioContext) {
                    this._audioCtx = new AudioContext();
                }
            }
            if (this._audioCtx && this._audioCtx.state === 'suspended') {
                this._audioCtx.resume();
            }
        } catch (e) {
            console.warn('Audio init error:', e);
        }
    }

    _playAlertSound() {
        if (!this._audioCtx) return;
        try {
            const playBeep = (time) => {
                const osc = this._audioCtx.createOscillator();
                const gain = this._audioCtx.createGain();
                osc.connect(gain);
                gain.connect(this._audioCtx.destination);
                osc.type = 'sine';
                osc.frequency.setValueAtTime(800, time);
                gain.gain.setValueAtTime(0, time);
                gain.gain.linearRampToValueAtTime(0.5, time + 0.05);
                gain.gain.exponentialRampToValueAtTime(0.01, time + 0.3);
                osc.start(time);
                osc.stop(time + 0.3);
            };
            const now = this._audioCtx.currentTime;
            playBeep(now);
            playBeep(now + 0.3);
            playBeep(now + 0.6);
        } catch (e) {
            console.warn('Audio play error:', e);
        }
    }

    start() {
        if (this._running) return;
        this._initAudio();

        if ('Notification' in window && Notification.permission === 'default') {
            Notification.requestPermission();
        }

        this._running = true;
        this._interval = setInterval(() => {
            this._remaining--;
            if (this._remaining <= 0) {
                this._onComplete();
            }
            this._updateDisplay();
        }, 1000);
        this._updateDisplay();
    }

    stop() {
        this._running = false;
        if (this._interval) {
            clearInterval(this._interval);
            this._interval = null;
        }
        this._updateDisplay();
    }

    reset() {
        this.stop();
        this._remaining = this._mode.duration;
        this._updateDisplay();
    }

    _switchMode(mode) {
        this.stop();
        this._mode = mode;
        this._remaining = mode.duration;
        this._updateDisplay();
    }

    _onComplete() {
        this.stop();

        this._playAlertSound();

        // Уведомление
        if (Notification.permission === 'granted') {
            new Notification(`🍅 ${this._mode.label} завершён!`, {
                body: this._taskTitle || 'Планарий',
                icon: '/planary/icon-192.png',
            });
        }

        events.emit(Events.TOAST, `🍅 ${this._mode.label} завершён!`);

        // Авто-переключение: Работа → Перерыв → Работа
        const nextIdx = (MODES.indexOf(this._mode) + 1) % MODES.length;
        this._mode = MODES[nextIdx];
        this._remaining = this._mode.duration;
        this._updateDisplay();
    }

    /**
     * Создать и вернуть DOM-элемент таймера для страницы
     */
    renderView(taskTitle = null) {
        if (taskTitle) {
            this._taskTitle = taskTitle;
        }

        // Если таймер не запущен и время кончилось, сбросим
        if (!this._running && this._remaining <= 0) {
            this._remaining = this._mode.duration;
        }

        this._widget = createElement('div', { className: 'pomodoro-view' });

        // Header
        const header = createElement('div', { className: 'pomodoro-view__header' });
        header.appendChild(createElement('span', { text: '🍅 Фокус' }));
        if (this._taskTitle) {
            header.appendChild(createElement('span', {
                className: 'pomodoro-view__task',
                text: this._taskTitle,
            }));
        }
        this._widget.appendChild(header);

        // Mode tabs
        const tabs = createElement('div', { className: 'pomodoro-view__modes' });
        for (const mode of MODES) {
            const tab = createElement('button', {
                className: `pomodoro-view__mode${this._mode.id === mode.id ? ' pomodoro-view__mode--active' : ''}`,
                text: mode.label,
            });
            tab.addEventListener('click', () => {
                this._switchMode(mode);
                tabs.querySelectorAll('.pomodoro-view__mode').forEach(t => t.classList.remove('pomodoro-view__mode--active'));
                tab.classList.add('pomodoro-view__mode--active');
            });
            tabs.appendChild(tab);
        }
        this._widget.appendChild(tabs);

        // Display
        this._displayContainer = createElement('div', { className: `pomodoro-view__display-container${this._running ? ' pomodoro-view__display-container--running' : ''}` });
        this._displayEl = createElement('div', { className: 'pomodoro-view__display' });
        this._displayContainer.appendChild(this._displayEl);
        this._widget.appendChild(this._displayContainer);

        // Controls
        const controls = createElement('div', { className: 'pomodoro-view__controls' });

        this._playBtn = createElement('button', {
            className: 'pomodoro-view__btn pomodoro-view__btn--play',
            text: this._running ? '⏸' : '▶',
        });
        this._playBtn.addEventListener('click', () => {
            if (this._running) {
                this.stop();
            } else {
                this.start();
            }
        });

        const resetBtn = createElement('button', {
            className: 'pomodoro-view__btn',
            text: '↺',
        });
        resetBtn.addEventListener('click', () => this.reset());

        controls.appendChild(this._playBtn);
        controls.appendChild(resetBtn);
        this._widget.appendChild(controls);

        this._updateDisplay();

        return this._widget;
    }

    _updateDisplay() {
        if (!this._displayEl) return;

        const mins = Math.floor(this._remaining / 60);
        const secs = this._remaining % 60;
        this._displayEl.textContent = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;

        if (this._playBtn) {
            this._playBtn.textContent = this._running ? '⏸' : '▶';
        }

        if (this._displayContainer) {
            if (this._running) {
                this._displayContainer.classList.add('pomodoro-view__display-container--running');
            } else {
                this._displayContainer.classList.remove('pomodoro-view__display-container--running');
            }
        }
    }
}

export const focusTimer = new FocusTimer();

