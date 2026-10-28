
import { useEffect, useMemo, useState } from "react";
import {
  getTasks,
  createTask,
  updateTask,
  deleteTask as deleteTaskRequest,
  getGroups,
  createGroup,
} from "./services/taskService";

const navigation = [
  { label: "Dashboard", icon: "▦" },
  { label: "My Tasks", icon: "☷" },
  { label: "Groups", icon: "▤" },
  { label: "Upcoming", icon: "◷" },
  { label: "Completed", icon: "✓" },
];

const statusStyles = {
  Pending: "bg-amber-50 text-amber-700",
  "In Progress": "bg-blue-50 text-blue-700",
  Completed: "bg-emerald-50 text-emerald-700",
};

const priorityStyles = {
  High: "text-rose-600",
  Medium: "text-amber-600",
  Low: "text-emerald-600",
};

const emptyForm = {
  title: "",
  description: "",
  priority: "Medium",
  dueDate: "",
  groupId: "",
};

function localDateKey(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatDueDate(date) {
  if (!date) return "No due date";
  const parsed = new Date(`${date}T00:00:00`);
  return Number.isNaN(parsed.getTime())
    ? date
    : parsed.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

function getTaskGroupId(task) {
  const id = task.groupId?._id || task.groupId;
  return id ? String(id) : "";
}

function App() {
  const [tasks, setTasks] = useState([]);
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [apiError, setApiError] = useState("");

  const [activePage, setActivePage] = useState("Dashboard");
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("All");
  const [priorityFilter, setPriorityFilter] = useState("All priorities");
  const [taskView, setTaskView] = useState("All tasks");
  const [sortBy, setSortBy] = useState("Due date");
  const [selectedGroupId, setSelectedGroupId] = useState("");
  const [groupName, setGroupName] = useState("");
  const [creatingGroup, setCreatingGroup] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [editingTask, setEditingTask] = useState(null);
  const [editForm, setEditForm] = useState(emptyForm);
  const [savingEdit, setSavingEdit] = useState(false);
  const [notice, setNotice] = useState("");

  useEffect(() => {
    async function loadTasks() {
      try {
        setApiError("");
        const [taskData, groupData] = await Promise.all([getTasks(), getGroups()]);
        setTasks(taskData);
        setGroups(groupData);
      } catch (error) {
        setApiError(
          error.response?.data?.message ||
            "Unable to load tasks. Check whether the backend is running."
        );
      } finally {
        setLoading(false);
      }
    }

    loadTasks();
  }, []);

  const todayKey = localDateKey();
  const openTasks = tasks.filter((task) => task.status !== "Completed");
  const overdueTasks = openTasks.filter((task) => task.dueDate && task.dueDate < todayKey);
  const dueTodayTasks = openTasks.filter((task) => task.dueDate === todayKey);
  const activeGroup = groups.find((group) => String(group._id) === selectedGroupId);
  const formGroupId = (value) => value || selectedGroupId || String(groups[0]?._id || "");

  const stats = [
    {
      label: "Total Tasks",
      value: tasks.length,
      icon: "▤",
      color: "bg-violet-50 text-violet-600",
    },
    {
      label: "Due today",
      value: dueTodayTasks.length,
      icon: "◷",
      color: "bg-amber-50 text-amber-600",
    },
    {
      label: "In Progress",
      value: tasks.filter((t) => t.status === "In Progress").length,
      icon: "↗",
      color: "bg-blue-50 text-blue-600",
    },
    {
      label: "Completed",
      value: tasks.filter((t) => t.status === "Completed").length,
      icon: "✓",
      color: "bg-emerald-50 text-emerald-600",
    },
  ];

  const filteredTasks = useMemo(() => {
    return tasks.filter((task) => {
      const searchText = search.trim().toLowerCase();
      const matchesSearch =
        task.title.toLowerCase().includes(searchText) ||
        (task.description || "").toLowerCase().includes(searchText);

      const matchesStatus =
        filter === "All" || task.status === filter;

      const matchesPriority =
        priorityFilter === "All priorities" || task.priority === priorityFilter;
      const matchesGroup = !selectedGroupId || getTaskGroupId(task) === selectedGroupId;
      const matchesPage =
        activePage === "Upcoming"
          ? task.status !== "Completed" && task.dueDate && task.dueDate >= todayKey
          : activePage === "Completed"
            ? task.status === "Completed"
            : true;
      const matchesView = matchesPage && (
        taskView === "All tasks" ||
        (taskView === "Due today" && task.status !== "Completed" && task.dueDate === todayKey) ||
        (taskView === "Upcoming" && task.status !== "Completed" && task.dueDate > todayKey) ||
        (taskView === "Overdue" && task.status !== "Completed" && task.dueDate && task.dueDate < todayKey) ||
        (taskView === "Completed" && task.status === "Completed")
      );

      return matchesSearch && matchesStatus && matchesPriority && matchesGroup && matchesView;
    });
  }, [tasks, search, filter, priorityFilter, taskView, todayKey, selectedGroupId, activePage]);

  const sortedTasks = useMemo(() => {
    const priorityRank = { High: 0, Medium: 1, Low: 2 };
    return [...filteredTasks].sort((a, b) => {
      if (sortBy === "Priority") {
        return (priorityRank[a.priority] ?? 3) - (priorityRank[b.priority] ?? 3);
      }
      if (sortBy === "Recently added") {
        return (b.createdAt || "").localeCompare(a.createdAt || "");
      }
      return (a.dueDate || "9999-12-31").localeCompare(b.dueDate || "9999-12-31");
    });
  }, [filteredTasks, sortBy]);

  async function handleAddTask(event) {
    event.preventDefault();

    if (!form.title.trim()) return;

    try {
      setApiError("");

      const newTask = await createTask({
        title: form.title.trim(),
        description: form.description.trim(),
        priority: form.priority,
        dueDate: form.dueDate,
        status: "Pending",
        groupId: formGroupId(form.groupId),
      });

      setTasks((current) => [newTask, ...current]);
      setForm(emptyForm);
      setShowForm(false);
      setNotice("Task added successfully.");
    } catch (error) {
      setApiError(
        error.response?.data?.message || "Failed to create task."
      );
    }
  }

  async function handleCreateGroup(event) {
    event.preventDefault();
    const name = groupName.trim();
    if (!name) return;

    try {
      setCreatingGroup(true);
      setApiError("");
      const newGroup = await createGroup({ name });
      setGroups((current) => [...current, newGroup].sort((a, b) => a.name.localeCompare(b.name)));
      setGroupName("");
      setSelectedGroupId(String(newGroup._id));
      setNotice(`“${newGroup.name}” group created.`);
    } catch (error) {
      setApiError(error.response?.data?.message || "Failed to create group.");
    } finally {
      setCreatingGroup(false);
    }
  }

  async function updateStatus(id, status) {
    try {
      setApiError("");

      const updatedTask = await updateTask(id, { status });

      setTasks((current) =>
        current.map((task) =>
          task.id === id ? updatedTask : task
        )
      );

      setNotice("Task status updated.");
    } catch (error) {
      setApiError(
        error.response?.data?.message || "Failed to update task."
      );
    }
  }

  function beginEdit(task) {
    setShowForm(false);
    setEditingTask(task);
    setEditForm({
      title: task.title || "",
      description: task.description || "",
      status: task.status || "Pending",
      priority: task.priority || "Medium",
      dueDate: task.dueDate || "",
      groupId: getTaskGroupId(task),
    });
    setApiError("");
    setNotice("");
  }

  async function handleEditTask(event) {
    event.preventDefault();

    if (!editForm.title.trim()) {
      setApiError("Task title is required.");
      return;
    }

    try {
      setSavingEdit(true);
      setApiError("");

      const updatedTask = await updateTask(editingTask.id, {
        title: editForm.title.trim(),
        description: editForm.description.trim(),
        status: editForm.status,
        priority: editForm.priority,
        dueDate: editForm.dueDate,
        groupId: formGroupId(editForm.groupId),
      });

      setTasks((current) =>
        current.map((task) =>
          task.id === editingTask.id ? updatedTask : task
        )
      );
      setEditingTask(null);
      setEditForm(emptyForm);
      setNotice("Task updated successfully.");
    } catch (error) {
      setApiError(
        error.response?.data?.message || "Failed to update task."
      );
    } finally {
      setSavingEdit(false);
    }
  }

  async function deleteTaskById(id) {
    try {
      setApiError("");

      await deleteTaskRequest(id);

      setTasks((current) =>
        current.filter((task) => task.id !== id)
      );

      setNotice("Task deleted.");
    } catch (error) {
      setApiError(
        error.response?.data?.message || "Failed to delete task."
      );
    }
  }

  async function resetTasks() {
    try {
      setApiError("");
      setTasks(await getTasks());
      setSearch("");
      setFilter("All");
      setPriorityFilter("All priorities");
      setTaskView("All tasks");
      setNotice("Tasks refreshed from server.");
    } catch {
      setApiError("Unable to refresh tasks.");
    }
  }

  const completedCount = tasks.filter(
    (task) => task.status === "Completed"
  ).length;
  const visibleTasks = activePage === "Dashboard"
    ? sortedTasks.slice(0, 5)
    : sortedTasks;

  const progress =
    tasks.length === 0
      ? 0
      : Math.round((completedCount / tasks.length) * 100);
  const taskSections = groups
    .map((group) => ({
      group,
      tasks: visibleTasks.filter((task) => getTaskGroupId(task) === String(group._id)),
    }))
    .filter((section) => section.tasks.length > 0);

  return (
    <div className="taskflow-shell min-h-screen text-slate-800 md:flex">
      {/* Sidebar */}
      <aside className="taskflow-sidebar flex w-full flex-col md:min-h-screen md:w-64 md:shrink-0">
        <div className="flex items-center gap-3 px-6 py-6">
          <div className="brand-mark flex h-10 w-10 items-center justify-center rounded-xl text-xl font-bold text-white">
            T
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight">TaskFlow</h1>
            <p className="text-xs text-slate-400">Plan with clarity</p>
          </div>
        </div>

        <div className="px-4 pt-3">
          <p className="mb-3 px-3 text-xs font-semibold uppercase tracking-widest text-slate-500">
            Workspace
          </p>

          <nav className="flex gap-2 md:flex-col">
            {navigation.map((item) => (
              <button
                key={item.label}
                onClick={() => {
                  setActivePage(item.label);
                  setFilter("All");
                  setPriorityFilter("All priorities");
                  setTaskView("All tasks");
                  setSelectedGroupId("");
                }}
                className={`flex flex-1 items-center gap-3 rounded-xl px-4 py-3 text-left text-sm font-medium transition md:flex-none ${
                  activePage === item.label
                    ? "nav-active text-white"
                    : "text-slate-400 hover:bg-white/10 hover:text-white"
                }`}
              >
                <span className="text-lg">{item.icon}</span>
                {item.label}
              </button>
            ))}
          </nav>
        </div>

        <div className="sidebar-progress mt-auto hidden p-4 md:block">
          <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-sm font-semibold text-white">
                Your progress
              </span>
              <span className="text-sm font-bold text-violet-300">
                {progress}%
              </span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-white/10">
              <div
                className="h-full rounded-full bg-violet-400 transition-all"
                style={{ width: `${progress}%` }}
              />
            </div>
            <p className="mt-3 text-xs leading-5 text-slate-400">
              {completedCount} of {tasks.length} tasks completed.
              Keep going!
            </p>
          </div>

          <p className="mt-5 text-center text-xs text-slate-400">
            TaskFlow · Stay productive
          </p>
        </div>
      </aside>

      {/* Main content */}
      <main className="main-panel min-w-0 flex-1 px-4 py-6 sm:px-6 lg:px-10 lg:py-9">
        {loading && (
          <div className="loading-banner mb-5" role="status">
            <span className="loading-dot" /> Loading your workspace...
          </div>
        )}

        {apiError && (
          <div
            role="alert"
            className="error-banner mb-5"
          >
            {apiError}
            <button
              onClick={resetTasks}
              className="ml-auto shrink-0 rounded-lg px-3 py-1.5 font-semibold text-rose-800 transition hover:bg-rose-100"
            >
              Try again
            </button>
          </div>
        )}

        <header className="page-header mb-8 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <p className="eyebrow mb-2 text-xs font-semibold uppercase tracking-widest text-violet-600">
              YOUR WORKSPACE · {activePage}
            </p>
            <h2 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
              {activePage}
            </h2>
            <p className="mt-2 text-sm text-slate-500 sm:text-base">
              {activePage === "Dashboard"
                ? "A clear view of your workload and progress."
                : activePage === "Groups"
                  ? "Bring related work together in focused spaces."
                  : activePage === "Upcoming"
                    ? "Stay ahead of the work on your calendar."
                    : activePage === "Completed"
                      ? "Look back at everything you have finished."
                      : "Keep your priorities moving forward."}
            </p>
          </div>

          <button
            onClick={() => {
              setActivePage("My Tasks");
              setEditingTask(null);
              setForm(emptyForm);
              setShowForm(true);
              setNotice("");
            }}
            className="primary-button inline-flex items-center justify-center gap-2 rounded-xl px-5 py-3 text-sm font-semibold text-white transition focus:outline-none focus:ring-2 focus:ring-violet-400 focus:ring-offset-2"
          >
            <span className="text-lg">+</span>
            Add New Task
          </button>
        </header>

        {notice && (
          <div
            role="status"
            className="mb-5 flex items-center justify-between rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800"
          >
            {notice}
            <button
              onClick={() => setNotice("")}
              aria-label="Dismiss notification"
              className="ml-3 font-bold"
            >
              ×
            </button>
          </div>
        )}

        {/* Summary cards */}
        {activePage === "Dashboard" && <section className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {stats.map((stat) => (
            <div
              key={stat.label}
              className="stat-card rounded-2xl bg-white p-5 transition"
            >
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-slate-500">
                  {stat.label}
                </p>
                <span
                  className={`flex h-10 w-10 items-center justify-center rounded-xl text-xl font-semibold ${stat.color}`}
                >
                  {stat.icon}
                </span>
              </div>
              <p className="mt-4 text-3xl font-bold tracking-tight text-slate-900">
                {stat.value}
              </p>
              <p className="mt-1 text-xs text-slate-400">
                {stat.label === "Total Tasks"
                  ? "Across your workspace"
                  : stat.label === "Due today"
                    ? "Open and due today"
                  : "Tasks in this status"}
              </p>
            </div>
          ))}
        </section>}

        {overdueTasks.length > 0 && activePage === "Dashboard" && (
          <button
            onClick={() => {
              setActivePage("My Tasks");
              setSearch("");
              setPriorityFilter("All priorities");
              setTaskView("Overdue");
              setFilter("All");
            }}
            className="overdue-callout mb-7 flex w-full items-center justify-between gap-4 rounded-2xl px-5 py-4 text-left transition hover:-translate-y-0.5"
          >
            <span>
              <strong className="block text-sm font-bold">A few tasks need attention</strong>
              <span className="mt-1 block text-sm">{overdueTasks.length} overdue task{overdueTasks.length === 1 ? "" : "s"} waiting for you.</span>
            </span>
            <span className="shrink-0 text-sm font-semibold">Review overdue <span aria-hidden="true">→</span></span>
          </button>
        )}

        {activePage === "Dashboard" && (
          <section className="dashboard-overview grid gap-5 lg:grid-cols-[1.2fr_0.8fr]">
            <div className="overview-card rounded-3xl bg-white p-6 sm:p-8">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-widest text-violet-600">Your momentum</p>
                  <h3 className="mt-2 text-xl font-bold text-slate-900">Progress at a glance</h3>
                  <p className="mt-1 text-sm text-slate-500">You have completed {completedCount} of {tasks.length} tasks.</p>
                </div>
                <span className="progress-value">{progress}%</span>
              </div>
              <div className="mt-6 h-3 overflow-hidden rounded-full bg-violet-50">
                <div className="h-full rounded-full bg-gradient-to-r from-violet-500 to-indigo-500 transition-all" style={{ width: `${progress}%` }} />
              </div>
              <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3">
                {[
                  { label: "Pending", count: tasks.filter((task) => task.status === "Pending").length },
                  { label: "In progress", count: tasks.filter((task) => task.status === "In Progress").length },
                  { label: "Completed", count: completedCount },
                ].map((item) => (
                  <div key={item.label} className="rounded-2xl bg-slate-50 px-4 py-3">
                    <span className="block text-xl font-bold text-slate-900">{item.count}</span>
                    <span className="mt-1 block text-xs text-slate-500">{item.label}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="overview-card rounded-3xl bg-white p-6 sm:p-8">
              <p className="text-xs font-semibold uppercase tracking-widest text-violet-600">Your spaces</p>
              <div className="mt-2 flex items-center justify-between gap-3">
                <h3 className="text-xl font-bold text-slate-900">Task groups</h3>
                <button onClick={() => setActivePage("Groups")} className="text-sm font-semibold text-violet-700 hover:text-violet-900">Manage</button>
              </div>
              <div className="mt-5 space-y-2">
                {groups.slice(0, 4).map((group) => (
                  <button
                    key={group._id}
                    onClick={() => { setSelectedGroupId(String(group._id)); setActivePage("My Tasks"); }}
                    className="group-shortcut flex w-full items-center justify-between rounded-xl px-3 py-3 text-left transition hover:bg-violet-50"
                  >
                    <span className="flex items-center gap-3"><span className="group-dot" /> <span className="text-sm font-semibold text-slate-700">{group.name}</span></span>
                    <span className="text-xs text-slate-400">{tasks.filter((task) => getTaskGroupId(task) === String(group._id)).length} tasks</span>
                  </button>
                ))}
                {groups.length === 0 && <p className="text-sm text-slate-500">Create your first group to organize tasks.</p>}
              </div>
            </div>
          </section>
        )}

        {activePage === "Groups" && (
          <section className="groups-page">
            <form onSubmit={handleCreateGroup} className="group-create-panel mb-6 flex flex-col gap-3 rounded-2xl bg-white p-5 sm:flex-row sm:items-end sm:p-6">
              <div className="min-w-0 flex-1">
                <label htmlFor="new-group-name" className="mb-2 block text-sm font-semibold text-slate-700">Create a group</label>
                <input id="new-group-name" value={groupName} maxLength={40} required onChange={(event) => setGroupName(event.target.value)} placeholder="e.g. Personal, Work, Study" className="control w-full rounded-xl px-4 py-3 text-sm outline-none" />
              </div>
              <button type="submit" disabled={creatingGroup} className="primary-button rounded-xl px-5 py-3 text-sm font-semibold text-white disabled:opacity-60">{creatingGroup ? "Creating…" : "Create group"}</button>
            </form>
            {groups.length === 0 ? (
              <div className="empty-state rounded-3xl bg-white px-6 py-16 text-center">
                <div className="empty-icon mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl text-2xl">▤</div>
                <h3 className="font-semibold text-slate-900">No groups yet</h3>
                <p className="mt-2 text-sm text-slate-500">Create a group to start organizing your work.</p>
              </div>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {groups.map((group, index) => {
                  const groupTasks = tasks.filter((task) => getTaskGroupId(task) === String(group._id));
                  const done = groupTasks.filter((task) => task.status === "Completed").length;
                  return (
                    <article key={group._id} className="group-card rounded-3xl bg-white p-5 sm:p-6">
                      <div className="flex items-start justify-between">
                        <span className={`group-card-icon group-color-${index % 4}`}>▤</span>
                        <span className="text-xs font-medium text-slate-400">{groupTasks.length} task{groupTasks.length === 1 ? "" : "s"}</span>
                      </div>
                      <h3 className="mt-5 text-lg font-bold text-slate-900">{group.name}</h3>
                      <p className="mt-1 text-sm text-slate-500">{done} completed · {groupTasks.length - done} active</p>
                      <button onClick={() => { setSelectedGroupId(String(group._id)); setActivePage("My Tasks"); setTaskView("All tasks"); }} className="mt-5 text-sm font-semibold text-violet-700 hover:text-violet-900">Open group <span aria-hidden="true">→</span></button>
                    </article>
                  );
                })}
              </div>
            )}
          </section>
        )}

        {/* Add task form */}
        {showForm && activePage !== "Dashboard" && activePage !== "Groups" && (
          <section className="form-panel mb-8 rounded-2xl bg-white p-5 sm:p-7">
            <div className="mb-5">
              <h3 className="text-lg font-bold">Create a new task</h3>
              <p className="mt-1 text-sm text-slate-500">
                Enter the details below to add a task.
              </p>
            </div>

            <form onSubmit={handleAddTask} className="space-y-4">
              <div>
                <label
                  htmlFor="task-title"
                  className="mb-2 block text-sm font-medium"
                >
                  Task title *
                </label>
                <input
                  id="task-title"
                  required
                  maxLength={120}
                  value={form.title}
                  onChange={(e) =>
                    setForm({ ...form, title: e.target.value })
                  }
                  placeholder="e.g. Build the login page"
                  className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none transition placeholder:text-slate-400 focus:border-violet-400 focus:ring-2 focus:ring-violet-100"
                />
              </div>

              <div>
                <label
                  htmlFor="task-description"
                  className="mb-2 block text-sm font-medium"
                >
                  Description
                </label>
                <textarea
                  id="task-description"
                  rows={3}
                  maxLength={500}
                  value={form.description}
                  onChange={(e) =>
                    setForm({ ...form, description: e.target.value })
                  }
                  placeholder="What needs to be done?"
                  className="w-full resize-y rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none transition placeholder:text-slate-400 focus:border-violet-400 focus:ring-2 focus:ring-violet-100"
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-3">
                <div>
                  <label htmlFor="task-group" className="mb-2 block text-sm font-medium">Group</label>
                  <select
                    id="task-group"
                    required
                    value={formGroupId(form.groupId)}
                    onChange={(e) => setForm({ ...form, groupId: e.target.value })}
                    className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100"
                  >
                    {groups.map((group) => <option key={group._id} value={group._id}>{group.name}</option>)}
                  </select>
                </div>
                <div>
                  <label
                    htmlFor="task-priority"
                    className="mb-2 block text-sm font-medium"
                  >
                    Priority
                  </label>
                  <select
                    id="task-priority"
                    value={form.priority}
                    onChange={(e) =>
                      setForm({ ...form, priority: e.target.value })
                    }
                    className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100"
                  >
                    <option>Low</option>
                    <option>Medium</option>
                    <option>High</option>
                  </select>
                </div>

                <div>
                  <label
                    htmlFor="task-date"
                    className="mb-2 block text-sm font-medium"
                  >
                    Due date
                  </label>
                  <input
                    id="task-date"
                    type="date"
                    value={form.dueDate}
                    onChange={(e) =>
                      setForm({ ...form, dueDate: e.target.value })
                    }
                    className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100"
                  />
                </div>
              </div>

              <div className="flex flex-wrap gap-3 pt-2">
                <button
                  type="submit"
                  className="rounded-xl bg-violet-600 px-5 py-3 text-sm font-semibold text-white hover:bg-violet-700"
                >
                  Create Task
                </button>
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="rounded-xl border border-slate-200 px-5 py-3 text-sm font-semibold text-slate-600 hover:bg-slate-50"
                >
                  Cancel
                </button>
              </div>
            </form>
          </section>
        )}

        {editingTask && activePage !== "Dashboard" && activePage !== "Groups" && (
          <section className="form-panel mb-8 rounded-2xl bg-white p-5 sm:p-7">
            <div className="mb-5">
              <h3 className="text-lg font-bold">Edit task</h3>
              <p className="mt-1 text-sm text-slate-500">
                Update the task details below.
              </p>
            </div>

            <form onSubmit={handleEditTask} className="space-y-4">
              <div>
                <label
                  htmlFor="edit-task-title"
                  className="mb-2 block text-sm font-medium"
                >
                  Task title *
                </label>
                <input
                  id="edit-task-title"
                  required
                  maxLength={120}
                  value={editForm.title}
                  onChange={(e) =>
                    setEditForm({ ...editForm, title: e.target.value })
                  }
                  className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-violet-400 focus:ring-2 focus:ring-violet-100"
                />
              </div>

              <div>
                <label
                  htmlFor="edit-task-description"
                  className="mb-2 block text-sm font-medium"
                >
                  Description
                </label>
                <textarea
                  id="edit-task-description"
                  rows={3}
                  maxLength={500}
                  value={editForm.description}
                  onChange={(e) =>
                    setEditForm({ ...editForm, description: e.target.value })
                  }
                  className="w-full resize-y rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-violet-400 focus:ring-2 focus:ring-violet-100"
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <div>
                  <label htmlFor="edit-task-group" className="mb-2 block text-sm font-medium">Group</label>
                  <select
                    id="edit-task-group"
                    required
                    value={formGroupId(editForm.groupId)}
                    onChange={(e) => setEditForm({ ...editForm, groupId: e.target.value })}
                    className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100"
                  >
                    {groups.map((group) => <option key={group._id} value={group._id}>{group.name}</option>)}
                  </select>
                </div>
                <div>
                  <label
                    htmlFor="edit-task-status"
                    className="mb-2 block text-sm font-medium"
                  >
                    Status
                  </label>
                  <select
                    id="edit-task-status"
                    value={editForm.status}
                    onChange={(e) =>
                      setEditForm({ ...editForm, status: e.target.value })
                    }
                    className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100"
                  >
                    <option>Pending</option>
                    <option>In Progress</option>
                    <option>Completed</option>
                  </select>
                </div>

                <div>
                  <label
                    htmlFor="edit-task-priority"
                    className="mb-2 block text-sm font-medium"
                  >
                    Priority
                  </label>
                  <select
                    id="edit-task-priority"
                    value={editForm.priority}
                    onChange={(e) =>
                      setEditForm({ ...editForm, priority: e.target.value })
                    }
                    className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100"
                  >
                    <option>Low</option>
                    <option>Medium</option>
                    <option>High</option>
                  </select>
                </div>

                <div>
                  <label
                    htmlFor="edit-task-date"
                    className="mb-2 block text-sm font-medium"
                  >
                    Due date
                  </label>
                  <input
                    id="edit-task-date"
                    type="date"
                    value={editForm.dueDate}
                    onChange={(e) =>
                      setEditForm({ ...editForm, dueDate: e.target.value })
                    }
                    className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100"
                  />
                </div>
              </div>

              <div className="flex flex-wrap gap-3 pt-2">
                <button
                  type="submit"
                  disabled={savingEdit}
                  className="rounded-xl bg-violet-600 px-5 py-3 text-sm font-semibold text-white hover:bg-violet-700 disabled:cursor-wait disabled:opacity-60"
                >
                  {savingEdit ? "Saving..." : "Save Changes"}
                </button>
                <button
                  type="button"
                  onClick={() => setEditingTask(null)}
                  disabled={savingEdit}
                  className="rounded-xl border border-slate-200 px-5 py-3 text-sm font-semibold text-slate-600 hover:bg-slate-50"
                >
                  Cancel
                </button>
              </div>
            </form>
          </section>
        )}

        {/* Task list */}
        {activePage !== "Dashboard" && activePage !== "Groups" && (
        <section className="tasks-panel overflow-hidden rounded-2xl bg-white">
          <div className="flex flex-col justify-between gap-4 border-b border-slate-100 p-5 sm:p-6 lg:flex-row lg:items-center">
            <div>
              <h3 className="text-lg font-bold text-slate-900">
                {selectedGroupId && activeGroup ? activeGroup.name : activePage === "Upcoming" ? "Upcoming tasks" : activePage === "Completed" ? "Completed tasks" : "All tasks"}
              </h3>
              <p className="mt-1 text-sm text-slate-500">
                {filteredTasks.length} task
                {filteredTasks.length !== 1 ? "s" : ""} found
              </p>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap lg:flex-nowrap">
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                  ⌕
                </span>
                <input
                  aria-label="Search tasks"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search tasks..."
                  className="control w-full rounded-xl py-2.5 pl-9 pr-3 text-sm outline-none sm:w-56"
                />
              </div>

              <select
                aria-label="Filter tasks by status"
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                className="control rounded-xl bg-white px-3 py-2.5 text-sm outline-none"
              >
                <option>All</option>
                <option>Pending</option>
                <option>In Progress</option>
                <option>Completed</option>
              </select>
              <select
                aria-label="Filter tasks by priority"
                value={priorityFilter}
                onChange={(e) => setPriorityFilter(e.target.value)}
                className="control rounded-xl bg-white px-3 py-2.5 text-sm outline-none"
              >
                <option>All priorities</option>
                <option>High</option>
                <option>Medium</option>
                <option>Low</option>
              </select>
              <select
                aria-label="Sort tasks"
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="control rounded-xl bg-white px-3 py-2.5 text-sm outline-none"
              >
                <option>Due date</option>
                <option>Priority</option>
                <option>Recently added</option>
              </select>
              <select
                aria-label="Filter tasks by group"
                value={selectedGroupId || "all-groups"}
                onChange={(e) => setSelectedGroupId(e.target.value === "all-groups" ? "" : e.target.value)}
                className="control rounded-xl bg-white px-3 py-2.5 text-sm outline-none"
              >
                <option value="all-groups">All groups</option>
                {groups.map((group) => <option key={group._id} value={group._id}>{group.name}</option>)}
              </select>
            </div>
          </div>

          {activePage === "My Tasks" && <div className="task-views flex gap-2 overflow-x-auto px-5 pt-4 sm:px-6">
            {["All tasks", "Due today", "Upcoming", "Overdue", "Completed"].map((view) => {
              const count = view === "All tasks" ? tasks.length
                : view === "Due today" ? dueTodayTasks.length
                  : view === "Overdue" ? overdueTasks.length
                    : view === "Completed" ? tasks.filter((task) => task.status === "Completed").length
                      : openTasks.filter((task) => task.dueDate > todayKey).length;
              return (
                <button
                  key={view}
                  onClick={() => setTaskView(view)}
                  className={`task-view shrink-0 rounded-full px-3.5 py-2 text-xs font-semibold transition ${taskView === view ? "task-view-active" : "text-slate-500 hover:bg-slate-100"}`}
                >
                  {view} <span className="ml-1 opacity-70">{count}</span>
                </button>
              );
            })}
          </div>}

          {filteredTasks.length === 0 ? (
            <div className="empty-state px-6 py-16 text-center">
              <div className="empty-icon mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl text-2xl">
                ☷
              </div>
              <h4 className="font-semibold text-slate-900">{loading ? "Loading your tasks" : selectedGroupId && activeGroup ? `No tasks in ${activeGroup.name} yet` : activePage === "Upcoming" ? "Nothing coming up" : activePage === "Completed" ? "No completed tasks yet" : "No tasks found"}</h4>
              <p className="mt-2 text-sm text-slate-500">
                {loading
                  ? "Your workspace will be ready in just a moment."
                  : selectedGroupId && activeGroup
                    ? `Add a task to ${activeGroup.name}, or choose another group.`
                    : "Try adjusting your filters or create a new task."}
              </p>
              {!loading && selectedGroupId && activeGroup && (
                <button
                  onClick={() => { setForm({ ...emptyForm, groupId: selectedGroupId }); setShowForm(true); }}
                  className="mt-4 rounded-xl bg-violet-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-violet-700"
                >
                  Add task to {activeGroup.name}
                </button>
              )}
              <button
                onClick={() => {
                  setSearch("");
                  setFilter("All");
                  setPriorityFilter("All priorities");
                  setTaskView("All tasks");
                  setSelectedGroupId("");
                }}
                className="mt-4 text-sm font-semibold text-violet-700 hover:text-violet-900"
                hidden={loading}
              >
                Clear filters
              </button>
            </div>
          ) : (
            <div className="grouped-task-list">
              {taskSections.map(({ group, tasks: groupTasks }) => (
                <div key={group._id} className="task-group-section">
                  <div className="task-group-heading flex items-center justify-between px-5 py-3 sm:px-6">
                    <h4 className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-500"><span className="group-dot" />{group.name}</h4>
                    <span className="text-xs text-slate-400">{groupTasks.length} task{groupTasks.length === 1 ? "" : "s"}</span>
                  </div>
                  <div className="divide-y divide-slate-100">
              {groupTasks.map((task) => (
                <article
                  key={task.id}
                  className="task-row flex flex-col gap-4 px-5 py-5 transition sm:px-6 lg:flex-row lg:items-center lg:justify-between"
                >
                  <div className="flex min-w-0 items-start gap-3">
                    <button
                      type="button"
                      onClick={() => updateStatus(task.id, task.status === "Completed" ? "Pending" : "Completed")}
                      aria-label={task.status === "Completed" ? `Reopen ${task.title}` : `Mark ${task.title} completed`}
                      title={task.status === "Completed" ? "Reopen task" : "Mark completed"}
                      className={`task-complete mt-1 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border text-xs transition ${
                        task.status === "Completed"
                          ? "border-emerald-500 bg-emerald-500 text-white"
                          : "border-slate-300 text-transparent hover:border-emerald-500 hover:bg-emerald-50 hover:text-emerald-600"
                      }`}
                    >
                      ✓
                    </button>

                    <div className="min-w-0">
                      <h4
                        className={`break-words font-semibold text-slate-900 ${
                          task.status === "Completed"
                            ? "text-slate-400 line-through"
                            : "text-slate-800"
                        }`}
                      >
                        {task.title}
                      </h4>
                      <p className="mt-1 break-words text-sm leading-5 text-slate-500">
                        {task.description || "No description provided."}
                      </p>
                      <div className="mt-3 flex flex-wrap items-center gap-3 text-xs">
                        <span
                          className={`priority-chip font-semibold ${priorityStyles[task.priority]}`}
                        >
                          {task.priority} priority
                        </span>
                        <span className="text-slate-300">•</span>
                        <span className={`due-date ${task.status !== "Completed" && task.dueDate && task.dueDate < todayKey ? "due-date-overdue" : "text-slate-500"}`}>
                          {task.status !== "Completed" && task.dueDate && task.dueDate < todayKey
                            ? `Overdue · ${formatDueDate(task.dueDate)}`
                            : task.dueDate === todayKey
                              ? "Due today"
                              : task.dueDate
                                ? `Due ${formatDueDate(task.dueDate)}`
                                : "No due date"}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 pl-8 lg:pl-0">
                    <span
                      className={`rounded-full px-3 py-1.5 text-xs font-semibold ${statusStyles[task.status]}`}
                    >
                      {task.status}
                    </span>

                    <select
                      aria-label={`Change status for ${task.title}`}
                      value={task.status}
                      onChange={(e) => updateStatus(task.id, e.target.value)}
                      className="max-w-36 rounded-lg border border-slate-200 bg-white px-2 py-2 text-xs outline-none focus:border-violet-400"
                    >
                      <option>Pending</option>
                      <option>In Progress</option>
                      <option>Completed</option>
                    </select>

                    <button
                      onClick={() => beginEdit(task)}
                      aria-label={`Edit ${task.title}`}
                      className="rounded-lg px-3 py-2 text-sm font-medium text-violet-700 transition hover:bg-violet-50"
                    >
                      Edit
                    </button>

                    <button
                      onClick={() => deleteTaskById(task.id)}
                      aria-label={`Delete ${task.title}`}
                      title="Delete task"
                      className="rounded-lg px-3 py-2 text-sm text-slate-400 transition hover:bg-rose-50 hover:text-rose-600"
                    >
                      Delete
                    </button>
                  </div>
                </article>
              ))}
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="flex flex-col justify-between gap-3 border-t border-slate-100 px-5 py-4 text-xs text-slate-500 sm:flex-row sm:items-center sm:px-6">
            <span>Showing {visibleTasks.length} of {filteredTasks.length} matching tasks</span>
            <div className="flex flex-wrap items-center gap-4">
              <button
                onClick={resetTasks}
                className="font-medium text-violet-700 hover:text-violet-900"
              >
                Refresh tasks
              </button>
            </div>
          </div>
        </section>
        )}

        <footer className="py-6 text-center text-xs text-slate-400">
          Built with React and Tailwind CSS v4 · TaskFlow
        </footer>
      </main>
    </div>
  );
}

export default App;
