// One list of specialties for the whole app: doctor registration, the symptom
// checker's suggestion and doctor search all use these values.
export const SPECIALTIES = [
  { value: "general_practice", label: "General practitioner" },
  { value: "dermatology", label: "Dermatologist" },
  { value: "psychiatry", label: "Psychiatrist" },
  { value: "psychology", label: "Counselling psychologist" },
  { value: "paediatrics", label: "Paediatrician" },
  { value: "gynaecology", label: "Obstetrician / gynaecologist" },
  { value: "ent", label: "Ear, nose & throat specialist" },
];

export const SPECIALTY_VALUES = SPECIALTIES.map((s) => s.value);
