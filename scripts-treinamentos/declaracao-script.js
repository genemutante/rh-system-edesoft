// /scripts-treinamentos/declaracao-script.js
import { DBHandler } from "../bd-treinamentos/db-handler.js";

let HOMOLOGACOES = [];
let COLABORADORES = [];
let TREINAMENTOS = [];
let currentId = null;

document.addEventListener('DOMContentLoaded', async () => {
    await carregarCombos();
    await carregarLista();
});

async function carregarCombos() {
    // Busca colaboradores ativos para o select
    COLABORADORES = await DBHandler.listarColaboradores({ somenteAtivos: true });
    const selColab = document.getElementById('selectColaborador');
    selColab.innerHTML = '<option value="">Selecione o Colaborador...</option>' + 
        COLABORADORES.map(c => `<option value="${c.id}">${c.nome}</option>`).join('');

    // Busca treinamentos para o select
    const dados = await DBHandler.carregarDadosIniciais();
    TREINAMENTOS = dados.treinamentos;
    const selTreino = document.getElementById('selectTreinamento');
    selTreino.innerHTML = '<option value="">Selecione o Treinamento...</option>' + 
        TREINAMENTOS.map(t => `<option value="${t.id}">${t.nome}</option>`).join('');
}

async function carregarLista() {
    HOMOLOGACOES = await DBHandler.listarHomologacoes();
    renderizarTabela();
}

// ---------- Função de Auditoria (De ➔ Para) ----------
function gerarLogHomologacao(original, novo) {
    const colabNome = COLABORADORES.find(c => c.id == novo.colaborador_id)?.nome || "—";
    const treinoNome = TREINAMENTOS.find(t => t.id == novo.treinamento_id)?.nome || "—";

    if (!original) {
        return `• Nova Homologação Registrada\n• Colaborador: ${colabNome}\n• Treinamento: ${treinoNome}\n• Nota: ${novo.nota || '—'}`;
    }

    let mudancas = [];
    if (original.nota != novo.nota) mudancas.push(`• Nota: ${original.nota} ➔ ${novo.nota}`);
    if (original.data_homologacao != novo.data_homologacao) mudancas.push(`• Data: ${original.data_homologacao} ➔ ${novo.data_homologacao}`);
    if (original.instrutor != novo.instrutor) mudancas.push(`• Instrutor: ${original.instrutor} ➔ ${novo.instrutor}`);

    return mudancas.length > 0 ? `• Alteração na Homologação de ${colabNome}\n${mudancas.join('\n')}` : "";
}

// ---------- Salvar com Persistência e Log ----------
window.registrarHomologacao = async function() {
    const session = JSON.parse(localStorage.getItem('rh_session'));
    
    const payload = {
        colaborador_id: document.getElementById('selectColaborador').value,
        treinamento_id: document.getElementById('selectTreinamento').value,
        data_homologacao: document.getElementById('dataHomologacao').value,
        nota: document.getElementById('notaTreinamento').value,
        instrutor: document.getElementById('instrutorNome').value,
        validade_meses: document.getElementById('validadeMeses').value,
        usuario_registro: session.user
    };

    if (!payload.colaborador_id || !payload.treinamento_id || !payload.data_homologacao) {
        alert("Preencha os campos obrigatórios (Colaborador, Treinamento e Data).");
        return;
    }

    try {
        const original = currentId ? HOMOLOGACOES.find(h => h.id === currentId) : null;
        const logDetalhes = gerarLogHomologacao(original, payload);

        await DBHandler.salvarHomologacao({ ...(currentId ? { id: currentId } : {}), ...payload });

        // Registra o log na Administração
        if (logDetalhes) {
            await DBHandler.registrarLog(session.user, currentId ? "EDITAR_HOMOLOGACAO" : "CRIAR_HOMOLOGACAO", logDetalhes, "Registro de Homologação");
        }

        alert("✅ Homologação registrada com sucesso!");
        window.location.reload();
    } catch (e) {
        alert("Erro ao salvar: " + e.message);
    }
};

function renderizarTabela() {
    const tbody = document.querySelector("#homologTable tbody");
    if (!tbody) return;
    
    tbody.innerHTML = HOMOLOGACOES.map(h => `
        <tr>
            <td><strong>${h.colaboradores?.nome}</strong><br><small>${h.colaboradores?.departamento}</small></td>
            <td>${h.treinamentos?.nome}</td>
            <td>${new Date(h.data_homologacao).toLocaleDateString()}</td>
            <td><span class="badge-nota">${h.nota || '—'}</span></td>
            <td>
                <button class="btn-sm" onclick="visualizarHomologacao(${h.id})">Visualizar</button>
            </td>
        </tr>
    `).join('');
}