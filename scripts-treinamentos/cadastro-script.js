// /scripts-treinamentos/cadastro-script.js
import { DBHandler } from "../bd-treinamentos/db-handler.js";

let COLABS = [];
let CARGOS = [];
let CARGOS_MAP = new Map();
let GESTORES_MAP = new Map(); // Adicionado para logs legíveis
let sortState = { key: "nome", asc: true };

let currentId = null;
let Mode = "view"; // "view" | "edit" | "new"

// ---------- Utils ----------
function $(id) {
  return document.getElementById(id);
}
function onlyDigits(v) {
  return (v || "").toString().replace(/\D/g, "");
}
function fmtDateBR(iso) {
  if (!iso) return "—";
  const [y, m, d] = iso.slice(0, 10).split("-");
  return `${d}/${m}/${y}`;
}
function isAtivo(c) {
  return !c.data_demissao;
}
function getCargoNome(colab) {
  const id = colab.cargo_atual_id ?? colab.cargoAtualId;
  return CARGOS_MAP.get(Number(id)) || colab.cargo || "—";
}
function safeLower(v) {
  return (v ?? "").toString().toLowerCase();
}

function showView(viewList) {
  $("viewList").style.display = viewList ? "flex" : "none";
  $("viewForm").style.display = viewList ? "none" : "block";
}

function setFormEnabled(enabled) {
  const form = $("viewForm");
  form.querySelectorAll("input, select, textarea").forEach((el) => {
    if (el.type === "hidden") return;
    el.disabled = !enabled;
  });
}

// ---------- Boot ----------
document.addEventListener("DOMContentLoaded", async () => {
  try {
    const sessionRaw = localStorage.getItem("rh_session");
    if (!sessionRaw) return;

    await carregarCombos();
    await carregarLista();

    showView(true);
    renderizarTabela();

    const firstTabBtn = document.querySelector(".tab-link");
    if (firstTabBtn) firstTabBtn.click();
    
  } catch (e) {
    console.error(e);
    alert("Erro ao inicializar tela de colaboradores:\n" + (e.message || e));
  }
});

async function carregarCombos() {
  // Cargos
  CARGOS = await DBHandler.listarCargos();
  CARGOS_MAP = new Map(CARGOS.map((c) => [Number(c.id), c.nome]));

  const selCargo = $("cargoAtualId");
  selCargo.innerHTML = `<option value="">Selecione...</option>` + CARGOS.map(
    (c) => `<option value="${c.id}">${c.nome}</option>`
  ).join("");

  const filtroCargo = $("filtroCargo");
  filtroCargo.innerHTML =
    `<option value="todos">Cargo: Todos</option>` +
    CARGOS.map((c) => `<option value="${c.id}">${c.nome}</option>`).join("");

  // Gestores
  const gestores = await DBHandler.listarColaboradores({ somenteAtivos: false });
  GESTORES_MAP = new Map(gestores.map(g => [Number(g.id), g.nome])); // Mapeado para o Log
  
  const selGestor = $("gestorId");
  selGestor.innerHTML =
    `<option value="">Selecione...</option>` +
    gestores
      .slice()
      .sort((a, b) => (a.nome || "").localeCompare(b.nome || ""))
      .map((g) => `<option value="${g.id}">${g.nome}</option>`)
      .join("");
}

async function carregarLista() {
  COLABS = await DBHandler.listarColaboradores({ somenteAtivos: false });

  const deptos = Array.from(
    new Set(COLABS.map((c) => c.departamento).filter(Boolean))
  ).sort((a, b) => a.localeCompare(b));

  const filtroDepto = $("filtroDepto");
  filtroDepto.innerHTML =
    `<option value="todos">Depto: Todos</option>` +
    deptos.map((d) => `<option value="${d}">${d}</option>`).join("");
}

// ---------- Tabela ----------
function applyFilters(list) {
  const q = safeLower($("searchBox").value);
  const fStatus = $("filtroStatus").value;
  const fDepto = $("filtroDepto").value;
  const fCargo = $("filtroCargo").value;

  return list.filter((c) => {
    const ativo = isAtivo(c);
    if (fStatus === "ativos" && !ativo) return false;
    if (fStatus === "desligados" && ativo) return false;
    if (fDepto && fDepto !== "todos" && (c.departamento || "") !== fDepto) return false;
    const cargoId = Number(c.cargo_atual_id ?? c.cargoAtualId ?? 0);
    if (fCargo && fCargo !== "todos" && cargoId !== Number(fCargo)) return false;

    if (q) {
      const blob = [c.nome, getCargoNome(c), c.departamento, c.cpf].map(safeLower).join(" ");
      if (!blob.includes(q)) return false;
    }
    return true;
  });
}

function applySort(list) {
  const { key, asc } = sortState;
  const sorted = list.slice().sort((a, b) => {
    if (key === "nome") return (a.nome || "").localeCompare(b.nome || "");
    if (key === "cargo") return getCargoNome(a).localeCompare(getCargoNome(b));
    if (key === "status") return Number(isAtivo(b)) - Number(isAtivo(a));
    return 0;
  });
  return asc ? sorted : sorted.reverse();
}

function updateSortIndicators() {
  ["nome", "cargo", "status"].forEach((k) => {
    const el = $(`sort-${k}`);
    if (el) el.textContent = "";
  });
  const target = $(`sort-${sortState.key}`);
  if (target) target.textContent = sortState.asc ? "▲" : "▼";
}

function montarLinha(colab) {
  const tr = document.createElement("tr");
  const status = isAtivo(colab) ? "ATIVO" : "DESLIGADO";
  const statusClass = isAtivo(colab) ? "status-ok" : "status-off";

  tr.innerHTML = `
    <td>${colab.nome || "—"}</td>
    <td>${getCargoNome(colab)}</td>
    <td>${colab.departamento || "—"}</td>
    <td>${fmtDateBR(colab.data_admissao)}</td>
    <td><span class="status-pill ${statusClass}">${status}</span></td>
    <td style="text-align:right;">
      <button class="btn-icon-action" onclick="visualizar(${colab.id})">👁️</button>
      <button class="btn-icon-action admin-only" onclick="editar(${colab.id})">✏️</button>
      ${isAtivo(colab)
          ? `<button class="btn-icon-action admin-only" onclick="abrirModalDesligamento(${colab.id})">🗑️</button>`
          : `<button class="btn-icon-action admin-only" onclick="reativar(${colab.id})">♻️</button>`
      }
    </td>
  `;
  return tr;
}

window.renderizarTabela = function renderizarTabela() {
  const tbody = document.querySelector("#colabTable tbody");
  if (!tbody) return;
  let list = applyFilters(COLABS);
  list = applySort(list);
  tbody.innerHTML = "";
  list.forEach((c) => tbody.appendChild(montarLinha(c)));
  $("contadorRegistros").textContent = `${list.length} registro(s)`;
  updateSortIndicators();
};

window.limparFiltros = function limparFiltros() {
  $("searchBox").value = "";
  $("filtroStatus").value = "todos";
  $("filtroDepto").value = "todos";
  $("filtroCargo").value = "todos";
  renderizarTabela();
};

window.ordenar = function ordenar(key) {
  if (sortState.key === key) sortState.asc = !sortState.asc;
  else sortState = { key, asc: true };
  renderizarTabela();
};

// ---------- Tabs ----------
window.openTab = function openTab(tabId, btn) {
  document.querySelectorAll(".tab-content").forEach((t) => {
    t.classList.remove("active");
    t.style.display = "none";
  });
  document.querySelectorAll(".tab-link").forEach((b) => b.classList.remove("active"));
  const target = $(tabId);
  if (target) {
    target.classList.add("active");
    target.style.display = "block";
  }
  if (btn) btn.classList.add("active");
};

// ---------- Form Context ----------
function limparForm() {
  currentId = null;
  window.originalColabData = null; // Reseta auditoria
  $("colabId").value = "";
  $("mainForm").querySelectorAll("input, select, textarea").forEach((el) => {
    if (el.type === "checkbox") el.checked = false;
    else el.value = "";
  });
  $("nacionalidade").value = "Brasileira";
  $("moeda").value = "BRL";
}

function setModoForm(mode) {
  const isAdmin = document.body.classList.contains("is-admin");
  const podeEditar = isAdmin && (mode === "edit" || mode === "new");

  if ($("btnSalvar")) $("btnSalvar").style.display = podeEditar ? "inline-flex" : "none";
  if ($("btnIrParaEdicao")) {
    const deveMostrar = isAdmin && mode === "view" && !!currentId;
    $("btnIrParaEdicao").style.setProperty("display", deveMostrar ? "inline-flex" : "none", "important");
  }

  setFormEnabled(podeEditar);

  const badge = $("formStatusBadge");
  if (badge) {
    if (!currentId) badge.style.display = "none";
    else {
      const col = COLABS.find((x) => x.id === currentId);
      const ativo = col ? isAtivo(col) : true;
      badge.style.display = "inline-flex";
      badge.textContent = ativo ? "ATIVO" : "DESLIGADO";
      badge.className = `status-pill ${ativo ? "status-ok" : "status-off"}`;
    }
  }
}

window.novoColaborador = function novoColaborador() {
  limparForm();
  $("formTitle").textContent = "Novo Colaborador";
  showView(false);
  setModoForm("new");
};

window.acaoVoltar = function acaoVoltar() {
  showView(true);
  renderizarTabela();
};

window.ativarModoEdicao = function ativarModoEdicao() {
  if (!currentId) return;
  setModoForm("edit");
};

window.visualizar = id => abrirFicha(id, "view");
window.editar = id => abrirFicha(id, "edit");

// ---------- Carregamento da Ficha (Baseline de Auditoria) ----------
async function abrirFicha(id, mode = "view") {
  const colab = await DBHandler.buscarColaboradorPorId(id);
  if (!colab) return;
  
  currentId = colab.id;
  // Criamos uma cópia imutável dos dados vindo do SQL para servir de "De" no Log
  window.originalColabData = Object.freeze({ ...colab });

  preencherForm(colab);
  $("formTitle").textContent = mode === "edit" ? "Editar Colaborador" : "Ficha do Colaborador";
  showView(false);
  setModoForm(mode);
}

function preencherForm(c) {
  $("colabId").value = c.id ?? "";
  $("nome").value = c.nome ?? "";
  $("cpf").value = c.cpf ?? "";
  $("dataNascimento").value = c.data_nascimento ?? "";
  $("genero").value = c.genero ?? "";
  $("estadoCivil").value = c.estado_civil ?? "";
  $("nacionalidade").value = c.nacionalidade ?? "Brasileira";
  $("naturalidade").value = c.naturalidade ?? "";
  $("racaEtnia").value = c.raca_etnia ?? "";
  $("escolaridade").value = c.escolaridade ?? "";
  $("nomeMae").value = c.nome_mae ?? "";
  $("nomePai").value = c.nome_pai ?? "";
  $("pcd").checked = !!c.pcd;
  $("candidato").checked = !!c.candidato;
  $("dataAdmissao").value = c.data_admissao ?? "";
  $("cargoAtualId").value = c.cargo_atual_id ?? "";
  $("departamento").value = c.departamento ?? "";
  $("matricula").value = c.matricula ?? "";
  $("tipoContrato").value = c.tipo_contrato ?? "CLT Indeterminado";
  $("salario").value = c.salario ?? "";
  $("moeda").value = c.moeda ?? "BRL";
  $("unidade").value = c.unidade ?? "";
  $("gestorId").value = c.gestor_id ?? "";
  $("emailEmpresarial").value = c.email_empresarial ?? "";
  $("turno").value = c.turno ?? "";
  $("rg").value = c.rg ?? "";
  $("orgaoExpedidor").value = c.orgao_expedidor ?? "";
  $("dataExpedicao").value = c.data_expedicao ?? "";
  $("pis").value = c.pis ?? "";
  $("ctpsNum").value = c.ctps_num ?? "";
  $("ctpsSerie").value = c.ctps_serie ?? "";
  $("tituloEleitor").value = c.titulo_eleitor ?? "";
  $("zonaEleitoral").value = c.zona_eleitoral ?? "";
  $("reservista").value = c.reservista ?? "";
  $("cnh").value = c.cnh ?? "";
  $("cep").value = c.cep ?? "";
  $("logradouro").value = c.logradouro ?? "";
  $("numero").value = c.numero ?? "";
  $("complemento").value = c.complemento ?? "";
  $("bairro").value = c.bairro ?? "";
  $("cidade").value = c.cidade ?? "";
  $("estado").value = c.estado ?? "";
  $("emailPessoal").value = c.email_pessoal ?? "";
  $("celular").value = c.celular ?? "";
  $("telefoneEmergencia").value = c.telefone_emergencia ?? "";
  $("banco").value = c.banco ?? "";
  $("agencia").value = c.agencia ?? "";
  $("contaCorrente").value = c.conta_corrente ?? "";
}

function coletarPayload() {
  const payload = {
    nome: $("nome").value.trim(),
    cpf: onlyDigits($("cpf").value),
    data_admissao: $("dataAdmissao").value || null,
    cargo_atual_id: $("cargoAtualId").value ? Number($("cargoAtualId").value) : null,
    data_nascimento: $("dataNascimento").value || null,
    genero: $("genero").value || null,
    estado_civil: $("estadoCivil").value || null,
    nacionalidade: $("nacionalidade").value || null,
    naturalidade: $("naturalidade").value || null,
    raca_etnia: $("racaEtnia").value || null,
    escolaridade: $("escolaridade").value || null,
    nome_mae: $("nomeMae").value || null,
    nome_pai: $("nomePai").value || null,
    pcd: !!$("pcd").checked,
    candidato: !!$("candidato").checked,
    departamento: $("departamento").value || null,
    matricula: $("matricula").value || null,
    tipo_contrato: $("tipoContrato").value || null,
    salario: $("salario").value ? Number($("salario").value) : 0,
    moeda: $("moeda").value || "BRL",
    unidade: $("unidade").value || null,
    gestor_id: $("gestorId").value ? Number($("gestorId").value) : null,
    email_empresarial: $("emailEmpresarial").value || null,
    turno: $("turno").value || null,
    rg: $("rg").value || null,
    orgao_expedidor: $("orgaoExpedidor").value || null,
    data_expedicao: $("dataExpedicao").value || null,
    pis: $("pis").value ? onlyDigits($("pis").value) : null,
    ctps_num: $("ctpsNum").value || null,
    ctps_serie: $("ctpsSerie").value || null,
    titulo_eleitor: $("tituloEleitor").value || null,
    zona_eleitoral: $("zonaEleitoral").value || null,
    reservista: $("reservista").value || null,
    cnh: $("cnh").value || null,
    cep: $("cep").value || null,
    logradouro: $("logradouro").value || null,
    numero: $("numero").value || null,
    complemento: $("complemento").value || null,
    bairro: $("bairro").value || null,
    cidade: $("cidade").value || null,
    estado: $("estado").value || null,
    email_pessoal: $("emailPessoal").value || null,
    celular: $("celular").value || null,
    telefone_emergencia: $("telefoneEmergencia").value || null,
    banco: $("banco").value || null,
    agencia: $("agencia").value || null,
    conta_corrente: $("contaCorrente").value || null,
  };

  if (!payload.nome) throw new Error("Nome é obrigatório.");
  if (!payload.cpf) throw new Error("CPF é obrigatório.");
  if (!payload.data_admissao) throw new Error("Data de admissão é obrigatória.");
  if (!payload.cargo_atual_id) throw new Error("Cargo é obrigatório.");

  return payload;
}

// ---------- Salvar com Auditoria ----------
// ---------- Ações de Salvamento ----------
window.salvarColaborador = async function salvarColaborador() {
    try {
        const session = JSON.parse(localStorage.getItem("rh_session"));
        const payload = coletarPayload(); 
        let logDetalhes = "";
        let acao = currentId ? "EDITAR_COLABORADOR" : "CRIAR_COLABORADOR";

        if (currentId && window.originalColabData) {
            // Detalhamento de mudanças para Edição
            logDetalhes = processarDiferencas(window.originalColabData, payload);
            if (!logDetalhes) logDetalhes = "Salvamento sem alterações de valores.";
        } else {
            // Detalhamento para Novo Registro
            logDetalhes = `• Nova Admissão Efetuada\n• Nome: ${payload.nome}\n• Cargo: ${CARGOS_MAP.get(payload.cargo_atual_id) || '—'}`;
        }

        if (!currentId) await DBHandler.inserirColaborador(payload);
        else await DBHandler.atualizarColaborador(currentId, payload);

        // Registro do Log para a tela de Administração
        await DBHandler.registrarLog(session.user, acao, logDetalhes, "Gestão de Colaboradores");

        alert("✅ Dados processados e auditoria registrada.");
        window.acaoVoltar();
    } catch (e) {
        alert("Erro ao salvar: " + (e.message || e));
    }
};


// ---------- Motor de Auditoria (De ➔ Para) ----------
function processarDiferencas(original, novo) {
    // Mapeamento baseado exatamente no esquema da tabela public.colaboradores
    const esquema = {
        nome: "Nome", cpf: "CPF", data_nascimento: "Nascimento", genero: "Gênero",
        estado_civil: "Estado Civil", nacionalidade: "Nacionalidade", naturalidade: "Naturalidade",
        raca_etnia: "Raça/Etnia", escolaridade: "Escolaridade", nome_pai: "Nome do Pai",
        nome_mae: "Nome da Mãe", pcd: "PCD", candidato: "Candidato",
        data_admissao: "Data Admissão", cargo_atual_id: { label: "Cargo", map: CARGOS_MAP },
        departamento: "Departamento", unidade: "Unidade", matricula: "Matrícula",
        tipo_contrato: "Contrato", salario: "Salário Base", moeda: "Moeda",
        turno: "Turno", gestor_id: { label: "Gestor Direto", map: GESTORES_MAP },
        email_empresarial: "Email Corp.", rg: "RG", orgao_expedidor: "Órgão Exp.",
        data_expedicao: "Expedição RG", pis: "PIS/PASEP", ctps_num: "CTPS Nº",
        ctps_serie: "Série CTPS", titulo_eleitor: "Tít. Eleitor", zona_eleitoral: "Zona/Seção",
        reservista: "Reservista", cnh: "CNH", cep: "CEP", logradouro: "Endereço",
        numero: "Nº", complemento: "Compl.", bairro: "Bairro", cidade: "Cidade",
        estado: "UF", email_pessoal: "Email Pessoal", celular: "Celular",
        telefone_emergencia: "Tel. Emergência", banco: "Banco", agencia: "Agência",
        conta_corrente: "Conta Corrente"
    };

    let mudancas = [];
    const norm = (v) => (v === null || v === undefined || String(v).trim() === "") ? "—" : String(v).trim();

    for (const [coluna, config] of Object.entries(esquema)) {
        let label = typeof config === 'string' ? config : config.label;
        let vAntigo = original[coluna];
        let vNovo = novo[coluna];

        // Tratamento para Checkboxes/Booleanos
        if (typeof vNovo === 'boolean') {
            vAntigo = !!vAntigo ? "Sim" : "Não";
            vNovo = vNovo ? "Sim" : "Não";
        } else {
            vAntigo = norm(vAntigo);
            vNovo = norm(vNovo);
        }

        // Tradução de IDs para Nomes amigáveis (Cargo e Gestor)
        if (config.map && vAntigo !== vNovo) {
            vAntigo = config.map.get(Number(vAntigo)) || vAntigo;
            vNovo = config.map.get(Number(vNovo)) || vNovo;
        }

        if (vAntigo !== vNovo) {
            mudancas.push(`• ${label}: ${vAntigo} ➔ ${vNovo}`);
        }
    }
    return mudancas.join('\n');
}

// ---------- Desligamento / Reativação ----------
let modalTargetId = null;

window.abrirModalDesligamento = id => {
  modalTargetId = id;
  $("modalDataDemissao").value = new Date().toISOString().slice(0, 10);
  $("modalMotivo").value = "";
  $("modalDesligamento").style.display = "flex";
};

window.fecharModalDesligamento = () => {
  $("modalDesligamento").style.display = "none";
  modalTargetId = null;
};

// ---------- Desligamento com Log Detalhado ----------
window.confirmarDesligamento = async function confirmarDesligamento() {
    try {
        if (!modalTargetId) return;
        const session = JSON.parse(localStorage.getItem("rh_session"));
        const colab = COLABS.find(c => c.id === modalTargetId);
        
        const dataD = $("modalDataDemissao").value;
        const motivo = $("modalMotivo").value || "Não informado";

        await DBHandler.desativarColaborador(modalTargetId, {
            dataDemissao: dataD,
            motivoDemissao: motivo,
        });

        const logMsg = `• Colaborador: ${colab.nome}\n• Status: ATIVO ➔ DESLIGADO\n• Data: ${fmtDateBR(dataD)}\n• Motivo: ${motivo}`;
        await DBHandler.registrarLog(session.user, "DESLIGAR_COLABORADOR", logMsg, "Gestão de Colaboradores");

        window.fecharModalDesligamento();
        await carregarLista();
        window.renderizarTabela();
    } catch (e) {
        alert("Erro no desligamento: " + (e.message || e));
    }
};

// ---------- Reativação com Log Detalhado ----------
window.reativar = async function reativar(id) {
  try {
    const session = JSON.parse(localStorage.getItem("rh_session"));
    const colab = COLABS.find(c => c.id === id);
    
    await DBHandler.reativarColaborador(id);
    
    const logMsg = `• Colaborador: ${colab.nome}\n• Status: DESLIGADO ➔ ATIVO\n• Detalhes: Registro reativado pelo administrador.`;
    await DBHandler.registrarLog(session.user, "REATIVAR_COLABORADOR", logMsg, "Gestão de Colaboradores");

    await carregarLista();
    window.renderizarTabela();
  } catch (e) {
    alert("Erro na reativação: " + (e.message || e));
  }
};

// ---------- ViaCEP ----------
window.buscarCep = async cep => {
  try {
    const clean = onlyDigits(cep);
    if (clean.length !== 8) return;
    const r = await fetch(`https://viacep.com.br/ws/${clean}/json/`);
    const j = await r.json();
    if (j.erro) return;
    $("logradouro").value = j.logradouro || "";
    $("bairro").value = j.bairro || "";
    $("cidade").value = j.localidade || "";
    $("estado").value = j.uf || "";
  } catch (e) {
    console.warn("ViaCEP falhou:", e);
  }
};
