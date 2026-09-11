# FutWearPT — Logística e emails

## Onde gerir a logística

Depois de iniciar sessão em `/admin/login`, abre `/admin` e escolhe o separador **Logística**.

A área permite alterar:
- método de envio;
- prazo de entrega;
- tempo de preparação;
- transportadora;
- preço dos portes;
- valor mínimo para portes grátis;
- levantamento;
- acompanhamento da encomenda;
- prazo de devolução;
- email de apoio.

O checkout usa estes valores e o backend recalcula os portes no servidor, para o cliente não conseguir alterar o preço através do browser.

## Emails automáticos

O backend usa Resend. Configurar no ambiente do backend:

- `RESEND_API_KEY` — chave secreta do Resend;
- `SENDER_EMAIL` — endereço remetente verificado no Resend;
- `SENDER_NAME=FutWearPT`;
- `ADMIN_NOTIFICATION_EMAIL` — endereço que recebe aviso de novas encomendas;
- `SITE_URL` — URL pública do site;
- `FRONTEND_URL` — URL pública do site;
- `EMAIL_LOGO_URL` — URL pública da logo, por exemplo `/futwearpt-logo-square.png` no domínio do site;
- `CORS_ORIGINS` — domínio do frontend, sem `*` em produção.

### Emails enviados

1. confirmação de encomenda ao cliente;
2. aviso de nova encomenda para a loja;
3. mudança de estado da encomenda;
4. pagamento confirmado;
5. encomenda pronta;
6. recuperação de password.

As credenciais/API não são guardadas no CMS nem no GitHub.

## Logística inicial sugerida

- Preparação: `24–48h úteis`
- Entrega: `2–4 dias úteis`
- Portes: `4,90 €`
- Portes grátis: a partir de `60 €`
- Levantamento: disponível após confirmação
- Acompanhamento: ativo
- Devoluções: `14 dias` (ajustar à política comercial aplicável)
