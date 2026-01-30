// =============================================================================
// db-handler.js - Camada de Serviço do Supabase (VERSÃO FINAL COMPLETA)
// =============================================================================

import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';

// Configuração (Suas chaves)
const SUPABASE_URL = 'https://mtblwyrcidrszwvjgxao.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im10Ymx3eXJjaWRyc3p3dmpneGFvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk3MTg4NTUsImV4cCI6MjA4NTI5NDg1NX0.6CipXB_HI0t0Gcle3pTlZTe9rqoh-8-EhfxQy-VodH0';

// Cliente Privado
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

export const DBHandler = {

    // --- 1. LEITURA INICIAL ---
    async carregarDadosIniciais() {
        console.log("🔄 Buscando dados do Supabase...");
        
        // A. Busca Treinamentos
        const { data: treinosRaw, error: errT } = await supabase
            .from('treinamentos')
            .select('id, nome, categoria, descricao, cor, link_externo') 
            .order('categoria', { ascending: true }) 
            .order('nome', { ascending: true });
            
        if (errT) throw errT;

        const treinos = treinosRaw.map(t => ({
            id: t.id,
            nome: t.nome,
            categoria: t.categoria,
            desc: t.descricao,
            color: t.cor,
            link: t.link_externo
        }));

        // B. Busca Cargos (Ordenados por ID)
        const { data: cargosRaw, error: errC } = await supabase
            .from('view_matriz_cargos')
            .select('*')
            .order('id', { ascending: true });

        if (errC) throw errC;

        // Mapeamento de classes de cor (cor_class -> corClass)
        const cargos = cargosRaw.map(c => ({
            ...c,
            corClass: c.cor_class 
        }));

        return { treinamentos: treinos, cargos: cargos };
    },

    // --- 2. GERENCIAR TREINAMENTOS (SALVAR/EDITAR) ---
    async salvarTreinamento(treino) {
        const payload = {
            nome: treino.nome,
            categoria: treino.categoria,
            descricao: treino.desc,
            cor: treino.color,
            link_externo: treino.link
        };

        if (treino.id) {
            // Se tem ID, é Edição (Update)
            payload.id = treino.id;
        }

        const { data, error } = await supabase
            .from('treinamentos')
            .upsert(payload)
            .select()
            .single();

        if (error) throw error;
        return data;
    },

    // --- 3. EXCLUIR TREINAMENTO ---
    async excluirTreinamento(id) {
        // 1. Remove regras associadas primeiro (Cascata manual)
        await supabase.from('matriz_regras').delete().eq('treinamento_id', id);

        // 2. Remove o treinamento
        const { error } = await supabase
            .from('treinamentos')
            .delete()
            .eq('id', id);
            
        if (error) throw error;
    },

    // --- 4. ATUALIZAR REGRA (OBRIGATORIEDADE) ---
    async atualizarRegra(cargoId, treinoId, novoStatus) {
        // 1. Limpa regra anterior (se existir)
        const { error: errDel } = await supabase
            .from('matriz_regras')
            .delete()
            .match({ cargo_id: cargoId, treinamento_id: treinoId });
            
        if (errDel) throw errDel;

        // 2. Insere nova regra (se não for remoção completa)
        if (novoStatus !== 'none') {
            const tipoBanco = novoStatus === 'mandatory' ? 'OBRIGATORIO' : 'RECOMENDADO';
            
            const { error: errIns } = await supabase
                .from('matriz_regras')
                .insert({
                    cargo_id: cargoId,
                    treinamento_id: treinoId,
                    tipo: tipoBanco
                });
                
            if (errIns) throw errIns;
        }
    },

    // --- 5. REGISTRAR LOG (AUDITORIA) ---
    async registrarLog(usuario, acao, detalhes) {
        const { error } = await supabase
            .from('logs_sistema')
            .insert({
                usuario: usuario,
                acao: acao,
                detalhes: detalhes,
                ip: '192.168.1.10' // IP Fixo ou capturado se possível
            });

        if (error) {
            console.error("Erro silencioso ao gravar log:", error);
            // Não damos throw para não travar a operação principal
        }
    },

    // --- 6. AUTENTICAÇÃO ---
    async validarLogin(username, password) {
        const { data, error } = await supabase
            .from('usuarios_sistema')
            .select('*')
            .eq('username', username)
            .eq('password', password)
            .maybeSingle();

        if (error) throw error;
        return data;
    }
};
