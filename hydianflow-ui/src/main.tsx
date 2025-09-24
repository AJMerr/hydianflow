import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { api } from "@/lib/api"
import './index.css'
import App from './App.tsx'
import { Toaster } from './components/ui/sonner.tsx'
import { createBrowserRouter, RouterProvider } from 'react-router-dom'

api.setBaseURL(import.meta.env.VITE_API_BASE_URL ?? "");
api.setWithCredentials(true);

const router = createBrowserRouter([
  { path: "/", lazy: async () => ({ Component: (await import("./routes/LandingPage")).default }) },
  { path: "/app", element: <App /> },
  { path: "*", lazy: async () => ({ Component: (await import("./routes/NotFound")).default }) },
]);


createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <RouterProvider router={router} />
    <Toaster richColors closeButton position="top-right" />
  </StrictMode>,
)
