// Tests for the emergency (red-flag) rules in lib/symptoms/redFlags.ts, the
// safety-critical part of the symptom checker. Run with: npm test
// (Node's built-in test runner; Node 22.18+ can load the .ts file directly.)
import assert from "node:assert/strict";
import { test } from "node:test";
import { findRedFlags } from "../lib/symptoms/redFlags.ts";

const ids = (text) => findRedFlags(text).map((flag) => flag.id);

// Each must be stopped before the AI, with the 999 / 112 message.
const EMERGENCIES = [
  ["I have chest pain and my left arm feels numb", "chest_pain"],
  ["There's a tight feeling in my chest when I climb stairs", "chest_pain"],
  ["I think I'm having a heart attack", "chest_pain"],
  ["I can't breathe properly since this morning", "breathing"],
  ["Shortness of breath when lying down", "breathing"],
  ["My lips are turning blue", "breathing"],
  ["His face is turning grey", "breathing"],
  ["Her lips have gone blue", "breathing"],
  ["My lips are blue", "breathing"],
  ["I'm bleeding heavily after a cut and it won't stop", "bleeding"],
  ["I have been vomiting blood", "bleeding"],
  ["There is blood in my stool", "bleeding"],
  ["Suddenly my right arm went weak and my speech is slurred", "stroke"],
  ["One side of my face is drooping", "stroke"],
  ["My grandmother is confused and doesn't know where she is", "stroke"],
  ["This is the worst headache of my life", "stroke"],
  ["I fainted twice today", "fainting"],
  ["He passed out at work", "fainting"],
  ["My child had a seizure last night", "fainting"],
  ["I want to end my life", "suicide"],
  ["I keep thinking about suicide", "suicide"],
  ["Sometimes I want to hurt myself", "suicide"],
  ["I feel like everyone would be better off dead without me, I'm better off dead", "suicide"],
  // Curly apostrophes from phone keyboards.
  ["I can’t breathe", "breathing"],
];

// Mild problems AfyaLink is for: these must go on to the AI.
const NOT_EMERGENCIES = [
  "I have a sore throat and pain when swallowing for 2 days",
  "Itchy rash on my arms after using a new soap",
  "I feel stressed about exams and can't sleep well",
  "Runny nose, sneezing and a mild cough",
  "I'd like a doctor to explain my blood test results",
  "My back aches after sitting all day",
  // Body-map text: "aches" (head) and "chest" (cough) are in different
  // sentences, so this is not chest pain.
  "Head: I have body aches. Chest: I have a cough.",
];

for (const [text, expected] of EMERGENCIES) {
  test(`red flag (${expected}): "${text}"`, () => {
    assert.ok(ids(text).includes(expected), `expected ${expected}, got [${ids(text).join(", ")}]`);
  });
}

for (const text of NOT_EMERGENCIES) {
  test(`no red flag: "${text}"`, () => {
    assert.deepEqual(ids(text), []);
  });
}

test("upper case and extra spaces don't hide a red flag", () => {
  assert.ok(ids("CHEST   PAIN").includes("chest_pain"));
});
