import { useEffect, useState } from "react";
import { Check, FileText, Pencil, Plus, Trash2, Eye, EyeOff, X, ExternalLink } from "lucide-react";
import { supabase } from "../lib/supabaseClient";
import { BRAND } from "../lib/tema";

// ---------------------------------------------------------------------------
// Aba "Conselho": documentos oficiais (PDF) e membros do COMTUR.
// Tudo o que for salvo aqui aparece sozinho na página "O Conselho" do site.
// Tabelas: comtur_documentos e comtur_membros. Arquivos: buckets
// "comtur-documentos" (PDF) e "comtur-fotos" (imagens) no Supabase Storage.
// ---------------------------------------------------------------------------

const CARTAO = { border: "1px solid rgba(247,242,231,0.14)" };

export const TIPOS_DOCUMENTO = [
  ["lei", "Lei"],
  ["decreto", "Decreto"],
  ["deliberacao", "Deliberação"],
  ["resolucao", "Resolução"],
  ["regulamento", "Regulamento / Regimento"],
  ["ata", "Ata de reunião"],
  ["outro", "Outro"],
];
const NOME_TIPO = Object.fromEntries(TIPOS_DOCUMENTO);
const SEGMENTOS = [["trade", "Trade turístico"], ["governo", "Poder público"]];
const NOME_SEGMENTO = Object.fromEntries(SEGMENTOS);

const dataBR = (iso) => (iso ? iso.split("-").reverse().join("/") : "");

function nomeArquivo(file) {
  const ext = (file.name.split(".").pop() || "").toLowerCase().replace(/[^a-z0-9]/g, "");
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}${ext ? `.${ext}` : ""}`;
}

async function enviarArquivo(bucket, file) {
  const path = nomeArquivo(file);
  const { error } = await supabase.storage.from(bucket).upload(path, file, { contentType: file.type, upsert: false });
  if (error) throw error;
  const { data } = supabase.storage.from(bucket).getPublicUrl(path);
  return { path, url: data.publicUrl };
}

async function apagarArquivo(bucket, path) {
  if (path) await supabase.storage.from(bucket).remove([path]);
}

function Rotulo({ id, children, obrigatorio }) {
  return (
    <label htmlFor={id} className="block text-sm font-medium mb-2">
      {children}{obrigatorio && <span style={{ color: BRAND.coral }}> *</span>}
    </label>
  );
}

// ---------------------------------------------------------------------------
// Documentos
// ---------------------------------------------------------------------------
const DOC_VAZIO = { titulo: "", tipo: "ata", data_documento: "", descricao: "" };

function Documentos() {
  const [itens, setItens] = useState(null);
  const [editando, setEditando] = useState(null); // null | "novo" | registro
  const [form, setForm] = useState(DOC_VAZIO);
  const [arquivo, setArquivo] = useState(null);
  const [msg, setMsg] = useState("");
  const [salvando, setSalvando] = useState(false);

  async function carregar() {
    const { data, error } = await supabase
      .from("comtur_documentos").select("*")
      .order("data_documento", { ascending: false, nullsFirst: false })
      .order("criado_em", { ascending: false });
    if (error) { setMsg("Não foi possível carregar os documentos."); setItens([]); return; }
    setItens(data);
  }
  useEffect(() => { carregar(); }, []);

  function abrir(item) {
    setEditando(item || "novo");
    setForm(item ? { titulo: item.titulo, tipo: item.tipo, data_documento: item.data_documento || "", descricao: item.descricao || "" } : DOC_VAZIO);
    setArquivo(null);
    setMsg("");
  }

  async function salvar() {
    const titulo = form.titulo.trim();
    if (!titulo) { setMsg("Informe o título do documento."); return; }
    if (editando === "novo" && !arquivo) { setMsg("Escolha o arquivo PDF."); return; }
    if (arquivo && arquivo.type !== "application/pdf") { setMsg("O arquivo precisa ser PDF."); return; }
    if (arquivo && arquivo.size > 20 * 1024 * 1024) { setMsg("O PDF pode ter no máximo 20 MB."); return; }
    setSalvando(true);
    setMsg(arquivo ? "Enviando o PDF…" : "Salvando…");
    try {
      const dados = { titulo, tipo: form.tipo, data_documento: form.data_documento || null, descricao: form.descricao.trim() || null };
      if (arquivo) {
        const up = await enviarArquivo("comtur-documentos", arquivo);
        dados.arquivo_url = up.url;
        dados.arquivo_path = up.path;
      }
      if (editando === "novo") {
        const { error } = await supabase.from("comtur_documentos").insert(dados);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("comtur_documentos").update(dados).eq("id", editando.id);
        if (error) throw error;
        if (arquivo) await apagarArquivo("comtur-documentos", editando.arquivo_path);
      }
      setEditando(null);
      await carregar();
      setMsg(`"${titulo}" publicado no site.`);
    } catch {
      setMsg("Não foi possível salvar. Confira a conexão e tente de novo.");
    }
    setSalvando(false);
  }

  async function remover(item) {
    if (!window.confirm(`Excluir "${item.titulo}"? O PDF também sai do site.`)) return;
    setSalvando(true);
    const { error } = await supabase.from("comtur_documentos").delete().eq("id", item.id);
    if (!error) await apagarArquivo("comtur-documentos", item.arquivo_path);
    await carregar();
    setMsg(error ? "Não foi possível excluir." : `"${item.titulo}" excluído.`);
    setSalvando(false);
  }

  if (editando) {
    return (
      <div className="rounded-3xl bg-white p-5 sm:p-7" style={CARTAO}>
        <div className="flex items-center justify-between mb-6">
          <h3 className="vd-display text-xl">{editando === "novo" ? "Novo documento" : "Editar documento"}</h3>
          <button type="button" className="vd-focus vd-icone-btn" aria-label="Fechar" onClick={() => setEditando(null)}><X size={18} /></button>
        </div>
        <div className="grid md:grid-cols-2 gap-5 sm:gap-6">
          <div className="md:col-span-2">
            <Rotulo id="doc-titulo" obrigatorio>Título</Rotulo>
            <input id="doc-titulo" className="vd-input vd-focus" value={form.titulo} placeholder="Ex.: Decreto nº 6.240 — composição do Conselho" onChange={(e) => setForm({ ...form, titulo: e.target.value })} />
          </div>
          <div>
            <Rotulo id="doc-tipo" obrigatorio>Tipo</Rotulo>
            <select id="doc-tipo" className="vd-input vd-focus" value={form.tipo} onChange={(e) => setForm({ ...form, tipo: e.target.value })}>
              {TIPOS_DOCUMENTO.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
          </div>
          <div>
            <Rotulo id="doc-data">Data do documento</Rotulo>
            <input id="doc-data" type="date" className="vd-input vd-focus" value={form.data_documento} onChange={(e) => setForm({ ...form, data_documento: e.target.value })} />
          </div>
          <div className="md:col-span-2">
            <Rotulo id="doc-descricao">Resumo (opcional)</Rotulo>
            <textarea id="doc-descricao" rows={3} className="vd-input vd-focus" value={form.descricao} onChange={(e) => setForm({ ...form, descricao: e.target.value })} />
          </div>
          <div className="md:col-span-2">
            <Rotulo id="doc-arquivo" obrigatorio={editando === "novo"}>Arquivo PDF{editando !== "novo" && " (envie só se quiser trocar)"}</Rotulo>
            <input id="doc-arquivo" type="file" accept="application/pdf" className="vd-input vd-focus" onChange={(e) => setArquivo(e.target.files?.[0] || null)} />
            {editando !== "novo" && editando.arquivo_url && (
              <a href={editando.arquivo_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs mt-2 underline" style={{ color: BRAND.textoSuave }}>
                Ver PDF atual <ExternalLink size={12} />
              </a>
            )}
          </div>
        </div>
        <div className="flex flex-col-reverse sm:flex-row sm:items-center justify-between gap-3 mt-8">
          <span className="text-sm" role="status">{msg}</span>
          <button type="button" className="vd-btn text-white vd-focus justify-center vd-btn-grande" style={{ background: BRAND.verdeVivo }} disabled={salvando} onClick={salvar}>
            {salvando ? "Salvando…" : <>Salvar <Check size={16} /></>}
          </button>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="flex flex-col-reverse sm:flex-row sm:items-center justify-between gap-3">
        <span className="text-sm" role="status">{msg}</span>
        <button type="button" className="vd-btn text-white vd-focus justify-center vd-btn-grande" style={{ background: BRAND.verdeVivo }} onClick={() => abrir(null)}>
          <Plus size={16} /> Enviar documento
        </button>
      </div>
      {itens === null ? (
        <p className="text-sm py-10 text-center" style={{ color: BRAND.textoSuave }}>Carregando…</p>
      ) : !itens.length ? (
        <p className="text-sm py-10 text-center rounded-2xl" style={{ ...CARTAO, color: BRAND.textoSuave }}>Nenhum documento enviado ainda.</p>
      ) : (
        <ul className="rounded-2xl bg-white vd-lista-cel" style={CARTAO}>
          {itens.map((d) => (
            <li key={d.id} className="flex items-center gap-3 py-3 pl-4 pr-2">
              <FileText size={18} className="shrink-0" style={{ color: BRAND.ambar }} />
              <div className="min-w-0 flex-1">
                <a href={d.arquivo_url} target="_blank" rel="noopener noreferrer" className="text-sm font-medium break-words hover:underline">{d.titulo}</a>
                <div className="text-xs mt-0.5" style={{ color: BRAND.textoSuave }}>{[NOME_TIPO[d.tipo], dataBR(d.data_documento)].filter(Boolean).join(" · ")}</div>
              </div>
              <div className="flex shrink-0">
                <button type="button" className="vd-icone-btn vd-focus" aria-label={`Editar ${d.titulo}`} onClick={() => abrir(d)}><Pencil size={17} /></button>
                <button type="button" className="vd-icone-btn vd-focus" aria-label={`Excluir ${d.titulo}`} onClick={() => remover(d)} disabled={salvando}><Trash2 size={17} /></button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}

// ---------------------------------------------------------------------------
// Membros
// ---------------------------------------------------------------------------
const MEMBRO_VAZIO = { nome: "", cargo: "", representa: "", segmento: "trade", ordem: 0 };

function Membros() {
  const [itens, setItens] = useState(null);
  const [editando, setEditando] = useState(null);
  const [form, setForm] = useState(MEMBRO_VAZIO);
  const [foto, setFoto] = useState(null);
  const [tirarFoto, setTirarFoto] = useState(false);
  const [msg, setMsg] = useState("");
  const [salvando, setSalvando] = useState(false);

  async function carregar() {
    const { data, error } = await supabase
      .from("comtur_membros").select("*")
      .order("segmento").order("ordem").order("nome");
    if (error) { setMsg("Não foi possível carregar os membros."); setItens([]); return; }
    setItens(data);
  }
  useEffect(() => { carregar(); }, []);

  function abrir(item) {
    setEditando(item || "novo");
    setForm(item ? { nome: item.nome, cargo: item.cargo || "", representa: item.representa || "", segmento: item.segmento, ordem: item.ordem ?? 0 } : MEMBRO_VAZIO);
    setFoto(null);
    setTirarFoto(false);
    setMsg("");
  }

  async function salvar() {
    const nome = form.nome.trim();
    if (!nome) { setMsg("Informe o nome."); return; }
    if (foto && !/^image\/(jpeg|png|webp)$/.test(foto.type)) { setMsg("A foto precisa ser JPG, PNG ou WEBP."); return; }
    if (foto && foto.size > 5 * 1024 * 1024) { setMsg("A foto pode ter no máximo 5 MB."); return; }
    setSalvando(true);
    setMsg("Salvando…");
    try {
      const dados = {
        nome, cargo: form.cargo.trim() || null, representa: form.representa.trim() || null,
        segmento: form.segmento, ordem: Number(form.ordem) || 0,
      };
      const fotoAntiga = editando !== "novo" ? editando.foto_path : null;
      if (foto) {
        const up = await enviarArquivo("comtur-fotos", foto);
        dados.foto_url = up.url;
        dados.foto_path = up.path;
      } else if (tirarFoto) {
        dados.foto_url = null;
        dados.foto_path = null;
      }
      if (editando === "novo") {
        const { error } = await supabase.from("comtur_membros").insert(dados);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("comtur_membros").update(dados).eq("id", editando.id);
        if (error) throw error;
        if ((foto || tirarFoto) && fotoAntiga) await apagarArquivo("comtur-fotos", fotoAntiga);
      }
      setEditando(null);
      await carregar();
      setMsg(`${nome} salvo.`);
    } catch {
      setMsg("Não foi possível salvar. Confira a conexão e tente de novo.");
    }
    setSalvando(false);
  }

  async function alternar(m) {
    setSalvando(true);
    const { error } = await supabase.from("comtur_membros").update({ ativo: !m.ativo }).eq("id", m.id);
    await carregar();
    setMsg(error ? "Não foi possível alterar." : m.ativo ? `${m.nome} oculto do site.` : `${m.nome} visível no site.`);
    setSalvando(false);
  }

  async function remover(m) {
    if (!window.confirm(`Excluir ${m.nome} da lista de conselheiros?`)) return;
    setSalvando(true);
    const { error } = await supabase.from("comtur_membros").delete().eq("id", m.id);
    if (!error) await apagarArquivo("comtur-fotos", m.foto_path);
    await carregar();
    setMsg(error ? "Não foi possível excluir." : `${m.nome} excluído.`);
    setSalvando(false);
  }

  if (editando) {
    return (
      <div className="rounded-3xl bg-white p-5 sm:p-7" style={CARTAO}>
        <div className="flex items-center justify-between mb-6">
          <h3 className="vd-display text-xl">{editando === "novo" ? "Novo membro" : "Editar membro"}</h3>
          <button type="button" className="vd-focus vd-icone-btn" aria-label="Fechar" onClick={() => setEditando(null)}><X size={18} /></button>
        </div>
        <div className="grid md:grid-cols-2 gap-5 sm:gap-6">
          <div>
            <Rotulo id="m-nome" obrigatorio>Nome</Rotulo>
            <input id="m-nome" className="vd-input vd-focus" value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} />
          </div>
          <div>
            <Rotulo id="m-cargo">Cargo no Conselho</Rotulo>
            <input id="m-cargo" className="vd-input vd-focus" value={form.cargo} placeholder="Ex.: Presidente, Titular, Suplente" onChange={(e) => setForm({ ...form, cargo: e.target.value })} />
          </div>
          <div>
            <Rotulo id="m-representa">Entidade que representa</Rotulo>
            <input id="m-representa" className="vd-input vd-focus" value={form.representa} placeholder="Ex.: Associação Comercial" onChange={(e) => setForm({ ...form, representa: e.target.value })} />
          </div>
          <div>
            <Rotulo id="m-segmento" obrigatorio>Segmento</Rotulo>
            <select id="m-segmento" className="vd-input vd-focus" value={form.segmento} onChange={(e) => setForm({ ...form, segmento: e.target.value })}>
              {SEGMENTOS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
          </div>
          <div>
            <Rotulo id="m-ordem">Ordem na lista</Rotulo>
            <input id="m-ordem" type="number" className="vd-input vd-focus" value={form.ordem} onChange={(e) => setForm({ ...form, ordem: e.target.value })} />
            <p className="text-xs mt-1.5" style={{ color: BRAND.textoSuave }}>Menor número aparece primeiro. Empate: ordem alfabética.</p>
          </div>
          <div>
            <Rotulo id="m-foto">Foto (opcional)</Rotulo>
            <input id="m-foto" type="file" accept="image/jpeg,image/png,image/webp" className="vd-input vd-focus" onChange={(e) => { setFoto(e.target.files?.[0] || null); setTirarFoto(false); }} />
            {editando !== "novo" && editando.foto_url && !foto && (
              <label className="flex items-center gap-2 text-xs mt-2" style={{ color: BRAND.textoSuave }}>
                <input type="checkbox" checked={tirarFoto} onChange={(e) => setTirarFoto(e.target.checked)} /> Remover a foto atual
              </label>
            )}
            <p className="text-xs mt-1.5" style={{ color: BRAND.textoSuave }}>Use só fotos com autorização da pessoa.</p>
          </div>
        </div>
        <div className="flex flex-col-reverse sm:flex-row sm:items-center justify-between gap-3 mt-8">
          <span className="text-sm" role="status">{msg}</span>
          <button type="button" className="vd-btn text-white vd-focus justify-center vd-btn-grande" style={{ background: BRAND.verdeVivo }} disabled={salvando} onClick={salvar}>
            {salvando ? "Salvando…" : <>Salvar <Check size={16} /></>}
          </button>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="flex flex-col-reverse sm:flex-row sm:items-center justify-between gap-3">
        <span className="text-sm" role="status">{msg}</span>
        <button type="button" className="vd-btn text-white vd-focus justify-center vd-btn-grande" style={{ background: BRAND.verdeVivo }} onClick={() => abrir(null)}>
          <Plus size={16} /> Cadastrar membro
        </button>
      </div>
      {itens === null ? (
        <p className="text-sm py-10 text-center" style={{ color: BRAND.textoSuave }}>Carregando…</p>
      ) : !itens.length ? (
        <p className="text-sm py-10 text-center rounded-2xl" style={{ ...CARTAO, color: BRAND.textoSuave }}>Nenhum membro cadastrado ainda.</p>
      ) : (
        <ul className="rounded-2xl bg-white vd-lista-cel" style={CARTAO}>
          {itens.map((m) => (
            <li key={m.id} className="flex items-center gap-3 py-3 pl-4 pr-2" style={{ opacity: m.ativo ? 1 : 0.5 }}>
              <div className="w-10 h-10 rounded-full overflow-hidden shrink-0 flex items-center justify-center text-xs font-semibold" style={{ background: "rgba(247,242,231,0.12)" }}>
                {m.foto_url ? <img src={m.foto_url} alt="" className="w-full h-full object-cover" /> : m.nome.split(/\s+/).slice(0, 2).map((p) => p[0]).join("").toUpperCase()}
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-sm font-medium break-words">{m.nome}{!m.ativo && <span className="text-xs font-normal" style={{ color: BRAND.textoSuave }}> (oculto)</span>}</div>
                <div className="text-xs mt-0.5" style={{ color: BRAND.textoSuave }}>{[m.cargo, m.representa, NOME_SEGMENTO[m.segmento]].filter(Boolean).join(" · ")}</div>
              </div>
              <div className="flex shrink-0">
                <button type="button" className="vd-icone-btn vd-focus" aria-label={`Editar ${m.nome}`} onClick={() => abrir(m)}><Pencil size={17} /></button>
                <button type="button" className="vd-icone-btn vd-focus" aria-label={`${m.ativo ? "Ocultar" : "Mostrar"} ${m.nome}`} onClick={() => alternar(m)} disabled={salvando}>{m.ativo ? <EyeOff size={17} /> : <Eye size={17} />}</button>
                <button type="button" className="vd-icone-btn vd-focus" aria-label={`Excluir ${m.nome}`} onClick={() => remover(m)} disabled={salvando}><Trash2 size={17} /></button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}

// ---------------------------------------------------------------------------
export default function Conselho() {
  const [secao, setSecao] = useState("documentos");
  return (
    <div className="space-y-6">
      <p className="text-sm max-w-2xl" style={{ color: BRAND.textoSuave }}>
        Documentos e membros cadastrados aqui aparecem automaticamente na página “O Conselho” do site, sem precisar mexer no código.
      </p>
      <div className="vd-rolagem-x flex gap-2">
        {[["documentos", "Documentos"], ["membros", "Membros"]].map(([id, label]) => (
          <button key={id} type="button" className="vd-chip vd-focus shrink-0 whitespace-nowrap" data-active={secao === id} style={secao === id ? { background: BRAND.verdeVivo } : {}} onClick={() => setSecao(id)}>
            {label}
          </button>
        ))}
      </div>
      {secao === "documentos" ? <Documentos /> : <Membros />}
    </div>
  );
}
