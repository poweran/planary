/**
 * Планарий — DOM-хелперы
 */

/**
 * Создание элемента с классами и атрибутами
 */
export function createElement(tag, options = {}) {
    const el = document.createElement(tag);

    if (options.className) {
        el.className = options.className;
    }
    if (options.text) {
        el.textContent = options.text;
    }
    if (options.html) {
        el.innerHTML = options.html;
    }
    if (options.attrs) {
        for (const [key, value] of Object.entries(options.attrs)) {
            el.setAttribute(key, value);
        }
    }
    if (options.dataset) {
        for (const [key, value] of Object.entries(options.dataset)) {
            el.dataset[key] = value;
        }
    }
    if (options.style) {
        Object.assign(el.style, options.style);
    }
    if (options.children) {
        for (const child of options.children) {
            if (child) el.appendChild(child);
        }
    }
    if (options.events) {
        for (const [event, handler] of Object.entries(options.events)) {
            el.addEventListener(event, handler);
        }
    }

    return el;
}

/**
 * Сокращение для querySelector
 */
export function $(selector, parent = document) {
    return parent.querySelector(selector);
}

/**
 * Сокращение для querySelectorAll
 */
export function $$(selector, parent = document) {
    return [...parent.querySelectorAll(selector)];
}

/**
 * Очистка содержимого элемента
 */
export function clearElement(el) {
    while (el.firstChild) {
        el.removeChild(el.firstChild);
    }
}

/**
 * Простой SVG-рендер для иконок
 */
export function svgIcon(path, size = 16) {
    return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${path}</svg>`;
}

// Базовые SVG-пути для иконок
export const Icons = {
    monitor: '<rect x="2" y="3" width="20" height="14" rx="2" ry="2"></rect><line x1="8" y1="21" x2="16" y2="21"></line><line x1="12" y1="17" x2="12" y2="21"></line>',
    check: '<polyline points="20 6 9 17 4 12"></polyline>',
    plus: '<line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line>',
    trash: '<polyline points="3 6 5 6 21 6"></polyline><path d="m19 6-.867 12.142A2 2 0 0 1 16.138 20H7.862a2 2 0 0 1-1.995-1.858L5 6m5 0V4a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1v2"></path>',
    moreVertical: '<circle cx="12" cy="12" r="1"></circle><circle cx="12" cy="5" r="1"></circle><circle cx="12" cy="19" r="1"></circle>',
    shuffle: '<polyline points="16 3 21 3 21 8"></polyline><line x1="4" y1="20" x2="21" y2="3"></line><polyline points="21 16 21 21 16 21"></polyline><line x1="15" y1="15" x2="21" y2="21"></line><line x1="4" y1="4" x2="9" y2="9"></line>',
    sun: '<circle cx="12" cy="12" r="5"></circle><line x1="12" y1="1" x2="12" y2="3"></line><line x1="12" y1="21" x2="12" y2="23"></line><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line><line x1="1" y1="12" x2="3" y2="12"></line><line x1="21" y1="12" x2="23" y2="12"></line><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line>',
    moon: '<path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path>',
    chevronDown: '<polyline points="6 9 12 15 18 9"></polyline>',
    grip: '<circle cx="9" cy="5" r="1"></circle><circle cx="9" cy="12" r="1"></circle><circle cx="9" cy="19" r="1"></circle><circle cx="15" cy="5" r="1"></circle><circle cx="15" cy="12" r="1"></circle><circle cx="15" cy="19" r="1"></circle>',
    palette: '<circle cx="13.5" cy="6.5" r="0.5" fill="currentColor" stroke="none"></circle><circle cx="17.5" cy="10.5" r="0.5" fill="currentColor" stroke="none"></circle><circle cx="8.5" cy="7.5" r="0.5" fill="currentColor" stroke="none"></circle><circle cx="6.5" cy="12" r="0.5" fill="currentColor" stroke="none"></circle><path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.926 0 1.648-.746 1.648-1.688 0-.437-.18-.835-.437-1.125-.29-.289-.438-.652-.438-1.125a1.64 1.64 0 0 1 1.668-1.668h1.996c3.051 0 5.555-2.503 5.555-5.554C21.965 6.012 17.461 2 12 2z"></path>',
    edit: '<path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"></path>',
    x: '<line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line>',
};
