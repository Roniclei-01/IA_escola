import { describe, expect, it } from "vitest";
import {
  normalizeMultipleChoiceChoices,
  stripMultipleChoiceLabelPrefix
} from "./study-card-formatting";

describe("study card formatting", () => {
  it("removes redundant multiple choice labels from option text", () => {
    expect(stripMultipleChoiceLabelPrefix("Alternativa A: Protocolo TCP")).toBe(
      "Protocolo TCP"
    );
    expect(stripMultipleChoiceLabelPrefix("Opção B - Protocolo UDP")).toBe(
      "Protocolo UDP"
    );
    expect(stripMultipleChoiceLabelPrefix("C) Protocolo ARP")).toBe("Protocolo ARP");
    expect(stripMultipleChoiceLabelPrefix("D. Protocolo ICMP")).toBe("Protocolo ICMP");
  });

  it("keeps normal answers that only start with a letter", () => {
    expect(stripMultipleChoiceLabelPrefix("A solução usa VLANs")).toBe(
      "A solução usa VLANs"
    );
  });

  it("normalizes all choices in a card", () => {
    expect(
      normalizeMultipleChoiceChoices([
        "Alternativa A: TCP",
        "Alternativa B: UDP",
        "Alternativa C: ARP",
        "Alternativa D: ICMP"
      ])
    ).toEqual(["TCP", "UDP", "ARP", "ICMP"]);
  });
});
