# Podręcznik Administratora Systemu — eSklep (GCUW) · Docusaurus

Ta sama dokumentacja co w `../docs` (Fumadocs), zbudowana na [Docusaurus](https://docusaurus.io) — do porównania obu rozwiązań.

## Uruchomienie

```bash
pnpm install
pnpm start
```

Aplikacja: http://localhost:3000. Wyszukiwarka (`@easyops-cn/docusaurus-search-local`) działa tylko w buildzie produkcyjnym:

```bash
pnpm build
pnpm serve
```

## Struktura

| Ścieżka | Opis |
| --- | --- |
| `docs/*.mdx` | Rozdziały podręcznika |
| `sidebars.ts` | Menu boczne (kolejność z `src/data/document.json`) |
| `static/img/podrecznik/` | Zrzuty ekranu wyciągnięte z DOCX |
| `src/data/document.json` | Tytuł, wersja i lista rozdziałów |
| `src/data/print-chapters.ts` | Importy wszystkich rozdziałów dla strony `/druk` (generowany) |
| `src/components/Access.tsx` | Komponent `<Access roles="..." />` — oznaczenie „Dostęp: …” |
| `src/theme/DocItem/Content` | Przyciski PDF nad każdym rozdziałem |
| `src/pages/druk.tsx` | Cały podręcznik na jednej stronie, przygotowany do druku / PDF |
| `i18n/pl/code.json` | Polskie teksty wyszukiwarki |

## Eksport do PDF

1. **Gotowy plik PDF** (numeracja stron, zakładki, klikalny spis treści):

   ```bash
   pnpm build
   pnpm pdf
   ```

   Plik trafia do `static/podrecznik.pdf` (wejdzie do kolejnych buildów) oraz do bieżącego
   `build/podrecznik.pdf`. Przycisk „Pobierz PDF” prowadzi pod `/podrecznik.pdf`.
   Skrypt używa lokalnego Chrome/Chromium (`CHROME_PATH`, aby wskazać inny).

2. **Wersja do druku** — `/druk` → „Drukuj / zapisz jako PDF”.

3. **Pojedynczy rozdział** — przycisk „Drukuj / PDF rozdziału” na każdej stronie.

Docusaurus generuje statyczną stronę, więc jeśli `static/podrecznik.pdf` nie istnieje, link „Pobierz PDF” zwróci 404.

## Aktualizacja treści z nowej wersji DOCX

```bash
pnpm convert "/ścieżka/do/Podręcznik Administratora Systemu GCUW wer. X.Y.Z.docx"
```

Konwersja nadpisuje `docs/`, `static/img/podrecznik/` i `src/data/`.
