/* =============================================================
   APP.JS - Lógica Principal (Conectada ao Supabase)
   ============================================================= */

// Variável global que armazenará os cursos vindos do banco
let cursos = [];

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

  // A ordenação agora é prioritariamente feita pela coluna 'ordem_curso_modulo' vinda do banco
  const listaOrdenada = [...lista].sort((a, b) => {
    const trilhaA = (a.trilha || "").toUpperCase();
    const trilhaB = (b.trilha || "").toUpperCase();
    if (trilhaA !== trilhaB) return trilhaA.localeCompare(trilhaB);

    const subA = (a.subtrilha || "").toUpperCase();
    const subB = (b.subtrilha || "").toUpperCase();
    if (subA !== subB) return subA.localeCompare(subB);

    // Se estiverem no mesmo módulo/subtrilha, usa a ordem definida
    const ordemA = a.ordem_curso_modulo || 0;
    const ordemB = b.ordem_curso_modulo || 0;
    if (ordemA !== ordemB) return ordemA - ordemB;

    return (a.nome || "").localeCompare(b.nome || "");
  });

  listaOrdenada.forEach((c) => {
    const card = document.createElement("div");
    card.className = "curso-card";

    // Lógica de cores baseada na trilha (opcional, pode ser vinda do campo 'cor' do banco)
// Adicionamos (c.trilha || "") para garantir que nunca seja null
const trilhaTexto = c.trilha || "Sem Trilha"; 
const trilhaLimpa = normalizarTexto(trilhaTexto.includes("-") ? trilhaTexto.split("-")[1] : trilhaTexto);
    card.setAttribute("data-trilha", trilhaLimpa);

    const labelStatus = c.status === "EM DESENVOLVIMENTO" ? "EM DEV" : c.status;
    const statusClass = "status-" + normalizarTexto(c.status).replace(/\s+/g, "-");

    // Regra: Se quantidadeAulas for 0, o botão fica desabilitado (Backlog)
    const isDisabled = !c.quantidadeAulas || c.quantidadeAulas === 0;
    const btnHtml = isDisabled
      ? `<button class="btn-assistir btn-disabled" disabled title="Conteúdo em breve">Em breve</button>`
      : `<a href="${c.link}" target="_blank" class="btn-assistir">Assistir agora</a>`;

    card.innerHTML = `
      <div class="curso-header">
        <span class="curso-status ${statusClass}">${labelStatus}</span>
        <span class="curso-duracao">${formatarDuracao(c.duracaoMinutos)}</span>
      </div>
      <div class="curso-info">
        <p class="curso-trilha-label">${c.trilha}${c.subtrilha ? " • " + c.subtrilha : ""}</p>
        <h3 class="curso-nome">${c.nome}</h3>
        <p class="curso-desc">${c.descricao || ""}</p>
      </div>
      <div class="curso-footer">
        <span class="curso-aulas">${c.quantidadeAulas || 0} aulas</span>
        ${btnHtml}
      </div>
    `;
    container.appendChild(card);
  });
}

// --- Dashboard / Resumo ---
function atualizarResumo(lista) {
  document.getElementById("resumo-total").textContent = lista.length;
  document.getElementById("resumo-disponivel").textContent = lista.filter(c => c.status === "DISPONÍVEL").length;
  document.getElementById("resumo-em-dev").textContent = lista.filter(c => c.status === "EM DESENVOLVIMENTO").length;
  document.getElementById("resumo-backlog").textContent = lista.filter(c => c.status === "BACKLOG").length;

  const totalMinutos = lista.reduce((acc, cur) => acc + (cur.duracaoMinutos || 0), 0);
  document.getElementById("resumo-horas").textContent = Math.floor(totalMinutos / 60) + "h";
}

// --- Filtros ---
function preencherOpcoesTrilha() {
  const select = document.getElementById("filtro-trilha");
  const trilhas = [...new Set(cursos.map((c) => c.trilha))].sort();
  
  // Mantém a opção "Todas" e adiciona as do banco
  select.innerHTML = '<option value="">Todas as Trilhas</option>';
  trilhas.forEach((t) => {
    const opt = document.createElement("option");
    opt.value = t;
    opt.textContent = t;
    select.appendChild(opt);
  });
}

function preencherOpcoesSubtrilha(trilhaSelecionada) {
  const select = document.getElementById("filtro-subtrilha");
  select.innerHTML = '<option value="">Todas as Subtrilhas</option>';

  if (!trilhaSelecionada) {
    select.disabled = true;
    return;
  }

  const subs = [...new Set(cursos.filter((c) => c.trilha === trilhaSelecionada && c.subtrilha).map((c) => c.subtrilha))].sort();

  if (subs.length > 0) {
    select.disabled = false;
    subs.forEach((s) => {
      const opt = document.createElement("option");
      opt.value = s;
      opt.textContent = s;
      select.appendChild(opt);
    });
  } else {
    select.disabled = true;
  }
}

function obterCursosFiltrados() {
  const trilha = document.getElementById("filtro-trilha").value;
  const sub = document.getElementById("filtro-subtrilha").value;
  const status = document.getElementById("filtro-status").value;
  const busca = normalizarTexto(document.getElementById("filtro-busca").value);

  return cursos.filter((c) => {
    if (trilha && c.trilha !== trilha) return false;
    if (sub && c.subtrilha !== sub) return false;
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

// --- INICIALIZAÇÃO ASSÍNCRONA (CONEXÃO COM BANCO) ---
async function inicializarApp() {
    const listaCursosContainer = document.getElementById("lista-cursos");
    listaCursosContainer.innerHTML = '<div class="lista-cursos-vazia">Carregando catálogo...</div>';

    try {
        // 1. Chama o DBHandler para buscar os dados reais do Supabase
        const dadosDoBanco = await DBHandler.listarTreinamentos();

        // 2. Mapeamento: Converte snake_case (banco) para camelCase (código)
        cursos = dadosDoBanco.map(item => ({
            ...item,
            quantidadeAulas: item.quantidade_aulas,
            duracaoMinutos: item.duracao_minutos
            // trilha, subtrilha, nome, descricao, status, link já estão ok
        }));

        // 3. Preenche a interface
        preencherOpcoesTrilha();
        aplicarFiltros(); // Renderiza e atualiza resumo

    } catch (error) {
        console.error("Erro ao inicializar catálogo:", error);
        listaCursosContainer.innerHTML = '<div class="lista-cursos-vazia text-red">Erro ao carregar dados do servidor.</div>';
    }
}

// Event Listeners
document.addEventListener("DOMContentLoaded", () => {
  // Inicia a carga dos dados
  inicializarApp();

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
});

