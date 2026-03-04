/**
 * Планарий — Touch + Mouse Drag & Drop
 * Единая система для мобильных и десктопных
 */

let activeDrag = null;
let ghostEl = null;
let globalIndicatorEl = null;
let currentDropTarget = null;
let startPos = { x: 0, y: 0 };
let isDragging = false;
const DRAG_THRESHOLD = 2; // px до начала перетаскивания

/**
 * Регистрация перетаскиваемого элемента
 */
export function makeDraggable(element, options = {}) {
    const {
        onDragStart,
        onDragEnd,
        data = {},
        handle = null, // CSS-селектор хэндла
    } = options;

    const handleEl = handle ? element.querySelector(handle) : element;
    if (!handleEl) return;

    // Mouse
    handleEl.addEventListener('mousedown', (e) => {
        if (e.button !== 0) return;
        if (e.target.closest('input, button, .task-card__checkbox')) return;
        e.preventDefault();
        initDrag(e.clientX, e.clientY, element, data, onDragStart, onDragEnd);
    });

    // Touch
    handleEl.addEventListener('touchstart', (e) => {
        if (e.touches.length !== 1) return;
        if (e.target.closest('input, button, .task-card__checkbox')) return;
        const touch = e.touches[0];
        initDrag(touch.clientX, touch.clientY, element, data, onDragStart, onDragEnd);
    }, { passive: true });
}

function initDrag(x, y, element, data, onDragStart, onDragEnd) {
    startPos = { x, y };
    isDragging = false;

    activeDrag = {
        element,
        data,
        onDragStart,
        onDragEnd,
    };

    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onEnd);
    document.addEventListener('touchmove', onTouchMove, { passive: false });
    document.addEventListener('touchend', onTouchEnd);
    document.addEventListener('touchcancel', onTouchEnd);
}

function onMove(e) {
    handleMove(e.clientX, e.clientY);
}

function onTouchMove(e) {
    if (!activeDrag) return;
    if (isDragging) e.preventDefault();
    const touch = e.touches[0];
    handleMove(touch.clientX, touch.clientY);
}

function handleMove(x, y) {
    if (!activeDrag) return;

    if (!isDragging) {
        const dist = Math.sqrt((x - startPos.x) ** 2 + (y - startPos.y) ** 2);
        if (dist < DRAG_THRESHOLD) return;

        isDragging = true;
        activeDrag.element.classList.add('task-card--dragging');

        // Создаём призрак
        createGhost(activeDrag.element, x, y);

        // Haptic feedback
        if (navigator.vibrate) navigator.vibrate(10);

        if (activeDrag.onDragStart) {
            activeDrag.onDragStart(activeDrag.data);
        }
    }

    // Двигаем призрак
    if (ghostEl) {
        ghostEl.style.left = `${x - ghostEl._offsetX}px`;
        ghostEl.style.top = `${y - ghostEl._offsetY}px`;
    }

    // Проверяем drop-зоны
    updateDropTarget(x, y);
}

function onEnd() {
    handleEnd();
}

function onTouchEnd() {
    handleEnd();
}

function handleEnd() {
    document.removeEventListener('mousemove', onMove);
    document.removeEventListener('mouseup', onEnd);
    document.removeEventListener('touchmove', onTouchMove);
    document.removeEventListener('touchend', onTouchEnd);
    document.removeEventListener('touchcancel', onTouchEnd);

    if (activeDrag) {
        activeDrag.element.classList.remove('task-card--dragging');

        if (isDragging && activeDrag.onDragEnd) {
            activeDrag.onDragEnd(activeDrag.data, currentDropTarget);
        }
    }

    if (currentDropTarget) {
        if (globalIndicatorEl) {
            globalIndicatorEl.style.display = 'none';
        }
    }

    removeGhost();
    activeDrag = null;
    currentDropTarget = null;
    isDragging = false;
}

function getIndicator() {
    if (!globalIndicatorEl) {
        globalIndicatorEl = document.createElement('div');
        document.body.appendChild(globalIndicatorEl);
    }
    return globalIndicatorEl;
}

function createGhost(sourceEl, x, y) {
    ghostEl = sourceEl.cloneNode(true);
    ghostEl.classList.add('task-card--ghost');
    ghostEl.classList.remove('task-card--dragging');
    ghostEl.classList.remove('task-card--new');
    const rect = sourceEl.getBoundingClientRect();
    ghostEl._offsetX = x - rect.left;
    ghostEl._offsetY = y - rect.top;

    // Set explicit width to prevent shrinking
    ghostEl.style.width = `${sourceEl.offsetWidth}px`;
    ghostEl.style.height = `${sourceEl.offsetHeight}px`;

    ghostEl.style.left = `${x - ghostEl._offsetX}px`;
    ghostEl.style.top = `${y - ghostEl._offsetY}px`;
    document.body.appendChild(ghostEl);
}

function removeGhost() {
    if (ghostEl && ghostEl.parentNode) {
        ghostEl.parentNode.removeChild(ghostEl);
    }
    ghostEl = null;
}

function updateDropTarget(x, y) {
    const el = document.elementFromPoint(x, y);

    if (!el) return;

    const cardEl = el.closest('.task-card:not(.task-card--dragging)');
    const areaEl = el.closest('.area');

    let found = null;

    if (cardEl) {
        const rect = cardEl.getBoundingClientRect();
        const relY = y - rect.top;
        let position = 'inside';

        if (relY < rect.height * 0.25) {
            position = 'before';
        } else if (relY > rect.height * 0.75) {
            position = 'after';
        }

        found = {
            element: cardEl,
            data: {
                type: 'task',
                taskId: Number(cardEl.dataset.taskId),
                areaId: cardEl.dataset.areaId,
                position
            }
        };
    } else if (areaEl) {
        found = {
            element: areaEl,
            data: {
                type: 'area',
                areaId: areaEl.dataset.areaId
            }
        };
    }

    if (!currentDropTarget || found?.element !== currentDropTarget.element || found?.data.position !== currentDropTarget.data.position) {
        const ind = getIndicator();
        if (found) {
            const rect = found.element.getBoundingClientRect();
            ind.style.display = 'block';

            if (found.data.type === 'area') {
                ind.className = 'global-drop-indicator global-drop-indicator--area';
                ind.style.left = rect.left + 'px';
                ind.style.top = rect.top + 'px';
                ind.style.width = rect.width + 'px';
                ind.style.height = rect.height + 'px';
            } else {
                if (found.data.position === 'inside') {
                    ind.className = 'global-drop-indicator global-drop-indicator--inside';
                    ind.style.left = rect.left + 'px';
                    ind.style.top = rect.top + 'px';
                    ind.style.width = rect.width + 'px';
                    ind.style.height = rect.height + 'px';
                } else if (found.data.position === 'before') {
                    ind.className = 'global-drop-indicator global-drop-indicator--line';
                    ind.style.left = rect.left + 'px';
                    ind.style.top = (rect.top - 2) + 'px';
                    ind.style.width = rect.width + 'px';
                    ind.style.height = '4px';
                } else if (found.data.position === 'after') {
                    ind.className = 'global-drop-indicator global-drop-indicator--line';
                    ind.style.left = rect.left + 'px';
                    ind.style.top = (rect.bottom - 2) + 'px';
                    ind.style.width = rect.width + 'px';
                    ind.style.height = '4px';
                }
            }
        } else {
            ind.style.display = 'none';
        }
        currentDropTarget = found;
    }
}

/**
 * Очистка всех drop-зон (no-op, оставлен для обратной совместимости)
 */
export function clearDropTargets() {
    // Больше не используется, находим цели динамически
}
