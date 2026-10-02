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
    title: "Quiet side, crowded side",
    lesson:
      "Green slices have few teams (a dead side). Red slices have lots (stacked). A quiet side gives you time to heal and farm. But it's a bet: if the next zone goes the other way, that whole side has to run at once.",
  },
  {
    id: "surge",
    seed: 14,
    title: "Beat surge with a tag",
    lesson:
      "From zone 3, surge hurts the teams that did the least damage. If you have no damage, hit a team and leave (a tag). A full fight in a crowded spot brings in other teams.",
  },
  {
    id: "moving",
    seed: 27,
    title: "Moving zones and deep pulls",
    lesson:
      "From zone 7 the circle moves, and it can even leave the old circle. Half and half means half the new circle is in the storm. Go early on those, while the old circle is still safe.",
  },
  {
    id: "center",
    seed: 5,
    title: "The middle isn't free",
    lesson:
      "The middle is close to every next zone, but every team can see you. Take it when teams are spread out. If the slices around you are red, stay near an edge instead.",
  },
];

export function scenarioById(id: string | null): Scenario | null {
  if (!id) return null;
  return SCENARIOS.find((scenario) => scenario.id === id) ?? null;
}
