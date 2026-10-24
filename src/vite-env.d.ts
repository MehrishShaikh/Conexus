/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_AI_ENDPOINT?: string
  readonly VITE_TRANSLATE_ENDPOINT?: string
  readonly VITE_DEPLOY_URL?: string
}
interface ImportMeta {
  readonly env: ImportMetaEnv
}
