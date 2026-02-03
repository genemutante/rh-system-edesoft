// /scripts-treinamentos/declaracao-script.js
import { DBHandler } from "../bd-treinamentos/db-handler.js";

let COLABORADORES = [];
let TREINAMENTOS = [];

document.addEventListener('DOMContentLoaded', async () => {
    await carregarDadosIniciais();
    // Define a data de hoje como padrão nos campos de data
    const hoje = new Date().toISOString().split('T')[0];
    if (document.getElementById('certData')) document.getElementById('certData').value = hoje;
    if (document.getElementById('notorioData')) document.getElementById('notorioData').value = hoje;
});

/**
 * Carrega os dados dos combos (Colaboradores e Treinamentos) vindos do Supabase
 */
async function carregarDadosIniciais() {
    try {
        // 1. Carregar Colaboradores Ativos
        COLABORADORES = await DBHandler.listarColaboradores({ somenteAtivos: true });
        const selColab = document.getElementById('selectColaborador');
        if (selColab) {
            selColab.innerHTML = '<option value="">Selecione o colaborador...</option>' + 
                COLABORADORES.map(c => `<option value="${c.id}">${c.nome}</option>`).join('');
        }

        // 2. Carregar Treinamentos do Catálogo Oficial
        const dados = await DBHandler.carregarDadosIniciais();
        TREINAMENTOS = dados.treinamentos;
        const selTreino = document.getElementById('selectTreinamento');
        if (selTreino) {
            selTreino.innerHTML = '<option value="">Selecione a competência alvo...</option>' + 
                TREINAMENTOS.map(t => `<option value="${t.id}">${t.nome}</option>`).join('');
        }
            
    } catch (e) {
        console.error("Erro ao inicializar dados:", e);
    }
}

/**
 * Lógica do Checkbox de Instituição (Edesoft-Academy)
 */
window.toggleInstituicao = function(isEdesoft) {
    const input = document.getElementById('certInstituicao');
    if (!input) return;

    if (isEdesoft) {
        input.value = "Edesoft-Academy";
        input.readOnly = true;
    } else {
        input.value = "";
        input.readOnly = false;
        input.focus();
    }
};

/**
 * Lógica do Checkbox de Nota (Não se aplica / NA)
 */
window.toggleNota = function(isNA) {
    const input = document.getElementById('certNota');
    if (!input) return;

    if (isNA) {
        input.value = "";
        input.readOnly = true;
        input.placeholder = "N/A";
    } else {
        input.readOnly = false;
        input.placeholder = "0.0";
        input.focus();
    }
};

/**
 * Função principal de salvamento (Gravar Homologação)
 */
window.salvarCertificacao = async function() {
    const sessionRaw = localStorage.getItem('rh_session');
    if (!sessionRaw) return alert("Sessão expirada. Faça login novamente.");
    const session = JSON.parse(sessionRaw);

    const btn = document.getElementById('btnSalvar');
    const mode = window.activeMode || 'TREINAMENTO'; // Captura o modo da aba ativa
    
    // Elementos de Identificação
    const idColab = document.getElementById('selectColaborador').value;
    const idTreino = document.getElementById('selectTreinamento').value;

    if (!idColab || !idTreino) {
        alert("Campos obrigatórios: Selecione o Colaborador e a Competência.");
        return;
    }

    // Preparação do Payload para a tabela homologacoes_treinamentos
    let payload = {
        colaborador_id: idColab,
        treinamento_id: idTreino,
        usuario_registro: session.user,
        status: 'Homologado (RH)'
    };

    if (mode === 'TREINAMENTO' || mode === 'certificado') {
        // Fluxo Certificado
        const notaNA = document.getElementById('checkNotaNA').checked;
        
        payload.data_homologacao = document.getElementById('certData').value;
        payload.instrutor = document.getElementById('certInstituicao').value; // Instituição no campo instrutor
        payload.nota = notaNA ? null : document.getElementById('certNota').value;
        payload.atividade_externa = 'CERTIFICADO_EXTERNO';
        payload.observacoes = document.getElementById('certLink').value ? `Link: ${document.getElementById('certLink').value}` : null;
    } else {
        // Fluxo Notório Saber (Parecer RH)
        if (!document.getElementById('checkAudit').checked) {
            alert("É necessário confirmar a validação dos critérios técnicos.");
            return;
        }

        payload.data_homologacao = document.getElementById('notorioData')?.value || new Date().toISOString().split('T')[0];
        payload.instrutor = document.getElementById('notorioAprovador').value; // Gestor/Aprovador no campo instrutor
        payload.nota = null; // Geralmente N/A para notório saber
        payload.atividade_externa = 'NOTORIO_SABER';
        payload.observacoes = `Justificativa: ${document.getElementById('notorioJustificativa').value}\nEvidências: ${document.getElementById('notorioMetodo').value}`;
    }

    try {
        btn.disabled = true;
        btn.textContent = "Gravando...";

        // 1. Persistência no Banco de Dados
        await DBHandler.salvarHomologacao(payload);

        // 2. Registro do Log de Auditoria
        const colabNome = document.getElementById('selectColaborador').options[document.getElementById('selectColaborador').selectedIndex].text;
        const treinoNome = document.getElementById('selectTreinamento').options[document.getElementById('selectTreinamento').selectedIndex].text;
        
        const detalhesLog = `• Colaborador: ${colabNome}\n• Competência: ${treinoNome}\n• Tipo: ${payload.atividade_externa}\n• Responsável/Inst.: ${payload.instrutor}\n• Nota: ${payload.nota || 'N/A'}`;
        
        await DBHandler.registrarLog(
            session.user, 
            "HOMOLOGAR_COMPETENCIA_RH", 
            detalhesLog, 
            "Homologação de Competência"
        );

        alert("✅ Homologação registada com sucesso!");
        window.location.reload();
        
    } catch (e) {
        console.error(e);
        alert("Erro ao salvar no banco: " + (e.message || e));
        btn.disabled = false;
        btn.textContent = "Gravar Homologação";
    }
};
