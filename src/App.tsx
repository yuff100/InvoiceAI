import React from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import Navbar from './components/Navbar'
import HomePage from './pages/Home'
import UploadPage from './pages/Upload'
import HistoryPage from './pages/History'
import SettingsPage from './pages/Settings'
import TestTesseractPage from './pages/test-tesseract'
import SimpleOCRTest from './components/SimpleOCRTest'

function App() {
  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <main className="container-desktop">
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/upload" element={<UploadPage />} />
          <Route path="/history" element={<HistoryPage />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="/test-tesseract" element={<TestTesseractPage />} />
          <Route path="/simple-test" element={<SimpleOCRTest />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
    </div>
  )
}

export default App