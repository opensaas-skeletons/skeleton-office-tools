/// <reference types="vite/client" />

declare global {
  interface Window {
    __OPENED_FILE__?: string;
  }
}

export {};
