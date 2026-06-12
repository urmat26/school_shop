// ───── Shared Data Types ─────

interface ItemData {
  id: string;
  title: string;
  description: string;
  price: number;
  category: string;
  image: string;
  contact: string;
  author: string;
  created: string;
  status: string;
  views?: number;
  deletedAt?: string;
}

interface ItemFormData {
  title: string;
  description: string;
  price: number;
  category: string;
  contact: string;
  image: string;
}

interface UserData {
  username: string;
  password: string;
  createdAt: string;
  favorites?: string[];
}

interface MessageData {
  id: string;
  itemId: string;
  itemTitle: string;
  from: string;
  to: string;
  text: string;
  createdAt: string;
  read: boolean;
}

interface Conversation {
  itemId: string;
  itemTitle: string;
  otherUser: string;
  lastMessage: string;
  lastMessageAt: string;
  unread: number;
}

interface BinData {
  items: ItemData[];
  users: UserData[];
  messages: MessageData[];
}

// ───── Globals defined in JS files (lang.js, auth.js) ─────

declare namespace Lang {
  function t(key: string, fallback?: string): string;
  function onChange(cb: () => void): void;
}

declare namespace Auth {
  function init(): void;
  function getUser(): string | null;
  function requireAuth(callback?: () => void): void;
  function canEdit(item: ItemData): boolean;
  function login(username: string, password: string): Promise<boolean>;
  function register(username: string, password: string): Promise<boolean>;
  function logout(): void;
  function updateUI(): void;
}
