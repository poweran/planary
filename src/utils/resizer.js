/**
 * Планарий — Resizer (гибкие границы областей)
 * Desktop: перетаскивание границ
 * Mobile: аккордеон
 */

import db from '../core/db.js';

/**
 * Инициализация ресайзера на desktop
 * Работает через CSS grid и fr-единицы
 */
export function initResizers(boardEl) {
    if (window.innerWidth < 768) return;

    const areas = boardEl.querySelectorAll('.area');
    if (areas.length < 2) return;

    boardEl.style.position = 'relative';

    // Горизонтальный ресайзер
    const hResizer = document.createElement('div');
    hResizer.className = 'area-resizer area-resizer--horizontal';

    // Вертикальный ресайзер
    const vResizer = document.createElement('div');
    vResizer.className = 'area-resizer area-resizer--vertical';

    Object.assign(hResizer.style, {
        position: 'absolute',
        left: '0',
        right: '0',
        height: '10px',
        zIndex: '10',
        cursor: 'row-resize',
        transform: 'translateY(-50%)',
    });

    Object.assign(vResizer.style, {
        position: 'absolute',
        top: '0',
        bottom: '0',
        width: '10px',
        zIndex: '10',
        cursor: 'col-resize',
        transform: 'translateX(-50%)',
    });

    boardEl.appendChild(hResizer);
    boardEl.appendChild(vResizer);

    function updateResizerPositions() {
        const rows = getRowSizes(boardEl);
        if (rows.length >= 2) {
            const hRatio = rows[0];
            hResizer.style.top = `${hRatio * 100}%`;
        }

        const cols = getColSizes(boardEl);
        if (cols.length >= 2) {
            const vRatio = cols[0];
            vResizer.style.left = `${vRatio * 100}%`;
        }
    }

    // Слушаем изменение размеров окна, чтобы обновлять позиции при необходимости
    const resizeObserver = new ResizeObserver(() => {
        updateResizerPositions();
    });
    resizeObserver.observe(boardEl);

    // Первичное обновление
    // Нужно немного подождать, чтобы grid отрисовался
    requestAnimationFrame(() => updateResizerPositions());

    // --- Логика горизонтального ресайза ---
    let startY = 0;
    let startHRowSizes = [];

    hResizer.addEventListener('mousedown', (e) => {
        e.preventDefault();
        startY = e.clientY;
        hResizer.classList.add('area-resizer--active');
        startHRowSizes = getRowSizes(boardEl);
        document.addEventListener('mousemove', onHMove);
        document.addEventListener('mouseup', onHEnd);
    });

    function onHMove(e) {
        const delta = e.clientY - startY;
        const totalHeight = boardEl.clientHeight;
        const ratioDelta = delta / totalHeight;

        let newRow1 = startHRowSizes[0] + ratioDelta;
        newRow1 = Math.max(0.1, Math.min(0.9, newRow1));
        const newRow2 = 1 - newRow1;

        boardEl.style.gridTemplateRows = `${newRow1}fr ${newRow2}fr`;
        updateResizerPositions();
    }

    function onHEnd() {
        hResizer.classList.remove('area-resizer--active');
        document.removeEventListener('mousemove', onHMove);
        document.removeEventListener('mouseup', onHEnd);
        saveGridSizes(boardEl);
    }

    // --- Логика вертикального ресайза ---
    let startX = 0;
    let startColSizes = [];

    vResizer.addEventListener('mousedown', (e) => {
        e.preventDefault();
        startX = e.clientX;
        vResizer.classList.add('area-resizer--active');
        startColSizes = getColSizes(boardEl);
        document.addEventListener('mousemove', onVMove);
        document.addEventListener('mouseup', onVEnd);
    });

    function onVMove(e) {
        const delta = e.clientX - startX;
        const totalWidth = boardEl.clientWidth;
        const ratioDelta = delta / totalWidth;

        let newCol1 = startColSizes[0] + ratioDelta;
        newCol1 = Math.max(0.1, Math.min(0.9, newCol1));
        const newCol2 = 1 - newCol1;

        boardEl.style.gridTemplateColumns = `${newCol1}fr ${newCol2}fr`;
        updateResizerPositions();
    }

    function onVEnd() {
        vResizer.classList.remove('area-resizer--active');
        document.removeEventListener('mousemove', onVMove);
        document.removeEventListener('mouseup', onVEnd);
        saveGridSizes(boardEl);
    }
}

function getRowSizes(boardEl) {
    const computed = getComputedStyle(boardEl);
    const rows = computed.gridTemplateRows.split(' ').map(parseFloat).filter(v => !isNaN(v));
    const total = rows.reduce((sum, r) => sum + r, 0);
    return total > 0 ? rows.map(r => r / total) : [0.5, 0.5];
}

function getColSizes(boardEl) {
    const computed = getComputedStyle(boardEl);
    const cols = computed.gridTemplateColumns.split(' ').map(parseFloat).filter(v => !isNaN(v));
    const total = cols.reduce((sum, c) => sum + c, 0);
    return total > 0 ? cols.map(c => c / total) : [0.5, 0.5];
}

async function saveGridSizes(boardEl) {
    const computed = getComputedStyle(boardEl);
    try {
        await db.settings.put({
            key: 'gridSizes',
            value: {
                rows: computed.gridTemplateRows,
                cols: computed.gridTemplateColumns,
            },
        });
    } catch (e) {
        // Ignore save errors
    }
}

/**
 * Восстановление сохранённых размеров
 */
export async function restoreGridSizes(boardEl) {
    if (window.innerWidth < 768) return;

    try {
        const setting = await db.settings.get('gridSizes');
        if (setting?.value) {
            if (setting.value.rows) boardEl.style.gridTemplateRows = setting.value.rows;
            if (setting.value.cols) boardEl.style.gridTemplateColumns = setting.value.cols;
        }
    } catch (e) {
        // Ignore restore errors
    }
}
