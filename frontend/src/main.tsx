import './polyfills'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './styles/global.css'
import Shell from './components/Shell.tsx'
import LanguageProvider from './i18n/LanguageProvider.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <LanguageProvider>
      <Shell />
    </LanguageProvider>
  </StrictMode>,
)
