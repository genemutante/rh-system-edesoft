<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Registro de Homologação | Enterprise</title>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet">
    <script src="../scripts-treinamentos/module-guard.js"></script>
    <style>
        * { box-sizing: border-box; font-family: 'Inter', sans-serif; outline: none; }
        html, body { height: 100%; margin: 0; padding: 0; overflow: hidden; display: flex; flex-direction: column; background-color: #f1f5f9; color: #1e293b; }
        
        .app-header { height: 56px; flex-shrink: 0; background: #ffffff; border-bottom: 1px solid #cbd5e1; display: flex; align-items: center; padding: 0 24px; }
        .main-content { flex: 1; overflow-y: auto; padding: 24px; display: flex; flex-direction: column; align-items: center; }
        
        .form-card { background: white; width: 100%; max-width: 900px; border-radius: 12px; border: 1px solid #cbd5e1; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1); display: flex; flex-direction: column; }

        /* --- TABS ORIGINAIS --- */
        .tabs-header { flex-shrink: 0; display: flex; background: #f8fafc; border-bottom: 1px solid #cbd5e1; padding: 0 12px; border-radius: 12px 12px 0 0; }
        .tab-btn { padding: 16px 20px; border: none; background: none; font-size: 13px; font-weight: 600; color: #64748b; cursor: pointer; border-bottom: 2px solid transparent; transition: all 0.2s; }
        .tab-btn.active { color: #4f46e5; border-bottom-color: #4f46e5; background: #fff; }

        .form-section { padding: 32px; border-bottom: 1px solid #f1f5f9; }
        .section-title { font-size: 14px; font-weight: 700; color: #64748b; text-transform: uppercase; margin-bottom: 24px; display: flex; align-items: center; gap: 8px; }
        
        .grid-form { display: grid; grid-template-columns: repeat(2, 1fr); gap: 24px; }
        .field-group { display: flex; flex-direction: column; gap: 8px; }
        
        label { font-size: 12px; font-weight: 600; color: #475569; }
        select, input { height: 42px; padding: 0 12px; border-radius: 8px; border: 1px solid #cbd5e1; font-size: 14px; transition: all 0.2s; width: 100%; background: #fff; }
        select:focus, input:focus { border-color: #4f46e5; box-shadow: 0 0 0 3px rgba(79,70,229,0.1); }

        .split-footer { padding: 20px 32px; background: #f8fafc; border-top: 1px solid #cbd5e1; display: flex; justify-content: flex-end; gap: 12px; border-radius: 0 0 12px 12px; }
        .btn { padding: 10px 24px; border-radius: 8px; font-size: 14px; font-weight: 600; cursor: pointer; transition: all 0.2s; border: 1px solid transparent; }
        .btn-primary { background: #4f46e5; color: white; }
        .btn-ghost { background: transparent; color: #64748b; border: 1px solid #cbd5e1; }
        .viewer-badge { display: none; background: #fff7ed; color: #c2410c; border: 1px solid #ffedd5; font-size: 11px; padding: 4px 12px; border-radius: 100px; }
    </style>
</head>
<body>

    <header class="app-header">
        <h1 style="font-size: 16px; font-weight: 700; margin: 0;">Registro de Homologação e Experiência</h1>
        <div style="flex: 1;"></div>
        <div id="viewerWarning" class="viewer-badge">Modo Leitura</div>
    </header>

    <div class="main-content">
        <main class="form-card">
            
            <nav class="tabs-header">
                <button class="tab-btn active" id="tabTreino" onclick="switchFormMode('TREINAMENTO', this)">Homologação Interna</button>
                <button class="tab-btn" id="tabExp" onclick="switchFormMode('EXPERIENCIA', this)">Declaração de Experiência</button>
            </nav>

            <div class="form-section">
                <div class="section-title">Identificação do Colaborador</div>
                <div class="grid-form">
                    <div class="field-group" style="grid-column: span 2;">
                        <label>COLABORADOR</label>
                        <select id="selectColaborador">
                            <option value="">Carregando lista...</option>
                        </select>
                    </div>
                </div>
            </div>

            <div class="form-section">
                <div class="section-title" id="txtTituloRegistro">Dados da Homologação</div>
                <div class="grid-form">
                    
                    <div class="field-group" id="groupTreinamento" style="grid-column: span 2;">
                        <label>TREINAMENTO / EQUIPAMENTO</label>
                        <select id="selectTreinamento">
                            <option value="">Carregando...</option>
                        </select>
                    </div>

                    <div class="field-group" id="groupExperiencia" style="grid-column: span 2; display: none;">
                        <label>ATIVIDADE / EQUIPAMENTO EXTERNO</label>
                        <input type="text" id="txtAtividadeExterna" placeholder="Ex: Operação de Empilhadeira Retrátil">
                    </div>
                    
                    <div class="field-group">
                        <label id="lblData">DATA DA HOMOLOGAÇÃO</label>
                        <input type="date" id="dataHomologacao">
                    </div>

                    <div class="field-group">
                        <label>VALIDADE (MESES)</label>
                        <select id="validadeMeses">
                            <option value="6">6 meses</option>
                            <option value="12" selected>12 meses</option>
                            <option value="24">24 meses</option>
                            <option value="0">Indeterminada</option>
                        </select>
                    </div>

                    <div class="field-group">
                        <label id="lblNota">NOTA / AVALIAÇÃO (0-10)</label>
                        <input type="number" id="notaTreinamento" step="0.1" min="0" max="10" placeholder="0.0">
                    </div>

                    <div class="field-group">
                        <label id="lblInstrutor">INSTRUTOR RESPONSÁVEL</label>
                        <input type="text" id="instrutorNome" placeholder="Nome do Responsável">
                    </div>
                </div>
            </div>

            <footer class="split-footer">
                <button class="btn btn-ghost" onclick="history.back()">Cancelar</button>
                <button class="btn btn-primary" id="btnSubmit" onclick="registrarEvento()">Gravar Registro</button>
            </footer>

        </main>
    </div>

    <script type="module" src="../scripts-treinamentos/declaracao-script.js"></script>
    
    <script>
        // Lógica de alternância de abas para manter os dois fluxos
        window.switchFormMode = function(mode, btn) {
            document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');

            const isTreino = mode === 'TREINAMENTO';
            document.getElementById('groupTreinamento').style.display = isTreino ? 'flex' : 'none';
            document.getElementById('groupExperiencia').style.display = isTreino ? 'none' : 'flex';
            
            // Ajuste dinâmico de labels conforme o original
            document.getElementById('txtTituloRegistro').textContent = isTreino ? 'Dados da Homologação' : 'Dados da Experiência';
            document.getElementById('lblData').textContent = isTreino ? 'DATA DA HOMOLOGAÇÃO' : 'DATA DO REGISTRO';
            document.getElementById('lblNota').textContent = isTreino ? 'NOTA / AVALIAÇÃO (0-10)' : 'AVALIAÇÃO TÉCNICA (0-10)';
            document.getElementById('lblInstrutor').textContent = isTreino ? 'INSTRUTOR RESPONSÁVEL' : 'RESPONSÁVEL PELA VALIDAÇÃO';

            window.activeMode = mode;
        };

        document.addEventListener('DOMContentLoaded', () => {
            const sessionRaw = localStorage.getItem('rh_session');
            if (!sessionRaw) { window.top.location.href = '../login.html'; return; }
            const session = JSON.parse(sessionRaw);

            if (session.role !== 'ADMIN') {
                document.getElementById('viewerWarning').style.display = 'flex';
                document.querySelectorAll('input, select, .btn-primary, .tab-btn').forEach(el => el.disabled = true);
            }
            window.activeMode = 'TREINAMENTO';
        });
    </script>
</body>
</html>
