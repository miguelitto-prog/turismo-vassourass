import { useEffect, useRef, useState } from "react";
import { Check, Eye, EyeOff, FileText, Link2, Pencil, Plus, Trash2, Upload, UserRound, X } from "lucide-react";
import { BRAND } from "../lib/tema";
import {
  carregarMembros, salvarMembro, removerMembro, carregarDocumentos, salvarDocumento, removerDocumento,
  enviarArquivo, reduzirFoto, TIPOS_DOCUMENTO, CARGOS_DIRETORIA,
} from "../lib/dados";

const CARTAO = { border: "1px solid rgba(247,242,231,0.14)" };
const NOME_TIPO = Object.fromEntries(TIPOS_DOCUMENTO);
const dataBR = (iso) => (iso ? iso.split("-").reverse().join("/") : "");
const MAX_PDF_MB = 20;

function Rotulo({ htmlFor, children, obrigatorio }) {
  return (
    <label htmlFor={htmlFor} className="block text-sm font-medium mb-2">
      {children}{obrigatorio && <span style={{ color: BRAND.coral }}> *</span>}
    </label>
  );
}

function Vazio({ texto }) {
  return <div className="rounded-2xl bg-white p-8 text-center text-sm" style={{ ...CARTAO, color: BRAND.textoSuave }}>{texto}</div>;
}

function Acoes({ item, rotulo, onEditar, onAlternar, onRemover, ocupado }) {
  return (
    <div className="flex shrink-0">
      <button type="button" className="vd-icone-btn vd-focus" aria-label={`Editar ${rotulo}`} title="Editar" onClick={onEditar}><Pencil size={16} /></button>
      <button type="button" className="vd-icone-btn vd-focus" aria-label={`${item.ativo ? "Ocultar" : "Mostrar"} ${rotulo}`} title={item.ativo ? "Ocultar do site" : "Mostrar no site"} onClick={onAlternar} disabled={ocupado}>
        {item.ativo ? <EyeOff size={16} /> : <Eye size={16} />}
      </button>
      <button type="button" className="vd-icone-btn vd-focus" aria-label={`Excluir ${rotulo}`} title="Excluir" onClick={onRemover} disabled={ocupado}><Trash2 size={16} /></button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Membros
// ---------------------------------------------------------------------------
const MEMBRO_VAZIO = { nome: "", segmento: "trade", representa: "", tipo: "Titular", cargo: "", foto_url: "", ordem: 0, ativo: true };

function Membros() {
  const [lista, setLista] = useState(null);
  const [form, setForm] = useState(null);
  const [foto, setFoto] = useState(null); // { arquivo, previa }
  const [msg, setMsg] = useState("");
  const [ocupado, setOcupado] = useState(false);
  const inputFoto = useRef(null);

  useEffect(() => {
    carregarMembros().then(setLista).catch(() => { setLista([]); setMsg("Não foi possível carregar. Confira se o script supabase.sql foi aplicado."); });
  }, []);

  function abrir(m) {
    setForm(m ? { ...MEMBRO_VAZIO, ...m, cargo: m.cargo || "", representa: m.representa || "", foto_url: m.foto_url || "" } : { ...MEMBRO_VAZIO, ordem: (lista?.length || 0) + 1 });
    setFoto(null);
    setMsg("");
  }
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  async function escolherFoto(e) {
    const arq = e.target.files?.[0];
    e.target.value = "";
    if (!arq) return;
    if (!arq.type.startsWith("image/")) { setMsg("Escolha uma imagem (JPG ou PNG)."); return; }
    const reduzida = await reduzirFoto(arq);
    setFoto({ arquivo: reduzida, previa: URL.createObjectURL(reduzida) });
  }

  async function salvar() {
    if (!form.nome.trim()) { setMsg("Informe o nome."); return; }
    setOcupado(true);
    try {
      let foto_url = form.foto_url;
      if (foto) foto_url = (await enviarArquivo("fotos", foto.arquivo, form.nome)).url;
      const salvo = await salvarMembro({
        ...form, nome: form.nome.trim(), representa: form.representa.trim() || null,
        cargo: form.cargo || null, foto_url: foto_url || null, ordem: Number(form.ordem) || 0,
      });
      setLista((l) => (form.id ? l.map((x) => (x.id === salvo.id ? salvo : x)) : [...l, salvo]).sort((a, b) => a.ordem - b.ordem || a.nome.localeCompare(b.nome, "pt-BR")));
      setMsg(`${salvo.nome} ${form.id ? "atualizado" : "cadastrado"}.`);
      setForm(null);
    } catch {
      setMsg("Não foi possível salvar. Verifique a conexão e tente de novo.");
    }
    setOcupado(false);
  }

  async function alternar(m) {
    setOcupado(true);
    try {
      const salvo = await salvarMembro({ ...m, ativo: !m.ativo });
      setLista((l) => l.map((x) => (x.id === salvo.id ? salvo : x)));
      setMsg(m.ativo ? `${m.nome} oculto do site.` : `${m.nome} visível no site.`);
    } catch { setMsg("Não foi possível alterar."); }
    setOcupado(false);
  }

  async function remover(m) {
    if (!window.confirm(`Excluir "${m.nome}" da composição do Conselho?`)) return;
    setOcupado(true);
    try { await removerMembro(m.id); setLista((l) => l.filter((x) => x.id !== m.id)); setMsg(`${m.nome} excluído.`); }
    catch { setMsg("Não foi possível excluir."); }
    setOcupado(false);
  }

  if (!lista) return <div className="py-16 text-center text-sm" style={{ color: BRAND.textoSuave }}>Carregando…</div>;

  if (form) {
    const fotoAtual = foto?.previa || form.foto_url;
    return (
      <div className="rounded-3xl bg-white p-5 sm:p-7" style={CARTAO}>
        <div className="flex items-center justify-between mb-6">
          <h3 className="vd-display text-xl">{form.id ? "Editar conselheiro" : "Novo conselheiro"}</h3>
          <button type="button" className="vd-focus vd-icone-btn" aria-label="Fechar" onClick={() => setForm(null)}><X size={18} /></button>
        </div>
        <div className="flex flex-col sm:flex-row gap-6">
          <div className="shrink-0 flex flex-col items-center gap-3">
            <div className="rounded-2xl overflow-hidden flex items-center justify-center" style={{ width: 132, height: 165, background: "rgba(247,242,231,0.08)", border: "1px solid rgba(247,242,231,0.18)" }}>
              {fotoAtual ? <img src={fotoAtual} alt="Foto do conselheiro" className="w-full h-full object-cover" /> : <UserRound size={44} style={{ color: BRAND.textoSuave }} />}
            </div>
            <input ref={inputFoto} type="file" accept="image/*" style={{ display: "none" }} onChange={escolherFoto} />
            <button type="button" className="vd-btn vd-btn-sec vd-focus" onClick={() => inputFoto.current?.click()}><Upload size={15} /> {fotoAtual ? "Trocar foto" : "Enviar foto"}</button>
            {fotoAtual && <button type="button" className="text-xs underline vd-focus" style={{ color: BRAND.textoSuave }} onClick={() => { setFoto(null); set("foto_url", ""); }}>Remover foto</button>}
          </div>
          <div className="grid md:grid-cols-2 gap-5 flex-1">
            <div className="md:col-span-2">
              <Rotulo htmlFor="m-nome" obrigatorio>Nome</Rotulo>
              <input id="m-nome" className="vd-input" value={form.nome} onChange={(e) => set("nome", e.target.value)} />
            </div>
            <div>
              <Rotulo htmlFor="m-seg">Segmento</Rotulo>
              <select id="m-seg" className="vd-input" value={form.segmento} onChange={(e) => set("segmento", e.target.value)}>
                <option value="trade">Iniciativa privada (trade turístico)</option>
                <option value="governo">Poder público</option>
              </select>
            </div>
            <div>
              <Rotulo htmlFor="m-tipo">Titular ou suplente</Rotulo>
              <select id="m-tipo" className="vd-input" value={form.tipo} onChange={(e) => set("tipo", e.target.value)}>
                <option>Titular</option><option>Suplente</option>
              </select>
            </div>
            <div className="md:col-span-2">
              <Rotulo htmlFor="m-rep">Representa</Rotulo>
              <input id="m-rep" className="vd-input" placeholder="Ex.: Setor de Hospedagem, Secretaria de Cultura" value={form.representa} onChange={(e) => set("representa", e.target.value)} />
            </div>
            <div>
              <Rotulo htmlFor="m-cargo">Cargo na diretoria</Rotulo>
              <select id="m-cargo" className="vd-input" value={form.cargo} onChange={(e) => set("cargo", e.target.value)}>
                <option value="">Nenhum (conselheiro)</option>
                {[...new Set([...CARGOS_DIRETORIA, form.cargo].filter(Boolean))].map((c) => <option key={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <Rotulo htmlFor="m-ordem">Ordem na lista</Rotulo>
              <input id="m-ordem" type="number" min="0" className="vd-input" value={form.ordem} onChange={(e) => set("ordem", e.target.value)} />
            </div>
          </div>
        </div>
        <p className="text-xs mt-6" style={{ color: BRAND.textoSuave }}>Use só fotos enviadas pelo próprio conselheiro ou com autorização de uso.</p>
        <div className="flex flex-col-reverse sm:flex-row sm:items-center justify-between gap-3 mt-6">
          <span className="text-sm" role="status">{msg}</span>
          <button type="button" className="vd-btn text-white vd-focus justify-center vd-btn-grande" style={{ background: BRAND.verdeVivo }} disabled={ocupado} onClick={salvar}>
            {ocupado ? "Salvando…" : <>Salvar <Check size={16} /></>}
          </button>
        </div>
      </div>
    );
  }

  const grupos = [["governo", "Poder público"], ["trade", "Iniciativa privada"]];
  return (
    <div className="space-y-6">
      <div className="flex flex-col-reverse sm:flex-row sm:items-center justify-between gap-3">
        <span className="text-sm" role="status">{msg}</span>
        <button type="button" className="vd-btn text-white vd-focus justify-center vd-btn-grande" style={{ background: BRAND.verdeVivo }} onClick={() => abrir(null)}>
          <Plus size={16} /> Cadastrar conselheiro
        </button>
      </div>
      {!lista.length ? <Vazio texto="Nenhum conselheiro cadastrado ainda." /> : grupos.map(([seg, titulo]) => {
        const doGrupo = lista.filter((m) => m.segmento === seg);
        if (!doGrupo.length) return null;
        return (
          <section key={seg}>
            <h3 className="vd-display text-lg mb-3">{titulo} <span className="text-sm" style={{ color: BRAND.textoSuave }}>({doGrupo.length})</span></h3>
            <ul className="rounded-2xl bg-white vd-lista-cel" style={CARTAO}>
              {doGrupo.map((m) => (
                <li key={m.id} className="flex items-center gap-3 py-3 pl-3 pr-2" style={{ opacity: m.ativo ? 1 : 0.5 }}>
                  <div className="rounded-full overflow-hidden shrink-0 flex items-center justify-center" style={{ width: 42, height: 42, background: "rgba(247,242,231,0.1)" }}>
                    {m.foto_url ? <img src={m.foto_url} alt="" className="w-full h-full object-cover" /> : <UserRound size={20} style={{ color: BRAND.textoSuave }} />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-medium break-words">
                      {m.nome}
                      {m.cargo && <span className="ml-2 text-[11px] px-2 py-0.5 rounded-full align-middle" style={{ background: "rgba(254,180,73,0.2)", color: BRAND.ambar }}>{m.cargo}</span>}
                      {!m.ativo && <span className="text-xs font-normal" style={{ color: BRAND.textoSuave }}> (oculto)</span>}
                    </div>
                    <div className="text-xs mt-0.5" style={{ color: BRAND.textoSuave }}>{[m.tipo, m.representa].filter(Boolean).join(" · ")}</div>
                  </div>
                  <Acoes item={m} rotulo={m.nome} ocupado={ocupado} onEditar={() => abrir(m)} onAlternar={() => alternar(m)} onRemover={() => remover(m)} />
                </li>
              ))}
            </ul>
          </section>
        );
      })}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Documentos
// ---------------------------------------------------------------------------
const DOC_VAZIO = { tipo: "ata", titulo: "", data: "", url: "", arquivo: null, observacao: "", ativo: true };

function Documentos() {
  const [lista, setLista] = useState(null);
  const [filtro, setFiltro] = useState("todos");
  const [form, setForm] = useState(null);
  const [modo, setModo] = useState("arquivo"); // "arquivo" | "link"
  const [pdf, setPdf] = useState(null);
  const [msg, setMsg] = useState("");
  const [ocupado, setOcupado] = useState(false);
  const inputPdf = useRef(null);

  useEffect(() => {
    carregarDocumentos().then(setLista).catch(() => { setLista([]); setMsg("Não foi possível carregar. Confira se o script supabase.sql foi aplicado."); });
  }, []);

  function abrir(d) {
    setForm(d ? { ...DOC_VAZIO, ...d, data: d.data || "", observacao: d.observacao || "" } : { ...DOC_VAZIO, tipo: filtro !== "todos" ? filtro : "ata" });
    setModo(d && !d.arquivo ? "link" : "arquivo");
    setPdf(null);
    setMsg("");
  }
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  function escolherPdf(e) {
    const arq = e.target.files?.[0];
    e.target.value = "";
    if (!arq) return;
    if (arq.size > MAX_PDF_MB * 1024 * 1024) { setMsg(`O arquivo passa de ${MAX_PDF_MB} MB.`); return; }
    setPdf(arq);
    if (!form.titulo.trim()) set("titulo", arq.name.replace(/\.[^.]+$/, "").replace(/[_-]+/g, " "));
  }

  async function salvar() {
    if (!form.titulo.trim()) { setMsg("Informe o título."); return; }
    if (modo === "arquivo" && !pdf && !form.arquivo && !form.url) { setMsg("Escolha o arquivo do documento."); return; }
    if (modo === "link" && !/^https?:\/\//i.test(form.url.trim())) { setMsg("Informe um link começando com https://"); return; }
    setOcupado(true);
    try {
      let { url, arquivo } = form;
      if (modo === "arquivo" && pdf) ({ url, caminho: arquivo } = await enviarArquivo(`documentos/${form.tipo}`, pdf, form.titulo));
      if (modo === "link") { url = form.url.trim(); arquivo = null; }
      const salvo = await salvarDocumento({ ...form, titulo: form.titulo.trim(), data: form.data || null, observacao: form.observacao.trim() || null, url, arquivo });
      setLista((l) => (form.id ? l.map((x) => (x.id === salvo.id ? salvo : x)) : [salvo, ...l]).sort((a, b) => String(b.data || "").localeCompare(String(a.data || ""))));
      setMsg(`"${salvo.titulo}" ${form.id ? "atualizado" : "publicado"}.`);
      setForm(null);
    } catch {
      setMsg("Não foi possível salvar. Verifique a conexão e tente de novo.");
    }
    setOcupado(false);
  }

  async function alternar(d) {
    setOcupado(true);
    try {
      const salvo = await salvarDocumento({ ...d, ativo: !d.ativo });
      setLista((l) => l.map((x) => (x.id === salvo.id ? salvo : x)));
      setMsg(d.ativo ? "Documento oculto do site." : "Documento visível no site.");
    } catch { setMsg("Não foi possível alterar."); }
    setOcupado(false);
  }

  async function remover(d) {
    if (!window.confirm(`Excluir "${d.titulo}"?${d.arquivo ? " O arquivo enviado também será apagado." : ""}`)) return;
    setOcupado(true);
    try { await removerDocumento(d); setLista((l) => l.filter((x) => x.id !== d.id)); setMsg("Documento excluído."); }
    catch { setMsg("Não foi possível excluir."); }
    setOcupado(false);
  }

  if (!lista) return <div className="py-16 text-center text-sm" style={{ color: BRAND.textoSuave }}>Carregando…</div>;

  if (form) {
    return (
      <div className="rounded-3xl bg-white p-5 sm:p-7" style={CARTAO}>
        <div className="flex items-center justify-between mb-6">
          <h3 className="vd-display text-xl">{form.id ? "Editar documento" : "Novo documento"}</h3>
          <button type="button" className="vd-focus vd-icone-btn" aria-label="Fechar" onClick={() => setForm(null)}><X size={18} /></button>
        </div>
        <div className="grid md:grid-cols-2 gap-5 sm:gap-6">
          <div>
            <Rotulo htmlFor="d-tipo">Tipo</Rotulo>
            <select id="d-tipo" className="vd-input" value={form.tipo} onChange={(e) => set("tipo", e.target.value)}>
              {TIPOS_DOCUMENTO.map(([id, nome]) => <option key={id} value={id}>{nome}</option>)}
            </select>
          </div>
          <div>
            <Rotulo htmlFor="d-data">Data</Rotulo>
            <input id="d-data" type="date" className="vd-input" value={form.data} onChange={(e) => set("data", e.target.value)} />
          </div>
          <div className="md:col-span-2">
            <Rotulo htmlFor="d-titulo" obrigatorio>Título</Rotulo>
            <input id="d-titulo" className="vd-input" placeholder="Ex.: Ata da 11ª Reunião Ordinária — gestão 2025–2027" value={form.titulo} onChange={(e) => set("titulo", e.target.value)} />
          </div>
          <div className="md:col-span-2">
            <div className="flex gap-2 mb-3">
              {[["arquivo", "Enviar arquivo", Upload], ["link", "Usar um link", Link2]].map(([id, nome, Icone]) => (
                <button key={id} type="button" className="vd-chip vd-focus inline-flex items-center gap-1.5" data-active={modo === id} style={modo === id ? { background: BRAND.verdeVivo } : {}} onClick={() => setModo(id)}>
                  <Icone size={14} /> {nome}
                </button>
              ))}
            </div>
            {modo === "arquivo" ? (
              <div className="flex flex-wrap items-center gap-3">
                <input ref={inputPdf} type="file" accept="application/pdf,.pdf,.doc,.docx,image/*" style={{ display: "none" }} onChange={escolherPdf} />
                <button type="button" className="vd-btn vd-btn-sec vd-focus" onClick={() => inputPdf.current?.click()}><FileText size={15} /> {pdf || form.arquivo ? "Trocar arquivo" : "Escolher arquivo"}</button>
                <span className="text-sm break-all" style={{ color: BRAND.textoSuave }}>
                  {pdf ? pdf.name : form.url ? <a href={form.url} target="_blank" rel="noopener noreferrer" className="underline">arquivo atual</a> : `PDF de preferência, até ${MAX_PDF_MB} MB`}
                </span>
              </div>
            ) : (
              <input className="vd-input" type="url" placeholder="https://..." value={form.url} onChange={(e) => set("url", e.target.value)} aria-label="Link do documento" />
            )}
          </div>
          <div className="md:col-span-2">
            <Rotulo htmlFor="d-obs">Observação</Rotulo>
            <input id="d-obs" className="vd-input" placeholder="Opcional. Ex.: Revogado pelo Decreto nº 6.240/2026." value={form.observacao} onChange={(e) => set("observacao", e.target.value)} />
          </div>
        </div>
        <div className="flex flex-col-reverse sm:flex-row sm:items-center justify-between gap-3 mt-8">
          <span className="text-sm" role="status">{msg}</span>
          <button type="button" className="vd-btn text-white vd-focus justify-center vd-btn-grande" style={{ background: BRAND.verdeVivo }} disabled={ocupado} onClick={salvar}>
            {ocupado ? "Enviando…" : <>Publicar <Check size={16} /></>}
          </button>
        </div>
      </div>
    );
  }

  const visiveis = filtro === "todos" ? lista : lista.filter((d) => d.tipo === filtro);
  return (
    <div className="space-y-6">
      <div className="vd-rolagem-x flex gap-2">
        {[["todos", "Todos"], ...TIPOS_DOCUMENTO].map(([id, nome]) => (
          <button key={id} type="button" className="vd-chip vd-focus shrink-0 whitespace-nowrap" data-active={filtro === id} style={filtro === id ? { background: BRAND.verdeVivo } : {}} onClick={() => setFiltro(id)}>
            {nome} ({id === "todos" ? lista.length : lista.filter((d) => d.tipo === id).length})
          </button>
        ))}
      </div>
      <div className="flex flex-col-reverse sm:flex-row sm:items-center justify-between gap-3">
        <span className="text-sm" role="status">{msg}</span>
        <button type="button" className="vd-btn text-white vd-focus justify-center vd-btn-grande" style={{ background: BRAND.verdeVivo }} onClick={() => abrir(null)}>
          <Plus size={16} /> Publicar documento
        </button>
      </div>
      {!visiveis.length ? <Vazio texto="Nenhum documento deste tipo ainda." /> : (
        <ul className="rounded-2xl bg-white vd-lista-cel" style={CARTAO}>
          {visiveis.map((d) => (
            <li key={d.id} className="flex items-center gap-3 py-3 pl-4 pr-2" style={{ opacity: d.ativo ? 1 : 0.5 }}>
              <div className="min-w-0 flex-1">
                <a href={d.url} target="_blank" rel="noopener noreferrer" className="text-sm font-medium break-words hover:underline">{d.titulo}</a>
                {!d.ativo && <span className="text-xs" style={{ color: BRAND.textoSuave }}> (oculto)</span>}
                <div className="text-xs mt-0.5" style={{ color: BRAND.textoSuave }}>{[NOME_TIPO[d.tipo], dataBR(d.data), d.observacao].filter(Boolean).join(" · ")}</div>
              </div>
              <Acoes item={d} rotulo={d.titulo} ocupado={ocupado} onEditar={() => abrir(d)} onAlternar={() => alternar(d)} onRemover={() => remover(d)} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default function Conselho() {
  const [secao, setSecao] = useState("documentos");
  return (
    <div className="space-y-6">
      <p className="text-sm max-w-2xl" style={{ color: BRAND.textoSuave }}>
        O que for publicado aqui aparece na página “O Conselho” do site. Itens ocultos saem do site, mas continuam guardados.
      </p>
      <div className="flex gap-2">
        {[["documentos", "Atas, leis e documentos"], ["membros", "Composição e fotos"]].map(([id, nome]) => (
          <button key={id} type="button" className="vd-chip vd-focus" data-active={secao === id} style={secao === id ? { background: BRAND.verdeVivo } : {}} onClick={() => setSecao(id)}>{nome}</button>
        ))}
      </div>
      {secao === "documentos" ? <Documentos /> : <Membros />}
    </div>
  );
}
