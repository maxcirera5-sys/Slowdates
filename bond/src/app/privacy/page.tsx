import { LegalPage } from '@/components/legal-page';

export const metadata = { title: 'Privacy · BOND' };

export default function PrivacyPage() {
  return (
    <LegalPage
      title="Privacy"
      intro="BOND is built to be private by default. Here is what we collect, why, and the control you keep."
      sections={[
        {
          heading: 'What we collect',
          body: 'Your profile details, photos, questionnaire answers, preferences and activity needed to make matches and arrange dates. We ask for explicit consent before generating your AI profile.',
        },
        {
          heading: 'What stays private',
          body: 'Your raw questionnaire answers are never shown to other users — only summarised compatibility insights are shared. Post-date feedback is private and never revealed to the other person.',
        },
        {
          heading: 'Location',
          body: 'We use approximate distance only. Your exact home location and address are never exposed to other users.',
        },
        {
          heading: 'AI processing',
          body: 'When an AI provider is configured, only permitted structured fields are sent to generate natural-language summaries and explanations. Compatibility scores are computed deterministically on our own servers.',
        },
        {
          heading: 'Your controls',
          body: 'You can edit your profile, regenerate your AI profile, pause discovery, block and report users, and delete your account at any time from Settings.',
        },
      ]}
    />
  );
}
