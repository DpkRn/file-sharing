import {Routes,Route} from 'react-router-dom'
import './App.css'
import Sender from './pages/Sender'
import Reciever from './pages/Reciever'

function App() {
 

  return (
    <>
    <Routes>
      <Route path='/' element={<Sender/>}/>
     <Route path="/share/:url" element={<Reciever />} />
    </Routes>
     
    </>
  )
}

export default App
