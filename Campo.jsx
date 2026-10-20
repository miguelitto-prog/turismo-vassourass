import { useEffect, useState } from "react";
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
        <Chips options={opcoes} ativo={(o) => arr.includes(o)} onToggle={toggle} cor={BRAND.azul} />
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

function CampoMunicipio({ campo, valor, onChange, uf, invalido }) {
  const { lista, carregando, falhou } = useMunicipios(uf);
  if (!uf) {
    return <p className="text-sm" style={{ color: BRAND.textoSuave }}>Escolha o estado primeiro.</p>;
  }
  // Até 120 municípios: lista suspensa. Acima disso: campo com busca.
  if (!falhou && lista.length && lista.length <= 120) {
    return (
      <select id={campo.id} className="vd-input vd-focus" aria-invalid={invalido} value={valor} onChange={(e) => onChange(e.target.value)}>
        <option value="">Selecione…</option>
        {lista.map((m) => <option key={m} value={m}>{m}</option>)}
      </select>
    );
  }
  return (
    <>
      <input
        id={campo.id}
        className="vd-input vd-focus"
        list={`${campo.id}-lista`}
        placeholder={carregando ? "Carregando municípios…" : "Digite para buscar"}
        aria-invalid={invalido}
        value={valor}
        onChange={(e) => onChange(e.target.value)}
        autoComplete="off"
      />
      <datalist id={`${campo.id}-lista`}>
        {lista.map((m) => <option key={m} value={m} />)}
      </datalist>
    </>
  );
}

// Se a lista do IBGE não carregou, aceita o que a pessoa digitou.
export function municipioValido(uf, nome) {
  const lista = cacheMunicipios[uf];
  if (!lista || !lista.length) return Boolean(nome);
  return lista.includes(nome);
}
