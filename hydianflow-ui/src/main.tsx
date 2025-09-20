import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { api } from "@/lib/api"
import './index.css'
import App from './App.tsx'

api.setBaseURL(import.meta.env.VITE_API_BASE_URL ?? "");
api.setWithCredentials(true);

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
