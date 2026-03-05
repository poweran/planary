/**
 * Планарий — Кнопка управления тегами в шапке
 * Открывает раздел #/tags (как остальные навигационные кнопки)
 */

import { createElement } from '../utils/dom.js';

export class TagManager {
    render() {
        const link = createElement('a', {
            className: 'header__nav-link',
            attrs: { href: '#/tags', title: 'Управление тегами' },
            text: '🏷️',
        });

        link.addEventListener('click', (e) => {
            if (window.location.hash === '#/tags') {
                e.preventDefault();
                window.location.hash = '#/';
            }
        });

        return link;
    }
}
