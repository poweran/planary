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

    /**
     * Показать/скрыть виджет таймера
     */
    toggle(taskTitle = null) {
        if (this._widget) {
            this.close();
            return;
        }
        this._taskTitle = taskTitle;
        this._mode = MODES[0];
        this._remaining = this._mode.duration;
        this._running = false;
        this._render();
    }

    close() {
        this.stop();
        if (this._widget) {
            this._widget.remove();
            this._widget = null;
        }
    }

    start() {
        if (this._running) return;
        this._initAudio();
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

    _render() {
        this._widget = createElement('div', { className: 'focus-timer' });

        // Header
        const header = createElement('div', { className: 'focus-timer__header' });
        header.appendChild(createElement('span', { text: '🍅 Фокус' }));
        if (this._taskTitle) {
            header.appendChild(createElement('span', {
                className: 'focus-timer__task',
                text: this._taskTitle,
            }));
        }
        const closeBtn = createElement('button', {
            className: 'focus-timer__close',
            text: '✕',
        });
        closeBtn.addEventListener('click', () => this.close());
        header.appendChild(closeBtn);
        this._widget.appendChild(header);

        // Mode tabs
        const tabs = createElement('div', { className: 'focus-timer__modes' });
        for (const mode of MODES) {
            const tab = createElement('button', {
                className: `focus-timer__mode${this._mode.id === mode.id ? ' focus-timer__mode--active' : ''}`,
                text: mode.label,
            });
            tab.addEventListener('click', () => {
                this._switchMode(mode);
                // Re-render tabs
                tabs.querySelectorAll('.focus-timer__mode').forEach(t => t.classList.remove('focus-timer__mode--active'));
                tab.classList.add('focus-timer__mode--active');
            });
            tabs.appendChild(tab);
        }
        this._widget.appendChild(tabs);

        // Display
        this._displayEl = createElement('div', { className: 'focus-timer__display' });
        this._widget.appendChild(this._displayEl);

        // Controls
        const controls = createElement('div', { className: 'focus-timer__controls' });

        this._playBtn = createElement('button', {
            className: 'focus-timer__btn focus-timer__btn--play',
            text: '▶',
        });
        this._playBtn.addEventListener('click', () => {
            if (this._running) {
                this.stop();
            } else {
                this.start();
            }
        });

        const resetBtn = createElement('button', {
            className: 'focus-timer__btn',
            text: '↺',
        });
        resetBtn.addEventListener('click', () => this.reset());

        controls.appendChild(this._playBtn);
        controls.appendChild(resetBtn);
        this._widget.appendChild(controls);

        this._updateDisplay();

        document.body.appendChild(this._widget);
    }

    _updateDisplay() {
        if (!this._displayEl) return;

        const mins = Math.floor(this._remaining / 60);
        const secs = this._remaining % 60;
        this._displayEl.textContent = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;

        if (this._playBtn) {
            this._playBtn.textContent = this._running ? '⏸' : '▶';
        }
    }
}

export const focusTimer = new FocusTimer();
