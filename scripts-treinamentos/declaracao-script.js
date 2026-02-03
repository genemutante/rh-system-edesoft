<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Gestão de Certificações | Academy</title>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet">
    <style>
        :root { --primary: #4f46e5; --border: #e2e8f0; --bg: #f8fafc; --text: #1e293b; }
        * { box-sizing: border-box; font-family: 'Inter', sans-serif; }
        
        body { margin: 0; background-color: var(--bg); color: var(--text); height: 100vh; display: flex; flex-direction: column; }
        
        /* HEADER */
        .app-header { height: 64px; background: white; border-bottom: 1px solid var(--border); display: flex; align-items: center; padding: 0 24px; justify-content: space-between; flex-shrink: 0; }
        .header-title { font-size: 18px; font-weight: 700; }

        /* FILTROS */
        .filter-bar { background: white; padding: 16px 24px; border-bottom: 1px solid var(--border); display: flex; gap: 12px; flex-wrap: wrap; align-items: center; }
        .search-input { flex: 1; min-width: 250px; height: 40px; padding: 0 12px; border: 1px solid var(--border); border-radius: 8px; }
        select { height: 40px; padding: 0 12px; border: 1px solid var(--border); border-radius: 8px; background: white; min-width: 160px; }

        /* TABELA */
        .table-container { flex: 1; overflow: auto; padding: 24px; }
        table { width: 100%; border-collapse: collapse; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
        th { background: #f1f5f9; text-align: left; padding: 14px 16px; font-size: 12px; font-weight: 700; color: #64748b; text-transform: uppercase; }
        td { padding: 14px 16px; border-bottom: 1px solid #f1f5f9; font-size: 14px; }
        tr:hover { background: #f8fafc; }

        /* STATUS E BOTÕES */
        .badge { padding: 4px 8px; border-radius: 6px; font-size: 11px; font-weight: 700; text-transform: uppercase; }
        .type-cert { background: #e0e7ff; color: #4338ca; }
        .type-notorio { background: #fef3c7; color: #92400e; }
        
        .btn { height: 40px; padding: 0 16px; border-radius: 8px; font-weight: 600; cursor: pointer; border: 1px solid transparent; font-size: 13px; display: inline-flex; align-items: center; gap: 6px; }
        .btn-primary { background: var(--primary); color: white; }
        .btn-icon { padding: 6px; background: #f1f5f9; color: #64748b; border: 1px solid var(--border); border-radius: 6px; }
        .btn-icon:hover { background: #e2e8f0; color: var(--text); }
        
        .admin-only { display: none; }
    </style>
</head>
<body>

    <header class="app-header">
        <div class="header-title">📜 Gestão de Homologações</div>
        <button class="btn btn-primary admin-only" id="btnNovo" onclick="window.location.href='004-declaracao-de-experiencia.html'">
            ➕ Nova Homologação
        </button>
    </header>

    <div class="filter-bar">
        <input type="text" id="searchBox" class="search-input" placeholder="Pesquisar por colaborador ou curso..." onkeyup="filtrar()">
        <select id="filterTipo" onchange="filtrar()">
            <option value="TODOS">Tipo: Todos</option>
            <option value="CERTIFICADO">Certificado</option>
            <option value="NOTORIO">Notório Saber</option>
        </select>
        <button class="btn btn-ghost" onclick="limparFiltros()">Limpar</button>
    </div>

    <div class="table-container">
        <table id="homologTable">
            <thead>
                <tr>
                    <th>Colaborador</th>
                    <th>Competência</th>
                    <th>Tipo</th>
                    <th>Data</th>
                    <th>Nota</th>
                    <th style="text-align: right;">Ações</th>
                </tr>
            </thead>
            <tbody>
                </tbody>
        </table>
    </div>

    <script type="module">
        import { DBHandler } from '../bd-treinamentos/db-handler.js';

        let DADOS = [];

        document.addEventListener('DOMContentLoaded', async () => {
            const session = JSON.parse(localStorage.getItem('rh_session'));
            if(session.role === 'ADMIN') {
                document.querySelectorAll('.admin-only').forEach(el => el.style.display = 'inline-flex');
            }

            await carregarLista();
        });

        async function carregarLista() {
            try {
                // Aqui usamos a função que já criamos no DBHandler anteriormente
                DADOS = await DBHandler.listarHomologacoes();
                renderizar(DADOS);
            } catch (e) { console.error(e); }
        }

        function renderizar(lista) {
            const tbody = document.querySelector("#homologTable tbody");
            tbody.innerHTML = lista.map(item => `
                <tr>
                    <td><strong>${item.colaboradores?.nome || '—'}</strong></td>
                    <td>${item.treinamentos?.nome || item.atividade_externa || '—'}</td>
                    <td><span class="badge ${item.treinamento_id ? 'type-cert' : 'type-notorio'}">
                        ${item.treinamento_id ? 'Certificado' : 'Notório'}</span>
                    </td>
                    <td>${new Date(item.data_homologacao).toLocaleDateString('pt-BR')}</td>
                    <td>${item.nota || 'N/A'}</td>
                    <td style="text-align: right;">
                        <button class="btn-icon" onclick="verDetalhes(${item.id})" title="Visualizar">👁️</button>
                        <button class="btn-icon admin-only" onclick="editar(${item.id})" title="Editar">✏️</button>
                    </td>
                </tr>
            `).join('');
            
            // Re-checa permissão para os botões recém criados
            const session = JSON.parse(localStorage.getItem('rh_session'));
            if(session.role !== 'ADMIN') {
                document.querySelectorAll('tbody .admin-only').forEach(el => el.style.display = 'none');
            }
        }

        window.filtrar = () => {
            const busca = document.getElementById('searchBox').value.toLowerCase();
            const tipo = document.getElementById('filterTipo').value;

            const filtrados = DADOS.filter(item => {
                const matchBusca = (item.colaboradores?.nome?.toLowerCase().includes(busca)) || 
                                   (item.treinamentos?.nome?.toLowerCase().includes(busca));
                const itemTipo = item.treinamento_id ? 'CERTIFICADO' : 'NOTORIO';
                const matchTipo = tipo === 'TODOS' || itemTipo === tipo;
                return matchBusca && matchTipo;
            });
            renderizar(filtrados);
        };

        window.verDetalhes = (id) => {
            window.location.href = `004-declaracao-de-experiencia.html?id=${id}&mode=view`;
        };

        window.editar = (id) => {
            window.location.href = `004-declaracao-de-experiencia.html?id=${id}&mode=edit`;
        };
    </script>
</body>
</html>
