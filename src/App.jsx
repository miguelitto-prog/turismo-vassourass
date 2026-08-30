import { useState } from 'react';
import Visitantes from './pages/Visitantes';
import Prefeitura from './pages/Prefeitura';

export default function App() {
  const [pagina, setPagina] = useState('visitantes');

  return (
    <div className="relative min-h-screen">
      {/* Botões flutuantes para alternar as abas */}
      <div className="fixed bottom-4 right-4 z-50 flex gap-2 bg-black/80 backdrop-blur border border-white/20 p-1.5 rounded-full shadow-lg">
        <button
          onClick={() => setPagina('visitantes')}
          className={`px-3 py-1.5 text-xs font-medium rounded-full transition-colors ${
            pagina === 'visitantes'
              ? 'bg-emerald-600 text-white'
              : 'text-gray-300 hover:text-white'
          }`}
        >
          Formulário Visitantes
        </button>
        <button
          onClick={() => setPagina('prefeitura')}
          className={`px-3 py-1.5 text-xs font-medium rounded-full transition-colors ${
            pagina === 'prefeitura'
              ? 'bg-emerald-600 text-white'
              : 'text-gray-300 hover:text-white'
          }`}
        >
          Painel Prefeitura
        </button>
      </div>

      {/* Renderiza a página ativa */}
      {pagina === 'visitantes' ? <Visitantes /> : <Prefeitura />}
    </div>
  );
}
