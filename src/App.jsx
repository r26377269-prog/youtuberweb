import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import PublicWebsite from './components/PublicWebsite';
import AdminPortal from './components/AdminPortal';
import './styles/index.css';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<PublicWebsite />} />
        <Route path="/admin/*" element={<AdminPortal />} />
      </Routes>
    </BrowserRouter>
  );
}
