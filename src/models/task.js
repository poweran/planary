/**
 * Планарий — Модель задачи
 */

export function createTask({
    title,
    note = '',
    areaId = 'today',
    parentId = null,
    color = null,
    tags = [],
    order = 0,
    reminderAt = null,
}) {
    return {
        title,
        note,
        areaId,
        parentId,
        color,
        tags,
        order,
        reminderAt,
        completed: false,
        completedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
    };
}

export const TASK_COLORS = [
    { id: 'red', value: '#E74C3C', label: 'Срочное' },
    { id: 'orange', value: '#F39C12', label: 'Важное' },
    { id: 'blue', value: '#3498DB', label: 'Обычное' },
    { id: 'green', value: '#27AE60', label: 'Лёгкое' },
    { id: 'purple', value: '#9B59B6', label: 'Творческое' },
    { id: 'pink', value: '#E91E63', label: 'Личное' },
];
