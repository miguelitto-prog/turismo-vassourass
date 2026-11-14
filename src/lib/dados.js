import { supabase } from "./supabaseClient";

// ---------------------------------------------------------------------------
// Chaves usadas na tabela kv_store
// ---------------------------------------------------------------------------
// Cada resposta da pesquisa é gravada em uma linha própria
// (vd_visitantes:<id>), para que duas pessoas respondendo ao mesmo tempo
// não sobrescrevam uma à outra. A chave antiga "vd_visitantes" (uma lista
// única) continua sendo lida para não perder as respostas já coletadas.
export const CHAVES = {
  visitantesLegado: "vd_visitantes",
  prefixoVisitante: "vd_visitantes:",
  hospedagem: "vd_hospedagem",
  eventos: "vd_eventos",
  cadastros: "vd_cadastros",
};

function novoId() {
  if (typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID();
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

async function lerChave(key) {
  const { data, error } = await supabase.from("kv_store").select("value").eq("key", key).maybeSingle();
  if (error) throw error;
  return data ? JSON.parse(data.value) : null;
}

async function gravarChave(key, valor) {
  const { error } = await supabase
    .from("kv_store")
    .upsert({ key, value: JSON.stringify(valor), updated_at: new Date().toISOString() });
  if (error) throw error;
}

// ---------------------------------------------------------------------------
// Pesquisa de visitantes (público)
// ---------------------------------------------------------------------------
export async function enviarResposta(registro) {
  const { error } = await supabase
    .from("kv_store")
    .insert({ key: `${CHAVES.prefixoVisitante}${novoId()}`, value: JSON.stringify(registro) });
  if (error) throw error;
}

// O e-mail é gravado numa tabela separada e sem ligação com a resposta,
// para que a pesquisa continue anônima.
export async function salvarContato(email) {
  const { error } = await supabase.from("contatos").insert({ email: email.trim().toLowerCase() });
  if (error) throw error;
}

// ---------------------------------------------------------------------------
// Leitura (painel do Conselho — exige login)
// ---------------------------------------------------------------------------
export async function carregarVisitantes() {
  const [legado, linhas] = await Promise.all([
    lerChave(CHAVES.visitantesLegado).catch(() => null),
    supabase.from("kv_store").select("key, value").like("key", `${CHAVES.prefixoVisitante}%`),
  ]);
  if (linhas.error) throw linhas.error;
  const novos = (linhas.data || []).map((l) => {
    try { return { id: l.key.slice(CHAVES.prefixoVisitante.length), ...JSON.parse(l.value) }; } catch { return null; }
  }).filter(Boolean);
  const antigos = Array.isArray(legado) ? legado.map((r, i) => ({ id: `legado-${i}`, ...r })) : [];
  return [...antigos, ...novos].sort((a, b) => String(a.timestamp || "").localeCompare(String(b.timestamp || "")));
}

export async function carregarLista(key) {
  const v = await lerChave(key).catch(() => null);
  return Array.isArray(v) ? v : [];
}

export async function salvarLista(key, lista) {
  await gravarChave(key, lista);
}

export async function carregarContatos() {
  const { data, error } = await supabase.from("contatos").select("email, criado_em").order("criado_em");
  if (error) throw error;
  return data || [];
}

// ---------------------------------------------------------------------------
// Cadastros dinâmicos (atrativos, hospedagens, eventos)
// Alimentam o formulário da pesquisa e as páginas do site.
// ---------------------------------------------------------------------------
export async function carregarCadastros() {
  try {
    const salvo = await lerChave(CHAVES.cadastros);
    if (salvo && typeof salvo === "object") {
      return {
        atrativos: salvo.atrativos || [],
        hospedagens: salvo.hospedagens || [],
        eventos: salvo.eventos || [],
      };
    }
  } catch {
    // sem conexão ou sem permissão: usa a lista padrão
  }
  return CADASTROS_PADRAO;
}

export async function salvarCadastros(cadastros) {
  await gravarChave(CHAVES.cadastros, cadastros);
}

export { novoId };

const at = (nome, categoria, descricao = "", site = false) => ({ id: novoId(), nome, categoria, descricao, site, ativo: true });
const hp = (nome, tipo, link = "") => ({ id: novoId(), nome, tipo, link, ativo: true });

export const CATEGORIAS_ATRATIVO = ["Centro histórico", "Museu", "Religioso", "Fazenda histórica", "Natureza", "Outro"];
export const TIPOS_HOSPEDAGEM = ["Hotel", "Pousada", "Fazenda", "Resort", "Residence", "Outro"];

// Lista inicial — usada até o Conselho salvar o primeiro cadastro no painel.
export const CADASTROS_PADRAO = {
  atrativos: [
    at("Praça Barão de Campo Belo", "Centro histórico", "O coração cívico da cidade, cercado por casarões e comércio histórico do centro tombado.", true),
    at("Igreja Matriz Nossa Senhora da Conceição", "Religioso", "Marco religioso e arquitetônico, símbolo da fé que acompanhou o apogeu cafeeiro.", true),
    at("Museu Casa da Hera", "Museu", "Erguida pela família do negociante Joaquim José Teixeira Leite, preserva os ambientes deixados por Eufrásia Teixeira Leite, com piano de cauda de 1862.", true),
    at("Mirante Imperial", "Centro histórico", "Vista panorâmica sobre os telhados históricos e as colinas ao redor da cidade.", true),
    at("Estação Ferroviária de Vassouras", "Centro histórico", "Erguida em 1875, testemunha da era em que trens escoavam o café rumo ao porto do Rio de Janeiro.", true),
    at("Memorial Manoel Congo", "Centro histórico", "Espaço de memória dedicado à resistência e à luta dos escravizados no período cafeeiro.", true),
    at("Museu Vassouras", "Museu", "Casarão dedicado ao auge do café (1830–1880) e a personagens silenciados, como Marianna Crioula.", true),
    at("Casa de Cultura Cazuza", "Museu", "Casarão de 1845 revitalizado em 2018 por Lucinha Araújo, com peças e objetos do cantor Cazuza.", true),
    at("Câmara Municipal de Vassouras", "Centro histórico", "Sede do poder legislativo local, instalada em um dos edifícios históricos do centro.", true),
    at("Palacete Barão do Ribeirão", "Centro histórico", "Antiga residência de barão do café, integrada ao patrimônio arquitetônico da cidade.", true),
    at("Pátio Casario", "Centro histórico", "Trecho do casario histórico transformado em espaço de convivência e comércio local.", true),
    at("Praça Sebastião de Lacerda", "Centro histórico", "Praça histórica do centro, ponto de encontro à sombra de árvores centenárias.", true),
    at("Cemitério Nossa Senhora da Conceição", "Religioso", "Referência do turismo religioso da cidade, onde nasce anualmente a Flor de Carne.", true),
    at("Centro de Convenções General Sombra", "Centro histórico", "Estrutura para eventos e convenções, ampliando a vocação turística e universitária da cidade.", true),
    at("Palacete Barão de Itambé", "Centro histórico"),
    at("Palacete Barão de Vassouras", "Centro histórico"),
    at("Museu de Arte Sacra da Igreja Matriz", "Museu"),
    at("Museu do Café", "Museu"),
    at("Observatório Magnético Nacional", "Outro"),
    at("Fazenda São Roque", "Fazenda histórica"),
    at("Fazenda Santa Eufrásia", "Fazenda histórica"),
    at("Fazenda da Cachoeira Grande", "Fazenda histórica"),
    at("Fazenda do Secretário", "Fazenda histórica"),
    at("Fazenda Cachoeira do Mato Dentro", "Fazenda histórica"),
    at("Fazenda Mulungu Vermelho", "Fazenda histórica"),
    at("Fazenda São Luiz da Boa Sorte", "Fazenda histórica"),
  ],
  hospedagens: [
    hp("Mara Palace Hotel", "Hotel", "https://www.marapalace.com.br/"),
    hp("Hotel Santa Amália", "Hotel", "https://www.hotelsantaamalia.com/"),
    hp("Vila Hibisco Pousada", "Pousada", "https://www.vilahibisco.com.br/"),
    hp("Bliss Hotel", "Hotel", "https://www.blisshotelvaledocafe.com.br/"),
    hp("Betânia Pousada", "Pousada", "https://www.betaniaceo.com.br/"),
    hp("Hotel Fazenda Galo Vermelho", "Fazenda", "https://www.hotelfazendagalovermelho.com.br/"),
    hp("Hotel Gramado da Serra", "Hotel", "https://www.hotelgramado.com.br/hotel.php"),
    hp("Pousada Fazenda Sto. Antônio", "Fazenda", "https://www.facebook.com/pescavassouras/"),
    hp("Pousada Vale das Palmeiras", "Pousada", "https://www.pousadavaledaspalmeiras.com.br/"),
    hp("Pousada Recanto do Verde", "Pousada", "https://www.facebook.com/Pousada-Recanto-Verde-Vassouras-Rj-268187113376131/"),
    hp("Pousada D'Alícia", "Pousada", "https://www.instagram.com/pousada_restaurante_dalicia/"),
    hp("Vassouras Eco Resort", "Resort", "https://www.vassourasecoresort.com.br/"),
    hp("Mansão Residence & Club", "Residence", "https://www.facebook.com/mansaoresidence"),
    hp("Fazenda Cachoeira Grande", "Fazenda", "https://www.instagram.com/fazendacachoeiragranderj/"),
    hp("Pousada Pomar de Vassouras", "Pousada", "https://www.instagram.com/pousadapomardevassouras/"),
    hp("Hotel Princesinha do Café", "Hotel", "https://www.instagram.com/hotelprincesinhadocafe/"),
    hp("Fazenda São Luiz da Boa Sorte", "Fazenda", "https://fazendasaoluizdaboasorte.com.br/suites/"),
    hp("Pousada Veredas", "Pousada", "https://www.facebook.com/pousadaveredas/"),
  ],
  eventos: [],
};

// ---------------------------------------------------------------------------
// Página "O Conselho": membros e documentos (tabelas próprias no Supabase)
// Arquivos (fotos e PDFs) vão para o Storage, na pasta pública "comtur".
// ---------------------------------------------------------------------------
export const BUCKET_CONSELHO = "comtur";

export const TIPOS_DOCUMENTO = [
  ["ata", "Ata"],
  ["deliberacao", "Deliberação / Resolução"],
  ["lei", "Lei"],
  ["decreto", "Decreto"],
  ["regimento", "Regimento"],
  ["apresentacao", "Apresentação"],
  ["outro", "Outro documento"],
];

export const CARGOS_DIRETORIA = ["Presidente", "Vice-Presidente", "1º Secretário", "1ª Secretária", "2º Secretário", "2ª Secretária"];

export async function carregarMembros() {
  const { data, error } = await supabase.from("conselho_membros").select("*").order("ordem").order("nome");
  if (error) throw error;
  return data || [];
}

export async function salvarMembro(membro) {
  const { id, criado_em: _criado, ...campos } = membro;
  const q = id ? supabase.from("conselho_membros").update(campos).eq("id", id) : supabase.from("conselho_membros").insert(campos);
  const { data, error } = await q.select().single();
  if (error) throw error;
  return data;
}

export async function removerMembro(id) {
  const { error } = await supabase.from("conselho_membros").delete().eq("id", id);
  if (error) throw error;
}

export async function carregarDocumentos() {
  const { data, error } = await supabase.from("conselho_documentos").select("*")
    .order("data", { ascending: false, nullsFirst: false }).order("criado_em", { ascending: false });
  if (error) throw error;
  return data || [];
}

export async function salvarDocumento(doc) {
  const { id, criado_em: _criado, ...campos } = doc;
  const q = id ? supabase.from("conselho_documentos").update(campos).eq("id", id) : supabase.from("conselho_documentos").insert(campos);
  const { data, error } = await q.select().single();
  if (error) throw error;
  return data;
}

export async function removerDocumento(doc) {
  const { error } = await supabase.from("conselho_documentos").delete().eq("id", doc.id);
  if (error) throw error;
  if (doc.arquivo) await supabase.storage.from(BUCKET_CONSELHO).remove([doc.arquivo]).catch(() => {});
}

function nomeSeguro(nome) {
  return String(nome).normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase()
    .replace(/[^a-z0-9.]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 80) || "arquivo";
}

// Envia um arquivo e devolve { caminho, url } públicos.
export async function enviarArquivo(pasta, arquivo, nomeBase) {
  const ext = (arquivo.name.split(".").pop() || "bin").toLowerCase();
  const caminho = `${pasta}/${Date.now().toString(36)}-${nomeSeguro(nomeBase || arquivo.name.replace(/\.[^.]+$/, ""))}.${ext}`;
  const { error } = await supabase.storage.from(BUCKET_CONSELHO).upload(caminho, arquivo, {
    contentType: arquivo.type || undefined, upsert: false, cacheControl: "3600",
  });
  if (error) throw error;
  const { data } = supabase.storage.from(BUCKET_CONSELHO).getPublicUrl(caminho);
  return { caminho, url: data.publicUrl };
}

// Reduz fotos grandes de celular para no máximo 800 px (JPEG), antes do envio.
export async function reduzirFoto(arquivo, max = 800) {
  if (!arquivo.type.startsWith("image/") || arquivo.type === "image/svg+xml") return arquivo;
  try {
    const bitmap = await createImageBitmap(arquivo);
    const escala = Math.min(1, max / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bitmap.width * escala);
    canvas.height = Math.round(bitmap.height * escala);
    canvas.getContext("2d").drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise((ok) => canvas.toBlob(ok, "image/jpeg", 0.85));
    return blob ? new File([blob], "foto.jpg", { type: "image/jpeg" }) : arquivo;
  } catch {
    return arquivo;
  }
}
