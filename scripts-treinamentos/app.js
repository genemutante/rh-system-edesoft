/* =============================================================
   APP.JS - Lógica Principal
   (Ordenação Alfabética + Regra de Botão por Qtd. Aulas)
   ============================================================= */

// --- Utilitários ---
function formatarDuracao(minutos) {
  if (!minutos || isNaN(minutos)) return "-";
  const h = Math.floor(minutos / 60);
  const m = minutos % 60;
  if (!h) return `${m} min`;
  if (!m) return `${h} h`;
  return `${h} h ${m} min`;
}

function normalizarTexto(str) {
  return (str || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

// --- Renderização Principal ---
function renderCursos(lista) {
  const container = document.getElementById("lista-cursos");
  container.innerHTML = "";

  if (!lista.length) {
    const vazio = document.createElement("div");
    vazio.className = "lista-cursos-vazia";
    vazio.innerHTML =
      "<strong>Nenhum curso encontrado.</strong><br/>Ajuste os filtros ou limpe a busca para ver mais resultados.";
    container.appendChild(vazio);
    return;
  }

  // Ordenação Alfabética (Trilha > Subtrilha > Nome)
  const listaOrdenada = [...lista].sort((a, b) => {
    const t = (a.trilha || "").localeCompare(b.trilha || "");
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

      const headerTrilha = document.createElement("div");
      headerTrilha.className = "header-trilha";
      headerTrilha.innerHTML = `
        <span>${trilhaAtual}</span>
        <small>Trilha principal</small>
      `;
      container.appendChild(headerTrilha);
    }

    // Cabeçalho de Subtrilha
    if (curso.subtrilha && curso.subtrilha !== subAtual) {
      subAtual = curso.subtrilha;
      const headerSub = document.createElement("div");
      headerSub.className = "header-subtrilha";
      headerSub.innerHTML = `
        <span>${subAtual}</span>
        <small>Subtrilha</small>
      `;
      container.appendChild(headerSub);
    }

    // --- NOVA LÓGICA DO BOTÃO ---
    const qtdAulas = Number(curso.quantidadeAulas) || 0;
    const temLink = Boolean(curso.link && curso.link.trim());
    
    // Só pode acessar se tiver link E aulas > 0
    const podeAcessar = temLink && qtdAulas > 0;
    // ----------------------------

    const card = document.createElement("article");
    card.className = "card-curso";

    const statusClass = curso.status
      ? curso.status.toLowerCase().replace(/\s+/g, "-").normalize("NFD").replace(/[\u0300-\u036f]/g, "")
      : "indefinido";
      
    card.classList.add(`status-${statusClass}`);

card.innerHTML = `
      <header class="card-header">
        <div class="card-trilhas">
          <span class="badge-trilha">${curso.trilha}</span>
          ${curso.subtrilha ? `<span class="badge-subtrilha">${curso.subtrilha}</span>` : ""}
        </div>
        <span class="badge-status ${statusClass}">
          ${curso.status}
        </span>
      </header>

      <h2 class="card-titulo">${curso.nome}</h2>
      <p class="card-descricao">${curso.descricao || ""}</p>

      <div class="card-info">
        
        <div class="info-item">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" d="M5.25 5.653c0-.856.917-1.398 1.667-.986l11.54 6.348a1.125 1.125 0 010 1.971l-11.54 6.347a1.125 1.125 0 01-1.667-.985V5.653z" />
          </svg>
          <span>${qtdAulas} aula(s)</span>
        </div>

        <div class="info-item">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span>${formatarDuracao(curso.duracaoMinutos)}</span>
        </div>

      </div>

      <footer class="card-footer">
        <button
          class="btn-link"
          ${podeAcessar ? `onclick="window.open('${curso.link}', '_blank')"` : "disabled"}
        >
          ${podeAcessar ? "Acessar curso" : "Em breve"}
        </button>
        
        <div class="pill-duracao">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <strong>${curso.duracaoMinutos || 0}</strong> min
        </div>
      </footer>
    `;

    container.appendChild(card);
  });
}

// --- Resumo ---
function atualizarResumo(lista) {
  const total = lista.length;
  const disponiveis = lista.filter((c) => c.status === "DISPONÍVEL").length;
  const emDev = lista.filter((c) => c.status === "EM DESENVOLVIMENTO").length;
  const backlog = lista.filter((c) => c.status === "BACKLOG").length;

  // Soma aulas
  const totalAulas = lista.reduce((acc, c) => {
    const q = Number(c.quantidadeAulas);
    if (isNaN(q) || q <= 0) return acc;
    return acc + q;
  }, 0);

  // --- NOVO: Soma Minutos Totais ---
  const totalMinutos = lista.reduce((acc, c) => {
    const m = Number(c.duracaoMinutos);
    if (isNaN(m) || m <= 0) return acc;
    return acc + m;
  }, 0);

  // Atualiza os elementos na tela
  document.getElementById("resumo-total").textContent = total;
  document.getElementById("resumo-disponivel").textContent = disponiveis;
  document.getElementById("resumo-em-dev").textContent = emDev;
  document.getElementById("resumo-backlog").textContent = backlog;
  
  const aulasEl = document.getElementById("total-aulas");
  if (aulasEl) aulasEl.textContent = totalAulas;

  // --- NOVO: Atualiza o card de tempo ---
  const tempoEl = document.getElementById("resumo-tempo");
  if (tempoEl) {
    // Usa sua função formatarDuracao existente para exibir bonito (ex: 10 h 30 min)
    tempoEl.textContent = formatarDuracao(totalMinutos);
  }
}

// --- Filtros ---
function preencherOpcoesTrilha() {
  const trilhasUnicas = Array.from(
    new Set(cursos.map((c) => c.trilha).filter(Boolean))
  ).sort((a, b) => a.localeCompare(b));

  const selectTrilha = document.getElementById("filtro-trilha");
  selectTrilha.innerHTML = '<option value="">Todas</option>';

  trilhasUnicas.forEach((trilha) => {
    const opt = document.createElement("option");
    opt.value = trilha;
    opt.textContent = trilha;
    selectTrilha.appendChild(opt);
  });
}

function preencherOpcoesSubtrilha(trilhaSelecionada) {
  const selectSub = document.getElementById("filtro-subtrilha");
  const valorAnterior = selectSub.value;

  selectSub.innerHTML = "";
  const optAll = document.createElement("option");
  optAll.value = "";
  optAll.textContent = "Todas";
  selectSub.appendChild(optAll);

  let base = cursos;
  if (trilhaSelecionada) {
    base = cursos.filter((c) => c.trilha === trilhaSelecionada);
  }

  const subtrilhasUnicas = Array.from(
    new Set(base.map((c) => c.subtrilha).filter(Boolean))
  ).sort((a, b) => a.localeCompare(b));

  subtrilhasUnicas.forEach((sub) => {
    const opt = document.createElement("option");
    opt.value = sub;
    opt.textContent = sub;
    selectSub.appendChild(opt);
  });

  if (valorAnterior && subtrilhasUnicas.includes(valorAnterior)) {
    selectSub.value = valorAnterior;
  }
}

function obterCursosFiltrados() {
  const trilha = document.getElementById("filtro-trilha").value;
  const subtrilha = document.getElementById("filtro-subtrilha").value;
  const status = document.getElementById("filtro-status").value;
  const busca = normalizarTexto(document.getElementById("filtro-busca").value);

  return cursos.filter((c) => {
    if (trilha && c.trilha !== trilha) return false;
    if (subtrilha && c.subtrilha !== subtrilha) return false;
    if (status && c.status !== status) return false;

    if (busca) {
      const texto = normalizarTexto(c.nome) + " " + normalizarTexto(c.descricao);
      if (!texto.includes(busca)) return false;
    }
    return true;
  });
}

function aplicarFiltros() {
  const filtrados = obterCursosFiltrados();
  renderCursos(filtrados);
  atualizarResumo(filtrados);
}

function limparFiltros() {
  document.getElementById("filtro-trilha").value = "";
  document.getElementById("filtro-status").value = "";
  document.getElementById("filtro-busca").value = "";
  preencherOpcoesSubtrilha("");
  document.getElementById("filtro-subtrilha").value = "";
  aplicarFiltros();
}

// Inicialização
document.addEventListener("DOMContentLoaded", () => {
  preencherOpcoesTrilha();
  preencherOpcoesSubtrilha("");

  const filtroTrilha = document.getElementById("filtro-trilha");
  const filtroSub = document.getElementById("filtro-subtrilha");
  const filtroStatus = document.getElementById("filtro-status");
  const filtroBusca = document.getElementById("filtro-busca");
  const btnLimpar = document.getElementById("btn-limpar-filtros");

  filtroTrilha.addEventListener("change", () => {
    preencherOpcoesSubtrilha(filtroTrilha.value);
    aplicarFiltros();
  });

  filtroSub.addEventListener("change", aplicarFiltros);
  filtroStatus.addEventListener("change", aplicarFiltros);
  filtroBusca.addEventListener("input", aplicarFiltros);
  btnLimpar.addEventListener("click", limparFiltros);

  aplicarFiltros();
});