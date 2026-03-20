export { default as Dashboard3Row } from './dashboard-3row';
export { default as DetailSidebar } from './detail-sidebar';
export { default as ListDetail } from './list-detail';
export { default as Briefing } from './briefing';
export { default as Comparison } from './comparison';
export { default as WizardFlow } from './wizard-flow';

import type { ComponentType, ReactNode } from 'react';
import Dashboard3Row from './dashboard-3row';
import DetailSidebar from './detail-sidebar';
import ListDetail from './list-detail';
import Briefing from './briefing';
import Comparison from './comparison';
import WizardFlow from './wizard-flow';

export interface LayoutProps {
  children: ReactNode[];
}

const LAYOUT_MAP: Record<string, ComponentType<LayoutProps>> = {
  'dashboard-3row': Dashboard3Row,
  'detail-sidebar': DetailSidebar,
  'list-detail': ListDetail,
  'briefing': Briefing,
  'comparison': Comparison,
  'wizard-flow': WizardFlow,
};

export default LAYOUT_MAP;
