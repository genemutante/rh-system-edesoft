/* =============================================================
   catalogo.js - Versão Completa e Definitiva
   ============================================================= */

import { DBHandler } from "../bd-treinamentos/db-handler.js";

// =============================================================
// 1. VARIÁVEIS GLOBAIS E CONSTANTES
// =============================================================
const YOUTUBE_API_KEY_FIXA = "AIzaSyAJyCenPXn41mbjieW6wTzeaFPYFX5Xrzo";

let cursos = [];
let videosPendentes = []; 
let houveAlteracao = false;

// Elementos do DOM (serão carregados no inicializar)
let modalCurso, formCurso, areaDelete, btnSalvarCurso;
let modalAulas, listaAulasUl;
let modalYouTube, btnSyncRapido, selectCursoYT, inputPlaylistId;
let btnNovoCurso, btnLimparFiltros;

// =============================================================
// 2. UTILITÁRIOS E FORMATAÇÃO
// =============================================================

function formatarDuracao(minutos) {
    if (!minutos || isNaN(minutos) || minutos === 0) return "0 min";
    const h = Math.floor(minutos / 60);
    const m = minutos % 60;
    
    if (h > 0 && m > 0) return `${h}h ${m}min`;
    if (h > 0) return `${h}h`;
    return `${m} min`;
}

// Converte formato ISO 8601 (PT1H2M10S) para minutos inteiros
function parseIsoDuration(iso) {
    if (!iso) return 0;
    const match = iso.match(/PT(\d+H)?(\d+M)?(\d+S)?/);
    if (!match) return 0;
    
    const hours = (parseInt(match[1]) || 0);
    const minutes = (parseInt(match[2]) || 0);
    // Segundos são ignorados para simplificação em minutos
    return (hours * 60) + minutes;
}

// Remove acentos e deixa minúsculo para busca
function normalizarTexto(str) {
    return (str || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

// Limpa títulos vindos do YouTube (remove numerações como "01.", "Aula 02 -")
function limparTituloVideo(titulo) {
    if (!titulo) return "Aula Sem Título";
    return titulo.replace(/^(\d+[\s\-\.]+|aula\s+\d+[\s\-\.]+|video\s+\d+[\s\-\.]+)/i, '').trim();
}

// =============================================================
// 3. INICIALIZAÇÃO DO SISTEMA
// =============================================================

function carregarElementosDOM() {
    modalCurso = document.getElementById("modal-curso");
    formCurso = document.getElementById("form-curso");
    areaDelete = document.getElementById("area-delete");
    btnSalvarCurso = document.getElementById("btn-salvar-curso");
    
    modalAulas = document.getElementById("modal-lista-aulas");
    listaAulasUl = document.getElementById("lista-aulas-container");

    modalYouTube = document.getElementById("modal-youtube"); // Se existir separadamente
    btnSyncRapido = document.getElementById("btn-sync-youtube-rapido");
    
    btnNovoCurso = document.getElementById("btn-novo-curso");
    btnLimparFiltros = document.getElementById("btn-limpar-filtros");
}

async function inicializarApp() {
    console.log("🚀 Iniciando Aplicação de Catálogo...");
    carregarElementosDOM();
    setupGlobalListeners();

    try {
        const dados = await DBHandler.listarTreinamentos();
        
        // Processamento inicial dos dados
        cursos = dados.map(item => {
            const aulas = item.aulas || [];
            return {
                ...item,
                quantidadeAulas: aulas.length,
                duracaoMinutos: aulas.reduce((acc, a) => acc + (Number(a.duracao_minutos) || 0), 0),
                trilha: item.trilha || "Geral",
                subtrilha: item.subtrilha || ""
            };
        });

        preencherOpcoesTrilha();
        aplicarFiltros(); // Renderiza a lista inicial
    } catch (e) {
        console.error("Erro fatal na inicialização:", e);
        const container = document.getElementById("lista-cursos");
        if(container) container.innerHTML = `<div class="lista-cursos-vazia" style="color:red">Erro ao carregar cursos: ${e.message}</div>`;
    }
}

document.addEventListener("DOMContentLoaded", inicializarApp);

// =============================================================
// 4. RENDERIZAÇÃO DO DASHBOARD (Cards e Métricas)
// =============================================================

function atualizarResumo(lista) {
    const setContent = (id, val) => { 
        const el = document.getElementById(id); 
        if(el) el.textContent = val; 
    };
    
    const totalMinutos = lista.reduce((acc, c) => acc + (c.duracaoMinutos || 0), 0);

    setContent("resumo-total", lista.length);
    setContent("resumo-disponivel", lista.filter(c => (c.status || "").toUpperCase() === "DISPONÍVEL").length);
    setContent("resumo-em-dev", lista.filter(c => (c.status || "").toUpperCase() === "EM DESENVOLVIMENTO").length);
    setContent("resumo-backlog", lista.filter(c => (c.status || "").toUpperCase() === "BACKLOG").length);
    setContent("resumo-total-aulas", lista.reduce((acc, c) => acc + (c.quantidadeAulas || 0), 0));
    setContent("resumo-horas", formatarDuracao(totalMinutos));
}

function renderCursos(lista) {
    const container = document.getElementById("lista-cursos");
    if(!container) return;
    container.innerHTML = "";

    if (lista.length === 0) {
        container.innerHTML = `<div class="lista-cursos-vazia">Nenhum curso encontrado com os filtros atuais.</div>`;
        return;
    }

    // Ordenação: Trilha > Subtrilha > Nome
    const listaOrdenada = [...lista].sort((a, b) => {
        const t = (a.trilha || "Geral").localeCompare(b.trilha || "Geral");
        if (t !== 0) return t;
        const s = (a.subtrilha || "").localeCompare(b.subtrilha || "");
        if (s !== 0) return s;
        return (a.nome || "").localeCompare(b.nome || "");
    });

    let trilhaAtual = null;
    let subAtual = null;

    listaOrdenada.forEach((curso) => {
        // Cabeçalho de Trilha
        if (curso.trilha !== trilhaAtual) {
            trilhaAtual = curso.trilha;
            subAtual = null;
            const h = document.createElement("div"); 
            h.className = "header-trilha";
            h.innerHTML = `<span>${trilhaAtual}</span><small>Trilha Principal</small>`;
            container.appendChild(h);
        }
        // Cabeçalho de Subtrilha
        if (curso.subtrilha && curso.subtrilha !== subAtual) {
            subAtual = curso.subtrilha;
            const h = document.createElement("div"); 
            h.className = "header-subtrilha";
            h.innerHTML = `<span>${subAtual}</span><small>Subtrilha</small>`;
            container.appendChild(h);
        }

        const statusClass = (curso.status || "backlog").toLowerCase().replace(/\s+/g, "-");
        const isOculto = curso.exibir_catalogo === false;
        
        // Lógica do botão de Link Externo
        let botaoLinkHtml = "";
        if (curso.link) {
            botaoLinkHtml = `<button class="btn-icon-acessar" onclick="window.open('${curso.link}', '_blank')" title="Acessar Link Externo">🚀</button>`;
        } else {
            botaoLinkHtml = `<button class="btn-disabled-text" disabled>Em breve</button>`;
        }

        const card = document.createElement("article");
        card.className = `card-curso ${isOculto ? 'is-hidden' : ''} status-${statusClass}`;
        
        card.innerHTML = `
            <header class="card-header">
                <div class="card-trilhas">
                    ${curso.subtrilha ? `<span class="badge-subtrilha">${curso.subtrilha}</span>` : `<span class="badge-trilha">${curso.trilha}</span>`}
                    ${isOculto ? '<span class="badge-oculto">🔒 OCULTO</span>' : ''}
                </div>
                <span class="badge-status ${statusClass}">${curso.status || 'Rascunho'}</span>
            </header>
            
            <h2 class="card-titulo">${curso.nome}</h2>
            <p class="card-descricao">${curso.descricao || "Sem descrição cadastrada."}</p>
            
            <footer class="card-footer">
                <div class="pill-duracao">
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                    <strong>${formatarDuracao(curso.duracaoMinutos)}</strong>
                </div>
                <div style="display: flex; gap: 8px;">
                    <button class="btn-icon-grade btn-abrir-grade" data-id="${curso.id}" title="Ver Grade Curricular">
                         <span class="grade-count">${curso.quantidadeAulas}</span> aulas
                    </button>
                    <button class="btn-icon-editar" data-id="${curso.id}" title="Editar Curso">📝</button>
                    ${botaoLinkHtml}
                </div>
            </footer>
        `;
        container.appendChild(card);
    });

    // Re-anexar listeners nos botões dinâmicos (Grade e Editar)
    container.querySelectorAll('.btn-abrir-grade').forEach(btn => {
        btn.addEventListener('click', (e) => { 
            e.stopPropagation(); 
            abrirModalAulas(e.currentTarget.dataset.id); 
        });
    });
    
    container.querySelectorAll('.btn-icon-editar').forEach(btn => {
        btn.addEventListener('click', (e) => { 
            e.stopPropagation(); 
            editarCurso(e.currentTarget.dataset.id); 
        });
    });
}

// =============================================================
// 5. LÓGICA DE FILTROS
// =============================================================

function preencherOpcoesTrilha() {
    const select = document.getElementById("filtro-trilha");
    if(!select) return;
    
    const trilhas = [...new Set(cursos.map(c => c.trilha))].filter(Boolean).sort();
    select.innerHTML = '<option value="">Todas</option>' + trilhas.map(t => `<option value="${t}">${t}</option>`).join("");
}

function preencherOpcoesSubtrilha(trilha) {
    const select = document.getElementById("filtro-subtrilha");
    if(!select) return;
    
    select.innerHTML = '<option value="">Todas</option>';
    
    if (!trilha) { 
        select.disabled = true; 
        return; 
    }
    
    const subs = [...new Set(cursos.filter(c => c.trilha === trilha && c.subtrilha).map(c => c.subtrilha))].sort();
    select.disabled = subs.length === 0;
    select.innerHTML += subs.map(s => `<option value="${s}">${s}</option>`).join("");
}

function aplicarFiltros() {
    const termo = normalizarTexto(document.getElementById("filtro-busca").value);
    const trilhaSel = document.getElementById("filtro-trilha").value;
    const subSel = document.getElementById("filtro-subtrilha").value;
    const statusSel = document.getElementById("filtro-status").value;
    const verOcultos = document.getElementById("filtro-ver-ocultos")?.checked;

    const filtrados = cursos.filter((c) => {
        // 1. Filtro de Visibilidade
        if (c.exibir_catalogo === false && !verOcultos) return false;

        // 2. Filtro de Texto (Nome ou Descrição)
        const matchBusca = normalizarTexto(c.nome).includes(termo) || normalizarTexto(c.descricao).includes(termo);
        
        // 3. Filtros de Seleção
        const matchTrilha = !trilhaSel || c.trilha === trilhaSel;
        const matchSub = !subSel || c.subtrilha === subSel;
        const matchStatus = !statusSel || (c.status || "").toUpperCase() === statusSel;

        return matchBusca && matchTrilha && matchSub && matchStatus;
    });

    renderCursos(filtrados);
    atualizarResumo(filtrados);
}

// =============================================================
// 6. MODAL DE VISUALIZAÇÃO DE AULAS (LEITURA)
// =============================================================

function abrirModalAulas(id) {
    const curso = cursos.find(c => c.id == id);
    if (!curso) return;

    document.getElementById("modal-titulo-curso").textContent = curso.nome;
    document.getElementById("modal-qtd-aulas").textContent = `${curso.quantidadeAulas} aulas`;
    document.getElementById("modal-tempo-total").textContent = formatarDuracao(curso.duracaoMinutos);
    listaAulasUl.innerHTML = "";

    const aulasOrdenadas = (curso.aulas || []).sort((a, b) => a.ordem - b.ordem);

    if (aulasOrdenadas.length === 0) {
        listaAulasUl.innerHTML = `<li style="padding:20px; text-align:center; color:#94a3b8;">Nenhuma aula cadastrada.</li>`;
    } else {
        aulasOrdenadas.forEach((aula, index) => {
            const li = document.createElement("li");
            li.className = "aula-item";
            li.innerHTML = `
                <div class="aula-ordem">${index + 1}</div>
                <div class="aula-info">
                    <span class="aula-titulo">${aula.titulo}</span>
                    <span class="aula-tempo">${aula.duracao_minutos} min</span>
                </div>
                ${aula.link_video ? `<button onclick="window.open('${aula.link_video}', '_blank')" class="btn-ver-video" title="Assistir">📺</button>` : ''}
            `;
            listaAulasUl.appendChild(li);
        });
    }
    modalAulas.style.display = "flex";
}

// =============================================================
// 7. GESTÃO DE ESTADO (MANUTENÇÃO, LIMPEZA, EDIÇÃO)
// =============================================================

function resetarModalManutencao() {
    // 1. Limpa o formulário HTML
    if(formCurso) formCurso.reset();
    
    // 2. Limpa variáveis de estado (CRUCIAL PARA NÃO DUPLICAR)
    videosPendentes = []; 
    houveAlteracao = false;
    
    // 3. Reseta botões e textos visuais
    if(btnSalvarCurso) {
        btnSalvarCurso.disabled = true;
        btnSalvarCurso.innerText = "Salvar Alterações";
    }
    
    document.getElementById("meta-qtd-aulas").textContent = "0";
    document.getElementById("meta-tempo-total").textContent = "0 min";
    
    const elSync = document.getElementById("meta-data-sync");
    if(elSync) {
        elSync.textContent = "-";
        elSync.style.color = "";
        elSync.style.fontWeight = "";
    }
    
    if(areaDelete) areaDelete.style.display = "none";
    
    // 4. Limpa a lista visual de aulas (HTML)
    if(document.getElementById("lista-manual-preview")) {
        document.getElementById("lista-manual-preview").innerHTML = "";
    }
    
    // 5. Esconde badges
    const badge = document.getElementById("badge-pendente");
    if(badge) badge.style.display = "none";

    // 6. Reseta as abas para o padrão (YouTube)
    const radioYoutube = document.getElementById("fonte_youtube");
    if(radioYoutube) {
        radioYoutube.checked = true;
        window.alternarFonte('youtube');
    }
    
    // 7. Reseta campos de Trilha (input vs select)
    alternarModoTrilha('select');
}

function editarCurso(id) {
    resetarModalManutencao(); // Limpa tudo antes de carregar o novo

    const curso = cursos.find(c => c.id == id);
    if (!curso) return;

    // Preenche Inputs do Formulário
    document.getElementById("curso-id").value = curso.id;
    document.getElementById("curso-nome").value = curso.nome;
    document.getElementById("curso-status").value = (curso.status || "DISPONÍVEL").toUpperCase();
    document.getElementById("curso-subtrilha").value = curso.subtrilha || "";
    document.getElementById("curso-link").value = curso.link || "";
    document.getElementById("curso-descricao").value = curso.descricao || "";
    document.getElementById("curso-exibir").checked = (curso.exibir_catalogo !== false);

    // Carrega aulas existentes para a memória de edição (Deep Copy para não afetar original)
    if (curso.aulas && curso.aulas.length > 0) {
        videosPendentes = JSON.parse(JSON.stringify(curso.aulas));
        videosPendentes.sort((a, b) => a.ordem - b.ordem);
    } else {
        videosPendentes = [];
    }
    
    // Renderiza a lista de edição
    renderizarListaManual();
    atualizarMetadadosGlobais();
    popularSelectTrilhas(curso.trilha);
    
    // Exibe Data da Última Sincronização
    const elData = document.getElementById("meta-data-sync");
    if(curso.ultima_sincronizacao) {
        elData.textContent = new Date(curso.ultima_sincronizacao).toLocaleString('pt-BR');
    } else {
        elData.textContent = "Nunca";
    }

    // Ajustes visuais do Modal
    document.getElementById("modal-curso-titulo").textContent = "Editar Curso";
    if(areaDelete) areaDelete.style.display = "block";
    
    modalCurso.style.display = "flex";
}

// =============================================================
// 8. MANIPULAÇÃO DA LISTA DE AULAS (MANUAL / SYNC)
// =============================================================

function renderizarListaManual() {
    const ul = document.getElementById("lista-manual-preview");
    const btnLimpar = document.getElementById("btn-limpar-aulas");
    
    if(!ul) return;
    ul.innerHTML = "";
    
    if(!videosPendentes || videosPendentes.length === 0) {
        if(btnLimpar) btnLimpar.style.display = "none";
        return;
    }

    videosPendentes.forEach((video, index) => {
        const li = document.createElement("li");
        li.className = "item-manual";
        li.innerHTML = `
            <div style="flex:1; overflow:hidden;">
                <strong style="color:#1e293b; font-size:0.85rem;">${index + 1}. ${video.titulo}</strong>
                <div style="font-size:0.75rem; color:#64748b; margin-top:2px;">
                    ${video.duracao_minutos} min • ${video.link_video ? 'Link OK' : 'Sem Link'}
                </div>
            </div>
            <button type="button" class="btn-remove-item" onclick="window.removerItemManual(${index})" title="Remover Aula">&times;</button>
        `;
        ul.appendChild(li);
    });

    if(btnLimpar) btnLimpar.style.display = "block";
}

// Função Global (Window) para ser chamada pelo HTML do onclick
window.removerItemManual = function(index) {
    videosPendentes.splice(index, 1);
    
    // Reindexar a ordem para não ficar buracos (1, 3, 5...)
    videosPendentes.forEach((v, i) => v.ordem = i + 1);
    
    renderizarListaManual();
    atualizarMetadadosGlobais();
    marcarAlteracao();
};

function marcarAlteracao() {
    houveAlteracao = true;
    if(btnSalvarCurso) {
        btnSalvarCurso.disabled = false;
    }
}

function atualizarMetadadosGlobais() {
    const totalAulas = videosPendentes.length;
    const totalMinutos = videosPendentes.reduce((acc, v) => acc + (Number(v.duracao_minutos) || 0), 0);

    document.getElementById("meta-qtd-aulas").textContent = totalAulas;
    document.getElementById("meta-tempo-total").textContent = formatarDuracao(totalMinutos);

    const badge = document.getElementById("badge-pendente");
    if(badge) {
        // Mostra pendente se tiver aulas carregadas OU se houve edição nos campos
        badge.style.display = (totalAulas > 0 || houveAlteracao) ? "block" : "none";
        if (totalAulas > 0) {
             badge.textContent = "Aulas Pendentes de Salvar";
             badge.style.backgroundColor = "#fef3c7";
             badge.style.color = "#d97706";
        }
    }
}

// =============================================================
// 9. HELPERS DE INTERFACE (TRILHAS, ABAS)
// =============================================================

function popularSelectTrilhas(valorSelecionado = "") {
    const select = document.getElementById("curso-trilha-select");
    if(!select) return;
    
    select.innerHTML = "";
    const trilhasUnicas = [...new Set(cursos.map(c => c.trilha || "Geral"))].sort();
    
    trilhasUnicas.forEach(t => {
        const opt = document.createElement("option");
        opt.value = t; opt.textContent = t;
        select.appendChild(opt);
    });

    if (valorSelecionado && trilhasUnicas.includes(valorSelecionado)) {
        select.value = valorSelecionado;
        alternarModoTrilha("select"); 
    } else if (valorSelecionado) {
        document.getElementById("curso-trilha-input").value = valorSelecionado;
        alternarModoTrilha("input");
    } else {
        alternarModoTrilha("select");
    }
}

function alternarModoTrilha(modo) {
    const boxSelect = document.getElementById("box-select-trilha");
    const inputTexto = document.getElementById("curso-trilha-input");
    const btnIcon = document.getElementById("btn-toggle-trilha");
    
    if(!boxSelect || !inputTexto) return;

    if (modo === "input") {
        boxSelect.style.display = "none";
        inputTexto.style.display = "block";
        inputTexto.focus();
        btnIcon.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="8" x2="21" y1="6" y2="6"/><line x1="8" x2="21" y1="12" y2="12"/><line x1="8" x2="21" y1="18" y2="18"/><line x1="3" x2="3.01" y1="6" y2="6"/><line x1="3" x2="3.01" y1="12" y2="12"/><line x1="3" x2="3.01" y1="18" y2="18"/></svg>`;
        btnIcon.title = "Selecionar existente";
        inputTexto.dataset.mode = "active"; 
    } else {
        boxSelect.style.display = "block";
        inputTexto.style.display = "none";
        btnIcon.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" x2="12" y1="5" y2="19"/><line x1="5" x2="19" y1="12" y2="12"/></svg>`;
        btnIcon.title = "Criar nova trilha";
        inputTexto.dataset.mode = "inactive";
    }
}

// Chamado pelos Radio Buttons no HTML
window.alternarFonte = function(valor) {
    const panelYT = document.getElementById("panel-youtube");
    const panelManual = document.getElementById("panel-manual");
    
    if (valor === 'youtube') {
        if(panelYT) panelYT.style.display = "block";
        if(panelManual) panelManual.style.display = "none";
    } else {
        if(panelYT) panelYT.style.display = "none";
        if(panelManual) panelManual.style.display = "block";
    }
}

// =============================================================
// 10. SETUP DE LISTENERS (EVENTOS GLOBAIS)
// =============================================================

function setupGlobalListeners() {
    const addEvt = (id, evt, fn) => { 
        const el = document.getElementById(id); 
        if(el) el.addEventListener(evt, fn); 
    };
    
    // --- 10.1 Filtros ---
    addEvt("filtro-trilha", "change", (e) => { 
        preencherOpcoesSubtrilha(e.target.value); 
        aplicarFiltros(); 
    });
    addEvt("filtro-subtrilha", "change", aplicarFiltros);
    addEvt("filtro-status", "change", aplicarFiltros);
    addEvt("filtro-busca", "input", aplicarFiltros);
    addEvt("filtro-ver-ocultos", "change", aplicarFiltros);
    
    addEvt("btn-limpar-filtros", "click", () => {
        document.getElementById("filtro-trilha").value = "";
        document.getElementById("filtro-status").value = "";
        document.getElementById("filtro-busca").value = "";
        preencherOpcoesSubtrilha("");
        aplicarFiltros();
    });

    // --- 10.2 Fechamento de Modais e Cancelar ---
    // Botões X
    document.querySelectorAll(".btn-close-modal, .btn-close-modal-curso, .btn-close-modal-aulas").forEach(btn => {
        btn.addEventListener("click", () => {
            resetarModalManutencao(); // Garante limpeza ao fechar
            if(modalCurso) modalCurso.style.display = "none";
            if(modalAulas) modalAulas.style.display = "none";
        });
    });

    // Botão Cancelar (Secundário no Footer)
    const btnCancelar = document.querySelector(".modal-footer .btn-secondary-full");
    if (btnCancelar) {
        btnCancelar.addEventListener("click", () => {
            resetarModalManutencao();
            if(modalCurso) modalCurso.style.display = "none";
        });
    }

    // --- 10.3 Novo Curso ---
    addEvt("btn-novo-curso", "click", () => {
        resetarModalManutencao();
        document.getElementById("curso-id").value = ""; 
        document.getElementById("modal-curso-titulo").textContent = "Novo Curso";
        document.getElementById("curso-exibir").checked = true;
        popularSelectTrilhas("");
        if(modalCurso) modalCurso.style.display = "flex";
    });

    // --- 10.4 Excluir Curso ---
    addEvt("btn-excluir-curso", "click", async () => {
        const id = document.getElementById("curso-id").value;
        if(!id) return;
        
        if(confirm("ATENÇÃO: Isso apagará o curso e TODO o histórico de aulas permanentemente.\n\nDeseja realmente continuar?")) {
            try {
                await DBHandler.excluirCurso(id);
                modalCurso.style.display = "none";
                inicializarApp(); // Recarrega lista
            } catch (e) { 
                alert("Erro ao excluir: " + e.message); 
            }
        }
    });

    // --- 10.5 Toggle Trilha (Input Manual vs Select) ---
    addEvt("btn-toggle-trilha", "click", () => {
        const inputTexto = document.getElementById("curso-trilha-input");
        const isInputMode = inputTexto.style.display === "block";
        alternarModoTrilha(isInputMode ? "select" : "input");
    });

    // --- 10.6 Adicionar Aula Manualmente ---
    addEvt("btn-add-manual", "click", () => {
        const titulo = document.getElementById("manual-titulo").value.trim();
        const link = document.getElementById("manual-link").value.trim();
        const minutos = parseInt(document.getElementById("manual-minutos").value) || 0;

        if(!titulo) { 
            alert("O título da aula é obrigatório."); 
            return; 
        }
        
        // Adiciona ao array global
        videosPendentes.push({
            titulo: titulo,
            link_video: link,
            duracao_minutos: minutos,
            ordem: videosPendentes.length + 1,
            descricao: "Cadastrado manualmente"
        });

        renderizarListaManual();
        atualizarMetadadosGlobais();
        marcarAlteracao();

        // Limpa campos de input manual
        document.getElementById("manual-titulo").value = "";
        document.getElementById("manual-link").value = "";
        document.getElementById("manual-minutos").value = "";
        document.getElementById("manual-titulo").focus();
    });

    // --- 10.7 Limpar Todas as Aulas ---
    addEvt("btn-limpar-aulas", "click", () => {
        if(confirm("Remover todas as aulas pendentes desta lista?")) {
            videosPendentes = [];
            renderizarListaManual();
            atualizarMetadadosGlobais();
            marcarAlteracao();
        }
    });

    // --- 10.8 Listener de Alteração nos Inputs (Habilita Salvar) ---
    if(formCurso) {
        formCurso.querySelectorAll("input, select, textarea").forEach(el => {
            el.addEventListener("input", marcarAlteracao);
            el.addEventListener("change", marcarAlteracao);
        });
    }

    // --- 10.9 SALVAR CURSO (HANDLER PRINCIPAL) ---
    if(btnSalvarCurso) btnSalvarCurso.addEventListener("click", async () => {
        const id = document.getElementById("curso-id").value;
        const nome = document.getElementById("curso-nome").value;
        
        // Define Trilha (Select ou Input)
        let trilhaValor = "";
        const inputTrilha = document.getElementById("curso-trilha-input");
        if (inputTrilha.dataset.mode === "active") {
            trilhaValor = inputTrilha.value.trim();
            if(!trilhaValor) { alert("Digite o nome da nova trilha."); return; }
        } else {
            trilhaValor = document.getElementById("curso-trilha-select").value || "Geral";
        }

        if(!nome) { alert("O nome do curso é obrigatório."); return; }

        // Monta Payload
        const payload = {
            categoria: trilhaValor, // Compatibilidade legado
            nome: nome,
            status: document.getElementById("curso-status").value,
            trilha: trilhaValor, 
            subtrilha: document.getElementById("curso-subtrilha").value,
            link: document.getElementById("curso-link").value,
            descricao: document.getElementById("curso-descricao").value,
            exibir_catalogo: document.getElementById("curso-exibir").checked
        };

        if(id) payload.id = id; 
        
        // Atualiza timestamp se houver aulas novas
        if (videosPendentes.length > 0) {
            payload.ultima_sincronizacao = new Date().toISOString();
        }

        // Bloqueia Botão
        btnSalvarCurso.innerText = "Gravando...";
        btnSalvarCurso.disabled = true;

        try {
            // Chama DBHandler para transação (Curso + Aulas)
            await DBHandler.salvarCursoCompleto(payload, videosPendentes);
            
            modalCurso.style.display = "none";
            resetarModalManutencao(); // Limpa tudo
            inicializarApp(); // Atualiza Dashboard
            
        } catch (e) {
            console.error(e);
            alert("Erro ao salvar: " + e.message);
            btnSalvarCurso.disabled = false;
            btnSalvarCurso.innerText = "Salvar Alterações";
        }
    });

    // --- 10.10 SINCRONIZAÇÃO YOUTUBE (LÓGICA CORRIGIDA) ---
    if(btnSyncRapido) {
        btnSyncRapido.addEventListener("click", async () => {
            const linkUrl = document.getElementById("curso-link").value.trim();
            let playlistId = "";
            
            // Extrai ID da Playlist
            if (linkUrl.includes("list=")) {
                playlistId = linkUrl.split("list=")[1].split("&")[0];
            } else {
                playlistId = linkUrl;
            }

            if (!playlistId || playlistId.length < 5) {
                alert("⚠️ Link inválido. Certifique-se de usar uma URL de Playlist do YouTube.");
                return;
            }

            // UI Loading
            const textoOriginal = btnSyncRapido.innerHTML;
            btnSyncRapido.innerHTML = `⏳ ...`;
            btnSyncRapido.disabled = true;

            // Backup caso falhe
            const backupAulas = [...videosPendentes];
            
            // ZERA O ARRAY GLOBAL PARA EVITAR DUPLICAÇÃO
            videosPendentes = []; 

            try {
                let videosLocais = []; // Array temporário
                let nextPageToken = "";
                
                // Loop de Paginação (YouTube API)
                do {
                    const url = `https://www.googleapis.com/youtube/v3/playlistItems?part=snippet,contentDetails&maxResults=50&playlistId=${playlistId}&key=${YOUTUBE_API_KEY_FIXA}&pageToken=${nextPageToken}`;
                    const response = await fetch(url);
                    const data = await response.json();
                    
                    if (data.error) throw new Error(data.error.message);
                    if (!data.items || data.items.length === 0) break;

                    const videoIds = data.items.map(item => item.contentDetails.videoId).join(",");
                    if(!videoIds) { 
                        nextPageToken = data.nextPageToken || ""; 
                        continue; 
                    }

                    // Busca detalhes (Duração)
                    const urlDetails = `https://www.googleapis.com/youtube/v3/videos?part=contentDetails,snippet&id=${videoIds}&key=${YOUTUBE_API_KEY_FIXA}`;
                    const respDetails = await fetch(urlDetails);
                    const dataDetails = await respDetails.json();

                    const pageVideos = dataDetails.items.map(item => {
                        return {
                            titulo: limparTituloVideo(item.snippet.title),
                            link_video: `https://www.youtube.com/watch?v=${item.id}`,
                            descricao: item.snippet.description || "",
                            duracao_minutos: parseIsoDuration(item.contentDetails.duration),
                            ordem: 0 // Será calculado no final
                        };
                    });
                    
                    videosLocais = [...videosLocais, ...pageVideos];
                    nextPageToken = data.nextPageToken || "";
                    
                } while (nextPageToken);

                if(videosLocais.length === 0) throw new Error("Playlist vazia ou privada.");

                // Atribui ao Global com Ordem Correta
                videosPendentes = videosLocais.map((v, i) => ({ ...v, ordem: i + 1 }));
                
                // Atualiza UI
                renderizarListaManual();      
                atualizarMetadadosGlobais();  
                
                const elData = document.getElementById("meta-data-sync");
                if(elData) {
                    elData.textContent = "Agora";
                    elData.style.color = "#16a34a";
                    elData.style.fontWeight = "bold";
                }

                marcarAlteracao();
                alert(`✅ Sincronização concluída!\n\n${videosPendentes.length} aulas encontradas.\nClique em SALVAR para confirmar.`);

            } catch (error) {
                console.error(error);
                alert("❌ Erro ao sincronizar: " + error.message);
                videosPendentes = backupAulas; // Restaura em caso de erro
                renderizarListaManual();
            } finally {
                btnSyncRapido.innerHTML = textoOriginal;
                btnSyncRapido.disabled = false;
            }
        });
    }
}
