import React from 'react'
import ReactDOM from 'react-dom/client'
import '@fontsource-variable/bricolage-grotesque'
import '@fontsource/atkinson-hyperlegible/400.css'
import '@fontsource/atkinson-hyperlegible/700.css'
import '@fontsource/atkinson-hyperlegible/400-italic.css'
import '@fontsource-variable/jetbrains-mono'
import './index.css'
import App from './App'

// Entra ID redirects back to the site root with ?code=… (or ?error=…). Send that to the playground page.
if (/[?&](code|error)=/.test(window.location.search) && !window.location.hash.startsWith('#/oauth-playground')) {
  window.history.replaceState(null, '', `${window.location.pathname}${window.location.search}#/oauth-playground`)
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
