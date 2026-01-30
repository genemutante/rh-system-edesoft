/* db-handler.js (global) */
/* Requer no HTML (ANTES deste arquivo):
   <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>
*/

(function () {
  // ✅ Supabase via CDN global
  if (!window.supabase || !window.supabase.createClient) {
    console.error("Supabase JS não encontrado. Verifique o script CDN no HTML.");
    return;
  }

  // 🔐 Credenciais
  const SUPABASE_URL = "https://mtblwyrcidrszwvjgxao.supabase.co";
  const SUPABASE_KEY =
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im10Ymx3eXJjaWRyc3p3dmpneGFvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk3MTg4NTUsImV4cCI6MjA4NTI5NDg1NX0.6CipXB_HI0t0Gcle3pTlZTe9rqoh-8-EhfxQy-VodH0";

  // ✅ Cliente único
  const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

  function normalizeError(err) {
    if (!err) return null;
    if (typeof err === "string") return err;
    if (err.message) return err.message;
    try {
      return JSON.stringify(err);
    } catch {
      return "Erro desconhecido";
    }
  }

  const DBHandler = {
    supabaseClient,

    // =========================
    // 1) LEITURA INICIAL (MATRIZ TREINAMENTOS)
    // =========================
    async carregarDadosIniciais() {
      console.log("🔄 Buscando dados do Supabase...");

      // 1. Treinamentos
      const { data: treinosRaw, error: errT } = await supabaseClient
        .from("treinamentos")
        .select("id, nome, categoria, descricao, cor, link_externo")
        .order("categoria", { ascending: true })
        .order("nome", { ascending: true });

      if (errT) throw errT;

      const treinos = (treinosRaw || []).map((t) => ({
        id: t.id,
        nome: t.nome,
        categoria: t.categoria,
        desc: t.descricao,
        color: t.cor,
        link: t.link_externo,
      }));

      // 2. Cargos (view ou tabela)
      const { data: cargosRaw, error: errC } = await supabaseClient
        .from("view_matriz_cargos")
        .select("*")
        .order("id", { ascending: true });

      if (errC) throw errC;

      const cargos = (cargosRaw || []).map((c) => ({
        ...c,
        corClass: c.cor_class, // padroniza para o front
      }));

      return { treinamentos: treinos, cargos };
    },

    // =========================
    // 2) TREINAMENTOS
    // =========================
    async salvarTreinamento(treino) {
      const payload = {
        nome: treino.nome,
        categoria: treino.categoria,
        descricao: treino.desc,
        cor: treino.color,
        link_externo: treino.link,
      };

      if (treino.id) payload.id = treino.id;

      const { data, error } = await supabaseClient
        .from("treinamentos")
        .upsert(payload)
        .select()
        .single();

      if (error) throw error;
      return data;
    },

    async excluirTreinamento(id) {
      // Remove regras primeiro (cascata manual)
      await supabaseClient.from("matriz_regras").delete().eq("treinamento_id", id);

      const { error } = await supabaseClient.from("treinamentos").delete().eq("id", id);
      if (error) throw error;
    },

    async atualizarRegra(cargoId, treinoId, novoStatus) {
      // Limpa regra anterior
      const { error: errDel } = await supabaseClient
        .from("matriz_regras")
        .delete()
        .match({ cargo_id: cargoId, treinamento_id: treinoId });

      if (errDel) throw errDel;

      // Insere nova regra se necessário
      if (novoStatus !== "none") {
        const tipoBanco = novoStatus === "mandatory" ? "OBRIGATORIO" : "RECOMENDADO";

        const { error: errIns } = await supabaseClient.from("matriz_regras").insert({
          cargo_id: cargoId,
          treinamento_id: treinoId,
          tipo: tipoBanco,
        });

        if (errIns) throw errIns;
      }
    },

    async registrarLog(usuario, acao, detalhes, ip) {
      const { error } = await supabaseClient.from("logs_sistema").insert({
        usuario,
        acao,
        detalhes,
        ip: ip || "IP não detectado",
      });

      if (error) console.error("Erro silencioso ao gravar log:", error);
    },

    // =========================
    // 3) CARGOS
    // =========================
    async salvarCargo(cargo) {
      const payload = {
        nome: cargo.nome,
        cor_class: cargo.corClass,
        ordem: cargo.ordem || 99,
      };
      if (cargo.id) payload.id = cargo.id;

      const { data, error } = await supabaseClient
        .from("cargos")
        .upsert(payload)
        .select()
        .single();

      if (error) throw error;
      return data;
    },

    async excluirCargo(id) {
      const { error: errRegras } = await supabaseClient
        .from("matriz_regras")
        .delete()
        .eq("cargo_id", id);

      if (errRegras) throw errRegras;

      const { error: errCargo } = await supabaseClient.from("cargos").delete().eq("id", id);
      if (errCargo) throw errCargo;
    },

    // =========================
    // 4) AUTH
    // =========================
    async validarLogin(username, password) {
      const { data, error } = await supabaseClient
        .from("usuarios_sistema")
        .select("*")
        .eq("username", username)
        .eq("password", password)
        .maybeSingle();

      if (error) throw error;
      return data;
    },

    // =========================
    // 5) COLABORADORES
    // =========================
    async listarColaboradores({ somenteAtivos = false } = {}) {
      let q = supabaseClient.from("colaboradores").select("*").order("nome", { ascending: true });
      if (somenteAtivos) q = q.is("data_demissao", null);

      const { data, error } = await q;
      if (error) throw new Error(normalizeError(error));
      return data || [];
    },

    async buscarColaboradorPorId(id) {
      const { data, error } = await supabaseClient
        .from("colaboradores")
        .select("*")
        .eq("id", id)
        .single();

      if (error) throw new Error(normalizeError(error));
      return data;
    },

    async inserirColaborador(payload) {
      const { data, error } = await supabaseClient
        .from("colaboradores")
        .insert([payload])
        .select()
        .single();

      if (error) throw new Error(normalizeError(error));
      return data;
    },

    async atualizarColaborador(id, payload) {
      const { data, error } = await supabaseClient
        .from("colaboradores")
        .update(payload)
        .eq("id", id)
        .select()
        .single();

      if (error) throw new Error(normalizeError(error));
      return data;
    },

    async desativarColaborador(id, { dataDemissao, motivoDemissao } = {}) {
      const payload = {
        data_demissao: dataDemissao || new Date().toISOString().slice(0, 10),
        motivo_demissao: motivoDemissao || null,
      };
      return this.atualizarColaborador(id, payload);
    },

    async reativarColaborador(id) {
      return this.atualizarColaborador(id, { data_demissao: null, motivo_demissao: null });
    },

    async listarCargos() {
      const { data, error } = await supabaseClient
        .from("cargos")
        .select("id, nome")
        .order("nome", { ascending: true });

      if (error) throw new Error(normalizeError(error));
      return data || [];
    },
  };

  // ✅ expõe globalmente
  window.supabaseClient = supabaseClient;
  window.DBHandler = DBHandler;

  console.log("✅ DBHandler carregado e Supabase conectado (client pronto).");
})();
