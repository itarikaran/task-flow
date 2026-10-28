
import axios from "axios";

const api = axios.create({
  baseURL: "http://localhost:5000/api",
});

export const getTasks = async () => {
  const response = await api.get("/tasks");
  return response.data;
};

export const getGroups = async () => {
  const response = await api.get("/groups");
  return response.data;
};

export const createGroup = async (group) => {
  const response = await api.post("/groups", group);
  return response.data;
};

export const createTask = async (task) => {
  const response = await api.post("/tasks", task);
  return response.data;
};

export const updateTask = async (id, updates) => {
  const response = await api.patch(`/tasks/${id}`, updates);
  return response.data;
};

export const deleteTask = async (id) => {
  const response = await api.delete(`/tasks/${id}`);
  return response.data;
};
