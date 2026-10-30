import type {ReactNode} from 'react';
import Content from '@theme-original/DocItem/Content';
import type ContentType from '@theme/DocItem/Content';
import type {WrapperProps} from '@docusaurus/types';
import PrintButton from '@site/src/components/PrintButton';

type Props = WrapperProps<typeof ContentType>;

export default function ContentWrapper(props: Props): ReactNode {
  return (
    <>
      <div className="doc-actions print-hidden">
        <PrintButton>Drukuj / PDF rozdziału</PrintButton>
        <a className="button button--secondary button--sm" href="/podrecznik.pdf">
          ⬇ Cały podręcznik (PDF)
        </a>
      </div>
      <Content {...props} />
    </>
  );
}
