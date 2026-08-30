import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Visitantes from './pages/Visitantes';
import Prefeitura from './pages/Prefeitura';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/visitantes" element={<Visitantes />} />
        <Route path="/prefeitura" element={<Prefeitura />} />
        {/* Redirecionamento padrão */}
        <Route path="*" element={<Navigate to="/visitantes" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
