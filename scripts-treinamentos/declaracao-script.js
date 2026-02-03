// /scripts-treinamentos/declaracao-script.js
import { DBHandler } from "../bd-treinamentos/db-handler.js";

// Variáveis de controle de estado
let currentMode = 'CERTIFICADO';
let currentId = null;

document.addEventListener('DOMContentLoaded', async () => {
    // 1. Carrega as listas de colaboradores e treinamentos
    await carregarCombos();

    // 2. Verifica se há parâmetros na URL (Modo Edição ou Visualização)
    const params = new URLSearchParams(window.location.search);
    currentId = params.get('id');
    const mode = params.get('mode');

    if (currentId) {
        await carregarParaEdicao(currentId);
        if (mode === 'view') {
            travarLeitura();
        }
    } else {
        // Se for novo registro, define a data de hoje como padrão
        const hoje = new Date().toISOString().split('T')[0];
        if (document.getElementById('certData')) document.getElementById('certData').value = hoje;
    }
});

async function carregarCombos() {
    try {
        const colabs = await DBHandler.listarColaboradores({ somenteAtivos: true });
        const selColab = document.getElementById('selectColaborador');
        if (selColab) {
            selColab.innerHTML = '<option value="">Selecione o colaborador...</option>' + 
                colabs.map(c => `<option value="${c.id}">${c.nome}</option>`).join('');
        }

        const { treinamentos } = await DBHandler.carregarDadosIniciais();
        const selTreino = document.getElementById('selectTreinamento');
        if (selTreino) {
            selTreino.innerHTML = '<option value="">Selecione a competência alvo...</option>' + 
                treinamentos.map(t => `<option value="${t.id}">${t.nome}</option>`).join('');
        }
    } catch (e) {
        console.error("Erro ao carregar combos:", e);
    }
}

async function carregarParaEdicao(id) {
    try {
        const dado = await DBHandler.buscarHomologacaoPorId(id);
        if (!dado) return;

        // Preenche identificação
        document.getElementById('selectColaborador').value = dado.colaborador_id;
        document.getElementById('selectTreinamento').value = dado.treinamento_id;

        // Define o modo e preenche detalhes específicos
        if (dado.atividade_externa === 'NOTORIO') {
            window.selectMode('notorio', document.getElementById('btn-notorio'));
            document.getElementById('notorioJustificativa').value = dado.observacoes || "";
            document.getElementById('notorioAprovador').value = dado.instrutor || "";
            document.getElementById('checkRH').checked = true;
        } else {
            window.selectMode('certificado', document.getElementById('btn-cert'));
            document.getElementById('certInstituicao').value = dado.instrutor || "";
            document.getElementById('certData').value = dado.data_homologacao;
            
            // Lógica de Instituição Edesoft
            const isEdesoft = dado.instrutor === "Edesoft-Academy";
            document.getElementById('checkEdesoft').checked = isEdesoft;
            window.toggleInstituicao(isEdesoft);

            // Lógica de Nota N/A
            if (dado.nota !== null && dado.nota !== undefined) {
                document.getElementById('checkNotaNA').checked = false;
                window.toggleNota(false);
                document.getElementById('certNota').value = dado.nota;
            } else {
                document.getElementById('checkNotaNA').checked = true;
                window.toggleNota(true);
            }
            
            // Observações (Link)
            if (dado.observacoes && dado.observacoes.startsWith("Link: ")) {
                document.getElementById('certLink').value = dado.observacoes.replace("Link: ", "");
            }
        }
    } catch (e) {
        console.error("Erro ao carregar registro para edição:", e);
    }
}

function travarLeitura() {
    const elementos = document.querySelectorAll('input, select, textarea, .evidence-button');
    elementos.forEach(el => {
        el.disabled = true;
        el.style.pointerEvents = 'none'; // Garante que botões de evidência não sejam clicáveis
    });
    
    const btnSalvar = document.getElementById('btnSalvar');
    if (btnSalvar) btnSalvar.style.display = 'none';
    
    const title = document.getElementById('main-title');
    if (title) title.textContent += " (Modo Leitura)";
}

// --- FUNÇÕES EXPOSTAS PARA O WINDOW ---

window.selectMode = function(mode, el) {
    currentMode = mode.toUpperCase();
    document.querySelectorAll('.evidence-button').forEach(btn => btn.classList.remove('active'));
    el.classList.add('active');
    
    const isCert = mode === 'certificado';
    document.getElementById('form-certificado').style.display = isCert ? 'block' : 'none';
    document.getElementById('form-notorio').style.display = isCert ? 'none' : 'block';
    
    const title = document.getElementById('main-title');
    if (title) {
        title.textContent = isCert ? '3. Detalhes da Homologação (Certificado)' : '3. Parecer de Notório Saber';
    }
};

window.toggleInstituicao = function(isEdesoft) {
    const input = document.getElementById('certInstituicao');
    if (!input) return;
    input.value = isEdesoft ? "Edesoft-Academy" : (currentId ? input.value : "");
    input.readOnly = isEdesoft;
    if (!isEdesoft) input.focus();
};

window.toggleNota = function(isNA) {
    const input = document.getElementById('certNota');
    if (!input) return;
    input.readOnly = isNA;
    input.placeholder = isNA ? "N/A" : "0.0";
    if (isNA) input.value = "";
    else if (!currentId) input.focus();
};

window.salvarHomologacao = async function() {
    const sessionRaw = localStorage.getItem('rh_session');
    if (!sessionRaw) return alert("Sessão expirada. Por favor, faça login novamente.");
    const session = JSON.parse(sessionRaw);

    const btn = document.getElementById('btnSalvar');
    const idColab = document.getElementById('selectColaborador').value;
    const idTreino = document.getElementById('selectTreinamento').value;

    if (!idColab || !idTreino) return alert("Por favor, selecione o Colaborador e a Competência.");

    let payload = {
        colaborador_id: idColab,
        treinamento_id: idTreino,
        usuario_registro: session.user,
        status: 'Homologado (RH)',
        atividade_externa: currentMode,
        validade_meses: 12 // Padrão conforme schema
    };

    if (currentMode === 'CERTIFICADO') {
        const notaNA = document.getElementById('checkNotaNA').checked;
        payload.data_homologacao = document.getElementById('certData').value;
        payload.instrutor = document.getElementById('certInstituicao').value;
        payload.nota = notaNA ? null : document.getElementById('certNota').value;
        payload.observacoes = document.getElementById('certLink').value ? `Link: ${document.getElementById('certLink').value}` : null;
    } else {
        if (!document.getElementById('checkRH').checked) return alert("É necessário confirmar a validação técnica para Notório Saber.");
        payload.data_homologacao = new Date().toISOString().split('T')[0];
        payload.instrutor = document.getElementById('notorioAprovador').value;
        payload.nota = null;
        payload.observacoes = `Justificativa: ${document.getElementById('notorioJustificativa').value}\nEvidências: ${document.getElementById('notorioEvidencias').value}`;
    }

    try {
        btn.disabled = true;
        btn.textContent = "Gravando...";

        // Se currentId existir, o DBHandler realizará o UPDATE (Upsert)
        await DBHandler.salvarHomologacao({ ...(currentId ? { id: currentId } : {}), ...payload });

        // Geração do rastro de auditoria
        const colabNome = document.getElementById('selectColaborador').options[document.getElementById('selectColaborador').selectedIndex].text;
        const treinoNome = document.getElementById('selectTreinamento').options[document.getElementById('selectTreinamento').selectedIndex].text;
        const acaoLog = currentId ? "EDITAR_HOMOLOGACAO" : "CRIAR_HOMOLOGACAO";
        
        const detalhesLog = `• Colaborador: ${colabNome}\n• Competência: ${treinoNome}\n• Tipo: ${payload.atividade_externa}\n• Inst/Aprovador: ${payload.instrutor}\n• Nota: ${payload.nota || 'N/A'}`;
        
        await DBHandler.registrarLog(session.user, acaoLog, detalhesLog, "Homologação de Competência");

        alert("✅ Homologação processada com sucesso!");
        window.location.href = '004-lista-homologacoes.html';
        
    } catch (e) {
        alert("Erro ao salvar registro: " + e.message);
        btn.disabled = false;
        btn.textContent = "Registrar Homologação";
    }
};
