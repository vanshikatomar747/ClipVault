import { api } from './client';

export interface Todo {
  _id: string;
  userId: string;
  title: string;
  isCompleted: boolean;
  priority: 'low' | 'medium' | 'high';
  date: string;
  createdAt: string;
  updatedAt: string;
}

export const getTodos = async (startDate?: string, endDate?: string): Promise<Todo[]> => {
  const params = new URLSearchParams();
  if (startDate) params.append('startDate', startDate);
  if (endDate) params.append('endDate', endDate);
  
  const { data } = await api.get(`/todos?${params.toString()}`);
  return data;
};

export const createTodo = async (todo: { title: string; priority?: 'low' | 'medium' | 'high'; date: string }): Promise<Todo> => {
  const { data } = await api.post('/todos', todo);
  return data;
};

export const updateTodo = async (id: string, updates: Partial<Todo>): Promise<Todo> => {
  const { data } = await api.put(`/todos/${id}`, updates);
  return data;
};

export const deleteTodo = async (id: string): Promise<void> => {
  await api.delete(`/todos/${id}`);
};

export const getTodoStats = async (startDate: string, endDate: string, tzOffset?: number): Promise<Record<string, { total: number; completed: number }>> => {
  let url = `/todos/stats?startDate=${startDate}&endDate=${endDate}`;
  if (tzOffset !== undefined) {
    url += `&tzOffset=${tzOffset}`;
  }
  const { data } = await api.get(url);
  return data;
};
