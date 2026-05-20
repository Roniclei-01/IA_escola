const CHOICE_LABEL_PREFIX_PATTERN =
  /^(?:(?:alternativa|op[cç][aã]o|alternative|option|resposta|answer)\s+)?[a-d]\s*[\).:\-–]\s*(.+)$/i;

export function stripMultipleChoiceLabelPrefix(choice: string): string {
  const trimmedChoice = choice.trim();
  const match = trimmedChoice.match(CHOICE_LABEL_PREFIX_PATTERN);
  const strippedChoice = match?.[1]?.trim();

  return strippedChoice && strippedChoice.length > 0 ? strippedChoice : trimmedChoice;
}

export function normalizeMultipleChoiceChoices(choices: string[]): string[] {
  return choices.map(stripMultipleChoiceLabelPrefix);
}
