/**
 * politica-binarios.mjs — fonte de verdade ÚNICA dos binários publicáveis.
 *
 * Antes desta consolidação a mesma informação vivia em três lugares: a lista
 * `EXTRAS_BINARIO` dentro do build, uma regex de extensões escrita à mão logo
 * abaixo dela, e um punhado de checks em tests/validate.js que confirmavam a
 * lista por casamento de texto no código-fonte do build. Casar texto de fonte é
 * o pior dos três: passa a existir uma segunda lista, escrita em outra
 * linguagem (regex), que precisa ser mantida em sincronia à mão e que continua
 * verde mesmo quando a lista de verdade muda de forma. Agora só existe este
 * arquivo, e quem precisa da informação importa daqui.
 *
 * O módulo é PURO de propósito: nenhum import de node:fs, node:child_process ou
 * qualquer coisa de ambiente. Quem sabe ler disco e falar com o git é o build;
 * quem sabe a REGRA é este arquivo. É isso que deixa a regra testável sem
 * montar árvore de arquivo e sem repositório git de mentira.
 */

/* Todo binário que a varredura final da publicação reconhece e barra por
   padrão. A lista existe porque captura de tela com dado real de cliente já foi
   parar em URL pública, e a trava é por FORMATO do arquivo, não por adivinhar o
   que ele tem dentro.

   Nasceu só com pdf/xls/doc/zip/png/jpg. Ganhou webp, avif e os formatos de
   vídeo em 2026-09-01, quando o primeiro .webp entrou no produto e revelou que
   um print salvo nesse formato passaria direto pela varredura. */
export const EXT_BINARIA_BARRADA =
  /\.(pdf|xlsx?|docx?|zip|png|jpe?g|webp|avif|gif|bmp|tiff?|mp4|webm|mov|m4v)$/i;

/* Subconjunto que um item de EXTRAS_BINARIO PODE usar. É mais estreito que a
   lista acima e a diferença é intencional: barrar é amplo, liberar é estreito.
   Declarar um .zip ou um .xlsx na allowlist passa a abortar a publicação, mesmo
   com o arquivo existindo e versionado, porque nenhuma dessas extensões tem
   motivo legítimo de ir para uma URL pública deste produto. */
export const EXT_LIBERAVEL = /\.(png|jpe?g|webp|avif|mp4|webm)$/i;

/* Binários liberados, um por vez, com destino explícito na saída.
   A allowlist é nominal: binário fora dela aborta a publicação.

   O cartão de prévia existe porque o link comercial precisa de imagem de
   verdade num endereço absoluto. WhatsApp e LinkedIn ignoram data URI no
   og:image e não renderizam SVG, então não há como resolver dentro do HTML.
   Sem ele, o link chega ao prospect como um retângulo de texto cinza.

   As duas artes de fundo da tela de acesso entram pelo mesmo critério de
   origem: geradas a partir de texto (o cartão pelo scripts/gera-card-social.py,
   os fundos pelo Higgsfield), nunca capturadas de tela, então não existe dado
   de carteira dentro delas. São duas porque o enquadramento de celular é
   composição própria, não o desktop recortado. */
export const EXTRAS_BINARIO = [
  { de: 'docs/go-to-market/atlas-card.png', para: 'atlas-card.png', social: true },
  { de: 'docs/go-to-market/atlas-bg-desktop.webp', para: 'atlas-bg-desktop.webp', social: false },
  { de: 'docs/go-to-market/atlas-bg-mobile.webp', para: 'atlas-bg-mobile.webp', social: false },
];

/* Caminhos que o Worker do demo tem de servir ANTES da checagem de sessão.
   Derivado da lista acima, nunca escrito à mão: era essa a segunda lista que
   deixava o cartão de prévia quebrar sem ninguém ver. O gate em
   tests/validate.js confere que o Set literal do Worker é exatamente este. */
export const ASSETS_PUBLICOS = EXTRAS_BINARIO.map((e) => '/' + e.para);

/* Só o que um leitor de link (WhatsApp, LinkedIn, Slack) vai buscar. É o
   subconjunto que o teste de regressão do preview social cobre de ponta a
   ponta, porque é nele que a falha era invisível: o Worker respondia 200 com o
   HTML da tela no lugar da imagem, sem 404 e sem erro nenhum. */
export const ASSETS_SOCIAIS = EXTRAS_BINARIO.filter((e) => e.social).map((e) => '/' + e.para);

/* Assinatura de arquivo por extensão. Serve para provar que o que saiu pela
   rota é mesmo a imagem, e não uma página HTML com o nome certo. Content-Type
   sozinho não prova nada: o Worker devolvia text/html com status 200 e o
   navegador só mostrava um ícone quebrado.

   `minimo` é o piso plausível em bytes. Placeholder de 1 KB salvo por engano no
   lugar da arte passaria em todo o resto e chegaria borrado no prospect. */
export const ASSINATURA = {
  '.png': {
    contentType: 'image/png',
    minimo: 20_000,
    confere: (b) => b.length > 8 && b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47
      && b[4] === 0x0d && b[5] === 0x0a && b[6] === 0x1a && b[7] === 0x0a,
  },
  '.jpg': {
    contentType: 'image/jpeg',
    minimo: 10_000,
    confere: (b) => b.length > 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff,
  },
  '.jpeg': {
    contentType: 'image/jpeg',
    minimo: 10_000,
    confere: (b) => b.length > 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff,
  },
  '.webp': {
    contentType: 'image/webp',
    minimo: 4_000,
    // RIFF nos 4 primeiros bytes e WEBP nos bytes 8..11.
    confere: (b) => b.length > 12
      && String.fromCharCode(b[0], b[1], b[2], b[3]) === 'RIFF'
      && String.fromCharCode(b[8], b[9], b[10], b[11]) === 'WEBP',
  },
  '.avif': {
    contentType: 'image/avif',
    minimo: 4_000,
    confere: (b) => b.length > 12 && String.fromCharCode(b[4], b[5], b[6], b[7]) === 'ftyp',
  },
  '.mp4': {
    contentType: 'video/mp4',
    minimo: 20_000,
    confere: (b) => b.length > 12 && String.fromCharCode(b[4], b[5], b[6], b[7]) === 'ftyp',
  },
  '.webm': {
    contentType: 'video/webm',
    minimo: 20_000,
    confere: (b) => b.length > 4 && b[0] === 0x1a && b[1] === 0x45 && b[2] === 0xdf && b[3] === 0xa3,
  },
};

export const extensaoDe = (nome) => {
  const i = String(nome).lastIndexOf('.');
  return i < 0 ? '' : String(nome).slice(i).toLowerCase();
};

export const ehBinarioBarrado = (nome) => EXT_BINARIA_BARRADA.test(String(nome));

export const ehExtensaoLiberavel = (nome) => EXT_LIBERAVEL.test(String(nome));

/**
 * As quatro condições que reprovam um item da allowlist.
 *
 * Recebe os predicados de ambiente em vez de ir ao disco por conta própria.
 * O build passa os de verdade, o teste passa os de mentira, e a regra é uma só
 * nos dois casos.
 *
 * @param {Array<{de: string, para: string}>} extras
 * @param {object} sonda
 * @param {(caminho: string) => boolean} sonda.existe       arquivo de origem está no disco
 * @param {(caminho: string) => boolean} sonda.versionado   git conhece o arquivo de origem
 * @param {(destino: string) => boolean} [sonda.naSaida]    chegou na saída (só depois da cópia)
 * @returns {Array<{de: string, para: string, problema: string}>}
 */
export function problemasDosExtras(extras, { existe, versionado, naSaida } = {}) {
  const problemas = [];

  for (const item of extras) {
    const { de, para } = item;

    if (!ehExtensaoLiberavel(para)) {
      problemas.push({
        de, para,
        problema: `extensão fora da política de liberação (${extensaoDe(para) || 'sem extensão'}). `
          + 'Só png, jpg, jpeg, webp, avif, mp4 e webm podem ser liberados.',
      });
      // Extensão proibida invalida o item inteiro: não adianta cobrar o resto.
      continue;
    }

    if (typeof existe === 'function' && !existe(de)) {
      problemas.push({ de, para, problema: 'não existe no disco' });
      continue;
    }

    if (typeof versionado === 'function' && !versionado(de)) {
      problemas.push({
        de, para,
        problema: 'não está versionado no git. O .gitignore deste repo é '
          + 'deny-by-default, então arquivo novo nasce ignorado e some do commit '
          + 'sem aviso: no disco de quem criou funciona, num clone limpo o build '
          + 'aborta. Libere com uma linha `!/<caminho>` e rode `git add`.',
      });
      continue;
    }

    if (typeof naSaida === 'function' && !naSaida(para)) {
      problemas.push({ de, para, problema: 'declarado mas ausente da saída da publicação' });
    }
  }

  return problemas;
}

/**
 * Deny-by-default da saída: qualquer binário reconhecido que não esteja na
 * allowlist é suspeito. A comparação é pelo caminho relativo à raiz da saída,
 * não pelo nome do arquivo: um atlas-card.png numa subpasta não é o cartão
 * declarado e continua abortando.
 *
 * @param {string[]} relativos   caminhos relativos à raiz da saída
 * @param {string[]} liberados   destinos (`para`) declarados na allowlist
 */
export function suspeitosNaSaida(relativos, liberados) {
  const ok = new Set(liberados.map((p) => p.replace(/\\/g, '/')));
  return relativos.filter((rel) => ehBinarioBarrado(rel) && !ok.has(rel.replace(/\\/g, '/')));
}
