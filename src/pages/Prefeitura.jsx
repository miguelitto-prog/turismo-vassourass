import { useEffect, useMemo, useState } from "react";
import {
  BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from "recharts";
import {
  Users, Building2, PartyPopper, LayoutDashboard, ClipboardList, Check, TrendingUp,
  Compass, Wallet, Info, Download, LogOut, ListChecks, Plus, Trash2, Eye, EyeOff, Pencil, X,
} from "lucide-react";
import { BRASAO_IMG } from "../assets/imagens";
import { BRAND, CORES_GRAFICO, STYLE_TAG } from "../lib/tema";
import { supabase } from "../lib/supabaseClient";
import {
  CHAVES, carregarVisitantes, carregarLista, salvarLista, carregarCadastros, salvarCadastros,
  carregarContatos, novoId, CATEGORIAS_ATRATIVO, TIPOS_HOSPEDAGEM,
} from "../lib/dados";
import { Campo, formatarReais } from "../components/Campo";

const CARTAO = { border: "1px solid rgba(247,242,231,0.14)" };

// true em telas de celular (até 767px) — usado nos gráficos e tabelas.
const CONSULTA_CELULAR = "(max-width: 767px)";
function useCelular() {
  const [celular, setCelular] = useState(() => typeof window !== "undefined" && window.matchMedia(CONSULTA_CELULAR).matches);
  useEffect(() => {
    const mq = window.matchMedia(CONSULTA_CELULAR);
    const aoMudar = () => setCelular(mq.matches);
    mq.addEventListener("change", aoMudar);
    return () => mq.removeEventListener("change", aoMudar);
  }, []);
  return celular;
}
const encurtar = (t, n) => (String(t).length > n ? `${String(t).slice(0, n - 1)}…` : t);
const TOOLTIP = { borderRadius: 10, border: "1px solid rgba(14,22,19,0.15)", fontSize: 12, color: BRAND.grafite };

// ---------------------------------------------------------------------------
// Login (Supabase Auth). Usuários são criados no painel do Supabase.
// ---------------------------------------------------------------------------
function Login() {
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [erro, setErro] = useState("");
  const [entrando, setEntrando] = useState(false);

  async function entrar(e) {
    e.preventDefault();
    setEntrando(true);
    setErro("");
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password: senha });
    setEntrando(false);
    if (error) setErro("E-mail ou senha incorretos. Se esqueceu a senha, peça a quem administra o painel para redefinir.");
  }

  return (
    <div className="max-w-sm mx-auto rounded-3xl bg-white p-6 sm:p-8" style={CARTAO}>
      <h1 className="vd-display text-2xl mb-1">Painel do Conselho</h1>
      <p className="text-sm mb-6" style={{ color: BRAND.textoSuave }}>Acesso restrito aos conselheiros.</p>
      <form onSubmit={entrar} className="space-y-4">
        <div>
          <label htmlFor="login-email" className="block text-sm font-medium mb-1.5">E-mail</label>
          <input id="login-email" className="vd-input vd-focus" type="email" autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} required />
        </div>
        <div>
          <label htmlFor="login-senha" className="block text-sm font-medium mb-1.5">Senha</label>
          <input id="login-senha" className="vd-input vd-focus" type="password" autoComplete="current-password" value={senha} onChange={(e) => setSenha(e.target.value)} required />
        </div>
        {erro && <p className="text-xs" role="alert" style={{ color: "#FFB3A6" }}>{erro}</p>}
        <button type="submit" className="vd-btn text-white vd-focus w-full justify-center" style={{ background: BRAND.verdeVivo }} disabled={entrando}>
          {entrando ? "Entrando…" : "Entrar"}
        </button>
      </form>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Utilidades de agregação
// ---------------------------------------------------------------------------
function contarPor(lista, campo) {
  const contagem = {};
  lista.forEach((item) => {
    const v = item[campo];
    const valores = Array.isArray(v) ? v : v ? [v] : [];
    valores.forEach((x) => { contagem[x] = (contagem[x] || 0) + 1; });
  });
  return Object.entries(contagem).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
}
function numero(v) {
  const n = typeof v === "number" ? v : parseFloat(String(v).replace(",", "."));
  return isNaN(n) ? null : n;
}
function media(nums) {
  const v = nums.filter((n) => n !== null);
  return v.length ? v.reduce((a, b) => a + b, 0) / v.length : 0;
}
// Respostas antigas guardavam "Município e Estado" num campo só.
function origemUf(r) {
  if (r.ufSigla) return r.ufSigla === "EX" ? "Exterior" : r.ufSigla;
  const m = String(r.municipioResidencia || "").match(/\b([A-Z]{2})\s*$/);
  return m ? m[1] : null;
}

// ---------------------------------------------------------------------------
// Dashboard
// ---------------------------------------------------------------------------
function KpiCard({ icon: Icone, label, valor, sub, cor }) {
  return (
    <div className="vd-kpi rounded-2xl p-4 sm:p-5 bg-white flex flex-col gap-3" style={CARTAO}>
      <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ background: `${cor}26` }}>
        <Icone size={17} color={cor} />
      </div>
      <div>
        <div className="vd-display text-2xl sm:text-3xl leading-none break-words">{valor}</div>
        <div className="text-xs mt-1.5" style={{ color: BRAND.textoSuave }}>{label}</div>
      </div>
      {sub && <div className="text-[11px]" style={{ color: BRAND.textoSuave }}>{sub}</div>}
    </div>
  );
}

function EstadoVazio({ texto }) {
  return (
    <div className="rounded-2xl p-10 text-center bg-white" style={{ border: "1.5px dashed rgba(247,242,231,0.22)" }}>
      <Compass size={26} style={{ color: BRAND.textoSuave, margin: "0 auto 10px" }} />
      <p className="text-sm" style={{ color: BRAND.textoSuave }}>{texto}</p>
    </div>
  );
}

function GraficoBarras({ titulo, dados, cor, horizontal = false, altura = 240, maximo }) {
  const celular = useCelular();
  const larguraRotulo = celular ? 112 : 150;
  return (
    <div className="rounded-2xl p-4 sm:p-5 bg-white min-w-0" style={CARTAO}>
      <p className="text-xs font-medium mb-3" style={{ color: BRAND.textoSuave }}>{titulo}</p>
      {!dados.length ? <p className="text-xs py-8 text-center" style={{ color: BRAND.textoSuave }}>Sem respostas ainda.</p> : (
        <ResponsiveContainer width="100%" height={altura}>
          {horizontal ? (
            <BarChart data={dados} layout="vertical" margin={{ left: celular ? 0 : 10, right: 12 }}>
              <XAxis type="number" hide allowDecimals={false} domain={[0, maximo || "auto"]} />
              <YAxis type="category" dataKey="name" width={larguraRotulo} tick={{ fontSize: celular ? 10 : 11, fill: BRAND.textoSuave }} tickFormatter={(t) => encurtar(t, celular ? 18 : 26)} />
              <Tooltip contentStyle={TOOLTIP} />
              <Bar dataKey="value" name={maximo ? "Ocupação (%)" : "Respostas"} radius={[0, 6, 6, 0]} fill={cor} maxBarSize={34} />
            </BarChart>
          ) : (
            <BarChart data={dados} margin={{ left: -20 }}>
              <CartesianGrid vertical={false} stroke="rgba(247,242,231,0.14)" />
              <XAxis dataKey="name" tick={{ fontSize: 10, fill: BRAND.textoSuave }} interval={0} tickFormatter={(t) => encurtar(t, celular ? 6 : 14)} />
              <YAxis tick={{ fontSize: 11, fill: BRAND.textoSuave }} allowDecimals={false} />
              <Tooltip contentStyle={TOOLTIP} />
              <Bar dataKey="value" name="Respostas" radius={[6, 6, 0, 0]} fill={cor} maxBarSize={56} />
            </BarChart>
          )}
        </ResponsiveContainer>
      )}
    </div>
  );
}

function GraficoPizza({ titulo, dados, cores }) {
  const celular = useCelular();
  return (
    <div className="rounded-2xl p-4 sm:p-5 bg-white min-w-0" style={CARTAO}>
      <p className="text-xs font-medium mb-3" style={{ color: BRAND.textoSuave }}>{titulo}</p>
      {!dados.length ? <p className="text-xs py-8 text-center" style={{ color: BRAND.textoSuave }}>Sem respostas ainda.</p> : (
        <ResponsiveContainer width="100%" height={celular ? 260 : 240}>
          <PieChart>
            <Pie data={dados} dataKey="value" nameKey="name" cx="50%" cy={celular ? "42%" : "50%"} innerRadius={celular ? 40 : 45} outerRadius={celular ? 70 : 80} paddingAngle={2}>
              {dados.map((d, i) => <Cell key={d.name} fill={cores ? cores(d, i) : CORES_GRAFICO[i % CORES_GRAFICO.length]} />)}
            </Pie>
            <Legend wrapperStyle={{ fontSize: 11 }} />
            <Tooltip contentStyle={TOOLTIP} />
          </PieChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}

function Dashboard({ dados }) {
  const { visitantes, hospedagem, eventos } = dados;

  const gastos = visitantes.map((v) => numero(v.gastoDiario));
  const gastoDia = media(gastos);
  const gastoVisita = media(visitantes.map((v) => {
    const g = numero(v.gastoDiario);
    if (g === null) return null;
    return g * Math.max(1, numero(v.noites) || 0);
  }));
  const respondeuGasto = gastos.filter((g) => g !== null).length;
  const noitesMedia = media(visitantes.map((v) => numero(v.noites)));

  const ocupacaoMedia = useMemo(() => media(hospedagem.map((h) => {
    const t = numero(h.totalUnidades); const o = numero(h.quartosOcupados);
    return t > 0 && o !== null ? (o / t) * 100 : null;
  })), [hospedagem]);
  const publicoEventos = eventos.reduce((s, e) => s + (numero(e.publicoTotal) || 0), 0);

  const origem = useMemo(() => {
    const c = {};
    visitantes.forEach((v) => { const uf = origemUf(v); if (uf) c[uf] = (c[uf] || 0) + 1; });
    return Object.entries(c).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value).slice(0, 10);
  }, [visitantes]);
  const municipios = contarPor(visitantes, "municipio").slice(0, 8);
  const ordemIdade = ["Até 17", "18–24", "25–34", "35–44", "45–59", "60+"];
  const idades = contarPor(visitantes, "faixaEtaria").sort((a, b) => ordemIdade.indexOf(a.name) - ordemIdade.indexOf(b.name));

  const ocupacaoPorEstabelecimento = hospedagem.map((h) => ({
    name: `${h.nomeEstabelecimento || "—"}${h.mesReferencia ? ` (${h.mesReferencia})` : ""}`,
    value: numero(h.totalUnidades) > 0 ? Math.round((numero(h.quartosOcupados) / numero(h.totalUnidades)) * 100) : 0,
  }));

  const abertas = visitantes
    .filter((v) => v.gostou || v.podeMelhorar || v.motivoViagemOutro || v.comoSoubeOutro || v.atrativosOutro)
    .slice(-12).reverse();

  return (
    <div className="space-y-8 sm:space-y-10">
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4">
        <KpiCard icon={Users} label="Visitantes registrados" valor={visitantes.length} sub={visitantes.length ? `${noitesMedia.toFixed(1)} noites em média` : null} cor={BRAND.verdeVivo} />
        <KpiCard icon={Wallet} label="Gasto médio por pessoa / dia" valor={gastoDia ? formatarReais(gastoDia).replace(",00", "") : "—"} sub={respondeuGasto ? `${respondeuGasto} informaram valor` : null} cor={BRAND.coral} />
        <KpiCard icon={Wallet} label="Gasto médio por pessoa / visita" valor={gastoVisita ? formatarReais(gastoVisita).replace(",00", "") : "—"} sub="gasto diário × noites (mín. 1 dia)" cor={BRAND.ambar} />
        <KpiCard icon={Building2} label="Ocupação média hoteleira" valor={ocupacaoMedia ? `${ocupacaoMedia.toFixed(0)}%` : "—"} sub={`${hospedagem.length} lançamentos mensais`} cor={BRAND.azul} />
        <KpiCard icon={PartyPopper} label="Público em eventos" valor={publicoEventos ? publicoEventos.toLocaleString("pt-BR") : "—"} sub={`${eventos.length} eventos lançados`} cor={BRAND.ambar} />
      </div>

      <section>
        <h3 className="vd-display text-xl mb-4">Perfil dos visitantes</h3>
        {!visitantes.length ? <EstadoVazio texto="Ainda não há respostas da pesquisa. Assim que chegarem, os gráficos aparecem aqui." /> : (
          <div className="grid md:grid-cols-2 gap-3 sm:gap-4">
            <GraficoBarras titulo="Estado de origem" dados={origem} cor={BRAND.verdeVivo} />
            <GraficoBarras titulo="Municípios de origem (top 8)" dados={municipios} cor={BRAND.verdeVivo} horizontal />
            <GraficoBarras titulo="Faixa etária" dados={idades} cor={BRAND.azul} />
            <GraficoPizza titulo="Gênero" dados={contarPor(visitantes, "genero")} />
            <GraficoBarras titulo="Motivos da viagem" dados={contarPor(visitantes, "motivoViagem")} cor={BRAND.verdeVivo} horizontal altura={280} />
            <GraficoPizza titulo="Tipo de hospedagem" dados={contarPor(visitantes, "tipoHospedagem")} />
            <GraficoBarras titulo="Hotéis e pousadas citados" dados={contarPor(visitantes, "estabelecimento").slice(0, 8)} cor={BRAND.coral} horizontal />
            <GraficoBarras titulo="Eventos citados pelos visitantes" dados={contarPor(visitantes, "evento").slice(0, 8)} cor={BRAND.ambar} horizontal />
            <GraficoBarras titulo="Atrativos mais visitados (top 10)" dados={contarPor(visitantes, "atrativos").slice(0, 10)} cor={BRAND.coral} horizontal altura={300} />
            <GraficoBarras titulo="Como ficou sabendo de Vassouras" dados={contarPor(visitantes, "comoSoube")} cor={BRAND.azul} horizontal altura={300} />
            <GraficoPizza titulo="Recomendaria Vassouras?" dados={contarPor(visitantes, "recomendaria")} cores={(d) => (d.name === "Sim" ? BRAND.verdeVivo : BRAND.coral)} />
            <GraficoBarras titulo="Pontos de coleta" dados={contarPor(visitantes, "codigoEntrevistador").slice(0, 8)} cor={BRAND.ambar} horizontal />
          </div>
        )}
      </section>

      {abertas.length > 0 && (
        <section>
          <h3 className="vd-display text-xl mb-4">Respostas abertas mais recentes</h3>
          <ul className="md:hidden space-y-3">
            {abertas.map((v) => (
              <li key={v.id} className="rounded-2xl bg-white p-4 text-sm space-y-2" style={CARTAO}>
                <div className="text-xs" style={{ color: BRAND.textoSuave }}>{v.timestamp ? new Date(v.timestamp).toLocaleDateString("pt-BR") : "—"}</div>
                {v.gostou && <p><span className="text-xs block" style={{ color: BRAND.textoSuave }}>Gostou</span>{v.gostou}</p>}
                {v.podeMelhorar && <p><span className="text-xs block" style={{ color: BRAND.textoSuave }}>Pode melhorar</span>{v.podeMelhorar}</p>}
                {[v.motivoViagemOutro && `Motivo: ${v.motivoViagemOutro}`, v.comoSoubeOutro && `Soube por: ${v.comoSoubeOutro}`, v.atrativosOutro && `Atrativo: ${v.atrativosOutro}`].filter(Boolean).map((t) => <p key={t} className="text-xs">{t}</p>)}
              </li>
            ))}
          </ul>
          <div className="hidden md:block rounded-2xl bg-white overflow-x-auto" style={CARTAO}>
            <table className="w-full text-sm vd-tabela">
              <thead><tr style={{ background: "rgba(255,255,255,0.06)" }}>
                {["Data", "O que mais gostou", "O que pode melhorar", "Respostas “Outro”"].map((h) => <th key={h} className="text-xs font-medium" style={{ color: BRAND.textoSuave }}>{h}</th>)}
              </tr></thead>
              <tbody>
                {abertas.map((v) => (
                  <tr key={v.id}>
                    <td className="text-xs whitespace-nowrap">{v.timestamp ? new Date(v.timestamp).toLocaleDateString("pt-BR") : "—"}</td>
                    <td>{v.gostou || "—"}</td>
                    <td>{v.podeMelhorar || "—"}</td>
                    <td className="text-xs">{[v.motivoViagemOutro && `Motivo: ${v.motivoViagemOutro}`, v.comoSoubeOutro && `Soube por: ${v.comoSoubeOutro}`, v.atrativosOutro && `Atrativo: ${v.atrativosOutro}`].filter(Boolean).join(" · ") || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      <section>
        <h3 className="vd-display text-xl mb-4">Ocupação hoteleira</h3>
        {!hospedagem.length ? <EstadoVazio texto="Nenhum lançamento mensal de hospedagem. Use a aba Lançamentos." /> : (
          <GraficoBarras titulo="Taxa de ocupação por estabelecimento (%)" dados={ocupacaoPorEstabelecimento} cor={BRAND.coral} horizontal maximo={100} altura={Math.max(200, ocupacaoPorEstabelecimento.length * 40)} />
        )}
      </section>

      <section>
        <h3 className="vd-display text-xl mb-4">Eventos e congressos</h3>
        {!eventos.length ? <EstadoVazio texto="Nenhum evento lançado. Use a aba Lançamentos." /> : (
          <>
          <ul className="md:hidden space-y-3">
            {eventos.map((e, i) => (
              <li key={i} className="rounded-2xl bg-white p-4 text-sm" style={CARTAO}>
                <div className="font-medium mb-2">{e.nomeEvento || "—"}</div>
                <dl className="grid grid-cols-2 gap-x-3 gap-y-1.5 text-xs">
                  <dt style={{ color: BRAND.textoSuave }}>Início</dt><dd>{e.dataInicio ? e.dataInicio.split("-").reverse().join("/") : "—"}</dd>
                  <dt style={{ color: BRAND.textoSuave }}>Público</dt><dd>{e.publicoTotal || "—"}</dd>
                  <dt style={{ color: BRAND.textoSuave }}>% de fora</dt><dd>{e.percentualForaVassouras ? `${e.percentualForaVassouras}%` : "—"}</dd>
                  <dt style={{ color: BRAND.textoSuave }}>Centro de Convenções</dt><dd>{e.usouCentroConvencoes || "—"}</dd>
                </dl>
              </li>
            ))}
          </ul>
          <div className="hidden md:block rounded-2xl bg-white overflow-x-auto" style={CARTAO}>
            <table className="w-full text-sm vd-tabela">
              <thead><tr style={{ background: "rgba(255,255,255,0.06)" }}>
                {["Evento", "Início", "Público", "% de fora", "Centro de Convenções"].map((h) => <th key={h} className="text-xs font-medium" style={{ color: BRAND.textoSuave }}>{h}</th>)}
              </tr></thead>
              <tbody>
                {eventos.map((e, i) => (
                  <tr key={i}>
                    <td className="font-medium">{e.nomeEvento || "—"}</td>
                    <td className="text-xs">{e.dataInicio || "—"}</td>
                    <td>{e.publicoTotal || "—"}</td>
                    <td>{e.percentualForaVassouras ? `${e.percentualForaVassouras}%` : "—"}</td>
                    <td>{e.usouCentroConvencoes || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          </>
        )}
      </section>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Lançamentos: hospedagem mensal e eventos (usam os cadastros)
// ---------------------------------------------------------------------------
function camposLancamento(tipo, cadastros) {
  if (tipo === "hospedagem") {
    return [
      { id: "nomeEstabelecimento", label: "Estabelecimento", type: "select", required: true,
        options: cadastros.hospedagens.filter((h) => h.ativo).map((h) => h.nome).sort((a, b) => a.localeCompare(b, "pt-BR")) },
      { id: "mesReferencia", label: "Mês de referência", type: "month", required: true },
      { id: "totalUnidades", label: "Total de quartos disponíveis", type: "number" },
      { id: "quartosOcupados", label: "Média de quartos ocupados no mês", type: "number" },
      { id: "valorDiaria", label: "Valor médio da diária", type: "moeda" },
      { id: "estimativaHospedes", label: "Total estimado de hóspedes no mês", type: "number" },
    ];
  }
  return [
    { id: "nomeEvento", label: "Evento", type: "select", required: true, options: cadastros.eventos.map((e) => e.nome) },
    { id: "dataInicio", label: "Data de início", type: "date" },
    { id: "dataFim", label: "Data de término", type: "date" },
    { id: "publicoTotal", label: "Público total estimado", type: "number" },
    { id: "percentualForaVassouras", label: "Percentual do público de fora de Vassouras (%)", type: "number" },
    { id: "gastoMedioDiario", label: "Gasto médio diário por participante", type: "moeda" },
    { id: "usouCentroConvencoes", label: "Usou o Centro de Convenções General Sombra?", type: "radio", options: ["Sim", "Não"] },
  ];
}

function Lancamentos({ cadastros, onSalvo }) {
  const [tipo, setTipo] = useState("hospedagem");
  const campos = camposLancamento(tipo, cadastros);
  const vazio = () => Object.fromEntries(campos.map((c) => [c.id, ""]));
  const [dados, setDados] = useState(vazio);
  const [msg, setMsg] = useState("");
  const [salvando, setSalvando] = useState(false);

  useEffect(() => { setDados(vazio()); setMsg(""); }, [tipo]); // eslint-disable-line react-hooks/exhaustive-deps

  // Ao escolher um evento cadastrado, preenche as datas
  function set(id, v) {
    setDados((d) => {
      const novo = { ...d, [id]: v };
      if (tipo === "eventos" && id === "nomeEvento") {
        const ev = cadastros.eventos.find((e) => e.nome === v);
        if (ev) { novo.dataInicio = ev.dataInicio || novo.dataInicio; novo.dataFim = ev.dataFim || novo.dataFim; }
      }
      return novo;
    });
  }

  async function salvar() {
    const faltando = campos.find((c) => c.required && !dados[c.id]);
    if (faltando) { setMsg(`Preencha: ${faltando.label}.`); return; }
    setSalvando(true);
    try {
      const chave = tipo === "hospedagem" ? CHAVES.hospedagem : CHAVES.eventos;
      const atual = await carregarLista(chave);
      const nova = [...atual, { ...dados, timestamp: new Date().toISOString() }];
      await salvarLista(chave, nova);
      onSalvo(tipo, nova);
      setDados(vazio());
      setMsg("Lançamento salvo.");
    } catch {
      setMsg("Não foi possível salvar. Verifique a conexão e tente de novo.");
    }
    setSalvando(false);
  }

  const semOpcoes = campos[0].options.length === 0;

  return (
    <div className="rounded-3xl bg-white p-5 sm:p-7 md:p-9" style={CARTAO}>
      <div className="flex gap-2 flex-wrap mb-6 sm:mb-7">
        {[["hospedagem", "Hospedagem mensal", Building2, BRAND.coral], ["eventos", "Eventos e congressos", PartyPopper, BRAND.azul]].map(([id, label, Icone, cor]) => (
          <button key={id} type="button" className="vd-chip vd-focus flex items-center gap-2" data-active={tipo === id} style={tipo === id ? { background: cor } : {}} onClick={() => setTipo(id)}>
            <Icone size={15} /> {label}
          </button>
        ))}
      </div>
      {semOpcoes ? (
        <EstadoVazio texto={`Cadastre ${tipo === "hospedagem" ? "hotéis e pousadas" : "eventos"} na aba Cadastros antes de fazer lançamentos.`} />
      ) : (
        <>
          <div className="grid md:grid-cols-2 gap-5 sm:gap-6">
            {campos.map((c) => (
              <div key={c.id}>
                <label htmlFor={c.id} className="block text-sm font-medium mb-2">{c.label}{c.required && <span style={{ color: BRAND.coral }}> *</span>}</label>
                <Campo campo={c} valor={dados[c.id] ?? ""} onChange={(v) => set(c.id, v)} dados={dados} set={set} />
              </div>
            ))}
          </div>
          <div className="flex flex-col-reverse sm:flex-row sm:items-center justify-between gap-3 mt-8 pt-6" style={{ borderTop: "1px solid rgba(247,242,231,0.14)" }}>
            <span className="text-sm" role="status">{msg}</span>
            <button type="button" className="vd-btn text-white vd-focus justify-center vd-btn-grande" style={{ background: BRAND.verdeVivo }} disabled={salvando} onClick={salvar}>
              {salvando ? "Salvando…" : <>Salvar lançamento <Check size={16} /></>}
            </button>
          </div>
        </>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Cadastros: atrativos, hospedagens e eventos
// ---------------------------------------------------------------------------
const DEF_CADASTROS = {
  atrativos: {
    titulo: "Atrativos", singular: "atrativo",
    campos: [
      { id: "nome", label: "Nome", type: "text", required: true },
      { id: "categoria", label: "Categoria", type: "select", options: CATEGORIAS_ATRATIVO },
      { id: "descricao", label: "Descrição curta (aparece no site)", type: "textarea" },
      { id: "site", label: "Mostrar na página de atrativos do site?", type: "radio", options: ["Sim", "Não"] },
    ],
    colunas: (i) => [i.categoria || "—", i.site ? "No site" : "Só na pesquisa"],
  },
  hospedagens: {
    titulo: "Hotéis e pousadas", singular: "hospedagem",
    campos: [
      { id: "nome", label: "Nome", type: "text", required: true },
      { id: "tipo", label: "Tipo", type: "select", options: TIPOS_HOSPEDAGEM },
      { id: "link", label: "Site ou rede social (link)", type: "url" },
    ],
    colunas: (i) => [i.tipo || "—", i.link ? "Com link" : "Sem link"],
  },
  eventos: {
    titulo: "Eventos", singular: "evento",
    campos: [
      { id: "nome", label: "Nome do evento", type: "text", required: true },
      { id: "dataInicio", label: "Início", type: "date" },
      { id: "dataFim", label: "Término", type: "date" },
      { id: "local", label: "Local", type: "text" },
    ],
    colunas: (i) => [[i.dataInicio, i.dataFim].filter(Boolean).map((d) => d.split("-").reverse().join("/")).join(" a ") || "Sem data", i.local || "—"],
  },
};

function paraFormulario(item, tipo) {
  const f = {};
  DEF_CADASTROS[tipo].campos.forEach((c) => {
    f[c.id] = c.id === "site" ? (item?.site ? "Sim" : item ? "Não" : "Sim") : (item?.[c.id] ?? "");
  });
  return f;
}

function Cadastros({ cadastros, setCadastros }) {
  const [tipo, setTipo] = useState("atrativos");
  const [editando, setEditando] = useState(null); // null | "novo" | id
  const [form, setForm] = useState({});
  const [msg, setMsg] = useState("");
  const [salvando, setSalvando] = useState(false);
  const def = DEF_CADASTROS[tipo];
  const itens = cadastros[tipo];

  async function persistir(novos, aviso) {
    setSalvando(true);
    try {
      await salvarCadastros(novos);
      setCadastros(novos);
      setMsg(aviso);
    } catch {
      setMsg("Não foi possível salvar. Verifique a conexão e tente de novo.");
    }
    setSalvando(false);
  }

  function abrir(item) {
    setEditando(item ? item.id : "novo");
    setForm(paraFormulario(item, tipo));
    setMsg("");
  }

  async function salvarItem() {
    if (!String(form.nome || "").trim()) { setMsg("Informe o nome."); return; }
    const nome = form.nome.trim();
    if (itens.some((i) => i.nome.toLowerCase() === nome.toLowerCase() && i.id !== editando)) {
      setMsg(`Já existe um ${def.singular} com esse nome.`); return;
    }
    const dadosItem = { ...form, nome, ...(tipo === "atrativos" ? { site: form.site === "Sim" } : {}) };
    const lista = editando === "novo"
      ? [...itens, { id: novoId(), ativo: true, ...dadosItem }]
      : itens.map((i) => (i.id === editando ? { ...i, ...dadosItem } : i));
    await persistir({ ...cadastros, [tipo]: lista }, editando === "novo" ? `${nome} cadastrado.` : `${nome} atualizado.`);
    setEditando(null);
  }

  async function alternar(item) {
    const lista = itens.map((i) => (i.id === item.id ? { ...i, ativo: !i.ativo } : i));
    await persistir({ ...cadastros, [tipo]: lista }, item.ativo ? `${item.nome} oculto da pesquisa e do site.` : `${item.nome} visível de novo.`);
  }

  async function remover(item) {
    if (!window.confirm(`Excluir "${item.nome}"? As respostas antigas que citam esse nome continuam no histórico.`)) return;
    await persistir({ ...cadastros, [tipo]: itens.filter((i) => i.id !== item.id) }, `${item.nome} excluído.`);
  }

  return (
    <div className="space-y-6">
      <p className="text-sm max-w-2xl" style={{ color: BRAND.textoSuave }}>
        O que for cadastrado aqui aparece automaticamente nas opções da pesquisa e nas páginas do site. Itens ocultos saem da pesquisa e do site, mas continuam no histórico.
      </p>
      <div className="vd-rolagem-x flex gap-2">
        {Object.entries(DEF_CADASTROS).map(([id, d]) => (
          <button key={id} type="button" className="vd-chip vd-focus shrink-0 whitespace-nowrap" data-active={tipo === id} style={tipo === id ? { background: BRAND.verdeVivo } : {}} onClick={() => { setTipo(id); setEditando(null); setMsg(""); }}>
            {d.titulo} ({cadastros[id].length})
          </button>
        ))}
      </div>

      {editando ? (
        <div className="rounded-3xl bg-white p-5 sm:p-7" style={CARTAO}>
          <div className="flex items-center justify-between mb-6">
            <h3 className="vd-display text-xl">{editando === "novo" ? `Novo ${def.singular}` : `Editar ${def.singular}`}</h3>
            <button type="button" className="vd-focus vd-icone-btn" aria-label="Fechar" onClick={() => setEditando(null)}><X size={18} /></button>
          </div>
          <div className="grid md:grid-cols-2 gap-5 sm:gap-6">
            {def.campos.map((c) => (
              <div key={c.id} className={c.type === "textarea" ? "md:col-span-2" : ""}>
                <label htmlFor={c.id} className="block text-sm font-medium mb-2">{c.label}{c.required && <span style={{ color: BRAND.coral }}> *</span>}</label>
                <Campo campo={c} valor={form[c.id] ?? ""} onChange={(v) => setForm((f) => ({ ...f, [c.id]: v }))} dados={form} set={(id, v) => setForm((f) => ({ ...f, [id]: v }))} />
              </div>
            ))}
          </div>
          <div className="flex flex-col-reverse sm:flex-row sm:items-center justify-between gap-3 mt-8">
            <span className="text-sm" role="status">{msg}</span>
            <button type="button" className="vd-btn text-white vd-focus justify-center vd-btn-grande" style={{ background: BRAND.verdeVivo }} disabled={salvando} onClick={salvarItem}>
              {salvando ? "Salvando…" : <>Salvar <Check size={16} /></>}
            </button>
          </div>
        </div>
      ) : (
        <>
          <div className="flex flex-col-reverse sm:flex-row sm:items-center justify-between gap-3">
            <span className="text-sm" role="status">{msg}</span>
            <button type="button" className="vd-btn text-white vd-focus justify-center vd-btn-grande" style={{ background: BRAND.verdeVivo }} onClick={() => abrir(null)}>
              <Plus size={16} /> Cadastrar {def.singular}
            </button>
          </div>
          {!itens.length ? <EstadoVazio texto={`Nenhum ${def.singular} cadastrado ainda.`} /> : (
            <>
            <ul className="md:hidden rounded-2xl bg-white vd-lista-cel" style={CARTAO}>
              {itens.map((i) => (
                <li key={i.id} className="flex items-center gap-2 py-3 pl-4 pr-2" style={{ opacity: i.ativo ? 1 : 0.5 }}>
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-medium break-words">{i.nome}{!i.ativo && <span className="text-xs font-normal" style={{ color: BRAND.textoSuave }}> (oculto)</span>}</div>
                    <div className="text-xs mt-0.5" style={{ color: BRAND.textoSuave }}>{def.colunas(i).join(" · ")}</div>
                  </div>
                  <div className="flex shrink-0">
                    <button type="button" className="vd-icone-btn vd-focus" aria-label={`Editar ${i.nome}`} onClick={() => abrir(i)}><Pencil size={17} /></button>
                    <button type="button" className="vd-icone-btn vd-focus" aria-label={`${i.ativo ? "Ocultar" : "Mostrar"} ${i.nome}`} onClick={() => alternar(i)} disabled={salvando}>{i.ativo ? <EyeOff size={17} /> : <Eye size={17} />}</button>
                    <button type="button" className="vd-icone-btn vd-focus" aria-label={`Excluir ${i.nome}`} onClick={() => remover(i)} disabled={salvando}><Trash2 size={17} /></button>
                  </div>
                </li>
              ))}
            </ul>
            <div className="hidden md:block rounded-2xl bg-white overflow-x-auto" style={CARTAO}>
              <table className="w-full text-sm vd-tabela">
                <tbody>
                  {itens.map((i) => (
                    <tr key={i.id} style={{ opacity: i.ativo ? 1 : 0.5 }}>
                      <td className="font-medium">{i.nome}{!i.ativo && <span className="text-xs font-normal" style={{ color: BRAND.textoSuave }}> (oculto)</span>}</td>
                      {def.colunas(i).map((c, k) => <td key={k} className="text-xs whitespace-nowrap" style={{ color: BRAND.textoSuave }}>{c}</td>)}
                      <td className="whitespace-nowrap text-right">
                        <button type="button" className="p-1.5 vd-focus" title="Editar" aria-label={`Editar ${i.nome}`} onClick={() => abrir(i)}><Pencil size={15} /></button>
                        <button type="button" className="p-1.5 vd-focus" title={i.ativo ? "Ocultar" : "Mostrar"} aria-label={`${i.ativo ? "Ocultar" : "Mostrar"} ${i.nome}`} onClick={() => alternar(i)} disabled={salvando}>{i.ativo ? <EyeOff size={15} /> : <Eye size={15} />}</button>
                        <button type="button" className="p-1.5 vd-focus" title="Excluir" aria-label={`Excluir ${i.nome}`} onClick={() => remover(i)} disabled={salvando}><Trash2 size={15} /></button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            </>
          )}
        </>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Exportação para Excel
// ---------------------------------------------------------------------------
const COLUNAS_VISITANTES = [
  ["timestamp", "Data/hora"], ["codigoEntrevistador", "Ponto de coleta"], ["autoriza", "Autoriza uso"],
  ["receberComunicacoes", "Quer receber comunicações"], ["tipoVisitante", "Tipo de visitante"], ["tipoVisitanteOutro", "Tipo (outro)"],
  ["faixaEtaria", "Faixa etária"], ["genero", "Gênero"], ["ufSigla", "UF"], ["municipio", "Município"], ["pais", "País"],
  ["municipioResidencia", "Município/UF (formato antigo)"], ["motivoViagem", "Motivos da viagem"], ["motivoViagemOutro", "Motivo (outro)"],
  ["evento", "Evento"], ["comQuemViaja", "Com quem viaja"], ["tipoHospedagem", "Hospedagem"], ["tipoHospedagemOutro", "Hospedagem (outro)"],
  ["estabelecimento", "Hotel/pousada"], ["noites", "Noites"], ["gastoDiario", "Gasto por dia (R$)"], ["ondeGastar", "Onde gasta"],
  ["guiaCredenciado", "Guia credenciado"], ["agenciaReceptivo", "Agência receptivo"], ["aquisicaoIngressos", "Ingressos"],
  ["atrativos", "Atrativos"], ["atrativosOutro", "Atrativos (outro)"], ["avaliacao", "Avaliação"], ["recomendaria", "Recomendaria"],
  ["comoSoube", "Como soube"], ["comoSoubeOutro", "Como soube (outro)"], ["gostou", "O que mais gostou"], ["podeMelhorar", "O que pode melhorar"],
];

function planilha(lista, colunas) {
  return lista.map((r) => Object.fromEntries(colunas.map(([k, rotulo]) => {
    let v = r[k];
    if (Array.isArray(v)) v = v.join("; ");
    if (k === "timestamp" && v) v = new Date(v).toLocaleString("pt-BR");
    return [rotulo, v ?? ""];
  })));
}

async function exportarExcel(dados, cadastros) {
  const XLSX = await import("xlsx");
  const wb = XLSX.utils.book_new();
  const add = (nome, linhas) => XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(linhas.length ? linhas : [{ "Sem dados": "" }]), nome);

  add("Visitantes", planilha(dados.visitantes, COLUNAS_VISITANTES));
  add("Hospedagem mensal", planilha(dados.hospedagem, [
    ["nomeEstabelecimento", "Estabelecimento"], ["mesReferencia", "Mês"], ["totalUnidades", "Quartos disponíveis"],
    ["quartosOcupados", "Quartos ocupados"], ["valorDiaria", "Diária média (R$)"], ["estimativaHospedes", "Hóspedes"], ["timestamp", "Lançado em"],
  ]));
  add("Eventos", planilha(dados.eventos, [
    ["nomeEvento", "Evento"], ["dataInicio", "Início"], ["dataFim", "Término"], ["publicoTotal", "Público"],
    ["percentualForaVassouras", "% de fora"], ["gastoMedioDiario", "Gasto médio diário (R$)"], ["usouCentroConvencoes", "Centro de Convenções"], ["timestamp", "Lançado em"],
  ]));
  add("Cadastro atrativos", planilha(cadastros.atrativos, [["nome", "Nome"], ["categoria", "Categoria"], ["descricao", "Descrição"], ["site", "No site"], ["ativo", "Ativo"]]));
  add("Cadastro hospedagens", planilha(cadastros.hospedagens, [["nome", "Nome"], ["tipo", "Tipo"], ["link", "Link"], ["ativo", "Ativo"]]));
  add("Cadastro eventos", planilha(cadastros.eventos, [["nome", "Nome"], ["dataInicio", "Início"], ["dataFim", "Término"], ["local", "Local"], ["ativo", "Ativo"]]));
  try {
    const contatos = await carregarContatos();
    add("Contatos (e-mails)", contatos.map((c) => ({ "E-mail": c.email, "Cadastrado em": new Date(c.criado_em).toLocaleString("pt-BR") })));
  } catch { /* tabela de contatos ainda não criada */ }

  XLSX.writeFile(wb, `turismo-vassouras-${new Date().toISOString().slice(0, 10)}.xlsx`);
}

// ---------------------------------------------------------------------------
// Estilos do painel no celular
// ---------------------------------------------------------------------------
const ESTILO_PAINEL = `
  .vd-cabecalho { top: calc(env(safe-area-inset-top, 0px) + 8px); }
  .vd-brasao { width: 44px; height: 44px; }
  .vd-icone-btn { width: 40px; height: 40px; display: inline-flex; align-items: center; justify-content: center; border-radius: 10px; background: none; border: none; color: inherit; cursor: pointer; }
  .vd-icone-btn:disabled { opacity: .5; }
  .vd-rolagem-x { overflow-x: auto; scrollbar-width: none; -webkit-overflow-scrolling: touch; margin-left: -16px; margin-right: -16px; padding: 0 16px 2px; }
  .vd-rolagem-x::-webkit-scrollbar { display: none; }
  .vd-lista-cel li + li { border-top: 1px solid rgba(247,242,231,0.12); }
  .vd-abas-cel {
    position: fixed; left: 0; right: 0; bottom: 0; z-index: 25;
    display: grid; grid-template-columns: repeat(3, 1fr);
    background: rgba(4,12,10,0.86); backdrop-filter: blur(14px); -webkit-backdrop-filter: blur(14px);
    border-top: 1px solid rgba(247,242,231,0.14);
    padding-bottom: env(safe-area-inset-bottom, 0px);
  }
  .vd-abas-cel button {
    display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 3px;
    min-height: 58px; font-size: 11px; font-weight: 500; background: none; border: none;
    color: ${BRAND.textoSuave}; cursor: pointer;
  }
  .vd-abas-cel button[data-active="true"] { color: #fff; }
  .vd-abas-cel button[data-active="true"] svg { color: ${BRAND.ambar}; }
  @media (max-width: 767px) {
    .vd-brasao { width: 36px; height: 36px; }
    .vd-btn-cabecalho { padding: 9px 11px; }
    .vd-btn-grande { width: 100%; padding: 12px 16px; font-size: 15px; }
    .vd-rodape { padding-bottom: calc(80px + env(safe-area-inset-bottom, 0px)); }
    .vd-kpi:last-child:nth-child(odd) { grid-column: span 2; }
  }
`;

// ---------------------------------------------------------------------------
// Página
// ---------------------------------------------------------------------------
export default function Prefeitura() {
  const [sessao, setSessao] = useState(undefined);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSessao(data.session));
    const { data } = supabase.auth.onAuthStateChange((_e, s) => setSessao(s));
    return () => data.subscription.unsubscribe();
  }, []);

  return (
    <div className="vd-root min-h-screen">
      <style>{STYLE_TAG}</style>
      <style>{ESTILO_PAINEL}</style>
      <div className="vd-bg-photo" aria-hidden="true" />
      <div className="vd-bg-veil" aria-hidden="true" />
      {sessao === undefined ? (
        <div className="py-32 text-center text-sm" style={{ color: BRAND.textoSuave }}>Carregando…</div>
      ) : sessao ? (
        <PainelLogado email={sessao.user?.email} />
      ) : (
        <main className="px-5 py-24"><Login /></main>
      )}
    </div>
  );
}

function PainelLogado({ email }) {
  const [aba, setAba] = useState("dashboard");
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState("");
  const [dados, setDados] = useState({ visitantes: [], hospedagem: [], eventos: [] });
  const [cadastros, setCadastros] = useState(null);
  const [exportando, setExportando] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const [v, h, e, c] = await Promise.all([
          carregarVisitantes(), carregarLista(CHAVES.hospedagem), carregarLista(CHAVES.eventos), carregarCadastros(),
        ]);
        setDados({ visitantes: v, hospedagem: h, eventos: e });
        setCadastros(c);
      } catch {
        setErro("Não foi possível carregar os dados. Confira a conexão e se o script supabase.sql foi aplicado.");
      }
      setCarregando(false);
    })();
  }, []);

  async function exportar() {
    setExportando(true);
    try { await exportarExcel(dados, cadastros); } catch { setErro("Não foi possível gerar a planilha."); }
    setExportando(false);
  }

  const abas = [
    ["dashboard", "Painel", LayoutDashboard],
    ["lancamentos", "Lançamentos", ClipboardList],
    ["cadastros", "Cadastros", ListChecks],
  ];

  return (
    <>
      <header className="vd-cabecalho sticky z-20 rounded-2xl" style={{ background: "rgba(4,12,10,0.6)", backdropFilter: "blur(14px)", WebkitBackdropFilter: "blur(14px)", border: "1px solid rgba(247,242,231,0.12)", maxWidth: "min(72rem, calc(100% - 24px))", margin: "12px auto 0" }}>
        <div className="px-3 sm:px-5 py-2.5 sm:py-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="rounded-full overflow-hidden shrink-0 vd-brasao" style={{ border: "2px solid rgba(247,242,231,0.35)" }}>
              <img src={BRASAO_IMG} alt="" className="w-full h-full object-cover block" />
            </div>
            <div className="min-w-0">
              <div className="vd-display text-base sm:text-lg leading-none">Painel do Conselho</div>
              <div className="text-[11px] mt-1 truncate" style={{ color: BRAND.textoSuave }}>
                <span className="sm:hidden">COMTUR Vassouras</span>
                <span className="hidden sm:inline">Conselho Municipal de Turismo de Vassouras</span>
              </div>
            </div>
          </div>
          <nav className="hidden md:flex gap-1 p-1 rounded-full" aria-label="Seções do painel" style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(247,242,231,0.14)" }}>
            {abas.map(([id, label, Icone]) => (
              <button key={id} type="button" onClick={() => setAba(id)} className="flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium vd-focus" style={aba === id ? { background: BRAND.verdeVivo, color: "#fff" } : { color: BRAND.textoSuave }} aria-current={aba === id ? "page" : undefined}>
                <Icone size={15} /> {label}
              </button>
            ))}
          </nav>
          <div className="flex items-center gap-2 shrink-0">
            <button type="button" className="vd-btn vd-btn-sec vd-focus vd-btn-cabecalho" onClick={exportar} disabled={carregando || exportando || !cadastros} aria-label="Exportar Excel">
              <Download size={15} /> <span className="hidden sm:inline">{exportando ? "Gerando…" : "Exportar Excel"}</span>
            </button>
            <button type="button" className="vd-btn vd-btn-sec vd-focus vd-btn-cabecalho" onClick={() => supabase.auth.signOut()} title={email} aria-label="Sair">
              <LogOut size={15} /> <span className="hidden sm:inline">Sair</span>
            </button>
          </div>
        </div>
      </header>

      <nav className="vd-abas-cel md:hidden" aria-label="Seções do painel">
        {abas.map(([id, label, Icone]) => (
          <button key={id} type="button" onClick={() => { setAba(id); window.scrollTo({ top: 0 }); }} className="vd-focus" data-active={aba === id} aria-current={aba === id ? "page" : undefined}>
            <Icone size={20} />
            <span>{label}</span>
          </button>
        ))}
      </nav>

      <main className="max-w-6xl mx-auto px-4 sm:px-5 py-6 sm:py-10">
        {erro && <p className="mb-6 text-sm px-4 py-3 rounded-xl" role="alert" style={{ background: "rgba(253,111,89,0.16)", color: "#FFD3CB" }}>{erro}</p>}
        {carregando ? (
          <div className="py-24 text-center text-sm" style={{ color: BRAND.textoSuave }}>Carregando dados…</div>
        ) : !cadastros ? null : aba === "dashboard" ? (
          <>
            <div className="flex items-start justify-between mb-6 sm:mb-8 flex-wrap gap-3">
              <div>
                <h1 className="vd-display text-2xl sm:text-3xl mb-1">Panorama do turismo</h1>
                <p className="text-sm" style={{ color: BRAND.textoSuave }}>Dados da pesquisa de visitantes e dos lançamentos do Conselho.</p>
              </div>
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs" style={{ background: "rgba(11,122,84,0.25)" }}>
                <TrendingUp size={13} /> {dados.visitantes.length + dados.hospedagem.length + dados.eventos.length} registros
              </div>
            </div>
            <Dashboard dados={dados} />
          </>
        ) : aba === "lancamentos" ? (
          <>
            <div className="mb-6 sm:mb-8">
              <h1 className="vd-display text-2xl sm:text-3xl mb-1">Lançamentos</h1>
              <p className="text-sm" style={{ color: BRAND.textoSuave }}>Ocupação mensal dos meios de hospedagem e números dos eventos.</p>
            </div>
            <Lancamentos cadastros={cadastros} onSalvo={(tipo, lista) => setDados((d) => ({ ...d, [tipo]: lista }))} />
          </>
        ) : (
          <>
            <div className="mb-6"><h1 className="vd-display text-2xl sm:text-3xl mb-1">Cadastros</h1></div>
            <Cadastros cadastros={cadastros} setCadastros={setCadastros} />
          </>
        )}
      </main>

      <footer className="vd-rodape max-w-6xl mx-auto px-4 sm:px-5 pb-10 flex items-start gap-2 text-xs" style={{ color: BRAND.textoSuave }}>
        <Info size={13} className="shrink-0 mt-px" /> Uso interno do Conselho Municipal de Turismo. Os dados de visitantes vêm da pesquisa pública.
      </footer>
    </>
  );
}
