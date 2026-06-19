/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** When "false", the API client hits the real FastAPI backend instead of the mock. */
  readonly VITE_USE_MOCK?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
