import React from 'react'
import { Route, Routes } from 'react-router-dom'
import './App.css'
import FileShare from './components/Fileshare'
import Sender from './components/Sender'
import Reciever from './components/Reciever'

function App() {

  const params = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null
  const room = params ? params.get('room') : null

  return (
    <>
      <Routes>
        <Route path="/" element={room ? <Reciever /> : <Sender />} />
      </Routes>

      <FileShare />
    </>
  )
}

export default App
