# Update de estabilidade

Inclui:
- Admin com atualização automática a cada 30 segundos.
- Som/aviso visual quando entra nova encomenda no painel admin.
- Botão para pausar/ativar refresh automático.
- Botão para ligar/desligar som no admin.
- Checkout com proteção contra encomendas duplicadas por duplo clique/retry.
- Checkout preenche nome/email/telefone/morada quando cliente está autenticado.
- Backend guarda telefone/morada do cliente após encomenda.
- Backend aceita `payment_method=manual` em encomendas antigas.
- Root `/` do backend responde OK para evitar 404 nos health checks.
- Service worker limpa caches antigas ao atualizar.
- Push usa `VAPID_SUBJECT` do Render.

Depois de subir:
1. Vercel faz deploy do frontend.
2. Render: Manual Deploy → Deploy latest commit.
3. Testar admin, checkout, notificação e encomenda nova.
