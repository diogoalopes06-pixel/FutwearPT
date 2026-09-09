# Alterações incluídas nesta versão final

## Backend (`backend/server.py`)
- Adicionados modelos `CustomerIn`, `CustomerUpdate`, `CustomerLogin`, `CustomerOut` e `CustomerLoginResponse`.
- Adicionado helper `get_current_customer()` com JWT role `customer`.
- Adicionadas rotas:
  - `POST /api/customers/register`
  - `POST /api/customers/login`
  - `GET /api/customers/me`
  - `PATCH /api/customers/me`
  - `GET /api/customers/orders`
- Encomendas agora podem ficar associadas ao `customer_id` quando o cliente está autenticado.
- Histórico também apanha encomendas antigas com o mesmo email.
- Mantidos `email_service.py` e imports de email.
- Mantidos emails em criação de encomenda.
- Estado `ready` continua a poder enviar email de encomenda pronta.
- `app.include_router(api)` foi colocado no fim para incluir todas as rotas definidas.

## Frontend
- `AuthContext.jsx` agora suporta sessão de admin e cliente.
- Nova página `CustomerAuthPage.jsx` para criar conta e login.
- Nova página `CustomerAccountPage.jsx` com:
  - dados pessoais
  - histórico de encomendas
  - detalhes via link para tracking existente
  - repetir encomenda
- Novas rotas:
  - `/cliente`
  - `/minha-conta`
- Navbar tem entrada para área cliente.
- Checkout preenche dados automaticamente quando o cliente está autenticado.

## Preservado
- `OrderConfirmationPage.jsx` não foi substituído.
- MBWay manual mantido.
- Tracking/status UI mantido.
- Admin mantido.
- RGPD/SEO mantidos.
