# FutWearPT — migração da loja

O projeto foi convertido da loja original para a marca **FutWearPT**.

## Já preparado
- Identidade visual FutWearPT com o logo em `frontend/public/futwearpt-logo.png`.
- Catálogo inicial de camisolas, retro, treino, criança e acessórios.
- Categorias novas no frontend e no painel de administração.
- Tamanhos por produto.
- Personalização por nome e número.
- Carrinho distingue variantes (produto + tamanho + personalização).
- A personalização é enviada e fica registada na encomenda.
- Stock por produto continua suportado.
- Encomendas e notificações do painel continuam suportadas.
- Build do frontend validado com sucesso.

## Pagamento
O checkout atual continua a usar o fluxo existente de **MB WAY manual** / pagamento na entrega. Não foi ativado um gateway de cartão real porque isso exige uma conta de pagamentos e credenciais próprias e tem custos por transação.

## Deploy sem VPS
O frontend pode ser publicado como aplicação estática. O backend Python/FastAPI continua a precisar de um serviço de execução cloud/serverless compatível e de uma base de dados MongoDB. A configuração final deve usar variáveis de ambiente no fornecedor de hosting.

## Segurança
O ZIP original continha um `backend/.env` com credenciais reais. Esse ficheiro foi removido desta versão. **Antes de voltar a usar o projeto original, roda/renova as credenciais que estavam nesse ficheiro**, especialmente MongoDB, JWT, email/Resend e VAPID.

## Próximos passos recomendados
1. Configurar um backend cloud para FastAPI.
2. Configurar MongoDB Atlas.
3. Configurar email transacional.
4. Configurar o método de pagamento escolhido.
5. Trocar os produtos de demonstração pelas camisolas reais e imagens autorizadas.
6. Configurar domínio `futwearpt.pt` e CORS/URLs.
