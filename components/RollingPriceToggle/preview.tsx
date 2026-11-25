import '@fontsource/bricolage-grotesque/400.css';
import '@fontsource/manrope/400.css';
import '@fontsource/manrope/600.css';
import '@fontsource/manrope/700.css';
import '@fontsource/manrope/800.css';
import { useMemo } from 'react';
import RollingPriceToggle from './Component';
import type { RollingPriceOption } from './Component';

const worstOptions: RollingPriceOption[] = [
  {
    label: 'Pay as you go, billed every month',
    price: 9.5,
    period: 'per month, billed monthly with no long term commitment',
    saving: '',
    features: [
      'Everyday current account with no minimum balance and no monthly maintenance fee whatsoever',
      'Round-up savings pot',
      'Free cash withdrawals at any partner machine in the country',
      'Card payments abroad',
      'Monthly statements',
    ].join('\n'),
  },
  {
    label: 'Quarterly instalments',
    price: 1249.99,
    period: 'per quarter, billed every three months',
    saving: 'Save $1,000,000.00 compared with paying monthly for a whole decade',
    features: [
      'Everyday current account with no minimum balance and no monthly maintenance fee whatsoever',
      'Round-up savings pot',
      'Card payments abroad',
      'Free cash withdrawals at any partner machine in the country',
      'Monthly statements',
      'Spending insights and category budgets',
      'Joint account for up to four family members',
      'Dedicated relationship manager',
    ].join('\n'),
  },
  {
    label: 'Yearly, paid up front',
    price: 12499.99,
    period: 'per year',
    saving: 'Save 20%',
    features: [
      'Boosted savings rate on balances up to the first one hundred thousand',
      'Card payments abroad',
      'Round-up savings pot',
      'Everyday current account with no minimum balance and no monthly maintenance fee whatsoever',
      'Free cash withdrawals at any partner machine in the country',
      'Priority phone support, answered by a named person within two minutes',
      'Spending insights and category budgets',
      'Joint account for up to four family members',
      'Dedicated relationship manager',
      'Travel insurance for the whole household',
      'Early access to new savings products',
      'Annual financial health check',
    ].join('\n'),
  },
  {
    label: 'Every two years',
    price: 3,
    period: 'per day',
    saving: 'Save $5',
    features: 'Everyday current account\nRound-up savings pot',
  },
];

const stage = {
  minHeight: '100vh',
  boxSizing: 'border-box' as const,
  display: 'grid',
  placeItems: 'center',
  padding: 'clamp(16px, 4vw, 56px)',
  background: 'linear-gradient(180deg, #dfe9e4 0%, #eef2ee 100%)',
};

export default function Preview() {
  const params = useMemo(() => new URLSearchParams(typeof window === 'undefined' ? '' : window.location.search), []);
  const isWorst = params.get('worst') === '1';

  return (
    <div style={stage}>
      <div style={{ width: '100%', maxWidth: 1200 }}>
        <RollingPriceToggle {...(isWorst ? { options: worstOptions, currency: 'CHF ' } : {})} />
      </div>
    </div>
  );
}
