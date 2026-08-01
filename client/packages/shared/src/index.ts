export interface User {
  _id: string;
  name: string;
  email: string;
  profilePicture?: string;
  themePreference: 'light' | 'dark';
  clipboardTogglePreference: boolean;
  defaultNotebookId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Notebook {
  _id: string;
  userId: string;
  name: string;
  description?: string;
  color: string;
  icon: string;
  isDefault: boolean;
  isArchived: boolean;
  isPinned: boolean;
  isFavorite: boolean;
  itemCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface ClipboardItem {
  _id: string;
  userId: string;
  notebookId: string;
  text: string;
  source?: string;
  characterCount: number;
  wordCount: number;
  isFavorite: boolean;
  isPinned: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface AuthResponse {
  user: User;
  token: string;
}

export interface ErrorResponse {
  message: string;
  errors?: Record<string, string[]>;
}
