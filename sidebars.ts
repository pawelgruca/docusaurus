import type {SidebarsConfig} from '@docusaurus/plugin-content-docs';
import documentInfo from './src/data/document.json';

const sidebars: SidebarsConfig = {
  manualSidebar: [
    'index',
    {
      type: 'category',
      label: 'Rozdziały',
      collapsible: false,
      items: documentInfo.chapters.map((chapter) => chapter.slug),
    },
  ],
};

export default sidebars;
