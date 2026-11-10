# 🎁 Lista de presentes com pagamento (Mercado Pago): guia completo

Este é **só a parte de presentes** do site de casamento, separada para funcionar sozinha. Ela tem:

- **Lista de presentes** (`/presentes`) com fotos, preço, ordenação e **cotas** (ex.: "Lua de mel", 10 cotas)
- **Chá de panela** (`/cha-de-panela`), uma segunda lista, escondida (só quem tem o link vê)
- **Pagamento de verdade pelo Mercado Pago**: Pix, cartão em até 12x, débito e boleto
- **Tela de obrigado** (`/presentes/obrigado`), que confere o pagamento direto no Mercado Pago
- **Painel** (`/admin`) com senha: cadastrar presentes (colando o link da loja), ver **quem presenteou**, o **recado** e se **pagou**

Não tem RSVP, convidados, fotos do casal nem as outras páginas: isso fica no site principal.

> 📖 Leia na ordem. Quando aparecer um bloco cinza como `npm run dev`, é um **comando**: copie e cole no terminal.

---

## Sumário

1. [Como funciona](#1-como-funciona)
2. [Qual jeito de usar? (escolham um)](#2-qual-jeito-de-usar-escolham-um)
3. [Rodar no computador](#3-rodar-no-computador)
4. [Colocar os dados de vocês](#4-colocar-os-dados-de-vocês)
5. [Trocar cores e fontes](#5-trocar-cores-e-fontes)
6. [Publicar na internet (Vercel)](#6-publicar-na-internet-vercel)
7. [Ligar no site principal](#7-ligar-no-site-principal)
8. [Usar o painel](#8-usar-o-painel)
9. [Mercado Pago, passo a passo](#9-mercado-pago-passo-a-passo)
10. [Deu problema? Soluções rápidas](#10-deu-problema-soluções-rápidas)
11. [Para quem entende de código: colocar dentro de outro projeto Next.js](#11-para-quem-entende-de-código-colocar-dentro-de-outro-projeto-nextjs)

---

## 1. Como funciona

```
Convidado abre /presentes → escolhe → "Presentear" → digita o nome (+ recado)
        ↓
O site cria um PEDIDO (Aguardando) e abre o checkout do Mercado Pago
        ↓
Convidado paga (Pix / cartão / débito / boleto) na página do Mercado Pago
        ↓
Volta sozinho para /presentes/obrigado  +  o Mercado Pago avisa o site (webhook)
        ↓
O site PERGUNTA ao Mercado Pago se pagou de verdade → pedido vira "Pago"
        ↓
Quando acabam as cotas, o presente some da lista sozinho
```

O dinheiro cai **direto na conta Mercado Pago do casal**. O site nunca vê dados de cartão.

---

## 2. Qual jeito de usar? (escolham um)

| Jeito | Para quem | Como fica |
| --- | --- | --- |
| **A) Site separado + link** ✅ recomendado | Qualquer site principal: Wix, WordPress, Squarespace, HTML, outro Next.js… | O módulo fica num endereço próprio (ex.: `presentes.gabrielealice.com.br`). O botão "Presentes" do site principal leva pra lá, e o topo da lista tem **"Voltar para o site"**. |
| **B) Dentro de um projeto Next.js** | Quem já tem o site principal em **Next.js 16** e quer tudo num endereço só | Copia as pastas para o projeto. Veja a [parte 11](#11-para-quem-entende-de-código-colocar-dentro-de-outro-projeto-nextjs). |

> ⚠️ **Não usem iframe** (colocar a lista "dentro" de outra página). O Mercado Pago bloqueia o checkout dentro de
> iframes e o convidado fica preso numa tela em branco. Usem link (jeito A).

Se escolherem **A**, sigam da parte 3 até a 9. É o mesmo caminho do site completo, só que menor.

---

## 3. Rodar no computador

Precisa ter instalado: **Node.js LTS** (https://nodejs.org), **Git** e **VS Code**.

1. No VS Code: **File → Open Folder** → escolha a pasta **`modulo-presentes`**.
2. Abra o terminal (**Terminal → New Terminal**) e instale as peças (só uma vez):

   ```bash
   npm install
   ```

3. **Duplique** o arquivo `.env.example` e renomeie a cópia para **`.env.local`**. Preencha pelo menos:

   ```
   ADMIN_PASSWORD=escolham-uma-senha-forte
   ```

4. (Opcional) Crie presentes de exemplo para ver a lista "cheia":

   ```bash
   npm run db:seed
   ```

5. Ligue:

   ```bash
   npm run dev
   ```

6. Abra **http://localhost:3000/presentes**. Painel: **http://localhost:3000/admin**.

Para desligar: clique no terminal e aperte `Ctrl + C`.

---

## 4. Colocar os dados de vocês

Tudo fica em **`src/lib/config.ts`**. Troque o que está marcado com ✏️, **só o que está entre aspas**.

| Campo | O que é | Exemplo |
| --- | --- | --- |
| `bride` / `groom` | Nomes (topo, rodapé, Mercado Pago, **nome na fatura do cartão**) | `"Alice"`, `"Gabriel"` |
| `dateISO` | Data do casamento, só para o rodapé. `null` esconde. | `"2027-10-16T16:00:00-03:00"` |
| `mainSite.url` | Endereço do **site principal** (o botão "Voltar para o site") | `"https://gabrielealice.com.br"` |
| `mainSite.label` | Texto desse botão | `"Voltar para o site"` |
| `mainSite = null` | Esconde o botão (se a lista for o único site) | |
| `listCopy` | Títulos das listas | `before: "Nossa lista", after: "de presentes"` |
| `giftIllustration` | Vídeo curto ao lado do título (opcional, em `public/media/`) | veja o comentário no arquivo |

**Outros textos:**

| O quê | Onde |
| --- | --- |
| "Muito obrigado!", "Quase lá…", "Ops…" (depois de pagar) | `src/app/presentes/obrigado/page.tsx`, no bloco `COPY` |
| Janela "Presentear", "Obrigado pelo carinho!", "Estamos escolhendo com carinho…" | `src/components/gifts/gift-grid.tsx` |
| Título da aba do navegador | `src/app/layout.tsx` (`metadata`) |

**Não vão usar o chá de panela?** Apaguem a pasta `src/app/cha-de-panela` e a linha
`["cha", "Chá de panela"]` no começo de `src/components/admin/admin-panel.tsx`.

---

## 5. Trocar cores e fontes

### 5.1 Cores

Todas as cores estão no começo de **`src/app/globals.css`**, no bloco `@theme`. Trocou ali, muda a lista e o
painel inteiros. Use códigos como `#5b6b40` (pegue em https://coolors.co ou no site principal, para combinar).

| Nome | Cor atual | Onde aparece |
| --- | --- | --- |
| `--color-primary` | `#5b6b40` verde-oliva | **A principal**: topo, botões, preços, títulos, lateral do painel |
| `--color-primary-deep` | `#4a5833` | Botão com o mouse em cima (um pouco mais escura que a principal) |
| `--color-primary-night` | `#2f3a20` | Rodapé e o fundo escurecido atrás da janela "Presentear" |
| `--color-accent` | `#b5654a` terracota | O "&" e o rótulo "Presentear" |
| `--color-paper` | `#fbf8f2` creme | Fundo principal |
| `--color-mist` | `#f3eee4` | Fundo da tela de obrigado e atrás das fotos |
| `--color-cloud` | `#e7dfd1` | Bordas dos campos e divisórias |
| `--color-sand` | `#ddd2bf` | Bloco "Em breve…" de presente sem foto |
| `--color-line` | `#b7b496` | Raminhos e textos claros no topo |
| `--color-sage` / `--color-sage-soft` | `#9aa57e` / `#dfe2cf` | Contorno do campo selecionado, detalhes suaves |
| `--color-ink` | `#2e2a24` | Texto forte |
| `--color-muted` | `#6b6257` | Texto normal |
| `--color-faint` | `#a59c8f` | Texto bem claro (descrições, "Menor valor") |

**Receita rápida para trocar a paleta inteira** (ex.: azul):

1. `--color-primary`: a cor principal do casal (ex.: `#1b3b5c`).
2. `--color-primary-deep`: a mesma, um pouco mais escura (`#142d47`).
3. `--color-primary-night`: bem escura (`#0c1c2e`).
4. `--color-accent`: uma cor de contraste para o "&" (ex.: dourado `#b08d57`).
5. Os fundos (`paper`, `mist`, `cloud`, `sand`) podem ficar como estão, ou puxem para um cinza/branco frio se a paleta for fria.
6. Em `src/app/layout.tsx`, troque o `themeColor: "#5b6b40"` pela nova `--color-primary` (é a cor da barra do navegador no celular).

> 💡 Salvou o arquivo com o `npm run dev` ligado? A cor muda na hora no navegador.

### 5.2 Fontes

Em **`src/app/layout.tsx`**: hoje são **Cormorant Garamond** (títulos) e **Jost** (textos), do Google Fonts.
Para trocar, por exemplo, para Playfair Display + Inter:

```ts
import { Playfair_Display, Inter } from "next/font/google";
const cormorant = Playfair_Display({ variable: "--font-cormorant", subsets: ["latin"], style: ["normal", "italic"] });
const jost = Inter({ variable: "--font-jost", subsets: ["latin"], weight: ["300", "400", "500"] });
```

Mantenham os nomes `--font-cormorant` e `--font-jost` (o CSS usa esses nomes), só troquem a fonte.

### 5.3 Formato dos botões

Em `globals.css`, na classe `.btn`: `border-radius: 999px` deixa em pílula. Use `8px` para cantos retos arredondados.

---

## 6. Publicar na internet (Vercel)

Contas grátis: **GitHub**, **Vercel** (entre com o GitHub) e **Mercado Pago** (a conta que **recebe**).

### 6.1 Subir para o GitHub

No VS Code, com a pasta `modulo-presentes` aberta: ícone do **galhinho** (Source Control) → **Publish to GitHub** →
**private repository**.

> Se o módulo estiver dentro de outro repositório (pasta `modulo-presentes/` do site completo), dá para
> subir o repositório inteiro e, na Vercel, apontar a pasta (veja 6.2, passo 3).

### 6.2 Criar o projeto

1. https://vercel.com/new → **Import** no repositório.
2. **Project Name**: ex.: `presentes-gabriel-e-alice` → fica `https://presentes-gabriel-e-alice.vercel.app`.
3. Se o repositório for o do site completo: em **Root Directory** clique em **Edit** e escolha **`modulo-presentes`**.
4. **Deploy**. Vai abrir, mas ainda falta o banco:

### 6.3 Banco de dados (presentes e pedidos)

Projeto na Vercel → **Storage** → **Create Database** → **Turso** → plano grátis → **Connect** ao projeto
(marque Production, Preview e Development).

> Não precisa do **Blob**: as fotos dos presentes são links das lojas, nada é enviado.

### 6.4 Variáveis (Settings → Environment Variables)

| Nome | Valor |
| --- | --- |
| `ADMIN_PASSWORD` | senha do painel (forte!) |
| `NEXT_PUBLIC_SITE_URL` | o endereço **deste módulo**, ex.: `https://presentes-gabriel-e-alice.vercel.app` |
| `MP_ACCESS_TOKEN` | token do Mercado Pago (parte 9) |

> ⚠️ **NUNCA coloque aspas** nos valores. Depois de mudar qualquer variável: **Deployments → ⋯ → Redeploy**.

### 6.5 Endereço bonito (opcional)

Se o casal já tem `gabrielealice.com.br`, o melhor é um **subdomínio**: `presentes.gabrielealice.com.br`.
Vercel → **Settings → Domains → Add** → digite `presentes.gabrielealice.com.br` → copie o registro **CNAME** que a
Vercel mostrar para o painel de DNS de onde o domínio foi comprado (Registro.br, GoDaddy, Wix…).
Depois troque o `NEXT_PUBLIC_SITE_URL` para o endereço novo → **Redeploy**.

---

## 7. Ligar no site principal

Basta um **link** para o endereço do módulo. O caminho certo é sempre **`/presentes`**.

**Wix / Squarespace / WordPress:** editem o item **"Presentes"** do menu (ou um botão) → **Link → Endereço web (URL)** →
`https://presentes.gabrielealice.com.br/presentes` → **abrir na mesma janela**.

**Site em HTML:**

```html
<a href="https://presentes.gabrielealice.com.br/presentes">Lista de presentes</a>
```

**Site em Next.js (separado):**

```tsx
<a href="https://presentes.gabrielealice.com.br/presentes">Presentes</a>
```

**Chá de panela:** mande o link `…/cha-de-panela` só para quem vai ao chá (ele não aparece em menu nenhum).

E, de volta: o topo e o rodapé da lista têm o botão **"Voltar para o site"** (configurado em `mainSite`, parte 4).

---

## 8. Usar o painel

`seu-endereco/admin` → senha do `ADMIN_PASSWORD`.

### Presentes

- **+ Novo presente → cole o link do produto** na loja: nome, preço, descrição e fotos vêm sozinhos
  (Westwing, Tok&Stok, Camicado e várias outras).
- **Amazon, Magalu e Mercado Livre bloqueiam isso.** Para elas, usem o **🎁 Capturar presente**: no quadro
  "Capturar presente → como usar", **arrastem** o botão para a **barra de favoritos** do Chrome
  (`Ctrl + Shift + B` mostra a barra). Depois abram o produto na loja e cliquem no favorito.
- **Adicionar vários:** cole uma lista (`Nome ; valor ; link da foto ; descrição`), uma por linha, ou direto de uma planilha.
- **Cotas:** quantas pessoas podem dar o mesmo presente.
- **Ordem no site:** números menores aparecem primeiro.
- **No site** (chavinha): esconde/mostra sem apagar. **Duplicar** cria uma cópia escondida.
- Presente pago **some da lista sozinho** quando acabam as cotas.

### Pedidos

Quem presenteou, o recado, o valor e o status (**Aguardando / Pago / Cancelado**). O painel confere no Mercado Pago
sozinho ao abrir, e o botão **Conferir no Mercado Pago** força a conferência. Dá para mudar o status na mão
(ex.: alguém pagou por fora).

> "Aguardando" é normal para: Pix gerado e ainda não pago, boleto (até 3 dias) ou quem desistiu no meio.

---

## 9. Mercado Pago, passo a passo

Primeiro **testem com dinheiro de mentira** (9.1 a 9.4), depois **liguem o de verdade** (9.5 a 9.7).

### 9.1 Criar a "aplicação"

1. https://www.mercadopago.com.br/developers com a conta **que vai receber**.
2. **Suas integrações → Criar aplicação → Criar no painel de integração**.
3. **Solução:** **Checkout Pro**. **Tipo de API:** **API de Preferências** (se tiver; senão, deixe como está).
4. **Nome:** `Presentes Gabriel e Alice` → aceite → **Criar aplicação**.

### 9.2 Token de TESTE

1. Na aplicação → **Credenciais de teste** → **Ativar credenciais** → copie o **Access Token**.
2. Vercel → `MP_ACCESS_TOKEN` = o token (**sem aspas**) → **Redeploy**.
   No computador: a mesma linha no `.env.local`.

### 9.3 Comprador de teste

Na aplicação → **Contas de teste → + Criar conta de teste → Comprador**, Brasil, valor 1000.
Guarde **usuário** e **senha** (se pedir código de verificação: os **últimos 6 dígitos do User ID** da conta de teste).

### 9.4 Compra de teste

1. **Janela anônima** (`Ctrl + Shift + N`) → site publicado → **Presentes → Presentear**.
2. Entre com o **comprador de teste** e pague com:

| Campo | Valor |
| --- | --- |
| Cartão | **4235 6477 2802 5682** (Visa) ou **5031 4332 1540 6351** (Mastercard) |
| Validade | **11/30** |
| CVV | **123** |
| Nome no cartão | **APRO** (aprovado) · **OTHE** (recusado) |
| CPF | **12345678909** |

3. Deve aparecer **"Muito obrigado!"** e, no painel → **Pedidos**, **Pago**. ✅

### 9.5 Chave Pix

No **app do Mercado Pago**, na conta que recebe: **Pix → Minhas chaves → Cadastrar chave**.
**Sem chave Pix, o Pix não aparece** para os convidados.

### 9.6 Produção (dinheiro de verdade)

1. Na aplicação → **Credenciais de produção** → Setor "Outros" ou "Eventos", **Site** = endereço deste módulo →
   **Ativar credenciais de produção**.
2. Copie o **Access Token de produção** → Vercel → edite `MP_ACCESS_TOKEN` (**sem aspas**) → **Redeploy**.

> 🔒 Esse token é como a **senha da conta que recebe o dinheiro**. Não mandem por WhatsApp nem postem em lugar nenhum.

### 9.7 Teste final

Criem um presente **"Teste" de R$ 1,00**, paguem no **Pix** com o celular de **outra pessoa**, confiram
"Muito obrigado!" + **Pago** no painel + dinheiro no app. Depois devolvam (**Atividade → pagamento → Devolver**)
e excluam o presente.

### Parcelamento e taxas

- Até **12x** no cartão. Por padrão **os juros ficam com quem presenteia** e o casal recebe o valor cheio.
- Para **parcelado sem juros** (a taxa sai do que o casal recebe): Mercado Pago → **Seu negócio → Custos → Parcelamento**.
- O Mercado Pago cobra uma taxa por venda (vejam no app). **Boleto** leva até 3 dias.

### (Opcional) Assinatura do webhook

Em **Suas integrações → Webhooks**, copie a **assinatura secreta** para `MP_WEBHOOK_SECRET`. Não é obrigatório:
mesmo sem ela, o site **sempre** confirma o pagamento perguntando ao Mercado Pago.

---

## 10. Deu problema? Soluções rápidas

| Problema | Solução |
| --- | --- |
| **"Senha incorreta"** no painel publicado | `ADMIN_PASSWORD` **sem aspas** → **Redeploy**. |
| Mudei variável e **nada mudou** | Só vale depois de **Redeploy**. |
| **"Não conseguimos abrir o pagamento"** | Token errado, vencido ou com aspas. Copie de novo → **Redeploy**. |
| **"Uma das partes é de teste"** | Está logado com a conta **real** num site em **teste**: use **janela anônima** + **comprador de teste**. |
| **Pix não aparece** | Falta cadastrar **chave Pix** (9.5). |
| Depois de pagar **não volta** para o site (no computador) | Normal: o Mercado Pago só volta sozinho para `https`. No site publicado funciona. No computador, use **Conferir no Mercado Pago** no painel. |
| Pago no Mercado Pago, mas "Aguardando" no painel | Confira se o `NEXT_PUBLIC_SITE_URL` é **exatamente** o endereço publicado (com `https://`). Depois **Conferir no Mercado Pago**. |
| "Voltar para o site" leva para o lugar errado | `mainSite.url` em `src/lib/config.ts`. |
| Foto do presente não aparece | A loja apagou ou bloqueou a foto. Edite o presente e cole outro link de foto. |
| Erro vermelho depois de editar o `config.ts` | Faltou aspa, vírgula ou chave. `Ctrl + Z`. |

---

## 11. Para quem entende de código: colocar dentro de outro projeto Next.js

**Stack:** Next.js 16 (App Router, Server Actions, **Cache Components**) · React 19 · TypeScript · Tailwind CSS 4 ·
Motion · Drizzle ORM + libSQL/Turso · Zod · Mercado Pago Checkout Pro (API REST, sem SDK).

### 11.1 Mapa dos arquivos

| Arquivo | O que faz |
| --- | --- |
| `src/lib/config.ts` | Nomes, data, link do site principal, textos das listas |
| `src/lib/mercado-pago.ts` | Cria a *preference*, consulta pagamentos, valida `x-signature` |
| `src/lib/actions/public.ts` | `createGiftOrder` (server action do botão "Presentear") |
| `src/lib/actions/admin.ts` | Login e CRUD de presentes/pedidos (todas com `requireAdmin()`) |
| `src/lib/data.ts` | Consultas: lista pública (catálogo com `"use cache"` + cotas sem cache), painel |
| `src/lib/db/` | Schema Drizzle e migração (tabelas `gifts` e `gift_orders`, criadas no 1º acesso) |
| `src/lib/auth.ts` | Cookie de admin assinado com HMAC (`ADMIN_PASSWORD`) |
| `src/lib/product-page.ts`, `src/lib/bookmarklet.ts` | Ler produto pelo link / botão "Capturar presente" |
| `src/components/gifts/` | Página, grade, janela "Presentear", carrossel de fotos |
| `src/components/admin/` | Painel e login |
| `src/app/presentes/`, `src/app/cha-de-panela/` | Rotas públicas |
| `src/app/presentes/obrigado/` | Retorno do checkout (status sempre vem da API, nunca da URL) |
| `src/app/api/mercado-pago/webhook/route.ts` | Notificações do Mercado Pago |
| `src/app/admin/` | Rota do painel |

### 11.2 Passo a passo da integração

1. **Requisitos:** Next.js **16** com App Router e **Tailwind CSS 4**, alias `@/*` → `./src/*`.
2. **Dependências:**

   ```bash
   npm i @libsql/client drizzle-orm motion zod clsx server-only
   ```

3. **Copie** para o projeto (mesmos caminhos): `src/lib/{config,mercado-pago,data,auth,utils,product-page,bookmarklet}.ts`,
   `src/lib/actions/`, `src/lib/db/`, `src/components/gifts/`, `src/components/admin/`,
   `src/components/{reveal,ornament,line-art,photo-slot,footer}.tsx` e as pastas de rota
   `src/app/{presentes,cha-de-panela,admin,api/mercado-pago}`.
   - Se o projeto **já tem** `utils.ts`, `config.ts`, `db/`, `auth.ts` ou `footer.tsx`: copie com outro nome
     (ex.: `src/lib/presentes/…`) e ajuste os imports.
   - **Não copie** `layout.tsx` nem `header.tsx`: o site principal já tem o dele.
4. **`next.config.ts`:**

   ```ts
   cacheComponents: true,
   partialPrefetching: true,
   images: { remotePatterns: [{ protocol: "https", hostname: "**" }, { protocol: "http", hostname: "**" }] },
   ```

   Sem `cacheComponents`: tire `"use cache"`, `cacheLife` e `cacheTag` de `getCatalog` em `data.ts`, e troque
   `updateTag("gifts")` por `revalidatePath("/presentes")` em `actions/admin.ts`.
5. **CSS:** copie para o `globals.css` do projeto o bloco `@theme` (cores) e as classes de `@layer components`
   (`.eyebrow`, `.caps`, `.btn*`, `.field`, `.arch-frame`). Se o projeto já tiver `--color-primary` etc., use as cores
   dele (fica com a cara do site) ou renomeie os tokens do módulo.
6. **Fontes:** o CSS usa as variáveis `--font-cormorant` (títulos) e `--font-jost` (texto). Aponte para as fontes do
   projeto, ex.: `--font-serif: var(--fonte-titulos-do-site)`.
7. **Menu fixo:** a página usa `pt-16 md:pt-24` no topo. Se o site tem menu `fixed`, some a altura dele
   (ex.: `pt-[calc(86px+5rem)]`) em `gifts-page.tsx` e `obrigado/page.tsx`.
8. **Banco:** usa `TURSO_DATABASE_URL`/`TURSO_AUTH_TOKEN` (ou `file:local.db`). Pode ser o mesmo banco do site:
   as tabelas são só `gifts` e `gift_orders` (sem conflito, a menos que o projeto já tenha tabelas com esses nomes).
9. **Variáveis:** `NEXT_PUBLIC_SITE_URL`, `ADMIN_PASSWORD`, `MP_ACCESS_TOKEN` (e opcional `MP_WEBHOOK_SECRET`).

### 11.3 Se o projeto já tem uma rota `/admin`

Mova `src/app/admin` para, por exemplo, `src/app/presentes/admin` e troque `"/admin"` por `"/presentes/admin"` em:
`actions/admin.ts` (`redirect`), `components/admin/admin-panel.tsx` (`replaceState`) e `lib/bookmarklet.ts` (`window.open`).
O cookie do painel se chama `tm_admin` (em `auth.ts`); renomeie se colidir.

### 11.4 Se mudar as rotas públicas

O retorno do checkout (`/presentes/obrigado`) e o webhook (`/api/mercado-pago/webhook`) estão em `createCheckout`,
em `src/lib/mercado-pago.ts`. O link "Voltar para a lista" fica em `obrigado/page.tsx`.

### 11.5 Detalhes do Mercado Pago

`createGiftOrder` cria o pedido e uma *preference* com `external_reference` = id do pedido, `x-idempotency-key`,
até 12 parcelas, `statement_descriptor` com os nomes, e `auto_return` + `notification_url` só quando o site é `https`.
O status vem sempre de `GET /v1/payments/{id}`; um pagamento recusado não derruba um pedido já pago por outra tentativa.
O `user-agent` customizado é necessário: sem ele a proteção do Mercado Pago responde 403 para servidores na nuvem.

### Comandos

```bash
npm run dev        # no computador
npm run db:seed    # presentes de exemplo (APAGA presentes e pedidos do banco local)
npm run build      # build de produção
npm run lint
npm run typecheck
```
