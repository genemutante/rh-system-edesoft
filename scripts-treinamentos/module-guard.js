// module-guard.js
document.addEventListener('DOMContentLoaded', () => {
    const params = new URLSearchParams(window.location.search);
    
    // Verifica se a URL tem ?readonly=true
    if (params.get('readonly') === 'true') {
        console.log("⚠️ Modo de Leitura Ativado: Desativando controlos de edição.");

        // 1. Esconde todos os botões que servem para salvar ou excluir
        const selectors = [
            'button[type="submit"]',
            '.btn-save',
            '.btn-delete',
            '.btn-danger',
            'button:contains("Salvar")', // Alguns browsers/bibliotecas podem precisar de ajuste aqui
            'button:contains("Excluir")'
        ];

        document.querySelectorAll(selectors.join(',')).forEach(el => {
            el.style.display = 'none';
        });

        // 2. Desativa todos os campos de entrada para que ninguém digite nada
        document.querySelectorAll('input, select, textarea').forEach(el => {
            el.disabled = true;
            el.style.backgroundColor = '#f1f5f9'; // Dá um aspeto de "bloqueado"
            el.style.cursor = 'not-allowed';
        });

        // 3. Adiciona um aviso visual discreto no topo (opcional)
        const banner = document.createElement('div');
        banner.innerHTML = '👁️ <b>Modo de Visualização:</b> Você não tem permissão para alterar dados neste módulo.';
        banner.style = 'background: #fff7ed; color: #c2410c; padding: 8px; text-align: center; font-size: 12px; border-bottom: 1px solid #ffedd5; font-family: sans-serif;';
        document.body.prepend(banner);
    }
});