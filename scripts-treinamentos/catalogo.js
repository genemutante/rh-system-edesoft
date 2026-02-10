/* =============================================================
   catalogo.js - Versão Final (Correção do Badge Pendente)
   ============================================================= */

import { DBHandler } from "../bd-treinamentos/db-handler.js";

// =============================================================
// 1. VARIÁVEIS GLOBAIS E CONSTANTES
// =============================================================
const YOUTUBE_API_KEY_FIXA = "AIzaSyAJyCenPXn41mbjieW6wTzeaFPYFX5Xrzo";

let cursos = [];
let videosPendentes = []; 
let houveAlteracao = false; // Flag crucial para o status "Pendente"

// Elementos do DOM
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

function parseIsoDuration(iso) {
    if (!iso) return 0;
    const match = iso.match(/PT(\d+H)?(\d+M)?(\d+S)?/);
    if (!match) return 0;
    const hours = (parseInt(match[1]) || 0);
    const minutes = (parseInt(match[2]) || 0);
    return (hours * 60) + minutes;
}

function normalizarTexto(str) {
    return (str || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

function limparTituloVideo(titulo) {
    if (!titulo) return "Aula Sem Título";
    // Remove numeração automática do início (ex: "01. ", "Aula 1 - ")
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

    modalYouTube = document.getElementById("modal-youtube");
    btnSyncRapido = document.getElementById("btn-sync-youtube-rapido");
    
    btnNovoCurso = document.getElementById("btn-novo-curso");
    btnLimparFiltros = document.getElementById("btn-limpar-filtros");
}

async function inicializarApp() {
    console.log("🚀 Iniciando Aplicação...");
    carregarElementosDOM();
    setupGlobalListeners();

    try {
        const dados = await DBHandler.listarTreinamentos();
        
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
        aplicarFiltros();
    } catch (e) {
        console.error("Erro fatal:", e);
        const container = document.getElementById("lista-cursos");
        if(container) container.innerHTML = `<div class="lista-cursos-vazia" style="color:#ef4444">Erro de conexão: ${e.message}</div>`;
    }
}

document.addEventListener("DOMContentLoaded", inicializarApp);

// =============================================================
// 4. RENDERIZAÇÃO DO DASHBOARD
// =============================================================

function atualizarResumo(lista) {
    const setContent = (id, val) => { const el = document.getElementById(id); if(el) el.textContent = val; };
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
        container.innerHTML = `<div class="lista-cursos-vazia">Nenhum curso encontrado.</div>`;
        return;
    }

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
        if (curso.trilha !== trilhaAtual) {
            trilhaAtual = curso.trilha; subAtual = null;
            container.insertAdjacentHTML('beforeend', `<div class="header-trilha"><span>${trilhaAtual}</span><small>Trilha Principal</small></div>`);
        }
        if (curso.subtrilha && curso.subtrilha !== subAtual) {
            subAtual = curso.subtrilha;
            container.insertAdjacentHTML('beforeend', `<div class="header-subtrilha"><span>${subAtual}</span><small>Subtrilha</small></div>`);
        }

        const statusClass = (curso.status || "backlog").toLowerCase().replace(/\s+/g, "-");
        const isOculto = curso.exibir_catalogo === false;
        
        const botaoLinkHtml = curso.link 
            ? `<button class="btn-icon-acessar" onclick="window.open('${curso.link}', '_blank')" title="Acessar">🚀</button>` 
            : `<button class="btn-disabled-text" disabled>Em breve</button>`;

        const html = `
        <article class="card-curso ${isOculto ? 'is-hidden' : ''} status-${statusClass}">
            <header class="card-header">
                <div class="card-trilhas">
                    ${curso.subtrilha ? `<span class="badge-subtrilha">${curso.subtrilha}</span>` : `<span class="badge-trilha">${curso.trilha}</span>`}
                    ${isOculto ? '<span class="badge-oculto">🔒 OCULTO</span>' : ''}
                </div>
                <span class="badge-status ${statusClass}">${curso.status || 'Rascunho'}</span>
            </header>
            <h2 class="card-titulo">${curso.nome}</h2>
            <p class="card-descricao">${curso.descricao || "Sem descrição."}</p>
            <footer class="card-footer">
                <div class="pill-duracao">
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                    <strong>${formatarDuracao(curso.duracaoMinutos)}</strong>
                </div>
                <div style="display: flex; gap: 8px;">
                    <button class="btn-icon-grade btn-abrir-grade" data-id="${curso.id}" title="Ver Grade">
                         <span class="grade-count">${curso.quantidadeAulas}</span> aulas
                    </button>
                    <button class="btn-icon-editar" data-id="${curso.id}" title="Editar">📝</button>
                    ${botaoLinkHtml}
                </div>
            </footer>
        </article>`;
        container.insertAdjacentHTML('beforeend', html);
    });

    // Reattach listeners
    container.querySelectorAll('.btn-abrir-grade').forEach(btn => 
        btn.addEventListener('click', (e) => { e.stopPropagation(); abrirModalAulas(e.currentTarget.dataset.id); }));
    container.querySelectorAll('.btn-icon-editar').forEach(btn => 
        btn.addEventListener('click', (e) => { e.stopPropagation(); editarCurso(e.currentTarget.dataset.id); }));
}

// =============================================================
// 5. FILTROS
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
    if (!trilha) { select.disabled = true; return; }
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
        if (c.exibir_catalogo === false && !verOcultos) return false;
        const matchBusca = normalizarTexto(c.nome).includes(termo) || normalizarTexto(c.descricao).includes(termo);
        const matchTrilha = !trilhaSel || c.trilha === trilhaSel;
        const matchSub = !subSel || c.subtrilha === subSel;
        const matchStatus = !statusSel || (c.status || "").toUpperCase() === statusSel;
        return matchBusca && matchTrilha && matchSub && matchStatus;
    });

    renderCursos(filtrados);
    atualizarResumo(filtrados);
}

// =============================================================
// 6. MODAL DE GRADE
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
                ${aula.link_video ? `<button onclick="window.open('${aula.link_video}', '_blank')" class="btn-ver-video">📺</button>` : ''}
            `;
            listaAulasUl.appendChild(li);
        });
    }
    modalAulas.style.display = "flex";
}

// =============================================================
// 7. GESTÃO DE ESTADO (MANUTENÇÃO)
// =============================================================

function resetarModalManutencao() {
    if(formCurso) formCurso.reset();
    
    // ZERA COMPLETAMENTE O ESTADO
    videosPendentes = []; 
    houveAlteracao = false; // Garante que começa como "Salvo"
    
    if(btnSalvarCurso) {
        btnSalvarCurso.disabled = true;
        btnSalvarCurso.innerText = "Salvar Alterações";
    }
    
    document.getElementById("meta-qtd-aulas").textContent = "0";
    document.getElementById("meta-tempo-total").textContent = "0 min";
    document.getElementById("meta-data-sync").textContent = "-";
    
    if(areaDelete) areaDelete.style.display = "none";
    if(document.getElementById("lista-manual-preview")) document.getElementById("lista-manual-preview").innerHTML = "";
    
    const badge = document.getElementById("badge-pendente");
    if(badge) badge.style.display = "none"; // Esconde o badge ao resetar

    const radioYoutube = document.getElementById("fonte_youtube");
    if(radioYoutube) { radioYoutube.checked = true; window.alternarFonte('youtube'); }
    alternarModoTrilha('select');
}

function editarCurso(id) {
    resetarModalManutencao(); 

    const curso = cursos.find(c => c.id == id);
    if (!curso) return;

    // Preenche Inputs
    document.getElementById("curso-id").value = curso.id;
    document.getElementById("curso-nome").value = curso.nome;
    document.getElementById("curso-status").value = (curso.status || "DISPONÍVEL").toUpperCase();
    document.getElementById("curso-subtrilha").value = curso.subtrilha || "";
    document.getElementById("curso-link").value = curso.link || "";
    document.getElementById("curso-descricao").value = curso.descricao || "";
    document.getElementById("curso-exibir").checked = (curso.exibir_catalogo !== false);

    // Carrega aulas salvas
    if (curso.aulas && curso.aulas.length > 0) {
        videosPendentes = JSON.parse(JSON.stringify(curso.aulas));
        videosPendentes.sort((a, b) => a.ordem - b.ordem);
    } else {
        videosPendentes = [];
    }
    
    // FORÇA O ESTADO DE "SEM ALTERAÇÃO" AO CARREGAR
    houveAlteracao = false; 

    // Renderiza a lista (vai mostrar as aulas, mas SEM o badge)
    renderizarListaManual();
    atualizarMetadadosGlobais();
    popularSelectTrilhas(curso.trilha);
    
    const elData = document.getElementById("meta-data-sync");
    if(curso.ultima_sincronizacao) elData.textContent = new Date(curso.ultima_sincronizacao).toLocaleString('pt-BR');

    document.getElementById("modal-curso-titulo").textContent = "Editar Curso";
    if(areaDelete) areaDelete.style.display = "block";
    modalCurso.style.display = "flex";
}

// =============================================================
// 8. LISTA DE AULAS (Preview)
// =============================================================

function renderizarListaManual() {
    const ul = document.getElementById("lista-manual-preview");
    const btnLimpar = document.getElementById("btn-limpar-aulas");
    
    if(!ul) return;
    ul.innerHTML = "";
    
    // Se não tiver vídeos, esconde o botão limpar e sai
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

window.removerItemManual = function(index) {
    videosPendentes.splice(index, 1);
    videosPendentes.forEach((v, i) => v.ordem = i + 1);
    renderizarListaManual();
    
    marcarAlteracao(); // Agora sim marca como alterado (removeu item)
    atualizarMetadadosGlobais();
};

function marcarAlteracao() {
    houveAlteracao = true; // Só vira true se o usuário mexer
    if(btnSalvarCurso) btnSalvarCurso.disabled = false;
}

function atualizarMetadadosGlobais() {
    const totalAulas = videosPendentes.length;
    const totalMinutos = videosPendentes.reduce((acc, v) => acc + (Number(v.duracao_minutos) || 0), 0);

    document.getElementById("meta-qtd-aulas").textContent = totalAulas;
    document.getElementById("meta-tempo-total").textContent = formatarDuracao(totalMinutos);

    // CORREÇÃO: O badge só aparece se houveAlteracao for TRUE
    // Antes aparecia se (totalAulas > 0), o que causava o erro ao abrir curso existente
    const badge = document.getElementById("badge-pendente");
    if(badge) {
        if (houveAlteracao) {
            badge.style.display = "block";
            badge.textContent = "Aulas Pendentes de Salvar";
            badge.style.backgroundColor = "#fef3c7";
            badge.style.color = "#d97706";
        } else {
            badge.style.display = "none";
        }
    }
}

// =============================================================
// 9. HELPERS UI
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
// 10. SETUP LISTENERS
// =============================================================

function setupGlobalListeners() {
    const addEvt = (id, evt, fn) => { const el = document.getElementById(id); if(el) el.addEventListener(evt, fn); };
    
    // Filtros
    addEvt("filtro-trilha", "change", (e) => { preencherOpcoesSubtrilha(e.target.value); aplicarFiltros(); });
    addEvt("filtro-subtrilha", "change", aplicarFiltros);
    addEvt("filtro-status", "change", aplicarFiltros);
    addEvt("filtro-busca", "input", aplicarFiltros);
    addEvt("filtro-ver-ocultos", "change", aplicarFiltros);
    addEvt("btn-limpar-filtros", "click", () => {
        document.getElementById("filtro-busca").value = "";
        document.getElementById("filtro-trilha").value = "";
        document.getElementById("filtro-status").value = "";
        preencherOpcoesSubtrilha("");
        aplicarFiltros();
    });

    // Fechar Modal (X)
    document.querySelectorAll(".btn-close-modal, .btn-close-modal-curso, .btn-close-modal-aulas").forEach(btn => {
        btn.addEventListener("click", () => {
            resetarModalManutencao();
            if(modalCurso) modalCurso.style.display = "none";
            if(modalAulas) modalAulas.style.display = "none";
        });
    });

    // Botão Cancelar (Secundário)
    const btnCancelar = document.querySelector(".modal-footer .btn-secondary-full");
    if (btnCancelar) {
        // Substituímos o evento padrão para garantir limpeza
        btnCancelar.replaceWith(btnCancelar.cloneNode(true));
        document.querySelector(".modal-footer .btn-secondary-full").addEventListener("click", () => {
            resetarModalManutencao();
            modalCurso.style.display = "none";
        });
    }

    addEvt("btn-novo-curso", "click", () => {
        resetarModalManutencao();
        document.getElementById("curso-id").value = ""; 
        document.getElementById("modal-curso-titulo").textContent = "Novo Curso";
        document.getElementById("curso-exibir").checked = true;
        popularSelectTrilhas("");
        if(modalCurso) modalCurso.style.display = "flex";
    });

    addEvt("btn-excluir-curso", "click", async () => {
        const id = document.getElementById("curso-id").value;
        if(!id) return;
        if(confirm("ATENÇÃO: Excluirá curso e histórico de aulas.\nConfirmar?")) {
            try {
                await DBHandler.excluirCurso(id);
                modalCurso.style.display = "none";
                inicializarApp();
            } catch (e) { alert("Erro: " + e.message); }
        }
    });

    addEvt("btn-toggle-trilha", "click", () => {
        const inputTexto = document.getElementById("curso-trilha-input");
        const isInputMode = inputTexto.style.display === "block";
        alternarModoTrilha(isInputMode ? "select" : "input");
    });

    addEvt("btn-add-manual", "click", () => {
        const t = document.getElementById("manual-titulo").value.trim();
        const l = document.getElementById("manual-link").value.trim();
        const m = parseInt(document.getElementById("manual-minutos").value) || 0;

        if(!t) { alert("Título obrigatório."); return; }
        
        videosPendentes.push({
            titulo: t, link_video: l, duracao_minutos: m, ordem: videosPendentes.length + 1
        });

        renderizarListaManual();
        marcarAlteracao(); // Marca que mexeu
        atualizarMetadadosGlobais();

        document.getElementById("manual-titulo").value = "";
        document.getElementById("manual-link").value = "";
        document.getElementById("manual-minutos").value = "";
        document.getElementById("manual-titulo").focus();
    });

    addEvt("btn-limpar-aulas", "click", () => {
        if(confirm("Remover todas as aulas da lista?")) {
            videosPendentes = [];
            renderizarListaManual();
            marcarAlteracao();
            atualizarMetadadosGlobais();
        }
    });

    if(formCurso) {
        formCurso.querySelectorAll("input, select, textarea").forEach(el => {
            el.addEventListener("input", marcarAlteracao);
            el.addEventListener("change", marcarAlteracao);
        });
    }

    if(btnSalvarCurso) btnSalvarCurso.addEventListener("click", async () => {
        const id = document.getElementById("curso-id").value;
        const nome = document.getElementById("curso-nome").value;
        
        let trilhaValor = "";
        const inputTrilha = document.getElementById("curso-trilha-input");
        if (inputTrilha.dataset.mode === "active") {
            trilhaValor = inputTrilha.value.trim();
            if(!trilhaValor) { alert("Informe a trilha."); return; }
        } else {
            trilhaValor = document.getElementById("curso-trilha-select").value || "Geral";
        }

        if(!nome) { alert("Nome obrigatório."); return; }

        const payload = {
            categoria: trilhaValor, nome: nome, status: document.getElementById("curso-status").value,
            trilha: trilhaValor, subtrilha: document.getElementById("curso-subtrilha").value,
            link: document.getElementById("curso-link").value, descricao: document.getElementById("curso-descricao").value,
            exibir_catalogo: document.getElementById("curso-exibir").checked
        };

        if(id) payload.id = id; 
        if (houveAlteracao && videosPendentes.length > 0) {
            payload.ultima_sincronizacao = new Date().toISOString();
        }

        btnSalvarCurso.innerText = "Gravando...";
        btnSalvarCurso.disabled = true;

        try {
            await DBHandler.salvarCursoCompleto(payload, videosPendentes);
            modalCurso.style.display = "none";
            resetarModalManutencao();
            inicializarApp(); 
        } catch (e) {
            alert("Erro: " + e.message);
            btnSalvarCurso.disabled = false;
            btnSalvarCurso.innerText = "Salvar Alterações";
        }
    });

    if(btnSyncRapido) {
        btnSyncRapido.addEventListener("click", async () => {
            const linkUrl = document.getElementById("curso-link").value.trim();
            let playlistId = "";
            if (linkUrl.includes("list=")) playlistId = linkUrl.split("list=")[1].split("&")[0];
            else playlistId = linkUrl;

            if (!playlistId || playlistId.length < 5) return alert("Playlist inválida.");

            const textoOriginal = btnSyncRapido.innerHTML;
            btnSyncRapido.innerHTML = `⏳ ...`;
            btnSyncRapido.disabled = true;

            const backupAulas = [...videosPendentes];
            videosPendentes = []; // Limpa para evitar duplicidade

            try {
                let videosLocais = []; 
                let nextPageToken = "";
                
                do {
                    const url = `https://www.googleapis.com/youtube/v3/playlistItems?part=snippet,contentDetails&maxResults=50&playlistId=${playlistId}&key=${YOUTUBE_API_KEY_FIXA}&pageToken=${nextPageToken}`;
                    const res = await fetch(url);
                    const data = await res.json();
                    if (data.error) throw new Error(data.error.message);
                    if (!data.items || data.items.length === 0) break;

                    const videoIds = data.items.map(i => i.contentDetails.videoId).join(",");
                    const resD = await fetch(`https://www.googleapis.com/youtube/v3/videos?part=contentDetails,snippet&id=${videoIds}&key=${YOUTUBE_API_KEY_FIXA}`);
                    const dataD = await resD.json();

                    videosLocais.push(...dataD.items.map(i => ({
                        titulo: limparTituloVideo(i.snippet.title),
                        link_video: `https://www.youtube.com/watch?v=${i.id}`,
                        duracao_minutos: parseIsoDuration(i.contentDetails.duration),
                        ordem: 0
                    })));
                    
                    nextPageToken = data.nextPageToken || "";
                } while (nextPageToken);

                if(videosLocais.length === 0) throw new Error("Playlist vazia/privada.");

                videosPendentes = videosLocais.map((v, i) => ({ ...v, ordem: i + 1 }));
                
                marcarAlteracao(); // Sync conta como alteração
                renderizarListaManual();      
                atualizarMetadadosGlobais();  
                
                const elData = document.getElementById("meta-data-sync");
                if(elData) { elData.textContent = "Agora"; elData.style.color = "#16a34a"; }

                alert(`✅ ${videosPendentes.length} aulas sincronizadas.`);

            } catch (error) {
                alert("Erro Sync: " + error.message);
                videosPendentes = backupAulas;
                renderizarListaManual();
            } finally {
                btnSyncRapido.innerHTML = textoOriginal;
                btnSyncRapido.disabled = false;
            }
        });
    }
}
