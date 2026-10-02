export type Scenario = {
  id: string;
  seed: number;
  title: string;
  lesson: string;
};

export const SCENARIOS: readonly Scenario[] = [
  {
    id: "dead-side",
    seed: 8,
    title: "Dead side, stacked side",
    lesson:
      "Green wedges are quiet, red ones are not. A dead side buys a refresh. It is still a bet: if you finish outside the dashed circle, the next pull makes that whole side run at once.",
  },
  {
    id: "surge",
    seed: 14,
    title: "Surge tags",
    lesson:
      "From zone 3 the lobby can be big enough for surge. If you have no damage, a tag is the call. A full fight in the red wedge gets third-partied.",
  },
  {
    id: "moving",
    seed: 27,
    title: "Moving zone",
    lesson:
      "Endgame circles move. Early means you walk while the old zone is still safe. Late means you farm while the storm is already closing on your side.",
  },
  {
    id: "center",
    seed: 5,
    title: "Center is not free",
    lesson:
      "Center shortens the next rotate and gives every team an angle. Take it when the lobby is spread. If the wedges around you are red, hold an edge.",
  },
];

export function scenarioById(id: string | null): Scenario | null {
  if (!id) return null;
  return SCENARIOS.find((scenario) => scenario.id === id) ?? null;
}
