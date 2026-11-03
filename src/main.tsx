import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import '@fontsource-variable/inter'
import '@fontsource-variable/inter/wght-italic.css'
import '@fontsource-variable/noto-serif'
import '@fontsource-variable/noto-serif/wght-italic.css'
import '@fontsource-variable/outfit'
import './styles.css'

const root = document.getElementById('root')

if (!root) throw new Error('Root element not found')

createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
