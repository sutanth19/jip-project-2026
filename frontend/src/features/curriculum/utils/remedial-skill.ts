export type RemedialSkillOption = {
  id: string;
  programmeId: string;
  code: string;
  sequence: number;
  name: string;
  description: string | null;
  status: string;
};

export function remedialSkillOptionLabel(skill: Pick<RemedialSkillOption, "code" | "name">): string {
  return `${skill.code} \u00b7 ${skill.name}`;
}
