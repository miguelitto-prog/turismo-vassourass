import { useEffect, useMemo, useRef, useState } from "react";
import { Check, ChevronDown, Search, X } from "lucide-react";
import { BRAND } from "../lib/tema";

export const UFS = [
  ["AC", "Acre"], ["AL", "Alagoas"], ["AP", "Amapá"], ["AM", "Amazonas"], ["BA", "Bahia"],
  ["CE", "Ceará"], ["DF", "Distrito Federal"], ["ES", "Espírito Santo"], ["GO", "Goiás"],
  ["MA", "Maranhão"], ["MT", "Mato Grosso"], ["MS", "Mato Grosso do Sul"], ["MG", "Minas Gerais"],
  ["PA", "Pará"], ["PB", "Paraíba"], ["PR", "Paraná"], ["PE", "Pernambuco"], ["PI", "Piauí"],
  ["RJ", "Rio de Janeiro"], ["RN", "Rio Grande do Norte"], ["RS", "Rio Grande do Sul"],
  ["RO", "Rondônia"], ["RR", "Roraima"], ["SC", "Santa Catarina"], ["SP", "São Paulo"],
  ["SE", "Sergipe"], ["TO", "Tocantins"],
];
export const EXTERIOR = "EX";

// Municípios vêm da API pública do IBGE; ficam em memória por UF.
const cacheMunicipios = {};
export function useMunicipios(uf) {
  const [estado, setEstado] = useState({ lista: [], carregando: false, falhou: false });
  useEffect(() => {
    if (!uf || uf === EXTERIOR) { setEstado({ lista: [], carregando: false, falhou: false }); return; }
    if (cacheMunicipios[uf]) { setEstado({ lista: cacheMunicipios[uf], carregando: false, falhou: false }); return; }
    let ativo = true;
    setEstado({ lista: [], carregando: true, falhou: false });
    fetch(`https://servicodados.ibge.gov.br/api/v1/localidades/estados/${uf}/municipios?orderBy=nome`)
      .then((r) => (r.ok ? r.json() : Promise.reject(r.status)))
      .then((json) => {
        const nomes = json.map((m) => m.nome);
        cacheMunicipios[uf] = nomes;
        if (ativo) setEstado({ lista: nomes, carregando: false, falhou: false });
      })
      .catch(() => { if (ativo) setEstado({ lista: [], carregando: false, falhou: true }); });
    return () => { ativo = false; };
  }, [uf]);
  return estado;
}

export function formatarReais(valor) {
  if (valor === "" || valor === null || valor === undefined || isNaN(valor)) return "";
  return Number(valor).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function Chips({ options, ativo, onToggle, cor }) {
  return (
    <div className="flex gap-2 flex-wrap">
      {options.map((o) => {
        const on = ativo(o);
        return (
          <button
            type="button"
            key={o}
            className="vd-chip vd-focus"
            data-active={on}
            aria-pressed={on}
            style={on ? { background: cor, borderColor: cor } : {}}
            onClick={() => onToggle(o)}
          >
            {o}
          </button>
        );
      })}
    </div>
  );
}

// Dropdown fechado que abre uma lista com caixinhas de marcar — usado nas
// perguntas de múltipla escolha, para não espalhar dezenas de botões na tela.
function DropdownMulti({ options, valor, onToggle, label }) {
  const [aberto, setAberto] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    function aoClicarFora(e) {
      if (ref.current && !ref.current.contains(e.target)) setAberto(false);
    }
    function aoTeclar(e) {
      if (e.key === "Escape") setAberto(false);
    }
    document.addEventListener("mousedown", aoClicarFora);
    document.addEventListener("keydown", aoTeclar);
    return () => {
      document.removeEventListener("mousedown", aoClicarFora);
      document.removeEventListener("keydown", aoTeclar);
    };
  }, []);

  const n = valor.length;
  const resumo = n === 0 ? "Selecione…" : n === 1 ? valor[0] : `${n} selecionados`;

  return (
    <div className="vd-multiselect" ref={ref}>
      <button
        type="button"
        className="vd-input vd-focus vd-multiselect-botao"
        aria-haspopup="listbox"
        aria-expanded={aberto}
        aria-label={label}
        onClick={() => setAberto((a) => !a)}
      >
        <span className={n ? "" : "vd-multiselect-placeholder"}>{resumo}</span>
        <ChevronDown size={18} style={{ flexShrink: 0, opacity: 0.6 }} />
      </button>
      {aberto && (
        <div className="vd-multiselect-painel" role="listbox" aria-multiselectable="true">
          {options.map((o) => {
            const on = valor.includes(o);
            return (
              <label key={o} className="vd-multiselect-item" data-active={on}>
                <input type="checkbox" checked={on} onChange={() => onToggle(o)} />
                <span className="vd-multiselect-check" aria-hidden="true">
                  {on && <Check size={12} color="#fff" strokeWidth={3} />}
                </span>
                <span>{o}</span>
              </label>
            );
          })}
          <div className="vd-multiselect-rodape">
            <button type="button" className="vd-multiselect-fechar" onClick={() => setAberto(false)}>
              Pronto
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Renderiza um campo a partir da sua definição.
 * Tipos: text, email, number, date, month, textarea, select, radio, multi, moeda, municipio
 * `campo.outro`: id do campo de texto livre que aparece quando "Outro" é escolhido.
 */
export function Campo({ campo, valor, onChange, dados, set, erro, options }) {
  const base = "vd-input vd-focus";
  const opcoes = options || campo.options || [];
  const invalido = erro ? "true" : "false";
  const textoOutro = campo.outro && (
    (Array.isArray(valor) ? valor.includes("Outro") : valor === "Outro") ? (
      <input
        className={`${base} mt-3`}
        type="text"
        placeholder="Conte qual"
        aria-label={`${campo.label} — outro`}
        value={dados?.[campo.outro] || ""}
        onChange={(e) => set(campo.outro, e.target.value)}
      />
    ) : null
  );

  if (campo.type === "select") {
    return (
      <>
        <select id={campo.id} className={base} aria-invalid={invalido} value={valor} onChange={(e) => onChange(e.target.value)}>
          <option value="">Selecione…</option>
          {opcoes.map((o) => <option key={o} value={o}>{o}</option>)}
        </select>
        {textoOutro}
      </>
    );
  }
  if (campo.type === "radio") {
    return <Chips options={opcoes} ativo={(o) => valor === o} onToggle={onChange} cor={BRAND.verde} />;
  }
  if (campo.type === "multi") {
    const arr = Array.isArray(valor) ? valor : (valor ? [valor] : []);
    const toggle = (o) => onChange(arr.includes(o) ? arr.filter((x) => x !== o) : [...arr, o]);
    return (
      <>
        <DropdownMulti options={opcoes} valor={arr} onToggle={toggle} label={campo.label} />
        {textoOutro}
      </>
    );
  }
  if (campo.type === "textarea") {
    return <textarea id={campo.id} className={base} rows={3} placeholder={campo.placeholder} value={valor} onChange={(e) => onChange(e.target.value)} />;
  }
  if (campo.type === "moeda") {
    return (
      <input
        id={campo.id}
        className={base}
        type="text"
        inputMode="numeric"
        placeholder="R$ 0,00"
        aria-invalid={invalido}
        value={formatarReais(valor)}
        onChange={(e) => {
          const digitos = e.target.value.replace(/\D/g, "");
          onChange(digitos ? parseInt(digitos, 10) / 100 : "");
        }}
      />
    );
  }
  if (campo.type === "municipio") {
    return <CampoMunicipio campo={campo} valor={valor} onChange={onChange} uf={dados?.[campo.dependeDe]} invalido={invalido} />;
  }
  return (
    <input
      id={campo.id}
      className={base}
      type={campo.type}
      inputMode={campo.type === "number" ? "numeric" : undefined}
      min={campo.type === "number" ? 0 : undefined}
      placeholder={campo.placeholder}
      aria-invalid={invalido}
      value={valor}
      onChange={(e) => onChange(e.target.value)}
    />
  );
}

// Tira acentos e caixa para a busca ("sao joao" encontra "São João").
function normalizar(t) {
  return String(t || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
}

// Campo de busca com lista própria — funciona igual em todos os estados e no
// celular (o <datalist> do navegador não aparece na maioria dos celulares).
function CampoMunicipio({ campo, valor, onChange, uf, invalido }) {
  const { lista, carregando, falhou } = useMunicipios(uf);
  const [aberto, setAberto] = useState(false);
  const [destaque, setDestaque] = useState(0);
  const ref = useRef(null);
  const listaRef = useRef(null);

  useEffect(() => {
    function aoClicarFora(e) {
      if (ref.current && !ref.current.contains(e.target)) setAberto(false);
    }
    document.addEventListener("mousedown", aoClicarFora);
    document.addEventListener("touchstart", aoClicarFora);
    return () => {
      document.removeEventListener("mousedown", aoClicarFora);
      document.removeEventListener("touchstart", aoClicarFora);
    };
  }, []);

  const filtrados = useMemo(() => {
    const q = normalizar(valor);
    if (!q || lista.includes(valor)) return lista;
    const comeca = [];
    const contem = [];
    lista.forEach((m) => {
      const n = normalizar(m);
      if (n.startsWith(q)) comeca.push(m);
      else if (n.includes(q)) contem.push(m);
    });
    return [...comeca, ...contem];
  }, [lista, valor]);

  useEffect(() => { setDestaque(0); }, [valor, uf]);

  useEffect(() => {
    const item = listaRef.current?.children[destaque];
    if (item) item.scrollIntoView({ block: "nearest" });
  }, [destaque]);

  if (!uf) {
    return <p className="text-sm" style={{ color: BRAND.textoSuave }}>Escolha o estado primeiro.</p>;
  }

  function escolher(m) {
    onChange(m);
    setAberto(false);
  }

  // Ao sair do campo, se o texto bate com um único município (sem acento), completa o nome certo.
  function aoSair() {
    if (!valor || lista.includes(valor)) return;
    const q = normalizar(valor);
    const exato = lista.find((m) => normalizar(m) === q);
    if (exato) onChange(exato);
  }

  function aoTeclar(e) {
    if (!lista.length) return;
    if (e.key === "ArrowDown") { e.preventDefault(); setAberto(true); setDestaque((d) => Math.min(d + 1, filtrados.length - 1)); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setDestaque((d) => Math.max(d - 1, 0)); }
    else if (e.key === "Enter" && aberto && filtrados[destaque]) { e.preventDefault(); escolher(filtrados[destaque]); }
    else if (e.key === "Escape") setAberto(false);
  }

  const idLista = `${campo.id}-lista`;
  const mostrarLista = aberto && !falhou && lista.length > 0;

  return (
    <div className="vd-multiselect" ref={ref}>
      <div className="vd-busca">
        <Search size={16} className="vd-busca-icone" aria-hidden="true" />
        <input
          id={campo.id}
          className="vd-input vd-focus vd-busca-input"
          type="text"
          role="combobox"
          aria-expanded={mostrarLista}
          aria-controls={idLista}
          aria-autocomplete="list"
          aria-invalid={invalido}
          placeholder={carregando ? "Carregando municípios…" : falhou ? "Digite o nome do município" : `Buscar entre ${lista.length} municípios`}
          value={valor}
          onChange={(e) => { onChange(e.target.value); setAberto(true); }}
          onFocus={() => setAberto(true)}
          onBlur={aoSair}
          onKeyDown={aoTeclar}
          autoComplete="off"
          autoCorrect="off"
          spellCheck={false}
          enterKeyHint="done"
        />
        {valor && (
          <button type="button" className="vd-busca-limpar vd-focus" aria-label="Limpar município" onClick={() => { onChange(""); setAberto(true); ref.current?.querySelector("input")?.focus(); }}>
            <X size={15} />
          </button>
        )}
      </div>
      {mostrarLista && (
        <div className="vd-multiselect-painel" role="listbox" id={idLista} ref={listaRef}>
          {filtrados.length === 0 ? (
            <div className="vd-busca-vazio">Nenhum município encontrado em {uf}.</div>
          ) : (
            filtrados.map((m, i) => (
              <div
                key={m}
                role="option"
                aria-selected={m === valor}
                className="vd-multiselect-item"
                data-active={m === valor}
                data-destaque={i === destaque}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => escolher(m)}
              >
                {m}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}

// Se a lista do IBGE não carregou, aceita o que a pessoa digitou.
export function municipioValido(uf, nome) {
  const lista = cacheMunicipios[uf];
  if (!lista || !lista.length) return Boolean(nome);
  return lista.includes(nome);
}
