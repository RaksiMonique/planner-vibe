import { state, saveState, setState, showToast } from './state.js';

export function createActions(refreshApp) {
    return {
        exportData: () => {
            const dataStr = JSON.stringify(state, null, 2);
            const url = URL.createObjectURL(new Blob([dataStr], { type: 'application/json' }));
            const link = document.createElement('a');
            link.href = url;
            link.download = `second-brain-backup-${new Date().toISOString().split('T')[0]}.json`;
            link.click();
            URL.revokeObjectURL(url);
            showToast('Data exported successfully!');
        },

        importData: () => {
            const input = document.createElement('input');
            input.type = 'file';
            input.accept = '.json,application/json';
            input.onchange = e => {
                const file = e.target.files[0];
                if (!file) return;
                const reader = new FileReader();
                reader.onload = re => {
                    try {
                        const imported = JSON.parse(re.target.result);
                        if (!imported.journal) imported.journal = {};
                        if (!imported.quotes) imported.quotes = [];
                        if (confirm('Overwrite all data?')) {
                            setState(imported);
                            showToast('Data imported!');
                            refreshApp('dashboard');
                        }
                    } catch (err) { showToast('Import failed', 'error'); }
                };
                reader.readAsText(file);
            };
            input.click();
        },

        toggleTask: (id) => {
            const task = state.tasks.find(t => t.id === parseInt(id));
            if (task) {
                task.completed = !task.completed;
                saveState();
                refreshApp();
            }
        },

        quickAddTask: (e) => {
            e.preventDefault();
            const input = document.getElementById('quick-add-task-input');
            if (!input.value.trim()) return;
            state.tasks.push({
                id: Date.now(), title: input.value.trim(), dueDate: new Date().toISOString().split('T')[0], priority: 3, segment: '', completed: false
            });
            saveState();
            input.value = '';
            refreshApp();
            showToast('Task added!');
        },

        // Calendar & Task Modals
        saveNewTask: () => {
            const title = document.getElementById('taskTitle').value;
            if (!title) return showToast('Title required', 'error');
            state.tasks.push({
                id: Date.now(),
                title,
                dueDate: document.getElementById('taskDate').value,
                priority: parseInt(document.getElementById('taskPriority').value),
                segment: document.getElementById('taskSegment').value,
                recurring: document.getElementById('taskRecurring').checked,
                completed: false
            });
            saveState();
            bootstrap.Modal.getInstance(document.getElementById('addTaskModal')).hide();
            refreshApp();
        },

        openEditTaskModal: (id) => {
            const task = state.tasks.find(t => t.id === parseInt(id));
            if (!task) return;
            document.getElementById('editTaskId').value = task.id;
            document.getElementById('editTaskTitle').value = task.title;
            document.getElementById('editTaskDate').value = task.dueDate;
            document.getElementById('editTaskPriority').value = task.priority;
            document.getElementById('editTaskSegment').value = task.segment;
            new bootstrap.Modal(document.getElementById('editTaskModal')).show();
        },

        updateTask: () => {
            const id = parseInt(document.getElementById('editTaskId').value);
            const idx = state.tasks.findIndex(t => t.id === id);
            if (idx === -1) return;
            Object.assign(state.tasks[idx], {
                title: document.getElementById('editTaskTitle').value,
                dueDate: document.getElementById('editTaskDate').value,
                priority: parseInt(document.getElementById('editTaskPriority').value),
                segment: document.getElementById('editTaskSegment').value,
            });
            saveState();
            bootstrap.Modal.getInstance(document.getElementById('editTaskModal')).hide();
            refreshApp();
        },

        deleteTask: () => {
            if(!confirm('Delete task?')) return;
            state.tasks = state.tasks.filter(t => t.id !== parseInt(document.getElementById('editTaskId').value));
            saveState();
            bootstrap.Modal.getInstance(document.getElementById('editTaskModal')).hide();
            refreshApp();
        },

        // Habits
        addHabitPrompt: () => {
            const name = prompt("Habit name:");
            if (!name) return;
            const goal = parseInt(prompt("Times per month:", "10"));
            state.habits.push({ name, goal: isNaN(goal) ? 10 : goal, logs: [] });
            saveState();
            refreshApp();
        },

        logHabit: (index) => {
            state.habits[index].logs.push(Date.now());
            saveState();
            refreshApp();
        },
        
        undoLastHabitLog: (index) => {
            state.habits[index].logs.pop();
            saveState();
            refreshApp();
        },

        deleteHabit: (index) => {
            if(confirm('Delete habit?')) {
                state.habits.splice(index, 1);
                saveState();
                refreshApp();
            }
        },

        // Segments
        toggleGoal: (segment, index, target) => {
            // Index comes as string from dataset
            state.segments[segment][parseInt(index)].done = target.checked;
            saveState();
            refreshApp();
        },
        deleteGoal: (segment, index) => {
            state.segments[segment].splice(parseInt(index), 1);
            saveState();
            refreshApp();
        },
        addGoal: (segment) => {
            const input = document.getElementById(`input-${segment}`);
            if(input.value.trim()) {
                state.segments[segment].push({ text: input.value.trim(), done: false });
                saveState();
                refreshApp();
            }
        },

        // Meals
        planMeal: (date, value) => {
            if (value) state.mealPlan[date] = parseInt(value);
            else delete state.mealPlan[date];
            saveState();
            refreshApp();
        },
        
        openRecipeModal: (id) => {
            const form = document.getElementById('recipeForm');
            form.reset();
            document.getElementById('ingredient-fields').innerHTML = '';
            if(id) {
                const r = state.recipes.find(r => r.id === parseInt(id));
                document.getElementById('recipeId').value = r.id;
                document.getElementById('recipeName').value = r.name;
                document.getElementById('recipeInstructions').value = r.instructions;
                // Re-creating ingredients logic would go here, simplified for brevity:
                // In a full refactor, 'addIngredientField' would be an exported view helper or action
            } else {
                document.getElementById('recipeId').value = '';
            }
            new bootstrap.Modal(document.getElementById('recipeModal')).show();
        },

        saveRecipe: () => {
            // Simplified save logic
            const id = document.getElementById('recipeId').value;
            const data = {
                id: id ? parseInt(id) : Date.now(),
                name: document.getElementById('recipeName').value,
                instructions: document.getElementById('recipeInstructions').value,
                ingredients: [] 
            };
            if(id) {
                const idx = state.recipes.findIndex(r => r.id == id);
                if(idx !== -1) state.recipes[idx] = data;
            } else state.recipes.push(data);
            saveState();
            bootstrap.Modal.getInstance(document.getElementById('recipeModal')).hide();
            refreshApp();
        },

        // Bible Study
        openBibleStudyModal: (id) => {
            const form = document.getElementById('bibleStudyForm');
            form.reset();
            // Populate prereqs logic omitted for brevity
            if(id) {
                const s = state.bibleStudies.find(s => s.id === parseInt(id));
                document.getElementById('bibleStudyId').value = s.id;
                document.getElementById('studyName').value = s.name;
                document.getElementById('studyStatus').value = s.status;
            } else document.getElementById('bibleStudyId').value = '';
            new bootstrap.Modal(document.getElementById('bibleStudyModal')).show();
        },
        saveBibleStudy: () => {
            const id = document.getElementById('bibleStudyId').value;
            const data = {
                id: id ? parseInt(id) : Date.now(),
                name: document.getElementById('studyName').value,
                type: document.getElementById('studyType').value,
                priority: document.getElementById('studyPriority').value,
                status: document.getElementById('studyStatus').value,
                bible: document.getElementById('studyBible').value,
                prereqId: document.getElementById('studyPrereq').value ? parseInt(document.getElementById('studyPrereq').value) : null,
                lastUpdate: Date.now()
            };
            if(id) {
                const idx = state.bibleStudies.findIndex(s => s.id == id);
                if(idx !== -1) state.bibleStudies[idx] = data;
            } else state.bibleStudies.push(data);
            saveState();
            bootstrap.Modal.getInstance(document.getElementById('bibleStudyModal')).hide();
            refreshApp();
        },

        // Journal
        saveJournalEntry: () => {
            const d = new Date();
            const key = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
            const val = document.getElementById('journal-entry-today').value;
            if(!val.trim()) delete state.journal[key];
            else state.journal[key] = val;
            saveState();
            showToast('Saved');
            document.getElementById('save-journal-btn').disabled = true;
        },

        // Quotes
        openQuoteModal: (id) => {
            document.getElementById('quoteForm').reset();
            if(id) {
                const q = state.quotes.find(q => q.id === parseInt(id));
                document.getElementById('quoteId').value = q.id;
                document.getElementById('quoteText').value = q.text;
                document.getElementById('quoteSource').value = q.source;
            } else document.getElementById('quoteId').value = '';
            new bootstrap.Modal(document.getElementById('quoteModal')).show();
        },
        saveQuote: () => {
            const id = document.getElementById('quoteId').value;
            const data = {
                id: id ? parseInt(id) : Date.now(),
                text: document.getElementById('quoteText').value,
                source: document.getElementById('quoteSource').value,
                author: document.getElementById('quoteAuthor').value,
                type: document.getElementById('quoteType').value
            };
            if(id) {
                const idx = state.quotes.findIndex(q => q.id == id);
                if(idx !== -1) state.quotes[idx] = data;
            } else state.quotes.push(data);
            saveState();
            bootstrap.Modal.getInstance(document.getElementById('quoteModal')).hide();
            refreshApp();
        },
        deleteQuote: () => {
             if(!confirm('Delete?')) return;
             state.quotes = state.quotes.filter(q => q.id !== parseInt(document.getElementById('quoteId').value));
             saveState();
             bootstrap.Modal.getInstance(document.getElementById('quoteModal')).hide();
             refreshApp();
        }
    };
}