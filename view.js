import { state, getUrgencyStatus, calculateTotalProgress, getTopHabit, getNextBibleStudy } from './state.js';

export function renderDashboard(container) {
    const urgentTasks = state.tasks
        .filter(t => !t.completed)
        .sort((a, b) => b.priority - a.priority || new Date(a.dueDate) - new Date(b.dueDate))
        .slice(0, 8);

    const todayStr = new Date().toISOString().split('T')[0];
    const todaysEvents = state.tasks.filter(t => t.dueDate === todayStr);

    container.innerHTML = `
        <div class="row g-4">
            <div class="col-md-8">
                <div class="card p-4 mb-4">
                    <h5><i class="bi bi-lightning-charge text-warning"></i> Urgent Focus</h5>
                    <ul class="list-group list-group-flush mt-3">
                        ${urgentTasks.map(t => `
                            <li class="list-group-item d-flex justify-content-between align-items-center">
                                <div>
                                    <input type="checkbox" class="form-check-input me-2" data-action="toggleTask" data-id="${t.id}">
                                    <span class="${t.priority >= 4 ? 'fw-bold text-danger' : ''}">${t.title}</span>
                                    <small class="text-muted ms-2">${getUrgencyStatus(t)}</small>
                                </div>
                                <span class="badge bg-light text-dark border">${t.segment || 'General'}</span>
                            </li>
                        `).join('') || '<li class="list-group-item">All clear! No urgent tasks.</li>'}
                    </ul>
                </div>
                <div class="row g-3">
                    <div class="col-md-4">
                        <div class="card p-3 bg-primary text-white h-100">
                            <h6>Segment Progress</h6>
                            <small>Overall: ${calculateTotalProgress()}%</small>
                        </div>
                    </div>
                    <div class="col-md-4">
                        <div class="card p-3 bg-success text-dark h-100">
                            <h6>Top Habit</h6>
                            <small>${getTopHabit()}</small>
                        </div>
                    </div>
                    <div class="col-md-4">
                        <div class="card p-3 bg-info text-dark h-100">
                            <h6>Next Study</h6>
                            <small class="text-truncate d-block" title="${getNextBibleStudy()}">${getNextBibleStudy()}</small>
                        </div>
                    </div>
                </div>
            </div>
            <div class="col-md-4">
                <div class="card p-4 mb-4">
                    <h5><i class="bi bi-calendar-check text-info"></i> Today's Schedule</h5>
                    <ul class="list-group list-group-flush mt-3">
                        ${todaysEvents.map(t => `
                            <li class="list-group-item d-flex justify-content-between align-items-center">
                                <div>
                                    <input type="checkbox" class="form-check-input me-2" data-action="toggleTask" data-id="${t.id}" ${t.completed ? 'checked' : ''}>
                                    <span class="${t.completed ? 'text-decoration-line-through text-muted' : ''}">${t.title}</span>
                                </div>
                                <span class="badge bg-light text-dark border">${t.segment || 'General'}</span>
                            </li>
                        `).join('') || '<li class="list-group-item text-muted fst-italic">No events scheduled for today.</li>'}
                    </ul>
                </div>
                <div class="card p-4 bg-light border-0">
                    <h5>Daily Routines</h5>
                    <div class="mt-3">
                        <h6><i class="bi bi-sun"></i> Morning</h6>
                        <ul class="ps-3 mb-4">${state.routines.morning.length > 0 ? state.routines.morning.map(r => `<li>${r}</li>`).join('') : '<li class="text-muted fst-italic list-unstyled">Add morning tasks...</li>'}</ul>
                        <h6><i class="bi bi-moon-stars"></i> Evening</h6>
                        <ul class="ps-3">${state.routines.evening.length > 0 ? state.routines.evening.map(r => `<li>${r}</li>`).join('') : '<li class="text-muted fst-italic list-unstyled">Add evening tasks...</li>'}</ul>
                    </div>
                </div>
            </div>
        </div>
    `;
}

export function renderCalendar(container, currentCalendarDate) {
    const year = currentCalendarDate.getFullYear();
    const month = currentCalendarDate.getMonth();
    const monthName = currentCalendarDate.toLocaleString('default', { month: 'long' });
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    let gridHtml = '';
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    days.forEach(day => { gridHtml += `<div class="text-center fw-bold p-2 border-bottom bg-light">${day}</div>`; });
    for (let i = 0; i < firstDay; i++) { gridHtml += `<div class="calendar-day bg-light"></div>`; }

    for (let day = 1; day <= daysInMonth; day++) {
        const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        const dayTasks = state.tasks.filter(t => t.dueDate === dateStr);
        const isToday = day === new Date().getDate() && month === new Date().getMonth() && year === new Date().getFullYear();

        gridHtml += `
            <div class="calendar-day border-end border-bottom">
                <div class="d-flex justify-content-between">
                    <span class="${isToday ? 'badge bg-primary rounded-circle' : 'fw-bold'}">${day}</span>
                </div>
                <div class="mt-1">
                    ${dayTasks.map(t => `<div class="task-item priority-${t.priority || 1} text-truncate" title="${t.title}" data-action="openEditTaskModal" data-id="${t.id}">${t.title}</div>`).join('')}
                </div>
            </div>
        `;
    }

    container.innerHTML = `
        <div class="card p-4">
            <div class="d-flex justify-content-between align-items-center mb-4">
                <div class="d-flex align-items-center gap-3">
                    <h4 class="m-0">${monthName} ${year}</h4>
                    <button class="btn btn-primary btn-sm" data-bs-toggle="modal" data-bs-target="#addTaskModal"><i class="bi bi-plus-lg"></i> Add Task</button>
                </div>
                <div>
                    <button class="btn btn-outline-secondary btn-sm" data-action="changeMonth" data-offset="-1"><i class="bi bi-chevron-left"></i></button>
                    <button class="btn btn-outline-secondary btn-sm" data-action="changeMonth" data-offset="1"><i class="bi bi-chevron-right"></i></button>
                </div>
            </div>
            <div class="overflow-auto"><div class="calendar-grid">${gridHtml}</div></div>
        </div>
    `;
}

export function renderHabits(container) {
    const currentMonth = new Date().getMonth();
    const currentYear = new Date().getFullYear();

    const habitsHtml = state.habits.map((habit, index) => {
        const logsThisMonth = habit.logs.filter(log => new Date(log).getMonth() === currentMonth && new Date(log).getFullYear() === currentYear);
        const progress = habit.goal > 0 ? Math.round((logsThisMonth.length / habit.goal) * 100) : 0;
        const loggedToday = logsThisMonth.some(log => new Date(log).setHours(0, 0, 0, 0) === new Date().setHours(0, 0, 0, 0));

        return `
            <div class="col-md-6 col-lg-4">
                <div class="card h-100">
                    <div class="card-body d-flex flex-column">
                        <div class="d-flex justify-content-between align-items-start">
                            <h5 class="card-title">${habit.name}</h5>
                            <button class="btn btn-sm text-danger" data-action="deleteHabit" data-index="${index}"><i class="bi bi-trash"></i></button>
                        </div>
                        <p class="card-text text-muted">Monthly Goal: ${logsThisMonth.length} / ${habit.goal}</p>
                        <div class="progress mb-3" style="height: 1.25rem;"><div class="progress-bar bg-success" style="width: ${progress}%">${progress}%</div></div>
                        <div class="mt-auto d-flex justify-content-end gap-2">
                            <button class="btn btn-sm btn-outline-secondary" data-action="undoLastHabitLog" data-index="${index}" ${habit.logs.length === 0 ? 'disabled' : ''}>Undo</button>
                            <button class="btn btn-sm btn-success" data-action="logHabit" data-index="${index}" ${loggedToday ? 'disabled' : ''}><i class="bi bi-check-lg"></i> ${loggedToday ? 'Logged' : 'Log Today'}</button>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }).join('');

    container.innerHTML = `<div class="d-flex justify-content-between align-items-center mb-4"><h4 class="m-0">Monthly Habits</h4><button class="btn btn-primary" data-action="addHabitPrompt"><i class="bi bi-plus-lg"></i> New Habit</button></div><div class="row g-4">${habitsHtml || '<div class="col-12"><p class="text-muted">No habits tracked yet.</p></div>'}</div>`;
}

export function renderSegments(container) {
    const segments = Object.keys(state.segments);
    const icons = { God: 'bi-book', Finance: 'bi-cash-stack', Health: 'bi-heart-pulse', Leisure: 'bi-controller', Business: 'bi-briefcase' };

    let html = '<div class="row g-4">';
    segments.forEach(segment => {
        const goals = state.segments[segment];
        const completed = goals.filter(g => g.done).length;
        const progress = goals.length === 0 ? 0 : Math.round((completed / goals.length) * 100);

        html += `
            <div class="col-md-6"><div class="card h-100"><div class="card-header d-flex justify-content-between align-items-center bg-white"><h5 class="m-0"><i class="bi ${icons[segment]} me-2"></i>${segment}</h5><span class="badge bg-${progress === 100 ? 'success' : 'primary'}">${progress}%</span></div><div class="card-body">
                <div class="progress mb-3" style="height: 10px;"><div class="progress-bar bg-${progress === 100 ? 'success' : 'primary'}" style="width: ${progress}%"></div></div>
                <ul class="list-group list-group-flush mb-3">${goals.map((g, i) => `<li class="list-group-item d-flex align-items-center px-0"><input class="form-check-input me-2" type="checkbox" ${g.done ? 'checked' : ''} data-action="toggleGoal" data-segment="${segment}" data-index="${i}"><span class="${g.done ? 'text-decoration-line-through text-muted' : ''} flex-grow-1">${g.text}</span><button class="btn btn-sm text-danger" data-action="deleteGoal" data-segment="${segment}" data-index="${i}"><i class="bi bi-trash"></i></button></li>`).join('') || '<li class="list-group-item px-0">No goals set yet.</li>'}</ul>
                <div class="input-group"><input type="text" class="form-control form-control-sm" id="input-${segment}" placeholder="New goal..."><button class="btn btn-outline-secondary btn-sm" type="button" data-action="addGoal" data-segment="${segment}">Add</button></div>
            </div></div></div>`;
    });
    container.innerHTML = html + '</div>';
}

export function renderMeals(container) {
    const recipeOptions = state.recipes.map(r => `<option value="${r.id}">${r.name}</option>`).join('');
    let mealPlanHtml = '';
    for (let i = 0; i < 7; i++) {
        const date = new Date(); date.setDate(date.getDate() + i);
        const dateStr = date.toISOString().split('T')[0];
        const planned = state.recipes.find(r => r.id === state.mealPlan[dateStr]);
        mealPlanHtml += `<li class="list-group-item d-flex justify-content-between align-items-center"><div><div class="fw-bold">${date.toLocaleDateString('en-US', { weekday: 'long' })} <small class="text-muted">${date.toLocaleDateString()}</small></div><div class="mt-1">${planned ? `Planned: ${planned.name}` : 'Nothing planned.'}</div></div><div class="d-flex align-items-center"><select class="form-select form-select-sm w-auto me-2" data-action="planMeal" data-date="${dateStr}"><option value="">Choose a meal...</option>${state.recipes.map(r => `<option value="${r.id}" ${state.mealPlan[dateStr] === r.id ? 'selected' : ''}>${r.name}</option>`).join('')}</select></div></li>`;
    }

    container.innerHTML = `
        <div class="row g-4"><div class="col-lg-5"><div class="card h-100"><div class="card-header d-flex justify-content-between align-items-center"><h5 class="m-0">My Recipes</h5><button class="btn btn-primary btn-sm" data-action="openRecipeModal"><i class="bi bi-plus-lg"></i> Add Recipe</button></div><div class="card-body"><ul class="list-group list-group-flush">${state.recipes.map(r => `<li class="list-group-item d-flex justify-content-between align-items-center">${r.name}<button class="btn btn-outline-secondary btn-sm" data-action="openRecipeModal" data-id="${r.id}">View/Edit</button></li>`).join('') || '<li class="list-group-item">No recipes yet.</li>'}</ul></div></div></div>
        <div class="col-lg-7"><div class="card h-100"><div class="card-header d-flex justify-content-between align-items-center"><h5 class="m-0">Upcoming Meal Plan</h5><button class="btn btn-success btn-sm" data-action="generateGroceryList"><i class="bi bi-cart"></i> Generate Grocery List</button></div><div class="card-body"><ul class="list-group list-group-flush">${mealPlanHtml}</ul></div></div></div></div>`;
}

export function renderBibleStudy(container) {
    const createCard = (s) => {
        const prereq = s.prereqId ? state.bibleStudies.find(p => p.id === s.prereqId) : null;
        return `<div class="col-md-6 col-lg-4"><div class="card h-100 border-${s.priority === 'High' ? 'danger' : s.priority === 'Medium' ? 'warning' : 'info'}"><div class="card-body"><div class="d-flex justify-content-between align-items-start mb-2"><h5 class="card-title text-truncate">${s.name}</h5><span class="badge bg-secondary">${s.type}</span></div><p class="card-text small text-muted mb-2"><i class="bi bi-book"></i> ${s.bible || 'N/A'} <br>${prereq ? `<i class="bi bi-arrow-right-circle"></i> After: ${prereq.name}` : ''}</p><p class="card-text"><small class="text-muted">Last updated: ${new Date(s.lastUpdate).toLocaleDateString()}</small></p><div class="d-flex gap-2 mt-3"><button class="btn btn-sm btn-outline-primary flex-grow-1" data-action="openBibleStudyModal" data-id="${s.id}">Edit</button>${s.status === 'In Progress' ? `<button class="btn btn-sm btn-success flex-grow-1" data-action="logStudySession" data-id="${s.id}">Log Session</button>` : ''}</div></div></div></div>`;
    };

    const inProgress = state.bibleStudies.filter(s => s.status === 'In Progress').sort((a, b) => b.lastUpdate - a.lastUpdate);
    const notStarted = state.bibleStudies.filter(s => s.status === 'Not Started');
    const completed = state.bibleStudies.filter(s => s.status === 'Completed');

    container.innerHTML = `
        <div class="d-flex justify-content-between align-items-center mb-4"><h4>Bible Study Tracker</h4><button class="btn btn-primary" data-action="openBibleStudyModal"><i class="bi bi-plus-lg"></i> Add Study</button></div>
        <h5 class="text-primary border-bottom pb-2 mb-3">In Progress</h5><div class="row g-3 mb-4">${inProgress.map(createCard).join('') || '<p class="text-muted">No active studies.</p>'}</div>
        <h5 class="text-secondary border-bottom pb-2 mb-3">Up Next</h5><div class="row g-3 mb-4">${notStarted.map(createCard).join('') || '<p class="text-muted">No upcoming studies.</p>'}</div>
        ${completed.length > 0 ? `<h5 class="text-success border-bottom pb-2 mb-3">Completed</h5><div class="row g-3">${completed.map(createCard).join('')}</div>` : ''}`;
}

export function renderJournal(container) {
    const d = new Date();
    const todayStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    const todaysEntry = state.journal[todayStr] || '';
    const pastEntries = Object.keys(state.journal).filter(date => date !== todayStr).sort((a, b) => new Date(b) - new Date(a));

    container.innerHTML = `
        <div class="row g-4">
            <div class="col-lg-8"><div class="card"><div class="card-header"><h5 class="m-0">Today's Journal</h5></div><div class="card-body"><textarea id="journal-entry-today" class="form-control" rows="12" placeholder="What's on your mind?"></textarea></div><div class="card-footer text-end"><button id="save-journal-btn" class="btn btn-primary" data-action="saveJournalEntry">Save Entry</button></div></div></div>
            <div class="col-lg-4"><div class="card"><div class="card-header"><h5 class="m-0"><i class="bi bi-clock-history"></i> Past Entries</h5></div><div class="card-body" style="max-height: 500px; overflow-y: auto;">${pastEntries.length > 0 ? `<div class="accordion accordion-flush" id="past-entries-accordion">${pastEntries.map((date, i) => `<div class="accordion-item"><h2 class="accordion-header"><button class="accordion-button collapsed" type="button" data-bs-toggle="collapse" data-bs-target="#collapse-${i}">${new Date(date).toLocaleDateString()}</button></h2><div id="collapse-${i}" class="accordion-collapse collapse" data-bs-parent="#past-entries-accordion"><div class="accordion-body small" style="white-space: pre-wrap;">${state.journal[date]}</div></div></div>`).join('')}</div>` : '<p class="text-muted">No past entries.</p>'}</div></div></div>
        </div>`;
    
    // Post-render init
    const textarea = container.querySelector('#journal-entry-today');
    const saveBtn = container.querySelector('#save-journal-btn');
    if(textarea) {
        textarea.value = todaysEntry;
        textarea.addEventListener('input', () => { saveBtn.disabled = false; saveBtn.innerText = 'Save Entry'; });
    }
}

export function renderQuotes(container) {
    const icons = { Book: 'bi-book', Movie: 'bi-film', Song: 'bi-music-note-beamed', Other: 'bi-chat-quote' };
    container.innerHTML = `
        <div class="d-flex justify-content-between align-items-center mb-4"><h4>Media Quotes</h4><button class="btn btn-primary" data-action="openQuoteModal"><i class="bi bi-plus-lg"></i> Add Quote</button></div>
        <div class="row g-4">${state.quotes.map(q => `
            <div class="col-md-6 col-lg-4"><div class="card h-100"><div class="card-body"><figure class="mb-0"><blockquote class="blockquote"><p class="fs-6">"${q.text}"</p></blockquote><figcaption class="blockquote-footer mb-0">${q.author ? `${q.author} in ` : ''} <cite>${q.source}</cite></figcaption></figure></div><div class="card-footer d-flex justify-content-between align-items-center text-muted small"><span><i class="bi ${icons[q.type]} me-1"></i> ${q.type}</span><button class="btn btn-link btn-sm p-0 text-secondary" data-action="openQuoteModal" data-id="${q.id}">Edit</button></div></div></div>
        `).join('') || '<div class="col-12"><p class="text-muted">No quotes added yet.</p></div>'}</div>`;
}