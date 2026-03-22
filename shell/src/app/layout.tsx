import type { Metadata } from 'next';
import './globals.css';
import { ShellLayout } from '../components/shell-layout';
import { ShellConfigProvider } from '../lib/shell-config';

const productConfig = {
  product: {
    name: 'KI-Prime',
    tagline: 'Financial Planning for MFDs',
  },
  apiUrl: 'http://localhost:3001',
  auth: {
    customHeaders: {
      'X-Dev-Tenant-Id': 'a0000000-0000-0000-0000-000000000001',
      'X-Dev-User-Id': 'a0000000-0000-0000-0000-000000000002',
    },
  },
  recipes: [
    {
      recipe: 'client-list',
      label: 'Clients',
      route: '/client-list',
      skills: [{ skill: 'client-skill', function: 'get_clients' }],
    },
    {
      recipe: 'portfolio-view',
      label: 'Portfolio Overview',
      route: '/portfolio-view',
      skills: [
        { skill: 'portfolio-skill', function: 'get_holdings', params: { client_id: 1 } },
        { skill: 'portfolio-skill', function: 'get_allocation', params: { client_id: 1 } },
      ],
    },
    {
      recipe: 'client-360',
      label: 'Client 360',
      route: '/client-360',
      skills: [
        { skill: 'client-skill', function: 'get_client_profile', params: { client_id: 1 } },
        { skill: 'portfolio-skill', function: 'get_portfolio_summary', params: { client_id: 1 } },
      ],
    },
    {
      recipe: 'goal-dashboard',
      label: 'Financial Goals',
      route: '/goal-dashboard',
      skills: [{ skill: 'planning-skill', function: 'get_goals', params: { client_id: 1 } }],
    },
    {
      recipe: 'scheme-explorer',
      label: 'Scheme Explorer',
      route: '/scheme-explorer',
      skills: [{ skill: 'market-skill', function: 'search_schemes' }],
    },
    { recipe: 'daily-briefing', label: 'VaNi Command Center', route: '/daily-briefing', skills: [] },
    { recipe: 'goal-deep-dive', label: 'Goal Analysis', route: '/goal-deep-dive', skills: [] },
    { recipe: 'planning-playground', label: 'Planning Playground', route: '/planning-playground', skills: [] },
    { recipe: 'plan-vs-reality', label: 'Plan vs Reality', route: '/plan-vs-reality', skills: [] },
  ],
};

export const metadata: Metadata = {
  title: 'KI-Prime',
  description: 'Financial Planning for MFDs',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" data-theme="ocean-blue">
      <body className="antialiased">
        <ShellConfigProvider config={productConfig}>
          <ShellLayout>{children}</ShellLayout>
        </ShellConfigProvider>
      </body>
    </html>
  );
}