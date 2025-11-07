import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import {BrowserRouter} from 'react-router-dom'
import './index.css'
import App from './App.jsx'
import SocketProvider from './provider/socket.jsx'
import WebRTCProvider from './provider/WebRTC.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <SocketProvider>
      <WebRTCProvider>
    <BrowserRouter>
    <App />
    </BrowserRouter>
    </WebRTCProvider>
    </SocketProvider>
  </StrictMode>,
)
