import type {ReactNode} from 'react';

export default function PrintButton({children}: {children: ReactNode}): ReactNode {
  return (
    <button type="button" className="button button--secondary button--sm print-hidden" onClick={() => window.print()}>
      🖨 {children}
    </button>
  );
}
