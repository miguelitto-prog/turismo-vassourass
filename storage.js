import { supabase } from "./supabaseClient";

// Wrapper com a MESMA assinatura da API window.storage usada nos artifacts do
// Claude (get/set/delete/list), mas persistindo em uma tabela Supabase
// chamada "kv_store" (key text primary key, value text, updated_at timestamptz).
//
// Todos os dados aqui são tratados como "compartilhados" (equivalente ao
// segundo parâmetro `shared = true` da API original), pois o app da
// Prefeitura precisa ler os registros enviados pelo app de Visitantes.

export const storage = {
  async get(key) {
    const { data, error } = await supabase
      .from("kv_store")
      .select("value, updated_at")
      .eq("key", key)
      .maybeSingle();

    if (error) throw error;
    if (!data) return null;
    return { key, value: data.value, shared: true };
  },

  async set(key, value) {
    const { error } = await supabase
      .from("kv_store")
      .upsert({ key, value, updated_at: new Date().toISOString() });

    if (error) throw error;
    return { key, value, shared: true };
  },

  async delete(key) {
    const { error } = await supabase.from("kv_store").delete().eq("key", key);
    if (error) throw error;
    return { key, deleted: true, shared: true };
  },

  async list(prefix = "") {
    const query = supabase.from("kv_store").select("key");
    const { data, error } = prefix
      ? await query.like("key", `${prefix}%`)
      : await query;
    if (error) throw error;
    return { keys: (data || []).map((r) => r.key), prefix, shared: true };
  },
};
