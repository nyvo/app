import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import { EmptyStateProvider } from './context/EmptyStateContext'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <EmptyStateProvider>
      <App />
    </EmptyStateProvider>
  </React.StrictMode>,
)
