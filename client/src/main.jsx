import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import {BrowserRouter} from 'react-router-dom'
import './index.css'
import App from './App.jsx'
import { SocketProvider } from './providers/SocketProvider.jsx'

createRoot(document.getElementById('root')).render(
  // <StrictMode>
    <SocketProvider>
    <BrowserRouter>
    <App />
    </BrowserRouter>
    </SocketProvider> 
  // </StrictMode>,
)
