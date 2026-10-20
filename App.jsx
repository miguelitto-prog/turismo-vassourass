import { lazy, Suspense } from "react";
import Visitantes from "./pages/Visitantes";

// O painel só é baixado por quem acessa /painel — a pesquisa pública fica leve.
const Prefeitura = lazy(() => import("./pages/Prefeitura"));

// /painel (ou o endereço antigo /prefeitura) abre o painel do Conselho.
// Qualquer outro endereço abre a pesquisa pública de visitantes.
export default function App() {
  const caminho = window.location.pathname.toLowerCase();
  const ehPainel = caminho.startsWith("/painel") || caminho.startsWith("/prefeitura");
  if (!ehPainel) return <Visitantes />;
  return (
    <Suspense fallback={<div style={{ minHeight: "100vh", background: "#0A1613" }} />}>
      <Prefeitura />
    </Suspense>
  );
}
