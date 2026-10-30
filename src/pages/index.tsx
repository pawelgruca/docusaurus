import type {ReactNode} from 'react';
import Link from '@docusaurus/Link';
import Layout from '@theme/Layout';
import documentInfo from '@site/src/data/document.json';
import styles from './home.module.css';

export default function Home(): ReactNode {
  return (
    <Layout title="Strona główna" description={`${documentInfo.title} ${documentInfo.subtitle}`}>
      <main className={styles.home}>
        <section className={styles.hero}>
          <p className={styles.version}>Wersja {documentInfo.version}</p>
          <h1>{documentInfo.title}</h1>
          <p className={styles.subtitle}>{documentInfo.subtitle}</p>
          <div className={styles.actions}>
            <Link className="button button--primary" to="/docs">
              Czytaj podręcznik
            </Link>
            <Link className="button button--secondary" href="pathname:///podrecznik.pdf">
              Pobierz PDF
            </Link>
            <Link className="button button--secondary" to="/druk">
              Wersja do druku
            </Link>
          </div>
        </section>

        <section>
          <h2>Rozdziały</h2>
          <ol className={styles.chapters}>
            {documentInfo.chapters.map((chapter) => (
              <li key={chapter.slug}>
                <Link to={`/docs/${chapter.slug}`} className={styles.chapter}>
                  {chapter.title}
                </Link>
              </li>
            ))}
          </ol>
        </section>
      </main>
    </Layout>
  );
}
