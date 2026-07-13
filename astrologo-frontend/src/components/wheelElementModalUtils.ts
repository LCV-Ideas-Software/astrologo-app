export const MAX_WHEEL_MODAL_FACTS = 5;

export const visibleWheelModalFacts = (facts: readonly string[]): readonly string[] =>
  facts.slice(0, MAX_WHEEL_MODAL_FACTS);
