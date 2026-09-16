import { LegalPage } from '@/components/legal-page';

export const metadata = { title: 'Safety · BOND' };

export default function SafetyPage() {
  return (
    <LegalPage
      title="Dating safely"
      intro="Meeting someone new should feel exciting and safe. A few simple habits go a long way."
      sections={[
        {
          heading: 'Meet in public first',
          body: 'For a first date, choose a public place like the café, bar or restaurant BOND suggests. Stay in public until you feel comfortable.',
        },
        {
          heading: 'Tell someone your plans',
          body: 'Let a friend know where you are going and when. Share your live location with them if you can.',
        },
        {
          heading: 'Look after yourself',
          body: 'Arrange your own transport there and back, keep an eye on your drink, and trust your instincts. It is always okay to leave.',
        },
        {
          heading: 'Report and block',
          body: 'If someone makes you uncomfortable, use Report or Block from their profile or the date screen. Reports are private and help keep BOND safe.',
        },
        {
          heading: 'Your privacy',
          body: 'BOND shows approximate distance only and never reveals your home address. Avoid sharing personal contact details until you are ready.',
        },
      ]}
    />
  );
}
