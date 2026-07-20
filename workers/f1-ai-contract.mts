export interface AiAnalysis {
  answer: string;
  facts: string[];
  inferences: string[];
  evidenceReferences: string[];
  confidence: number;
  assumptions: string[];
}

function stringList(value: unknown, maximumItems = 30, maximumLength = 500): value is string[] {
  return Array.isArray(value) && value.length <= maximumItems && value.every((item) => typeof item === "string" && item.length <= maximumLength);
}

export function validateAiAnalysis(value: unknown, allowedEvidence: Set<string>): AiAnalysis {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("AI provider returned an invalid evidence contract");
  const parsed = value as Partial<AiAnalysis>;
  if (
    typeof parsed.answer !== "string" ||
    !parsed.answer.trim() ||
    parsed.answer.length > 4000 ||
    !stringList(parsed.facts) ||
    !stringList(parsed.inferences) ||
    !stringList(parsed.evidenceReferences, 50, 160) ||
    !Number.isFinite(parsed.confidence) ||
    Number(parsed.confidence) < 0 ||
    Number(parsed.confidence) > 1 ||
    !stringList(parsed.assumptions)
  ) throw new Error("AI provider returned an invalid evidence contract");
  if (parsed.facts.length > 0 && parsed.evidenceReferences.length === 0) {
    throw new Error("AI answer contains unsupported factual claims");
  }
  const unknown = parsed.evidenceReferences.filter((reference) => !allowedEvidence.has(reference));
  if (unknown.length) throw new Error("AI answer cited evidence outside the verified race snapshot");
  return parsed as AiAnalysis;
}
