import { invoke, isTauri } from '@tauri-apps/api/core';
export type Workspace = 'personal';
export type Language = 'en' | 'ru';
export type Priority = 'none' | 'low' | 'medium' | 'high';
export type View = 'today' | 'tasks' | 'projects' | 'focus';
export interface Task {
  id: string;
  title: string;
  notes: string;
  scheduledDate: string | null;
  deadline: string | null;
  priority: Priority;
  completed: boolean;
  estimateMinutes: number;
  createdAt: string;
  updatedAt: string;
  completedAt: string | null;
  revision: number;
  projectId: string | null;
}
export type TaskInput = Pick<
  Task,
  | 'title'
  | 'notes'
  | 'scheduledDate'
  | 'deadline'
  | 'priority'
  | 'completed'
  | 'estimateMinutes'
  | 'revision'
  | 'projectId'
>;
export interface Project {
  id: string;
  name: string;
  description: string;
  color: string;
  archived: boolean;
  parentId: string | null;
  createdAt: string;
  updatedAt: string;
  revision: number;
}
export type ProjectInput = Pick<
  Project,
  'name' | 'description' | 'color' | 'archived' | 'revision' | 'parentId'
>;
export interface DayPlan {
  date: string;
  exists: boolean;
  revision: number;
  taskIds: string[];
}
export interface FocusSession {
  id: string;
  kind: 'work' | 'break';
  state: 'running' | 'paused' | 'completed';
  taskId: string | null;
  projectId: string | null;
  label: string;
  startedAt: string;
  endedAt: string | null;
  targetSeconds: number | null;
  revision: number;
  elapsedMilliseconds: number;
}
export interface FocusState {
  active: FocusSession | null;
  sessions: FocusSession[];
  now: string;
  taskMilliseconds: Record<string, number>;
  projectMilliseconds: Record<string, number>;
}
export interface Statistics {
  days: { date: string; milliseconds: number }[];
  projects: { id: string; name: string; color: string; milliseconds: number }[];
  tasks: Record<string, number>;
  totalMilliseconds: number;
  sessionCount: number;
}
export interface Preferences {
  theme: string;
  language: Language;
  dailyGoalMinutes: string;
  breakMinutes: string;
  sidebarCollapsed: string;
  glassTransparency: string;
}
export interface WorkspaceSnapshot {
  tasks: Task[];
  projects: Project[];
  plan: DayPlan;
  focus: FocusState;
  preferences: Preferences;
  dayStatistics: Statistics;
}
export interface BackendStatus {
  ready: boolean;
  error: string | null;
}
export type MutationOperation =
  | 'create'
  | 'update'
  | 'delete'
  | 'createProject'
  | 'updateProject'
  | 'savePlan'
  | 'startFocus'
  | 'pauseFocus'
  | 'resumeFocus'
  | 'stopFocus'
  | 'editSession'
  | 'deleteSession'
  | 'savePreferences';
export type ApiOperation =
  | MutationOperation
  | 'workspace'
  | 'list'
  | 'projects'
  | 'plan'
  | 'suggestPlan'
  | 'focus'
  | 'statistics'
  | 'preferences';

export interface RequestOptions {
  workspace?: Workspace;
  id?: string;
  revision?: number;
  body?: unknown;
  date?: string;
  zone?: string;
  from?: string;
  to?: string;
  limit?: number;
}
export const desktop = isTauri();
export function backendStatus(): Promise<BackendStatus> {
  return invoke('backend_status');
}
export function request<T>(operation: ApiOperation, options: RequestOptions = {}): Promise<T> {
  return invoke<T>('api_request', { operation, ...options });
}
export const inputOf = (task: Task): TaskInput => ({
  title: task.title,
  notes: task.notes,
  scheduledDate: task.scheduledDate,
  deadline: task.deadline,
  priority: task.priority,
  completed: task.completed,
  estimateMinutes: task.estimateMinutes,
  revision: task.revision,
  projectId: task.projectId,
});
export const zone = () => Intl.DateTimeFormat().resolvedOptions().timeZone;

export function applyNativeLanguage(language: Language): Promise<void> {
  return desktop ? invoke('set_language', { language }) : Promise.resolve();
}
