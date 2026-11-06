import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { Entry } from './Entry'
import '@fontsource-variable/inter/opsz.css'
import '@fontsource-variable/inter/opsz-italic.css'
import '@fontsource-variable/noto-serif'
import '@fontsource-variable/noto-serif/wght-italic.css'
import './styles.css'

const root = document.getElementById('root')

if (!root) throw new Error('Root element not found')

createRoot(root).render(
  <StrictMode>
    <Entry />
  </StrictMode>,
)
