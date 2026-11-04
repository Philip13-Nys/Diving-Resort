/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_FIREBASE_API_KEY: string;
  readonly VITE_FIREBASE_AUTH_DOMAIN: string;
  readonly VITE_FIREBASE_PROJECT_ID: string;

  readonly VITE_FIREBASE_API_KEYS: string;
  readonly VITE_FIREBASE_AUTH_DOMAINS: string;
  readonly VITE_FIREBASE_PROJECT_IDS: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
