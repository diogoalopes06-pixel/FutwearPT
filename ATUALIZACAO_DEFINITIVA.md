# FutWearPT — atualização definitiva

Esta versão corrige:
- catálogo público sem produtos quando a base tinha dados antigos da frutaria;
- seed/upsert dos 6 produtos FutWearPT;
- token de Admin em localStorage e sessionStorage;
- meta mobile-web-app deprecated;
- branding antigo no HTML/root;
- service worker versionado para evitar cache antigo.

Depois de substituir o conteúdo no GitHub, é necessário deixar a Vercel fazer novo deploy do frontend e o Render fazer novo deploy do backend.

No navegador, depois do deploy: F12 > Application > Storage > Clear site data e recarregar.
