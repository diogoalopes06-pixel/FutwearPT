# PRD — As Delícias da Quintinha

## Original problem statement
"transformar o projeto numa loja de camisolas de futebol chamada FutWearPT, usando a identidade visual FutWearPT e o logo oficial"
+ Iteração: "ja temos este site mas esta muito fraco e queremos adicionar carrinho para as pessoas fazerem encomendas"
+ Iteração: "que quando a pessoa compra algo e mete o email a dizer que esta confirmado a encomenda e depois o funcionario no painel admin faz com que tenha uma mensagem automatica quando clicar num botao a enviar um email ou sms a dizer que a encomenda esta disponivel para entrega"

## Stack
- Backend: FastAPI + Motor MongoDB + JWT (PyJWT) + bcrypt + Resend (emails)
- Frontend: React + Tailwind + react-router + sonner (toasts) + Cormorant Garamond/Outfit fonts
- Theme: Red #C1292E + bone #FDFBF7 (per design_guidelines.json — Organic & Earthy)

## Personas
- **Cliente** — visitante de Abrantes que quer encomendar produtos frescos online (entrega ao domicílio ou levantamento)
- **Lojista (admin)** — dona/funcionária que gere produtos e processa encomendas

## Implemented (2026-12)
- ✅ Public site: Home, Loja (catálogo + filtro + pesquisa), A Quintinha (sobre), Contactos (mapa + FAQ)
- ✅ Carrinho lateral (drawer) com persistência em localStorage
- ✅ Checkout com escolha entrega/levantamento + confirmação de encomenda
- ✅ Admin: login JWT, dashboard com encomendas + produtos, estatísticas
- ✅ CRUD completo de produtos (categorias: frutas, legumes, queijos-enchidos, vinhos, compotas, mercearia)
- ✅ Atualização de estado das encomendas (pendente → confirmada → preparar → pronta → entregue → cancelada)
- ✅ Email automático Resend: confirmação ao criar encomenda + notificação "pronta" pelo admin
- ✅ Botão WhatsApp no admin (link wa.me com mensagem prefilled — grátis)
- ✅ 20 produtos iniciais semeados + admin seeded
- ✅ Dados reais: morada Av. Mário Soares 37 Abrantes, +351 241 402 897, email, horário Seg-Sáb 08:00-20:00, Facebook
- ✅ Testing 100% pass (backend 18/18 + frontend completo)

## Acesso administrativo
- Login: `/admin/login` → Dashboard: `/admin`
- As credenciais são definidas exclusivamente nas variáveis de ambiente `ADMIN_EMAIL` e `ADMIN_PASSWORD`. Nunca devem ser guardadas em documentação ou no repositório.

## Backlog / Próximos passos (P1)
- Domínio próprio para Resend (DNS verification) — atualmente usa onboarding@resend.dev (sandbox; entrega só a emails verificados na conta Resend até validar domínio)
- Configurar um rate limiter partilhado (Redis) se o backend passar a usar vários workers
- Confirmar `CORS_ORIGINS` com o domínio de produção em cada ambiente

## P2
- Cabazes / packs sazonais
- Programa de fidelidade ou cupões
- Newsletter (subscrição via Resend Audiences)
- Estatísticas de vendas no admin (gráficos)
