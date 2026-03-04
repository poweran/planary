/**
 * Планарий — Hash Router
 */

class Router {
    constructor() {
        this._routes = new Map();
        this._currentRoute = null;
        window.addEventListener('hashchange', () => this._handleChange());
    }

    /**
     * Регистрация маршрута
     * @param {string} path — например '#/' или '#/archive'
     * @param {Function} handler — callback при навигации
     */
    route(path, handler) {
        this._routes.set(path, handler);
        return this;
    }

    /**
     * Навигация
     */
    navigate(path) {
        window.location.hash = path;
    }

    /**
     * Запуск
     */
    start() {
        this._handleChange();
    }

    /**
     * Текущий маршрут
     */
    get current() {
        return this._currentRoute;
    }

    _handleChange() {
        const hash = window.location.hash || '#/';
        this._currentRoute = hash;

        const handler = this._routes.get(hash);
        if (handler) {
            handler();
        } else {
            // Fallback на главную
            const fallback = this._routes.get('#/');
            if (fallback) fallback();
        }
    }
}

export const router = new Router();
