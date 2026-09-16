# FutWearPT — correção definitiva do catálogo

Esta versão foi feita a partir do ZIP fornecido pelo utilizador.

## O que foi corrigido
- Node.js 24.x em root e frontend.
- Backend passa a garantir o catálogo FutWearPT sempre que `/api/products`, `/api/products/{id}` ou `/api/orders` são usados.
- Os 6 produtos padrão são recriados se a MongoDB estiver vazia/sem esses produtos.
- Produtos FutWearPT criados no Admin são preservados.
- Produtos com categorias antigas da frutaria são removidos pelo mecanismo de catálogo.
- O Shop deixa de esconder silenciosamente erros de catálogo no código.
- `FwImage` e ProductPage permanecem corrigidos.
- Não foram removidas funcionalidades existentes.

## Deploy obrigatório
1. Frontend: Vercel.
2. Backend: Render.
3. Após ambos os deploys, abrir `/loja` e confirmar os 6 produtos.
