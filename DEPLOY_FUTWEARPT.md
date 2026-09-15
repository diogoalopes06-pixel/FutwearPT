# FutWearPT — versão final corrigida

Esta versão inclui:
- Node.js 24.x no package.json raiz e frontend;
- FwImage importado corretamente no ProductPage;
- autenticação Bearer lendo localStorage e sessionStorage;
- campos do Admin com texto preto;
- logo FutWearPT e branding atualizado;
- service worker sem cache persistente de versões antigas;
- seed do backend que garante os 6 produtos FutWearPT sem apagar produtos criados no Admin.

## Publicação

1. Substituir o conteúdo do repositório GitHub por esta versão e fazer commit em `main`.
2. O Vercel deve fazer novo deployment do frontend.
3. O Render deve fazer novo deployment do backend.
4. Depois dos dois deployments, limpar os dados do site no navegador (F12 → Application → Storage → Clear site data) e recarregar.
5. Entrar novamente no Admin.
