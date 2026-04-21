import { BrowserRouter, Routes, Route } from 'react-router-dom'
import TrackingPage from './pages/TrackingPage'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/track/:token" element={<TrackingPage />} />
        <Route path="/" element={<TrackingPage />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
