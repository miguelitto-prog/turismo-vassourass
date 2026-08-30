import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Prefeitura from "./pages/Prefeitura";
import Visitantes from "./pages/Visitantes";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/prefeitura" element={<Prefeitura />} />
        <Route path="/visitantes" element={<Visitantes />} />
        <Route path="/" element={<Navigate to="/visitantes" replace />} />
        <Route path="*" element={<Navigate to="/visitantes" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
