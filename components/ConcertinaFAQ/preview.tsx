import '@fontsource/bricolage-grotesque/400.css';
import '@fontsource/bricolage-grotesque/600.css';
import '@fontsource/bricolage-grotesque/700.css';
import { useMemo } from 'react';
import ConcertinaFAQ from './Component';
import type { ConcertinaFAQProps } from './Component';

const worst: ConcertinaFAQProps = {
  allowMultipleOpen: true,
  questions: [
    {
      question:
        'What happens to the deposit, the delivery schedule and the cancellation terms if my event date moves after the contract has been signed?',
      answer:
        'Nothing is lost. A date change made more than thirty days before the event carries over the full deposit at no charge, and we hold your original slot for fourteen days while we find a new one. Inside thirty days we move the booking where the calendar allows and pass on only the costs we cannot recover from suppliers, itemised line by line so you can see every figure. Cancellations follow the same schedule, with the deposit credited against a future date for up to eighteen months. Please note that seasonal peaks, public holidays and venue closures can shorten these windows, and we always confirm the exact terms in writing before anything changes.',
    },
    { question: 'Do you cater for dietary requirements?', answer: 'Yes.' },
    {
      question: 'Is there step-free access, parking and a quiet room for guests who need a break?',
      answer:
        'All three. The main hall, restrooms and garden terrace are step-free, there are twelve accessible bays beside the entrance, and the first-floor library is kept as a quiet room throughout every event.',
    },
    {
      question: 'Can we bring our own photographer, florist, musicians and decorators?',
      answer:
        'Of course. We only ask that outside suppliers share their insurance certificate a week ahead and arrive during the load-in window we agree together, so setup stays calm for everyone.',
    },
    {
      question: 'Who do I speak to on the day itself?',
      answer:
        'Your named coordinator stays on site from the first delivery to the last guest, with a direct mobile number for you and one person you nominate.',
    },
    {
      question: 'How far ahead should we book for a summer weekend?',
      answer:
        'Saturdays between June and September usually go twelve to eighteen months ahead. Midweek and Sunday dates are far more flexible and often available within three months.',
    },
    {
      question: 'Do you offer tastings before we choose a menu?',
      answer:
        'Every confirmed booking includes a tasting for up to four people, scheduled in the kitchen about eight weeks before the event.',
    },
    {
      question: 'What is the latest the music can run?',
      answer:
        'Amplified music finishes at midnight; acoustic sets and quiet conversation are welcome until one in the morning.',
    },
    {
      question: 'Are children welcome, and is there anything for them?',
      answer:
        'Children are very welcome. We can set up a supervised craft table, a separate early supper and a quiet corner with beanbags and books.',
    },
    {
      question: 'Can the space be hired for an evening workshop or a small launch?',
      answer:
        'Yes, the library and garden terrace can be booked on their own for groups of up to forty, with simple catering available.',
    },
    {
      question: 'How do I pay, and when is the balance due?',
      answer:
        'A quarter of the total secures your date. The balance is due four weeks before the event, by bank transfer or card, and we send a reminder two weeks ahead.',
    },
    {
      question: 'Where can I read the full terms and conditions?',
      answer:
        'The complete terms are sent with your quote and again with the contract, and we are happy to talk through any clause by phone.',
    },
  ],
};

const stage = {
  minHeight: '100vh',
  boxSizing: 'border-box' as const,
  padding: 'clamp(16px, 4vw, 56px)',
  background: 'linear-gradient(180deg, #dfe6e5 0%, #e9eceb 100%)',
};

export default function Preview() {
  const params = useMemo(() => new URLSearchParams(typeof window === 'undefined' ? '' : window.location.search), []);
  const isWorst = params.get('worst') === '1';

  return (
    <div style={stage}>
      <div style={{ width: '100%', maxWidth: 1200, marginInline: 'auto' }}>
        <ConcertinaFAQ {...(isWorst ? worst : {})} />
      </div>
    </div>
  );
}
