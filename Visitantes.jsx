import { useEffect, useMemo, useRef, useState } from "react";
import { Check, ChevronLeft, ChevronRight, Info, RotateCcw } from "lucide-react";
import { BRASAO_IMG } from "../assets/imagens";
import { BRAND, SITE_URL, STYLE_TAG } from "../lib/tema";
import { carregarCadastros, enviarResposta, salvarContato } from "../lib/dados";
import { Campo, UFS, EXTERIOR, municipioValido } from "../components/Campo";

// ---------------------------------------------------------------------------
// Opções fixas
// ---------------------------------------------------------------------------
const SIM_NAO = ["Sim", "Não"];
const OPCOES = {
  tipoVisitante: ["Turista", "Excursionista (bate-volta)", "Participante de evento/congresso", "Acompanhante de paciente / turismo de saúde", "Outro"],
  faixaEtaria: ["Até 17", "18–24", "25–34", "35–44", "45–59", "60+"],
  genero: ["Feminino", "Masculino", "Outro", "Prefiro não informar"],
  motivoViagem: ["Turismo histórico/cultural", "Eventos/Congressos", "Turismo de saúde / médico-hospitalar", "Turismo religioso", "Gastronomia", "Ecoturismo/Natureza", "Negócios", "Visita a familiares", "Outro"],
  comQuemViaja: ["Sozinho(a)", "Em casal", "Em família", "Com amigos", "Em grupo organizado/excursão"],
  tipoHospedagem: ["Hotel", "Pousada", "Casa de familiares/amigos", "Airbnb/aluguel por temporada", "Bate-volta (sem pernoite)", "Outro"],
  ondeGastar: ["Alimentação", "Hospedagem", "Compras / artesanato", "Atrativos turísticos", "Transporte local"],
  aquisicaoIngressos: ["Compra no local", "Compra antecipada online", "Incluso em pacote turístico", "Não se aplica"],
  avaliacao: ["1 – Muito ruim", "2 – Ruim", "3 – Regular", "4 – Boa", "5 – Excelente"],
  comoSoube: ["Indicação de amigos/família", "Redes sociais", "Internet / Google", "Evento", "TV, rádio ou jornal", "Agência de turismo", "Outro"],
};
const SEM_EVENTO = "Não estou participando de um evento";
const FORA_DA_LISTA = "Outro (não está na lista)";
const HOTEL_OU_POUSADA = ["Hotel", "Pousada"];

// ---------------------------------------------------------------------------
// Etapas da pesquisa. `mostrarSe` esconde perguntas que não se aplicam.
// ---------------------------------------------------------------------------
function montarEtapas(cadastros, pontoNaUrl) {
  const eventosAtivos = cadastros.eventos.filter((e) => e.ativo).map((e) => e.nome);
  const hospedagens = cadastros.hospedagens.filter((h) => h.ativo).map((h) => h.nome).sort((a, b) => a.localeCompare(b, "pt-BR"));
  const atrativos = cadastros.atrativos.filter((a) => a.ativo).map((a) => a.nome);

  return [
    {
      titulo: "Sobre você",
      campos: [
        { id: "autoriza", label: "Você autoriza o uso das suas respostas, de forma anônima, para estatística e planejamento do turismo?", type: "radio", options: SIM_NAO, required: true },
        { id: "receberComunicacoes", label: "Quer receber notícias e eventos de Vassouras por e-mail?", type: "radio", options: SIM_NAO },
        { id: "email", label: "Seu e-mail", type: "email", placeholder: "seuemail@exemplo.com", required: true,
          ajuda: "O e-mail é guardado separado das respostas, que continuam anônimas.",
          mostrarSe: (d) => d.receberComunicacoes === "Sim" },
        { id: "tipoVisitante", label: "Você está em Vassouras como:", type: "select", options: OPCOES.tipoVisitante, outro: "tipoVisitanteOutro", required: true },
        { id: "faixaEtaria", label: "Faixa etária", type: "select", options: OPCOES.faixaEtaria },
        { id: "genero", label: "Gênero", type: "select", options: OPCOES.genero },
        { id: "uf", label: "Estado onde você mora", type: "select", options: [...UFS.map(([s, n]) => `${n} (${s})`), "Moro fora do Brasil"], required: true },
        { id: "municipio", label: "Município onde você mora", type: "municipio", dependeDe: "ufSigla", required: true,
          mostrarSe: (d) => d.ufSigla && d.ufSigla !== EXTERIOR },
        { id: "pais", label: "País onde você mora", type: "text", placeholder: "Ex: Portugal", mostrarSe: (d) => d.ufSigla === EXTERIOR },
      ],
    },
    {
      titulo: "Sua viagem",
      campos: [
        { id: "motivoViagem", label: "Motivos da viagem a Vassouras (pode marcar mais de um)", type: "multi", options: OPCOES.motivoViagem, outro: "motivoViagemOutro" },
        { id: "evento", label: "Está participando de algum destes eventos?", type: "select", options: [...eventosAtivos, SEM_EVENTO],
          mostrarSe: () => eventosAtivos.length > 0 },
        { id: "comQuemViaja", label: "Com quem você está viajando?", type: "select", options: OPCOES.comQuemViaja },
        { id: "tipoHospedagem", label: "Onde você está hospedado?", type: "select", options: OPCOES.tipoHospedagem, outro: "tipoHospedagemOutro" },
        { id: "estabelecimento", label: "Qual hotel ou pousada?", type: "select", options: [...hospedagens, FORA_DA_LISTA],
          mostrarSe: (d) => HOTEL_OU_POUSADA.includes(d.tipoHospedagem) },
        { id: "estabelecimentoOutro", label: "Nome do hotel ou pousada", type: "text",
          mostrarSe: (d) => HOTEL_OU_POUSADA.includes(d.tipoHospedagem) && d.estabelecimento === FORA_DA_LISTA },
        { id: "noites", label: "Quantas noites vai ficar em Vassouras?", type: "number", placeholder: "Ex: 2",
          mostrarSe: (d) => d.tipoHospedagem && d.tipoHospedagem !== "Bate-volta (sem pernoite)" },
      ],
    },
    {
      titulo: "Gastos",
      campos: [
        { id: "gastoDiario", label: "Quanto você estima gastar por dia em Vassouras, por pessoa?", type: "moeda",
          ajuda: "Opcional. Um valor aproximado já ajuda." },
        { id: "ondeGastar", label: "Com o que você gasta ou pretende gastar na visita?", type: "multi", options: OPCOES.ondeGastar },
        { id: "guiaCredenciado", label: "Esteve acompanhado por guia de turismo credenciado?", type: "radio", options: SIM_NAO },
        { id: "agenciaReceptivo", label: "Usou agência de turismo receptivo para organizar a visita?", type: "radio", options: SIM_NAO },
        { id: "aquisicaoIngressos", label: "Nos atrativos pagos, como comprou (ou vai comprar) os ingressos?", type: "select", options: OPCOES.aquisicaoIngressos },
      ],
    },
    {
      titulo: "Atrativos",
      campos: [
        { id: "atrativos", label: "Quais atrativos você visitou ou pretende visitar? (pode marcar vários)", type: "multi", options: [...atrativos, "Outro"], outro: "atrativosOutro" },
      ],
    },
    {
      titulo: "Avaliação",
      campos: [
        { id: "avaliacao", label: "Como avalia sua experiência em Vassouras?", type: "select", options: OPCOES.avaliacao },
        { id: "recomendaria", label: "Recomendaria Vassouras como destino turístico?", type: "radio", options: SIM_NAO },
        { id: "comoSoube", label: "Como ficou sabendo de Vassouras? (pode marcar mais de um)", type: "multi", options: OPCOES.comoSoube, outro: "comoSoubeOutro" },
        { id: "gostou", label: "O que mais gostou na cidade?", type: "textarea", placeholder: "Opcional" },
        { id: "podeMelhorar", label: "O que pode melhorar para quem visita Vassouras?", type: "textarea", placeholder: "Opcional" },
        { id: "codigoEntrevistador", label: "Código do entrevistador ou ponto de coleta", type: "text", placeholder: "Preencha só se um entrevistador pediu",
          mostrarSe: () => !pontoNaUrl },
      ],
    },
  ];
}

function dadosIniciais(etapas) {
  const obj = {};
  etapas.forEach((e) => e.campos.forEach((c) => { obj[c.id] = c.type === "multi" ? [] : ""; }));
  return obj;
}

// ---------------------------------------------------------------------------
// Rascunho local: permite continuar de onde parou (mesmo aparelho/navegador)
// ---------------------------------------------------------------------------
const CHAVE_RASCUNHO = "vd_pesquisa_rascunho_v1";
const VALIDADE_RASCUNHO_MS = 7 * 24 * 60 * 60 * 1000;

function lerRascunho() {
  try {
    const bruto = localStorage.getItem(CHAVE_RASCUNHO);
    if (!bruto) return null;
    const r = JSON.parse(bruto);
    if (!r.salvoEm || Date.now() - r.salvoEm > VALIDADE_RASCUNHO_MS) {
      localStorage.removeItem(CHAVE_RASCUNHO);
      return null;
    }
    return r;
  } catch {
    return null;
  }
}
function gravarRascunho(dados, passo) {
  try { localStorage.setItem(CHAVE_RASCUNHO, JSON.stringify({ dados, passo, salvoEm: Date.now() })); } catch { /* navegador sem armazenamento */ }
}
function apagarRascunho() {
  try { localStorage.removeItem(CHAVE_RASCUNHO); } catch { /* idem */ }
}

function lerParametrosUrl() {
  const p = new URLSearchParams(window.location.search);
  return { ponto: (p.get("ponto") || p.get("p") || "").trim().slice(0, 80), evento: (p.get("evento") || "").trim() };
}

const vazio = (v) => v === "" || v === null || v === undefined || (Array.isArray(v) && v.length === 0);
const EMAIL_OK = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

// ---------------------------------------------------------------------------
// Página
// ---------------------------------------------------------------------------
export default function Visitantes() {
  const [cadastros, setCadastros] = useState(null);
  const parametros = useMemo(lerParametrosUrl, []);
  const etapas = useMemo(() => (cadastros ? montarEtapas(cadastros, Boolean(parametros.ponto)) : []), [cadastros, parametros.ponto]);

  const [dados, setDados] = useState(null);
  const [passo, setPasso] = useState(0);
  const [erros, setErros] = useState({});
  const [retomado, setRetomado] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [falhaEnvio, setFalhaEnvio] = useState("");
  const [concluido, setConcluido] = useState(false);
  const topoRef = useRef(null);

  // Carrega cadastros e recupera rascunho
  useEffect(() => {
    (async () => {
      const c = await carregarCadastros();
      setCadastros(c);
      const base = dadosIniciais(montarEtapas(c, Boolean(parametros.ponto)));
      const eventoUrl = c.eventos.find((e) => e.ativo && (e.id === parametros.evento || e.nome === parametros.evento));
      if (eventoUrl) base.evento = eventoUrl.nome;
      const rascunho = lerRascunho();
      if (rascunho) {
        setDados({ ...base, ...rascunho.dados });
        setPasso(Math.min(rascunho.passo || 0, 4));
        setRetomado(true);
      } else {
        setDados(base);
      }
    })();
  }, [parametros]);

  // Salva rascunho a cada mudança
  useEffect(() => {
    if (dados && !concluido) gravarRascunho(dados, passo);
  }, [dados, passo, concluido]);

  if (!cadastros || !dados) {
    return (
      <Moldura>
        <div className="py-24 text-center text-sm" style={{ color: BRAND.textoSuave }}>Carregando…</div>
      </Moldura>
    );
  }

  const etapa = etapas[passo];
  const visiveis = etapa.campos.filter((c) => !c.mostrarSe || c.mostrarSe(dados));
  const ultimo = passo === etapas.length - 1;

  function set(id, valor) {
    setDados((d) => {
      const novo = { ...d, [id]: valor };
      if (id === "uf") {
        const m = UFS.find(([s, n]) => `${n} (${s})` === valor);
        novo.ufSigla = valor === "Moro fora do Brasil" ? EXTERIOR : m ? m[0] : "";
        novo.municipio = "";
      }
      return novo;
    });
    setErros((e) => ({ ...e, [id]: undefined }));
  }

  function validar() {
    const novos = {};
    visiveis.forEach((c) => {
      const v = dados[c.id];
      if (c.required && vazio(v)) novos[c.id] = "Responda esta pergunta para continuar.";
      else if (c.id === "autoriza" && v === "Não") novos[c.id] = "Sem a sua autorização não podemos registrar as respostas. Se mudar de ideia, marque Sim.";
      else if (c.id === "email" && v && !EMAIL_OK.test(v)) novos[c.id] = "Confira o e-mail: ele precisa ter o formato nome@provedor.com.";
      else if (c.type === "municipio" && v && !municipioValido(dados.ufSigla, v)) novos[c.id] = "Escolha um município da lista.";
      else if (c.type === "number" && v !== "" && (Number(v) < 0 || Number(v) > 365)) novos[c.id] = "Informe um número entre 0 e 365.";
    });
    setErros(novos);
    const primeiro = Object.keys(novos)[0];
    if (primeiro) document.getElementById(`campo-${primeiro}`)?.scrollIntoView({ behavior: "smooth", block: "center" });
    return !primeiro;
  }

  function irPara(n) {
    setPasso(n);
    setErros({});
    topoRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function recomecar() {
    apagarRascunho();
    const base = dadosIniciais(etapas);
    const eventoUrl = cadastros.eventos.find((e) => e.ativo && (e.id === parametros.evento || e.nome === parametros.evento));
    if (eventoUrl) base.evento = eventoUrl.nome;
    setDados(base);
    setPasso(0);
    setErros({});
    setRetomado(false);
  }

  async function enviar() {
    if (!validar()) return;
    setEnviando(true);
    setFalhaEnvio("");

    // Monta o registro só com as perguntas que apareceram para a pessoa.
    // O e-mail NÃO entra na resposta.
    const registro = {};
    etapas.forEach((e) => e.campos.forEach((c) => {
      if (c.id === "email") return;
      if (c.mostrarSe && !c.mostrarSe(dados)) return;
      registro[c.id] = dados[c.id];
      if (c.outro) registro[c.outro] = dados[c.outro] || "";
    }));
    registro.ufSigla = dados.ufSigla || "";
    registro.noites = registro.noites === undefined ? (dados.tipoHospedagem === "Bate-volta (sem pernoite)" ? 0 : "") : registro.noites;
    if (registro.estabelecimento === FORA_DA_LISTA) registro.estabelecimento = registro.estabelecimentoOutro || "Outro";
    delete registro.estabelecimentoOutro;
    if (registro.evento === SEM_EVENTO) registro.evento = "";
    registro.codigoEntrevistador = parametros.ponto || registro.codigoEntrevistador || "";
    registro.timestamp = new Date().toISOString();

    try {
      await enviarResposta(registro);
    } catch {
      setEnviando(false);
      setFalhaEnvio("Não foi possível enviar agora. Suas respostas continuam salvas neste aparelho — confira a internet e toque em Enviar de novo.");
      return;
    }
    if (dados.receberComunicacoes === "Sim" && dados.email) {
      // Falha no cadastro do e-mail não invalida a resposta já enviada.
      try { await salvarContato(dados.email); } catch { /* segue */ }
    }
    apagarRascunho();
    setEnviando(false);
    setConcluido(true);
    topoRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  if (concluido) {
    return (
      <Moldura topoRef={topoRef}>
        <div className="rounded-3xl bg-white p-7 md:p-9" style={{ border: "1px solid rgba(247,242,231,0.14)" }}>
          <div className="flex flex-col items-center text-center py-14 px-4">
            <div className="w-16 h-16 rounded-full flex items-center justify-center mb-5" style={{ background: BRAND.verde }}>
              <Check color="#fff" size={30} />
            </div>
            <h2 className="vd-display text-2xl mb-2">Resposta enviada</h2>
            <p className="text-sm mb-7 max-w-sm" style={{ color: BRAND.textoSuave }}>
              Obrigado. Suas respostas ajudam o Conselho Municipal de Turismo a planejar uma Vassouras melhor para quem visita.
            </p>
            <a href={SITE_URL} className="vd-btn text-white vd-focus" style={{ background: BRAND.verde }}>Conhecer os atrativos de Vassouras</a>
          </div>
        </div>
      </Moldura>
    );
  }

  return (
    <Moldura topoRef={topoRef}>
      <div className="mb-8">
        <h1 className="vd-display text-3xl mb-2">Pesquisa de turismo</h1>
        <p className="text-sm max-w-xl" style={{ color: BRAND.textoSuave }}>
          Conte como está sendo sua visita a Vassouras. A pesquisa é anônima e você responde em pouco tempo.
        </p>
      </div>

      {retomado && (
        <div className="flex items-center justify-between gap-3 flex-wrap mb-5 px-4 py-3 rounded-2xl text-sm" style={{ background: "rgba(254,180,73,0.14)", border: "1px solid rgba(254,180,73,0.4)" }}>
          <span>Você continuou de onde parou.</span>
          <button type="button" className="flex items-center gap-1.5 underline vd-focus" onClick={recomecar}>
            <RotateCcw size={14} /> Começar de novo
          </button>
        </div>
      )}

      <div className="rounded-3xl bg-white p-6 md:p-9" style={{ border: "1px solid rgba(247,242,231,0.14)" }}>
        {/* Progresso */}
        <div className="flex items-center gap-1.5 mb-3" aria-hidden="true">
          {etapas.map((_, i) => (
            <div key={i} className="h-1.5 rounded-full flex-1" style={{ background: i <= passo ? BRAND.verdeVivo : "rgba(247,242,231,0.18)", transition: "background .2s" }} />
          ))}
        </div>
        <p className="text-xs mb-8" style={{ color: BRAND.textoSuave }}>
          Etapa {passo + 1} de {etapas.length}: <strong style={{ color: BRAND.texto }}>{etapa.titulo}</strong>
        </p>

        <div className="space-y-7 min-h-[260px]">
          {visiveis.map((campo) => (
            <div key={campo.id} id={`campo-${campo.id}`}>
              <label htmlFor={campo.id} className="block text-[15px] font-medium mb-2">
                {campo.label}{campo.required && <span style={{ color: BRAND.coral }} aria-label="obrigatória"> *</span>}
              </label>
              {campo.ajuda && <p className="text-xs mb-2" style={{ color: BRAND.textoSuave }}>{campo.ajuda}</p>}
              <Campo campo={campo} valor={dados[campo.id] ?? ""} onChange={(v) => set(campo.id, v)} dados={dados} set={set} erro={erros[campo.id]} />
              {erros[campo.id] && <p className="text-xs mt-2" role="alert" style={{ color: "#FFB3A6" }}>{erros[campo.id]}</p>}
            </div>
          ))}
        </div>

        {falhaEnvio && (
          <p className="text-sm mt-6 px-4 py-3 rounded-xl" role="alert" style={{ background: "rgba(253,111,89,0.16)", color: "#FFD3CB" }}>{falhaEnvio}</p>
        )}

        <div className="flex items-center justify-between mt-10 pt-6" style={{ borderTop: "1px solid rgba(247,242,231,0.14)" }}>
          <button
            type="button"
            className="vd-btn vd-focus disabled:opacity-30"
            style={{ color: BRAND.textoSuave, paddingLeft: 4 }}
            disabled={passo === 0}
            onClick={() => irPara(Math.max(0, passo - 1))}
          >
            <ChevronLeft size={16} /> Voltar
          </button>
          {!ultimo ? (
            <button type="button" className="vd-btn text-white vd-focus" style={{ background: BRAND.verdeVivo }} onClick={() => validar() && irPara(passo + 1)}>
              Continuar <ChevronRight size={16} />
            </button>
          ) : (
            <button type="button" className="vd-btn text-white vd-focus" style={{ background: BRAND.verdeVivo }} disabled={enviando} onClick={enviar}>
              {enviando ? "Enviando…" : <>Enviar respostas <Check size={16} /></>}
            </button>
          )}
        </div>
      </div>
    </Moldura>
  );
}

function Moldura({ children, topoRef }) {
  return (
    <div className="vd-root min-h-screen">
      <style>{STYLE_TAG}</style>
      <div className="vd-bg-photo" aria-hidden="true" />
      <div className="vd-bg-veil" aria-hidden="true" />
      <header
        ref={topoRef}
        className="sticky top-3 z-20 rounded-2xl"
        style={{ background: "rgba(4,12,10,0.6)", backdropFilter: "blur(14px)", WebkitBackdropFilter: "blur(14px)", border: "1px solid rgba(247,242,231,0.12)", maxWidth: "min(72rem, calc(100% - 24px))", margin: "12px auto 0" }}
      >
        <div className="px-5 py-3 flex items-center gap-3">
          <div className="rounded-full overflow-hidden shrink-0" style={{ width: 44, height: 44, border: "2px solid rgba(247,242,231,0.35)" }}>
            <img src={BRASAO_IMG} alt="" className="w-full h-full object-cover block" />
          </div>
          <div>
            <div className="vd-display text-lg leading-none">Turismo Vassouras</div>
            <div className="text-[11px] mt-1" style={{ color: BRAND.textoSuave }}>Conselho Municipal de Turismo</div>
          </div>
        </div>
      </header>
      <main className="max-w-3xl mx-auto px-5 py-10">{children}</main>
      <footer className="max-w-3xl mx-auto px-5 pb-10 flex items-start gap-2 text-xs" style={{ color: BRAND.textoSuave }}>
        <Info size={13} className="shrink-0 mt-0.5" />
        <span>
          Respostas anônimas, usadas só para estatística e planejamento do turismo em Vassouras.{" "}
          <a className="underline" href={`${SITE_URL}/privacidade.html`}>Política de privacidade</a>
        </span>
      </footer>
    </div>
  );
}
