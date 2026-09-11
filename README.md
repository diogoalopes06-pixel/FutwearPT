# FutWearPT

Loja online com catálogo, carrinho, checkout, contas de cliente e painel administrativo.

## Tecnologias

- Frontend: React, React Router, Tailwind CSS e Axios
- Backend: FastAPI, MongoDB/Motor, JWT, Resend e Web Push

## Desenvolvimento local

1. Copie `backend/.env.example` para `backend/.env` e preencha os valores.
2. Copie `frontend/.env.example` para `frontend/.env`.
3. Instale o backend: `python -m pip install -r backend/requirements.txt`.
4. Inicie o backend: `uvicorn server:app --reload --app-dir backend`.
5. Instale o frontend: `npm install --prefix frontend`.
6. Inicie o frontend: `npm start --prefix frontend`.

## Validação

```text
python -m pytest backend/tests
npm run build --prefix frontend
```

## Produção

- Defina `CORS_ORIGINS` apenas com os domínios autorizados, separados por vírgulas.
- Use valores longos e únicos para `JWT_SECRET` e `ADMIN_PASSWORD`.
- Nunca envie ficheiros `.env` para o repositório.
- Configure um domínio validado no serviço de email antes de enviar para clientes reais.
- Mantenha backups automáticos da base de dados e teste periodicamente a recuperação.

As encomendas usam preços oficiais do catálogo no servidor, reserva atómica de stock, proteção de utilização de cupões e identificadores de repetição do checkout.
