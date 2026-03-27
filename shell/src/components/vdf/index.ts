/**
 * VDF Component Registry — maps component type strings to React components.
 * The recipe renderer uses this to look up which component to render for each slot.
 */

import type { ComponentType } from 'react';
import KpiCard from './kpi-card';
import DataTable from './data-table';
import Doughnut from './doughnut';
import StatRow from './stat-row';
import InsightCard from './insight-card';
import ChatPanel from './chat-panel';
import ProbabilityGauge from './probability-gauge';
import LineChart from './line-chart';
import SliderPanel from './slider-panel';
import Suggestion from './suggestion';
import Badge from './badge';
import BarChart from './bar-chart';
import Sparkline from './sparkline';
import Timeline from './timeline';
import ActionBar from './action-bar';
import FilterRow from './filter-row';
import Wizard from './wizard';
import ApprovalCard from './approval-card';
import BriefingPanel from './briefing-panel';
import FormInput from './form-input';
import Button from './button';
import Alert from './alert';
import Modal from './modal';

/* eslint-disable @typescript-eslint/no-explicit-any */
const VDF_COMPONENTS: Record<string, ComponentType<any>> = {
  'kpi-card': KpiCard,
  'data-table': DataTable,
  'doughnut': Doughnut,
  'stat-row': StatRow,
  'insight-card': InsightCard,
  'chat-panel': ChatPanel,
  'probability-gauge': ProbabilityGauge,
  'line-chart': LineChart,
  'slider-panel': SliderPanel,
  'suggestion': Suggestion,
  'badge': Badge,
  'bar-chart': BarChart,
  'sparkline': Sparkline,
  'timeline': Timeline,
  'action-bar': ActionBar,
  'filter-row': FilterRow,
  'wizard': Wizard,
  'approval-card': ApprovalCard,
  'briefing-panel': BriefingPanel,
  'form-input': FormInput,
  'button': Button,
  'alert': Alert,
  'modal': Modal,
};

export default VDF_COMPONENTS;
