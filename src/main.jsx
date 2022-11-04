import React from 'react'
import ReactDOM from 'react-dom/client'
import { App } from './App'
import './index.css'

// Horrible hack to get rid of the math module:
for (let key of Array.from(Object.getOwnPropertyNames(Math))) {
  window[key.toLowerCase()] = Math[key]
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)
