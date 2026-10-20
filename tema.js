import { PRACA_IMG } from "../assets/imagens";

// Tokens de marca — extraídos do brasão de Vassouras
export const BRAND = {
  verde: "#005D42",
  verdeEscuro: "#003620",
  verdeVivo: "#0B7A54",
  coral: "#FD6F59",
  azul: "#0171D3",
  ambar: "#FEB449",
  creme: "#F7F2E7",
  grafite: "#0E1613",
  grafiteSuave: "#0B0F0D",
  texto: "#F7F2E7",
  textoSuave: "rgba(247,242,231,0.86)",
  vidro: "rgba(10,22,18,0.52)",
  vidroBorda: "rgba(247,242,231,0.14)",
};

export const CORES_GRAFICO = [BRAND.verde, BRAND.coral, BRAND.azul, BRAND.ambar, "#8A9A93", "#C97F6B", "#4FA3E8", "#B9D9C8"];

// Endereço do site institucional (landing page) — usado nos links de privacidade
export const SITE_URL = "https://miguelitto-prog-landing-page.vercel.app";

export const STYLE_TAG = `
  @import url('https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,400;9..144,500;9..144,600;9..144,700&family=Inter:wght@400;500;600;700&family=IBM+Plex+Mono:wght@500&display=swap');
  .vd-root {
    font-family: 'Inter', sans-serif;
    background: linear-gradient(180deg, #0A1613 0%, #050A08 100%);
    color: ${BRAND.texto};
    position: relative;
    isolation: isolate;
  }
  .vd-bg-photo {
    position: fixed;
    inset: -3%;
    background-image: url(${PRACA_IMG});
    background-size: cover;
    background-position: center 38%;
    filter: blur(3px) saturate(1.08) brightness(0.92);
    transform: scale(1.04);
    z-index: -2;
  }
  .vd-bg-veil {
    position: fixed;
    inset: 0;
    background:
      radial-gradient(ellipse 1200px 700px at 10% -10%, rgba(253,111,89,0.14), transparent 55%),
      radial-gradient(ellipse 900px 600px at 100% 10%, rgba(254,180,73,0.10), transparent 55%),
      linear-gradient(180deg, rgba(3,10,8,0.45) 0%, rgba(3,10,8,0.62) 45%, rgba(2,7,6,0.88) 100%);
    z-index: -1;
  }
  .vd-display { font-family: 'Fraunces', serif; }
  .vd-mono { font-family: 'IBM Plex Mono', monospace; letter-spacing: 0.02em; }
  .vd-focus:focus-visible { outline: 2px solid ${BRAND.ambar}; outline-offset: 2px; }
  input.vd-input, select.vd-input, textarea.vd-input {
    font-family: 'Inter', sans-serif;
    background: #fff;
    border: 1.5px solid #E3D9CC;
    border-radius: 10px;
    padding: 10px 12px;
    font-size: 16px;
    color: ${BRAND.grafite};
    width: 100%;
    transition: border-color .15s ease;
  }
  input.vd-input:focus, select.vd-input:focus, textarea.vd-input:focus {
    outline: none;
    border-color: ${BRAND.azul};
  }
  .vd-input[aria-invalid="true"] { border-color: ${BRAND.coral}; }
  .vd-chip {
    border: 1.5px solid #E3D9CC;
    background: #fff;
    color: ${BRAND.grafite};
    border-radius: 999px;
    padding: 8px 14px;
    font-size: 13px;
    font-weight: 500;
    cursor: pointer;
    transition: background .15s ease, border-color .15s ease;
    text-align: left;
  }
  .vd-chip[data-active="true"] { border-color: transparent; color: #fff; }
  .vd-root .bg-white {
    background: ${BRAND.vidro} !important;
    backdrop-filter: blur(16px);
    -webkit-backdrop-filter: blur(16px);
    border-color: ${BRAND.vidroBorda} !important;
  }
  .vd-tabela th, .vd-tabela td { padding: 10px 14px; text-align: left; vertical-align: top; }
  .vd-tabela tr + tr { border-top: 1px solid rgba(247,242,231,0.14); }
  .vd-btn {
    display: inline-flex; align-items: center; gap: 6px;
    padding: 9px 16px; border-radius: 999px; font-size: 14px; font-weight: 500;
    cursor: pointer; border: 1px solid transparent;
  }
  .vd-btn:disabled { opacity: .5; cursor: default; }
  .vd-btn-sec { background: rgba(255,255,255,0.06); border-color: rgba(247,242,231,0.2); color: ${BRAND.texto}; }
  @media (prefers-reduced-motion: reduce) {
    * { animation-duration: 0.001ms !important; transition-duration: 0.001ms !important; }
  }
`;
