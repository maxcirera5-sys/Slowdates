import type { Question } from '@/lib/types';

/**
 * DEMO/SEED DATA — 36 compatibility questions across 8 categories.
 * Each question feeds exactly one deterministic engine dimension. Scale questions
 * carry a polarity so "strongly agree" can push a dimension up (+1) or down (-1).
 */
export const QUESTIONS: Question[] = [
  // ---- Personality (dimension: personality) ----
  { id: 'p1', category: 'personality', type: 'scale', dimension: 'personality', polarity: 1, prompt: 'I feel energised after spending time with a group of people.' },
  { id: 'p2', category: 'personality', type: 'scale', dimension: 'personality', polarity: 1, prompt: 'I enjoy trying things I have never done before.' },
  { id: 'p3', category: 'personality', type: 'scale', dimension: 'personality', polarity: -1, prompt: 'I prefer a predictable routine over spontaneity.' },
  { id: 'p4', category: 'personality', type: 'single', dimension: 'personality', prompt: 'A free Saturday is best spent…', options: [
    { value: 'social', label: 'Out with friends' },
    { value: 'quiet', label: 'A quiet day to recharge' },
    { value: 'adventure', label: 'An outdoor adventure' },
    { value: 'project', label: 'A personal project' },
  ] },
  { id: 'p5', category: 'personality', type: 'scale', dimension: 'personality', polarity: 1, prompt: 'I make decisions with my heart more than my head.' },
  { id: 'p6', category: 'personality', type: 'scale', dimension: 'personality', polarity: 1, prompt: 'I am usually the one who plans things for others.' },

  // ---- Values (dimension: values) ----
  { id: 'v1', category: 'values', type: 'ranked', dimension: 'values', prompt: 'Rank what matters most to you.', options: [
    { value: 'honesty', label: 'Honesty' },
    { value: 'growth', label: 'Personal growth' },
    { value: 'family', label: 'Family' },
    { value: 'freedom', label: 'Freedom' },
    { value: 'kindness', label: 'Kindness' },
  ] },
  { id: 'v2', category: 'values', type: 'scale', dimension: 'values', polarity: 1, prompt: 'Being honest matters more to me than keeping the peace.' },
  { id: 'v3', category: 'values', type: 'scale', dimension: 'values', polarity: 1, prompt: 'Giving back to my community is important to me.' },
  { id: 'v4', category: 'values', type: 'single', dimension: 'values', prompt: 'Money is mainly a tool for…', options: [
    { value: 'security', label: 'Security and stability' },
    { value: 'experiences', label: 'Experiences and travel' },
    { value: 'freedom', label: 'Independence' },
    { value: 'generosity', label: 'Helping people I love' },
  ] },
  { id: 'v5', category: 'values', type: 'scale', dimension: 'values', polarity: 1, prompt: 'Living sustainably influences my daily choices.' },

  // ---- Ambition (dimension: lifeGoals) ----
  { id: 'a1', category: 'ambition', type: 'scale', dimension: 'lifeGoals', polarity: 1, prompt: 'I have clear goals for the next five years.' },
  { id: 'a2', category: 'ambition', type: 'scale', dimension: 'lifeGoals', polarity: 1, prompt: 'My career is a central part of my identity.' },
  { id: 'a3', category: 'ambition', type: 'scale', dimension: 'lifeGoals', polarity: -1, prompt: 'I would happily trade ambition for a slower, simpler life.' },
  { id: 'a4', category: 'ambition', type: 'single', dimension: 'lifeGoals', prompt: 'Success to me looks most like…', options: [
    { value: 'impact', label: 'Making an impact' },
    { value: 'balance', label: 'A balanced, calm life' },
    { value: 'mastery', label: 'Mastering my craft' },
    { value: 'wealth', label: 'Financial freedom' },
  ] },
  { id: 'a5', category: 'ambition', type: 'scale', dimension: 'lifeGoals', polarity: 1, prompt: 'I am willing to relocate for the right opportunity.' },

  // ---- Communication (dimension: communication) ----
  { id: 'c1', category: 'communication', type: 'scale', dimension: 'communication', polarity: 1, prompt: 'I say what I feel directly rather than hinting.' },
  { id: 'c2', category: 'communication', type: 'scale', dimension: 'communication', polarity: 1, prompt: 'I like to talk through feelings soon after they come up.' },
  { id: 'c3', category: 'communication', type: 'scale', dimension: 'communication', polarity: -1, prompt: 'I need time alone to process before discussing something difficult.' },
  { id: 'c4', category: 'communication', type: 'single', dimension: 'communication', prompt: 'When something bothers me, I usually…', options: [
    { value: 'address', label: 'Bring it up right away' },
    { value: 'wait', label: 'Wait for a calm moment' },
    { value: 'write', label: 'Write my thoughts first' },
    { value: 'let_go', label: 'Often let small things go' },
  ] },
  { id: 'c5', category: 'communication', type: 'scale', dimension: 'communication', polarity: 1, prompt: 'Frequent check-ins during the day make me feel close.' },

  // ---- Conflict (dimension: communication) ----
  { id: 'k1', category: 'conflict', type: 'scenario', dimension: 'communication', prompt: 'A disagreement is heating up. You would rather…', options: [
    { value: 'pause', label: 'Take a short break, then talk' },
    { value: 'resolve_now', label: 'Resolve it fully before moving on' },
    { value: 'compromise', label: 'Find a quick middle ground' },
    { value: 'space', label: 'Give it a day to settle' },
  ] },
  { id: 'k2', category: 'conflict', type: 'scale', dimension: 'communication', polarity: 1, prompt: 'I find it easy to apologise first.' },
  { id: 'k3', category: 'conflict', type: 'scale', dimension: 'communication', polarity: -1, prompt: 'I tend to avoid conflict when I can.' },
  { id: 'k4', category: 'conflict', type: 'scale', dimension: 'communication', polarity: 1, prompt: 'I can stay calm and hear the other side during an argument.' },

  // ---- Lifestyle (dimension: lifestyle) ----
  { id: 'l1', category: 'lifestyle', type: 'scale', dimension: 'lifestyle', polarity: 1, prompt: 'I am an early riser.' },
  { id: 'l2', category: 'lifestyle', type: 'scale', dimension: 'lifestyle', polarity: 1, prompt: 'Regular exercise is part of my week.' },
  { id: 'l3', category: 'lifestyle', type: 'single', dimension: 'lifestyle', prompt: 'My ideal weekend pace is…', options: [
    { value: 'packed', label: 'Full of plans' },
    { value: 'mixed', label: 'A bit of both' },
    { value: 'slow', label: 'Slow and unstructured' },
  ] },
  { id: 'l4', category: 'lifestyle', type: 'single', dimension: 'lifestyle', prompt: 'Pets?', options: [
    { value: 'love', label: 'Love them, have/want them' },
    { value: 'fine', label: 'Happy around them' },
    { value: 'none', label: 'Prefer none' },
  ] },
  { id: 'l5', category: 'lifestyle', type: 'scale', dimension: 'lifestyle', polarity: 1, prompt: 'I enjoy cooking and eating well at home.' },

  // ---- Expectations (dimension: values) ----
  { id: 'e1', category: 'expectations', type: 'scale', dimension: 'values', polarity: 1, prompt: 'Independence within a relationship is important to me.' },
  { id: 'e2', category: 'expectations', type: 'scale', dimension: 'values', polarity: 1, prompt: 'I value shared rituals and traditions with a partner.' },
  { id: 'e3', category: 'expectations', type: 'single', dimension: 'values', prompt: 'In a partnership I most want a…', options: [
    { value: 'teammate', label: 'Teammate for life' },
    { value: 'anchor', label: 'Calm anchor' },
    { value: 'spark', label: 'Spark and adventure' },
    { value: 'grower', label: 'Someone who grows with me' },
  ] },

  // ---- Future (dimension: lifeGoals) ----
  { id: 'f1', category: 'future', type: 'single', dimension: 'lifeGoals', prompt: 'Children?', options: [
    { value: 'want', label: 'Want them' },
    { value: 'open', label: 'Open to it' },
    { value: 'dont', label: 'Prefer not' },
    { value: 'have', label: 'Already have' },
  ] },
  { id: 'f2', category: 'future', type: 'single', dimension: 'lifeGoals', prompt: 'Where do you see home in ten years?', options: [
    { value: 'city', label: 'A vibrant city' },
    { value: 'nature', label: 'Closer to nature' },
    { value: 'abroad', label: 'Somewhere abroad' },
    { value: 'roots', label: 'Near family roots' },
  ] },
  { id: 'f3', category: 'future', type: 'scale', dimension: 'lifeGoals', polarity: 1, prompt: 'I want a committed, long-term partnership.' },
];

export const QUESTION_COUNT = QUESTIONS.length;
