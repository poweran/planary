/**
 * Планарий — Модель достижения (заготовка для Этапа 2)
 */

export const ACHIEVEMENT_TYPES = {
    FIRST_TASK: 'first_task',
    TEN_TASKS: 'ten_tasks',
    HUNDRED_TASKS: 'hundred_tasks',
    WEEK_STREAK: 'week_streak',
    MONTH_STREAK: 'month_streak',
    ALL_FROGS: 'all_frogs',
    CHAOS_MASTER: 'chaos_master',
};

export const ACHIEVEMENT_DEFS = {
    [ACHIEVEMENT_TYPES.FIRST_TASK]: {
        title: 'Первый шаг',
        description: 'Создать первую задачу',
        icon: '🌱',
    },
    [ACHIEVEMENT_TYPES.TEN_TASKS]: {
        title: 'Десятка',
        description: 'Завершить 10 задач',
        icon: '🎯',
    },
    [ACHIEVEMENT_TYPES.HUNDRED_TASKS]: {
        title: 'Сотня',
        description: 'Завершить 100 задач',
        icon: '💯',
    },
    [ACHIEVEMENT_TYPES.WEEK_STREAK]: {
        title: 'Неделька',
        description: '7 дней подряд с завершёнными задачами',
        icon: '🔥',
    },
    [ACHIEVEMENT_TYPES.MONTH_STREAK]: {
        title: 'Марафонец',
        description: '30 дней подряд',
        icon: '🏆',
    },
    [ACHIEVEMENT_TYPES.ALL_FROGS]: {
        title: 'Лягушатник',
        description: 'Завершить все задачи с тегом «лягушки»',
        icon: '🐸',
    },
    [ACHIEVEMENT_TYPES.CHAOS_MASTER]: {
        title: 'Повелитель хаоса',
        description: 'Перемешать хаос 50 раз',
        icon: '🌀',
    },
};
