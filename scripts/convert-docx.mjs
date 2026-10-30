import fs from 'node:fs';
import path from 'node:path';
import mammoth from 'mammoth';
import TurndownService from 'turndown';
import { gfm } from 'turndown-plugin-gfm';
import { parseHTML } from 'linkedom';

const ROOT = path.resolve(import.meta.dirname, '..');
const CONTENT_DIR = path.join(ROOT, 'docs');
const IMAGES_PUBLIC_PATH = '/img/podrecznik';
const IMAGES_DIR = path.join(ROOT, 'static', IMAGES_PUBLIC_PATH);
const DATA_DIR = path.join(ROOT, 'src/data');
const DOCUMENT_INFO_FILE = path.join(DATA_DIR, 'document.json');
const PRINT_CHAPTERS_FILE = path.join(DATA_DIR, 'print-chapters.ts');
const DOCS_ROUTE = '/docs';

const ACCESS_PATTERN = /^\[Dostęp:\s*(.+?)\]$/;
const WARNING_PATTERN = /^Uwaga\b/;
const TOC_ENTRY_PATTERN = /^(#_|\/docs\/)/;
const TOC_TITLE = 'Spis treści';
const LEADING_DIGIT = /^(\d)/;
const HEADING_ID_PREFIX = 'sekcja-';

const POLISH_CHARS = { ą: 'a', ć: 'c', ę: 'e', ł: 'l', ń: 'n', ó: 'o', ś: 's', ź: 'z', ż: 'z' };

function slugify(text) {
  return text
    .toLowerCase()
    .replace(/[ąćęłńóśźż]/g, (char) => POLISH_CHARS[char])
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function createUniqueSlugger() {
  const used = new Map();

  return (text) => {
    const base = slugify(text) || 'sekcja';
    const count = used.get(base) ?? 0;
    used.set(base, count + 1);

    return count === 0 ? base : `${base}-${count}`;
  };
}

function normalizeText(text) {
  return text.replace(/\s+/g, ' ').trim();
}

function stripChapterNumber(title) {
  return title.replace(/^\d+\.\s*/, '');
}

function yamlString(value) {
  return JSON.stringify(value);
}

async function convertDocxToHtml(docxPath) {
  fs.rmSync(IMAGES_DIR, { recursive: true, force: true });
  fs.mkdirSync(IMAGES_DIR, { recursive: true });

  let imageCount = 0;

  const result = await mammoth.convertToHtml(
    { path: docxPath },
    {
      convertImage: mammoth.images.imgElement(async (image) => {
        imageCount += 1;

        const extension = image.contentType.split('/')[1].replace('jpeg', 'jpg');
        const fileName = `img-${String(imageCount).padStart(3, '0')}.${extension}`;
        fs.writeFileSync(path.join(IMAGES_DIR, fileName), await image.read());

        return { src: `${IMAGES_PUBLIC_PATH}/${fileName}`, alt: image.altText ?? '' };
      }),
    },
  );

  return result.value;
}

function extractFootnotes(document) {
  const footnotes = new Map();

  for (const item of document.querySelectorAll('li[id^="footnote-"]')) {
    item.querySelectorAll('a[href^="#footnote-ref-"]').forEach((backLink) => backLink.remove());

    const number = Number(item.id.replace('footnote-', '')) + 1;
    footnotes.set(number, normalizeText(item.textContent));

    const list = item.parentElement;
    item.remove();

    if (list && list.children.length === 0) {
      list.remove();
    }
  }

  for (const reference of document.querySelectorAll('a[href^="#footnote-"]')) {
    const number = Number(reference.getAttribute('href').replace('#footnote-', '')) + 1;
    const marker = document.createElement('footnote-ref');
    marker.setAttribute('data-number', String(number));
    marker.textContent = String(number);

    const outermostSup = reference.closest('sup')?.parentElement?.closest('sup') ?? reference.closest('sup');
    (outermostSup ?? reference).replaceWith(marker);
  }

  return footnotes;
}

function splitIntoSections(body) {
  const preamble = [];
  const chapters = [];

  for (const node of [...body.childNodes]) {
    if (node.nodeName === 'H2') {
      chapters.push({ heading: node, nodes: [] });
      continue;
    }

    if (chapters.length === 0) {
      preamble.push(node);
    } else {
      chapters.at(-1).nodes.push(node);
    }
  }

  return { preamble, chapters };
}

function assignChapterSlugs(chapters) {
  const slugger = createUniqueSlugger();

  for (const chapter of chapters) {
    chapter.title = normalizeText(chapter.heading.textContent);
    chapter.slug = slugger(stripChapterNumber(chapter.title));
  }
}

function collectAnchors(chapters) {
  const anchors = new Map();
  const headingSlugger = createUniqueSlugger();

  for (const chapter of chapters) {
    const chapterUrl = `${DOCS_ROUTE}/${chapter.slug}`;

    for (const anchor of chapter.heading.querySelectorAll('a[id]')) {
      anchors.set(anchor.id, chapterUrl);
      anchor.remove();
    }

    for (const node of chapter.nodes) {
      if (node.nodeType !== 1) {
        continue;
      }

      const headingText = /^H[3-6]$/.test(node.nodeName) ? normalizeText(node.textContent) : '';

      if (headingText) {
        const headingId = headingSlugger(headingText).replace(LEADING_DIGIT, `${HEADING_ID_PREFIX}$1`);
        node.setAttribute('data-heading-id', headingId);

        for (const anchor of node.querySelectorAll('a[id]')) {
          anchors.set(anchor.id, `${chapterUrl}#${headingId}`);
        }
      }

      node.querySelectorAll('a[id]').forEach((anchor) => {
        if (!anchors.has(anchor.id)) {
          anchors.set(anchor.id, chapterUrl);
        }
      });
    }
  }

  return anchors;
}

function removeEmptyAnchors(root) {
  root.querySelectorAll('a[id]:not([href])').forEach((anchor) => {
    anchor.replaceWith(...anchor.childNodes);
  });
}

function rewriteInternalLinks(root, anchors) {
  root.querySelectorAll('a[href^="#_"]').forEach((link) => {
    const target = anchors.get(link.getAttribute('href').slice(1));

    if (target) {
      link.setAttribute('href', target);
    } else {
      link.replaceWith(...link.childNodes);
    }
  });
}

function unwrapImageOnlyHeadings(root, document) {
  root.querySelectorAll('h3, h4, h5, h6').forEach((heading) => {
    if (normalizeText(heading.textContent) === '' && heading.querySelector('img')) {
      const paragraph = document.createElement('p');
      paragraph.append(...heading.childNodes);
      heading.replaceWith(paragraph);
    }
  });
}

function flattenHeadingFormatting(root) {
  root.querySelectorAll('h2, h3, h4, h5, h6').forEach((heading) => {
    heading.querySelectorAll('strong, em').forEach((inline) => inline.replaceWith(...inline.childNodes));
  });
}

function markCallouts(root, document) {
  root.querySelectorAll('p').forEach((paragraph) => {
    const text = normalizeText(paragraph.textContent);
    const accessMatch = text.match(ACCESS_PATTERN);

    if (accessMatch) {
      const marker = document.createElement('access-roles');
      marker.setAttribute('data-roles', accessMatch[1]);
      marker.textContent = accessMatch[1];
      paragraph.replaceWith(marker);
      return;
    }

    const firstElement = paragraph.firstElementChild;
    const startsWithBoldWarning =
      firstElement?.nodeName === 'STRONG' &&
      paragraph.firstChild === firstElement &&
      WARNING_PATTERN.test(normalizeText(firstElement.textContent));

    if (startsWithBoldWarning) {
      const marker = document.createElement('warning-callout');
      marker.append(...paragraph.childNodes);
      paragraph.replaceWith(marker);
    }
  });
}

function normalizeTables(root, document) {
  root.querySelectorAll('table').forEach((table) => {
    const rows = [...table.querySelectorAll('tr')];
    const images = table.querySelectorAll('img');

    if (images.length > 0 && normalizeText(table.textContent) === '') {
      const paragraph = document.createElement('p');
      paragraph.setAttribute('data-logos', 'true');
      images.forEach((image) => paragraph.append(image));
      table.replaceWith(paragraph);
      return;
    }

    const newTable = document.createElement('table');
    const thead = document.createElement('thead');
    const tbody = document.createElement('tbody');

    rows.forEach((row, rowIndex) => {
      const newRow = document.createElement('tr');

      row.querySelectorAll('th, td').forEach((cell) => {
        const newCell = document.createElement(rowIndex === 0 ? 'th' : 'td');
        const paragraphs = [...cell.querySelectorAll('p')];
        const parts = paragraphs.length > 0 ? paragraphs.map((p) => p.innerHTML.trim()) : [cell.innerHTML.trim()];
        newCell.innerHTML = parts.filter(Boolean).join('<br>');
        newRow.append(newCell);
      });

      (rowIndex === 0 ? thead : tbody).append(newRow);
    });

    newTable.append(thead, tbody);
    table.replaceWith(newTable);
  });
}

function removeTableOfContents(nodes) {
  return nodes.filter((node) => {
    if (node.nodeName !== 'P') {
      return true;
    }

    if (normalizeText(node.textContent) === TOC_TITLE) {
      return false;
    }

    const links = node.querySelectorAll('a');
    const isTocEntry = links.length === 1 && TOC_ENTRY_PATTERN.test(links[0].getAttribute('href') ?? '');

    return !isTocEntry;
  });
}

function createTurndown() {
  const service = new TurndownService({
    headingStyle: 'atx',
    bulletListMarker: '-',
    emDelimiter: '*',
    strongDelimiter: '**',
  });

  service.use(gfm);

  const escapeMarkdown = service.escape.bind(service);
  service.escape = (text) =>
    escapeMarkdown(text)
      .replace(/[{}]/g, (char) => `\\${char}`)
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');

  service.addRule('headingWithId', {
    filter: ['h3', 'h4', 'h5', 'h6'],
    replacement: (content, node) => {
      const level = Number(node.nodeName[1]) - 1;
      const headingId = node.getAttribute('data-heading-id');
      const suffix = headingId ? ` \\{#${headingId}}` : '';

      return `\n\n${'#'.repeat(level)} ${normalizeText(content)}${suffix}\n\n`;
    },
  });

  service.addRule('accessRoles', {
    filter: (node) => node.nodeName === 'ACCESS-ROLES',
    replacement: (_content, node) => `\n\n<Access roles=${yamlString(node.getAttribute('data-roles'))} />\n\n`,
  });

  service.addRule('warningCallout', {
    filter: (node) => node.nodeName === 'WARNING-CALLOUT',
    replacement: (content) => `\n\n:::warning\n\n${content.trim()}\n\n:::\n\n`,
  });

  service.addRule('footnoteReference', {
    filter: (node) => node.nodeName === 'FOOTNOTE-REF',
    replacement: (_content, node) => `[^${node.getAttribute('data-number')}]`,
  });

  service.addRule('tableCellBreak', {
    filter: (node) => node.nodeName === 'BR' && Boolean(node.closest('td, th')),
    replacement: () => '<br />',
  });

  service.addRule('image', {
    filter: 'img',
    replacement: (_content, node) => {
      const isLogo = Boolean(node.closest('[data-logos]'));
      const alt = node.getAttribute('alt') || (isLogo ? 'Logo' : 'Zrzut ekranu');

      return isLogo ? `![${alt}](${node.getAttribute('src')}) ` : `\n\n![${alt}](${node.getAttribute('src')})\n\n`;
    },
  });

  return service;
}

function nodesToHtml(nodes) {
  return nodes.map((node) => node.outerHTML ?? node.textContent).join('');
}

function footnotesFor(markdown, footnotes) {
  const definitions = [...footnotes.entries()]
    .filter(([number]) => markdown.includes(`[^${number}]`))
    .map(([number, text]) => `[^${number}]: ${text}`);

  return definitions.length > 0 ? `\n\n${definitions.join('\n')}\n` : '';
}

function tidyMarkdown(markdown) {
  return `${markdown.replace(/\n{3,}/g, '\n\n').trim()}\n`;
}

function writePage(fileName, frontmatter, markdown) {
  const header = Object.entries(frontmatter)
    .map(([key, value]) => `${key}: ${yamlString(value)}`)
    .join('\n');

  fs.writeFileSync(path.join(CONTENT_DIR, fileName), `---\n${header}\n---\n\n${markdown}`);
}

function readDocumentInfo(preambleNodes) {
  const info = { title: 'Podręcznik Administratora Systemu', subtitle: 'Platformy eSklep', version: '' };
  const html = nodesToHtml(preambleNodes);
  const { document } = parseHTML(`<!doctype html><html><body>${html}</body></html>`);

  for (const row of document.querySelectorAll('tr')) {
    const cells = [...row.querySelectorAll('th, td')].map((cell) => normalizeText(cell.textContent));

    if (cells[0] === 'Wersja dokumentu') {
      info.version = cells[1];
    }

    if (cells[0] === 'Data utworzenia') {
      info.createdAt = cells[1];
    }
  }

  return info;
}

function isTitleParagraph(node) {
  return node.nodeName === 'P' && /^Podręcznik Administratora/i.test(normalizeText(node.textContent));
}

function renderPrintChaptersModule(chapterList) {
  const imports = chapterList.map(
    (chapter, index) => `import Chapter${index + 1} from '@site/docs/${chapter.slug}.mdx';`,
  );
  const entries = chapterList.map(
    (chapter, index) => `  { slug: ${yamlString(chapter.slug)}, title: ${yamlString(chapter.title)}, Content: Chapter${index + 1} },`,
  );

  return [
    "import FrontPage from '@site/docs/index.mdx';",
    ...imports,
    '',
    'export { FrontPage };',
    '',
    'export const printChapters = [',
    ...entries,
    '];',
    '',
  ].join('\n');
}

async function main() {
  const docxPath = process.argv[2];

  if (!docxPath) {
    console.error('Użycie: pnpm convert <ścieżka-do-pliku.docx>');
    process.exit(1);
  }

  const html = await convertDocxToHtml(path.resolve(docxPath));
  const { document } = parseHTML(`<!doctype html><html><body>${html}</body></html>`);

  const footnotes = extractFootnotes(document);
  unwrapImageOnlyHeadings(document.body, document);
  flattenHeadingFormatting(document.body);
  markCallouts(document.body, document);
  normalizeTables(document.body, document);

  const { preamble, chapters } = splitIntoSections(document.body);
  assignChapterSlugs(chapters);
  const anchors = collectAnchors(chapters);

  rewriteInternalLinks(document.body, anchors);
  removeEmptyAnchors(document.body);

  const turndown = createTurndown();

  fs.rmSync(CONTENT_DIR, { recursive: true, force: true });
  fs.mkdirSync(CONTENT_DIR, { recursive: true });

  const preambleNodes = removeTableOfContents(preamble).filter((node) => !isTitleParagraph(node));
  const documentInfo = readDocumentInfo(preambleNodes);
  const preambleMarkdown = tidyMarkdown(turndown.turndown(nodesToHtml(preambleNodes)));

  writePage(
    'index.mdx',
    {
      title: documentInfo.title,
      description: `${documentInfo.subtitle} — wersja ${documentInfo.version}`,
    },
    preambleMarkdown + footnotesFor(preambleMarkdown, footnotes),
  );

  for (const chapter of chapters) {
    const markdown = tidyMarkdown(turndown.turndown(nodesToHtml(chapter.nodes)));
    writePage(`${chapter.slug}.mdx`, { title: chapter.title }, markdown + footnotesFor(markdown, footnotes));
  }

  const chapterList = chapters.map(({ slug, title }) => ({ slug, title }));

  fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.writeFileSync(DOCUMENT_INFO_FILE, `${JSON.stringify({ ...documentInfo, chapters: chapterList }, null, 2)}\n`);
  fs.writeFileSync(PRINT_CHAPTERS_FILE, renderPrintChaptersModule(chapterList));

  console.log(`Zapisano ${chapters.length} rozdziałów i ${fs.readdirSync(IMAGES_DIR).length} obrazów.`);
}

await main();
