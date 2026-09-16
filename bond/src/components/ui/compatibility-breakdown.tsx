import type { CategoryScores } from '@/lib/types';
import { DIMENSION_WEIGHTS } from '@/lib/types';
import { TraitBar } from './trait-bar';

const LABELS: Record<keyof CategoryScores, string> = {
  personality: 'Personality',
  values: 'Values',
  lifeGoals: 'Life goals',
  communication: 'Communication',
  lifestyle: 'Lifestyle',
};

const ORDER: (keyof CategoryScores)[] = [
  'personality',
  'values',
  'lifeGoals',
  'communication',
  'lifestyle',
];

export function CompatibilityBreakdown({
  categories,
  showWeights = false,
}: {
  categories: CategoryScores;
  showWeights?: boolean;
}) {
  return (
    <div className="space-y-3">
      {ORDER.map((key) => (
        <div key={key}>
          <TraitBar label={LABELS[key]} value={categories[key]} />
          {showWeights ? (
            <p className="mt-0.5 pl-[7.5rem] text-xs text-muted-foreground">
              weight {Math.round(DIMENSION_WEIGHTS[key] * 100)}%
            </p>
          ) : null}
        </div>
      ))}
    </div>
  );
}
