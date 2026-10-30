import type {ComponentProps, ReactNode} from 'react';
import {MDXProvider} from '@mdx-js/react';
import Link from '@docusaurus/Link';
import Layout from '@theme/Layout';
import MDXContent from '@theme/MDXContent';
import PrintButton from '@site/src/components/PrintButton';
import documentInfo from '@site/src/data/document.json';
import {FrontPage, printChapters} from '@site/src/data/print-chapters';

const DOCS_LINK_PATTERN = /^\/docs\/([^#]+)(?:#(.+))?$/;

function chapterAnchor(slug: string) {
  return `rozdzial-${slug}`;
}

function toDocumentAnchor(href: string | undefined) {
  const match = href?.match(DOCS_LINK_PATTERN);

  if (!match) {
    return href;
  }

  const [, slug, headingId] = match;

  return `#${headingId ?? chapterAnchor(slug)}`;
}

function PrintLink({href, ...props}: ComponentProps<'a'>) {
  return <a href={toDocumentAnchor(href)} {...props} />;
}

function PrintImage(props: ComponentProps<'img'>) {
  return <img {...props} loading="eager" decoding="sync" />;
}

const printComponents = {a: PrintLink, img: PrintImage};

function PrintMdx({children}: {children: ReactNode}) {
  return (
    <MDXContent>
      <MDXProvider components={printComponents}>{children}</MDXProvider>
    </MDXContent>
  );
}

export default function PrintPage(): ReactNode {
  return (
    <Layout title="Wersja do druku" noFooter>
      <div className="print-document">
        <div className="print-toolbar print-hidden">
          <Link to="/docs">← Wróć do podręcznika</Link>
          <span>Wybierz „Zapisz jako PDF” w oknie drukowania, aby wyeksportować cały podręcznik.</span>
          <PrintButton>Drukuj / zapisz jako PDF</PrintButton>
        </div>

        <section className="print-cover">
          <p className="print-cover__eyebrow">Platforma eSklep · GCUW</p>
          <h1>{documentInfo.title}</h1>
          <p className="print-cover__subtitle">{documentInfo.subtitle}</p>
          <p>Wersja dokumentu: {documentInfo.version}</p>
        </section>

        <article className="markdown print-chapter">
          <PrintMdx>
            <FrontPage />
          </PrintMdx>
        </article>

        <nav className="print-chapter print-toc">
          <h2>Spis treści</h2>
          <ol>
            {printChapters.map((chapter) => (
              <li key={chapter.slug}>
                <a href={`#${chapterAnchor(chapter.slug)}`}>{chapter.title}</a>
              </li>
            ))}
          </ol>
        </nav>

        {printChapters.map(({slug, title, Content}) => (
          <article key={slug} id={chapterAnchor(slug)} className="markdown print-chapter">
            <h1>{title}</h1>
            <PrintMdx>
              <Content />
            </PrintMdx>
          </article>
        ))}
      </div>
    </Layout>
  );
}
