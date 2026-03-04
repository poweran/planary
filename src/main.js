/**
 * 🦎 Планарий — Точка входа
 * Визуальный планировщик времени
 */

import './styles/index.css';
import { App } from './app.js';

const app = new App();

app.init().catch((err) => {
    console.error('Планарий: ошибка инициализации', err);
    document.getElementById('app').innerHTML = `
    <div style="display:flex;align-items:center;justify-content:center;min-height:100dvh;padding:2rem;text-align:center;font-family:Inter,sans-serif;">
      <div>
        <div style="font-size:3rem;margin-bottom:1rem;">🦎</div>
        <h1 style="margin-bottom:0.5rem;">Что-то пошло не так</h1>
        <p style="color:#666;">Попробуйте перезагрузить страницу</p>
        <pre style="margin-top:1rem;text-align:left;background:#f5f5f5;padding:1rem;border-radius:8px;font-size:12px;overflow:auto;max-width:400px;">${err.message}</pre>
      </div>
    </div>
  `;
});
