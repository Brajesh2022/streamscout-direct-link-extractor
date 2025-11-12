export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}
// StreamScout specific types
export interface DownloadLink {
  url: string;
  label: string;
  isTrusted: boolean;
}
export interface ProcessUrlResponse {
  links: DownloadLink[];
  pageTitle: string;
  isZipFile: boolean;
}
// Minimal real-world chat example types (shared by frontend and worker)
export interface User {
  id: string;
  name: string;
}
export interface Chat {
  id: string;
  title: string;
}
export interface ChatMessage {
  id: string;
  chatId: string;
  userId: string;
  text: string;
  ts: number; // epoch millis
}