// Hard-coded emergency rules. They run BEFORE the AI and whatever the AI
// says: if any rule matches, the patient is told to go to hospital or call
// 999 / 112, and no booking is offered.
//
// They err on the side of caution: "no chest pain" also matches "chest pain".
// Sending someone to hospital who didn't need it is much safer than missing
// an emergency.

export type RedFlag = { id: string; label: string };

const RULES: { id: string; label: string; patterns: RegExp[] }[] = [
  {
    id: "chest_pain",
    label: "Chest pain or pressure",
    patterns: [
      /chest\s*(pain|pains|tight\w*|pressure|hurts?|ache|aching|discomfort)/,
      // e.g. "a tight feeling in my chest": the words may be a few apart
      /(pain|tight|pressure|heav|squeez|ache|hurt|burn)\w*\b.{0,25}\bchest/,
      /heart\s*attack/,
    ],
  },
  {
    id: "breathing",
    label: "Trouble breathing",
    patterns: [
      /(can'?t|cannot|can not|hard to|difficult\w* (to )?|trouble|struggl\w* to|unable to)\s*breath/,
      /short(ness)?\s+of\s+breath/,
      /breathless|gasping|choking|suffocat/,
      /(lips|face) (are |is |turning )?(blue|grey|gray)/,
    ],
  },
  {
    id: "bleeding",
    label: "Heavy bleeding",
    patterns: [
      /(heavy|heavily|severe|a lot of|lots of|uncontrolled|non-?stop)\s+bleed/,
      /bleed\w*\s+(heavily|a lot|badly|won'?t stop|will not stop|that won'?t stop|nonstop|non-stop)/,
      /(won'?t|will not|can'?t|cannot) stop bleed/,
      /(vomit\w*|cough\w*( up)?|throw\w* up)\s+blood/,
      /blood (in|from) (my )?(vomit|stool|poo)/,
    ],
  },
  {
    id: "stroke",
    label: "Sudden weakness, numbness or confusion",
    patterns: [
      // e.g. "suddenly my left arm went weak"
      /sudden\w*\b.{0,40}\b(weak|numb|confus|paralys|slurr|can'?t (speak|talk|move|see))/,
      /(face|mouth) (is )?(droop|drooping|twisted)/,
      /slurr\w* (speech|words)/,
      /(one side|half) of (my |the )?(body|face)/,
      /\b(confused|disoriented|disorientated)\b/,
      /worst headache/,
    ],
  },
  {
    id: "fainting",
    label: "Fainting, seizures or loss of consciousness",
    patterns: [
      /\bfaint(ed|ing|s)?\b/,
      /passed out|blacked out|black out|lost consciousness|losing consciousness|unconscious/,
      /seizure|convuls|fits\b/,
    ],
  },
  {
    id: "suicide",
    label: "Thoughts of suicide or self-harm",
    patterns: [
      /suicid/,
      /kill (my ?self|me)/,
      /(end|take) (my|my own) life/,
      /(want|wanting|wish) to die/,
      /self[- ]?harm|harm(ing)? my ?self|hurt(ing)? my ?self|cut(ting)? my ?self/,
      /no (reason|point) (to|in) liv/,
      /better off dead/,
    ],
  },
];

// Returns every rule the text matches (empty list = no red flags).
export function findRedFlags(symptoms: string): RedFlag[] {
  const text = symptoms.toLowerCase().replace(/[’‘]/g, "'").replace(/\s+/g, " ");
  return RULES.filter((rule) => rule.patterns.some((p) => p.test(text))).map(({ id, label }) => ({ id, label }));
}
