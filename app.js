const loginCard = document.querySelector("#loginCard");
const loginForm = document.querySelector("#loginForm");
const dashboard = document.querySelector("#dashboard");
const userInfo = document.querySelector("#userInfo");
const createFolderBtn = document.querySelector("#createFolderBtn");
const clientList = document.querySelector("#clientList");
const taskForm = document.querySelector("#taskForm");
const clientTitle = document.querySelector("#clientTitle");
const clientNotes = document.querySelector("#clientNotes");
const clientDetails = document.querySelector("#clientDetails");
const taskCounter = document.querySelector("#taskCounter");
const todoList = document.querySelector("#todoList");
const progressList = document.querySelector("#progressList");
const doneList = document.querySelector("#doneList");
const taskTemplate = document.querySelector("#taskTemplate");
const clientWorkspace = document.querySelector("#clientWorkspace");
const clientDueIndicator = document.querySelector("#clientDueIndicator");
const emptyState = document.querySelector("#emptyState");
const emptyCreateBtn = document.querySelector("#emptyCreateBtn");

const STORAGE_KEY = "todo-client-hub";
const USER_KEY = "todo-user";

const state = {
  user: null,
  clients: [],
  activeClientId: null,
};

const formatDate = (value) => {
  if (!value) {
    return "Sem data";
  }
  const date = new Date(value);
  return new Intl.DateTimeFormat("pt-BR").format(date);
};

const nowLabel = () =>
  new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date());

const isDueSoon = (task) => {
  if (!task?.dueDate || task.status === "Finalizada") return false;
  const due = new Date(`${task.dueDate}T23:59:59`);
  if (Number.isNaN(due.getTime())) return false;
  const diff = due.getTime() - Date.now();
  const oneDay = 24 * 60 * 60 * 1000;
  return diff > 0 && diff <= oneDay;
};

const clientHasDueSoon = (client) =>
  client?.tasks?.some((task) => isDueSoon(task)) ?? false;

const saveState = () => {
  localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify({
      clients: state.clients,
      activeClientId: state.activeClientId,
    })
  );
};

const loadState = () => {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (!stored) return;
  try {
    const parsed = JSON.parse(stored);
    state.clients = parsed.clients ?? [];
    state.activeClientId = parsed.activeClientId ?? null;
  } catch (error) {
    state.clients = [];
    state.activeClientId = null;
  }
};

const loadUser = () => {
  const stored = localStorage.getItem(USER_KEY);
  if (!stored) return;
  try {
    state.user = JSON.parse(stored);
  } catch (error) {
    state.user = null;
  }
};

const saveUser = () => {
  localStorage.setItem(USER_KEY, JSON.stringify(state.user));
};

const setActiveClient = (clientId) => {
  state.activeClientId = clientId;
  saveState();
  renderClients();
  renderActiveClient();
};

const addClient = (name, notes) => {
  const id = crypto.randomUUID();
  const client = {
    id,
    name,
    notes,
    createdAt: new Date().toISOString(),
    tasks: [],
  };
  state.clients.unshift(client);
  setActiveClient(id);
};

const updateTaskLog = (task, action) => {
  task.logs = task.logs ?? [];
  task.logs.unshift({
    id: crypto.randomUUID(),
    date: nowLabel(),
    action,
  });
};

const collectUpdates = (task) =>
  (task.logs ?? []).filter((entry) => entry.action.startsWith("Atualização:"));

const addTask = (clientId, payload) => {
  const client = state.clients.find((item) => item.id === clientId);
  if (!client) return;
  const task = {
    id: crypto.randomUUID(),
    title: payload.title,
    details: payload.details,
    priority: payload.priority,
    dueDate: payload.dueDate,
    status: "A Fazer",
    createdAt: new Date().toISOString(),
    logs: [],
  };
  updateTaskLog(task, "Missão criada.");
  client.tasks.unshift(task);
  saveState();
  renderActiveClient();
};

const toggleTask = (clientId, taskId) => {
  const client = state.clients.find((item) => item.id === clientId);
  if (!client) return;
  const task = client.tasks.find((item) => item.id === taskId);
  if (!task) return;
  task.status = task.status === "Finalizada" ? "A Fazer" : "Finalizada";
  updateTaskLog(task, `Status atualizado para ${task.status}.`);
  saveState();
  renderActiveClient();
};

const openCreateFolder = () => {
  const name = window.prompt("Nome da pasta do cliente:");
  if (!name || !name.trim()) return;
  const notes = window.prompt("Resumo do cliente (opcional):", "");
  addClient(name.trim(), notes ? notes.trim() : "");
};

const renderClients = () => {
  clientList.innerHTML = "";
  if (!state.clients.length) {
    const empty = document.createElement("li");
    empty.textContent = "Nenhuma pasta criada.";
    empty.classList.add("muted");
    clientList.appendChild(empty);
    return;
  }
  state.clients.forEach((client) => {
    const item = document.createElement("li");
    const name = document.createElement("span");
    name.textContent = client.name;
    item.appendChild(name);
    if (client.id === state.activeClientId) {
      item.classList.add("active");
    }
    if (clientHasDueSoon(client)) {
      const indicator = document.createElement("span");
      indicator.classList.add("due-indicator");
      indicator.title = "Prazo próximo de vencer";
      item.appendChild(indicator);
    }
    const deleteBtn = document.createElement("button");
    deleteBtn.type = "button";
    deleteBtn.classList.add("icon-button");
    deleteBtn.title = "Excluir pasta";
    deleteBtn.textContent = "🗑️";
    deleteBtn.addEventListener("click", (event) => {
      event.stopPropagation();
      if (!window.confirm("Excluir esta pasta e todas as missões?")) return;
      state.clients = state.clients.filter((entry) => entry.id !== client.id);
      if (state.activeClientId === client.id) {
        state.activeClientId = null;
      }
      saveState();
      renderClients();
      renderActiveClient();
    });
    item.appendChild(deleteBtn);
    item.addEventListener("click", () => setActiveClient(client.id));
    clientList.appendChild(item);
  });
};

const renderTasks = (client) => {
  todoList.innerHTML = "";
  progressList.innerHTML = "";
  doneList.innerHTML = "";
  const tasks = client ? client.tasks : [];
  taskCounter.textContent = tasks.length;

  if (!tasks.length) {
    const empty = document.createElement("p");
    empty.classList.add("muted");
    empty.textContent = "Nenhuma missão cadastrada.";
    todoList.appendChild(empty);
    return;
  }

  tasks.forEach((task) => {
    const clone = taskTemplate.content.cloneNode(true);
    const card = clone.querySelector(".task");
    const title = clone.querySelector(".task-title");
    const meta = clone.querySelector(".task-meta");
    const details = clone.querySelector(".task-details");
    const updates = clone.querySelector(".task-updates");
    const status = clone.querySelector(".status");
    const toggle = clone.querySelector(".toggle");
    const logButton = clone.querySelector(".log");
    const updateButton = clone.querySelector(".update");
    const deleteButton = clone.querySelector(".delete");
    const logContainer = clone.querySelector(".task-log");

    title.textContent = task.title;
    meta.textContent = `${task.priority} • Entrega: ${formatDate(task.dueDate)}`;
    details.textContent = task.details;
    const updatesList = collectUpdates(task);
    if (updatesList.length) {
      updates.innerHTML = "<strong>Atualizações</strong>";
      const list = document.createElement("ul");
      updatesList.forEach((entry) => {
        const item = document.createElement("li");
        item.textContent = `${entry.date} — ${entry.action.replace("Atualização: ", "")}`;
        list.appendChild(item);
      });
      updates.appendChild(list);
    } else {
      updates.textContent = "";
    }
    status.textContent = task.status;
    toggle.textContent =
      task.status === "Finalizada" ? "Reabrir" : "Marcar como concluída";
    toggle.classList.toggle("done", task.status === "Finalizada");
    updateButton.classList.toggle("hidden", task.status !== "Em Andamento");
    card.classList.toggle("done", task.status === "Finalizada");
    card.classList.toggle("due-soon", isDueSoon(task));
    card.setAttribute("draggable", "true");
    card.dataset.taskId = task.id;

    toggle.addEventListener("click", () =>
      toggleTask(state.activeClientId, task.id)
    );

    logButton.addEventListener("click", () => {
      logContainer.classList.toggle("active");
      logButton.textContent = logContainer.classList.contains("active")
        ? "Ocultar histórico"
        : "Ver histórico";
    });

    updateButton.addEventListener("click", () => {
      const note = window.prompt(
        "Descreva a atualização do chamado:",
        ""
      );
      if (!note) return;
      updateTaskLog(task, `Atualização: ${note}`);
      saveState();
      renderActiveClient();
    });

    deleteButton.addEventListener("click", () => {
      if (!window.confirm("Excluir esta missão?")) return;
      const client = state.clients.find((item) => item.id === state.activeClientId);
      if (!client) return;
      client.tasks = client.tasks.filter((entry) => entry.id !== task.id);
      saveState();
      renderActiveClient();
    });

    const logList = document.createElement("ul");
    task.logs.forEach((entry) => {
      const item = document.createElement("li");
      item.textContent = `${entry.date} — ${entry.action}`;
      logList.appendChild(item);
    });

    logContainer.innerHTML = "<strong>Histórico</strong>";
    logContainer.appendChild(logList);

    if (task.status === "Em Andamento") {
      progressList.appendChild(card);
    } else if (task.status === "Finalizada") {
      doneList.appendChild(card);
    } else {
      todoList.appendChild(card);
    }
  });
};

const updateTaskStatus = (clientId, taskId, newStatus) => {
  const client = state.clients.find((item) => item.id === clientId);
  if (!client) return;
  const task = client.tasks.find((item) => item.id === taskId);
  if (!task) return;
  if (task.status === newStatus) return;
  task.status = newStatus;
  updateTaskLog(task, `Status atualizado para ${task.status}.`);
  saveState();
  renderActiveClient();
};

const setupBoardDnD = () => {
  const columns = document.querySelectorAll(".board-column");
  columns.forEach((column) => {
    column.addEventListener("dragover", (event) => {
      event.preventDefault();
      column.classList.add("drag-over");
    });

    column.addEventListener("dragleave", () => {
      column.classList.remove("drag-over");
    });

    column.addEventListener("drop", (event) => {
      event.preventDefault();
      column.classList.remove("drag-over");
      const taskId = event.dataTransfer.getData("text/plain");
      if (!taskId) return;
      updateTaskStatus(state.activeClientId, taskId, column.dataset.status);
    });
  });

  document.addEventListener("dragstart", (event) => {
    const target = event.target;
    if (!target || !target.classList.contains("task")) return;
    event.dataTransfer.setData("text/plain", target.dataset.taskId);
  });
};

const renderActiveClient = () => {
  const client = state.clients.find((item) => item.id === state.activeClientId);
  if (!state.user) {
    createFolderBtn.classList.add("hidden");
    emptyState.classList.add("hidden");
  }
  if (!client) {
    clientTitle.textContent = "Selecione um cliente";
    clientNotes.textContent =
      "Crie ou escolha uma pasta para visualizar as tarefas detalhadas.";
    clientWorkspace.classList.add("hidden");
    clientDueIndicator.classList.add("hidden");
    if (state.user) {
      emptyState.classList.toggle("hidden", state.clients.length > 0);
      createFolderBtn.classList.toggle("hidden", state.clients.length === 0);
    }
    clientDetails.classList.toggle("hidden", state.clients.length === 0);
    renderTasks(null);
    return;
  }
  clientTitle.textContent = client.name;
  clientNotes.textContent = client.notes || "Sem resumo adicional.";
  clientWorkspace.classList.remove("hidden");
  clientDueIndicator.classList.toggle(
    "hidden",
    !clientHasDueSoon(client)
  );
  emptyState.classList.add("hidden");
  createFolderBtn.classList.remove("hidden");
  clientDetails.classList.remove("hidden");
  renderTasks(client);
};

const showDashboard = () => {
  loginCard.style.display = "none";
  dashboard.classList.add("active");
  userInfo.innerHTML = `${state.user.name} | ${state.user.email} <button id="logoutBtn">Sair</button>`;
  renderClients();
  renderActiveClient();

  const logoutBtn = document.querySelector("#logoutBtn");
  logoutBtn.addEventListener("click", () => {
    state.user = null;
    localStorage.removeItem(USER_KEY);
    dashboard.classList.remove("active");
    loginCard.style.display = "block";
    userInfo.textContent = "";
    createFolderBtn.classList.add("hidden");
    emptyState.classList.add("hidden");
  });
};

const init = () => {
  loadUser();
  loadState();

  if (state.user) {
    showDashboard();
  }

  renderClients();
  renderActiveClient();
  setupBoardDnD();
};

loginForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const formData = new FormData(loginForm);
  state.user = {
    name: formData.get("name").toString().trim(),
    email: formData.get("email").toString().trim(),
  };
  saveUser();
  showDashboard();
});

createFolderBtn.addEventListener("click", openCreateFolder);
emptyCreateBtn.addEventListener("click", openCreateFolder);

taskForm.addEventListener("submit", (event) => {
  event.preventDefault();
  if (!state.activeClientId) return;
  const formData = new FormData(taskForm);
  addTask(state.activeClientId, {
    title: formData.get("taskTitle").toString().trim(),
    details: formData.get("taskDetails").toString().trim(),
    priority: formData.get("taskPriority").toString(),
    dueDate: formData.get("taskDue").toString(),
  });
  taskForm.reset();
});

init();
