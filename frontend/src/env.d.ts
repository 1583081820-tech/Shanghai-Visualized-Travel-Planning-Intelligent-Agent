/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_BASE_URL?: string;
  readonly VITE_MAPTILER_KEY?: string;
  readonly VITE_AMAP_WEB_KEY?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
