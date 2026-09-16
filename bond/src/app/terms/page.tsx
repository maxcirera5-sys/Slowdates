import { LegalPage } from '@/components/legal-page';

export const metadata = { title: 'Terms · BOND' };

export default function TermsPage() {
  return (
    <LegalPage
      title="Terms of Use"
      intro="By using BOND you agree to these terms. They are written to keep the community safe and respectful."
      sections={[
        {
          heading: 'Eligibility',
          body: 'You must be at least 18 years old to use BOND. Accounts found to belong to minors are removed.',
        },
        {
          heading: 'Respectful use',
          body: 'Treat other members with respect. Harassment, hate speech, impersonation and sharing others’ private information are not allowed.',
        },
        {
          heading: 'Your content',
          body: 'You are responsible for the photos and information you upload. Do not post content you do not have the right to share.',
        },
        {
          heading: 'AI features',
          body: 'BOND’s compatibility profile is a dating aid, not a psychological diagnosis or a guarantee of a successful relationship.',
        },
        {
          heading: 'Meeting in person',
          body: 'BOND helps you arrange dates but does not vet individuals. Always follow the safety guidance and use your own judgement.',
        },
      ]}
    />
  );
}
