import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App.jsx'
import { SocketProvider } from './context/SocketProvider.jsx'
import {WebRTCProvider}  from './context/WebRTCProvider.jsx'

createRoot(document.getElementById('root')).render(
  <SocketProvider>
     <WebRTCProvider>
    <BrowserRouter>
        <App />
    </BrowserRouter>
     </WebRTCProvider>
  </SocketProvider>
);
