// /scripts-treinamentos/declaracao-script.js
import { DBHandler } from "../bd-treinamentos/db-handler.js";

let COLABORADORES = [];
let TREINAMENTOS = [];

document.addEventListener('DOMContentLoaded', async () => {
    await carregarDadosIniciais();
});

async function carregarDadosIniciais() {
    try {
        // Carrega Funcionários
        COLABORADORES = await DBHandler.listarColaboradores({ somenteAtivos: true });
        const selColab = document.getElementById('selectColaborador');
        selColab.innerHTML = '<option value="">Selecione o funcionário...</option>' + 
            COLABORADORES.map(c => `<option value="${c.id}">${c.nome}</option>`).join('');

        // Carrega Treinamentos Internos
        const dados = await DBHandler.carregarDadosIniciais();
        TREINAMENTOS = dados.treinamentos;
        const selTreino = document.getElementById('selectTreinamento');
        selTreino.innerHTML = '<option value="">Selecione o treinamento...</option>' + 
            TREINAMENTOS.map(t => `<option value="${t.id}">${t.nome}</option>`).join('');
            
    } catch (e) {
        console.error("Erro ao carregar dados:", e);
    }
}

window.registrarRegistro = async function() {
    const session = JSON.parse(localStorage.getItem('rh_session'));
    const mode = window.activeMode || 'TREINAMENTO';
    
    let payload = {
        colaborador_id: document.getElementById('selectColaborador').value,
        usuario_registro: session.user
    };

    // Mapeamento baseado na aba ativa (Exatamente conforme os IDs do HTML)
    if (mode === 'TREINAMENTO') {
        payload.treinamento_id = document.getElementById('selectTreinamento').value;
        payload.data_homologacao = document.getElementById('dataTreino').value;
        payload.nota = document.getElementById('notaTreino').value || 0;
        payload.instrutor = document.getElementById('instrutorTreino').value;
        payload.validade_meses = document.getElementById('validadeTreino').value;
        payload.atividade_externa = null;
    } else {
        payload.treinamento_id = null;
        payload.atividade_externa = document.getElementById('txtAtividadeExterna').value;
        payload.data_homologacao = document.getElementById('dataExp').value;
        payload.nota = document.getElementById('notaExp').value || 0;
        payload.instrutor = document.getElementById('responsavelExp').value;
        payload.validade_meses = document.getElementById('validadeExp').value;
    }

    // Validação de campos obrigatórios
    if (!payload.colaborador_id || !payload.data_homologacao) {
        alert("Por favor, selecione o colaborador e a data do evento.");
        return;
    }

    try {
        await DBHandler.salvarHomologacao(payload);

        // --- GERAÇÃO DE LOG PARA ADMINISTRAÇÃO ---
        const colabNome = document.getElementById('selectColaborador').options[document.getElementById('selectColaborador').selectedIndex].text;
        const infoPrincipal = mode === 'TREINAMENTO' 
            ? `Treinamento: ${document.getElementById('selectTreinamento').options[document.getElementById('selectTreinamento').selectedIndex].text}`
            : `Experiência: ${payload.atividade_externa}`;

        const detalhesAudit = `• Modo: ${mode}\n• Colaborador: ${colabNome}\n• ${infoPrincipal}\n• Nota: ${payload.nota}`;
        
        await DBHandler.registrarLog(session.user, "CERTIFICACAO_REGISTRO", detalhesAudit, "Registro de Homologação");

        alert("✅ Registro gravado com sucesso!");
        window.location.reload();
        
    } catch (e) {
        alert("Erro ao gravar no banco: " + e.message);
    }
};
