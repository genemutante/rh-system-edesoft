/**
 * module-guard.js
 * Proteção Granular: Banners de Aviso + Remoção em Tempo Real
 */

document.addEventListener('DOMContentLoaded', () => {
    const params = new URLSearchParams(window.location.search);
    const isReadonly = params.get('readonly') === 'true';
    const hideDetails = params.get('hide_details') === 'true';

    // --- 1. CRIAÇÃO DOS BANNERS (AS MENSAGENS VOLTARAM!) ---
    
    // Banner Marrom (Modo Leitura)
    if (isReadonly && !document.getElementById('guard-banner-readonly')) {
        const bannerLeitura = document.createElement('div');
        bannerLeitura.id = 'guard-banner-readonly';
        bannerLeitura.style = 'background: #fff7ed; color: #c2410c; padding: 10px; text-align: center; font-size: 12px; border-bottom: 1px solid #ffedd5; font-family: "Inter", sans-serif; font-weight: 500;';
        bannerLeitura.innerHTML = '👁️ <b>Modo de Visualização:</b> Você não tem permissão para alterar dados neste módulo.';
        document.body.prepend(bannerLeitura);
    }

    // Banner Azul (Privacidade LGPD)
    if (hideDetails && !document.getElementById('guard-banner-privacy')) {
        const bannerPrivacidade = document.createElement('div');
        bannerPrivacidade.id = 'guard-banner-privacy';
        bannerPrivacidade.style = 'background: #f0f9ff; color: #075985; padding: 10px; text-align: center; font-size: 12px; border-bottom: 1px solid #e0f2fe; font-family: "Inter", sans-serif; font-weight: 600;';
        bannerPrivacidade.innerHTML = 'ℹ️ Detalhes individuais ocultos por regra de privacidade.';
        document.body.prepend(bannerPrivacidade);
        
        // CSS de Backup: Esconde o botão antes mesmo do JS agir
        const style = document.createElement('style');
        style.innerHTML = `
            .btn-visualizar, .btn-detalhes, .action-view, .lupa-detalhe, .btn-eye, 
            [title*="Visualizar"], [title*="Detalhes"], .fa-eye { 
                display: none !important; 
            }
        `;
        document.head.appendChild(style);
    }

    // --- 2. VIGILÂNCIA CONSTANTE (PARA OS BOTÕES QUE APARECEM DEPOIS) ---

    const executarLimpeza = () => {
        // Se for Somente Leitura: Remove botões de salvar/excluir
        if (isReadonly) {
            const actionSelectors = ['button[type="submit"]', '.btn-save', '.btn-delete', '.btn-danger'];
            document.querySelectorAll(actionSelectors.join(',')).forEach(el => el.remove());
            document.querySelectorAll('input, select, textarea').forEach(el => {
                if (!el.disabled) el.disabled = true;
            });
        }

        // Se for Ocultar Detalhes: Remove o ícone de "Olho" ou botões de Visualizar
        if (hideDetails) {
            const detailSelectors = [
                '.btn-visualizar', '.btn-detalhes', '.action-view', '.lupa-detalhe', 
                '.btn-eye', '[title*="Visualizar"]', '[title*="Detalhes"]', '.fa-eye'
            ];
            document.querySelectorAll(detailSelectors.join(',')).forEach(el => {
                // Remove o botão ou o link que contém o ícone
                const alvo = el.closest('button') || el.closest('a') || el;
                alvo.remove();
            });
        }
    };

    // Executa imediatamente
    executarLimpeza();

    // Configura o vigia (Observer) para limpar novos elementos (linhas da tabela)
    const observer = new MutationObserver(executarLimpeza);
    observer.observe(document.body, { childList: true, subtree: true });
});
