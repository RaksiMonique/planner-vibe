export let state = JSON.parse(localStorage.getItem('secondBrainData')) || {
    tasks: [],
    bibleStudies: [],
    habits: [],
    segments: { God: [], Finance: [], Health: [], Leisure: [], Business: [] },
    routines: { morning: [], evening: [] },
    recipes: [],
    mealPlan: {},
    journal: {},
    quotes: []
};

// Backward compatibility
if (!state.journal) state.journal = {};
if (!state.quotes) state.quotes = [];

export const saveState = () => localStorage.setItem('secondBrainData', JSON.stringify(state));

export const setState = (newState) => {
    state = newState;
    saveState();
};

export function showToast(message, type = 'success') {
    const toastEl = document.getElementById('liveToast');
    const toastBody = document.getElementById('toast-body');
    
    toastBody.textContent = message;
    toastEl.className = `toast align-items-center border-0 text-white bg-${type === 'error' ? 'danger' : 'success'}`;
    
    const toast = new bootstrap.Toast(toastEl);
    toast.show();
}

export function getUrgencyStatus(task) {
    if (!task.dueDate) return 'No Date';
    const diff = (new Date(task.dueDate) - new Date()) / (1000 * 60 * 60 * 24);
    if (diff < 0) return 'Overdue';
    if (diff <= 1) return 'Today';
    if (diff <= 7) return 'This Week';
    return 'This Month';
}

export function calculateTotalProgress() {
    let total = 0, completed = 0;
    Object.values(state.segments).forEach(tasks => {
        tasks.forEach(t => { total++; if(t.done) completed++; });
    });
    return total === 0 ? 0 : Math.round((completed / total) * 100);
}

export function getTopHabit() {
    if (state.habits.length === 0) return "None yet";

    const currentMonth = new Date().getMonth();
    const currentYear = new Date().getFullYear();

    const habitsWithMonthlyProgress = state.habits.map(habit => {
        const logsThisMonth = habit.logs.filter(log => {
            const logDate = new Date(log);
            return logDate.getMonth() === currentMonth && logDate.getFullYear() === currentYear;
        });
        const progress = (habit.goal > 0) ? (logsThisMonth.length / habit.goal) : 0;
        return { ...habit, progress };
    });

    if (habitsWithMonthlyProgress.length === 0) return "None yet";

    let top = habitsWithMonthlyProgress.reduce((prev, current) =>
        (prev.progress > current.progress) ? prev : current
    );

    if (top.progress === 0) return "No progress yet";
    return `${top.name} (${Math.round(top.progress * 100)}%)`;
}

export function getNextBibleStudy() {
    const studies = state.bibleStudies;
    if (!studies || studies.length === 0) return "None yet";

    const priorityMap = { 'High': 3, 'Medium': 2, 'Low': 1 };

    const inProgress = studies.filter(s => s.status === 'In Progress')
        .sort((a, b) => priorityMap[b.priority] - priorityMap[a.priority] || b.lastUpdate - a.lastUpdate);
    
    if (inProgress.length > 0) return inProgress[0].name;

    const notStarted = studies.filter(s => s.status === 'Not Started')
        .sort((a, b) => priorityMap[b.priority] - priorityMap[a.priority]);
    
    if (notStarted.length > 0) return notStarted[0].name;

    return "All completed!";
}