import { AdoptableCat } from './adoption.models';

export function adoptableCatSexLabel(sex: AdoptableCat['sex']): string {
  return sex === 'FEMALE' ? 'Hembra' : 'Macho';
}

export function adoptableCatAgeLabel(birthDate: string | null, now = new Date()): string {
  if (!birthDate) return 'Edad a confirmar';
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(birthDate);
  if (!match) return 'Edad a confirmar';

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  if (month < 1 || month > 12 || day < 1 || day > 31) return 'Edad a confirmar';

  let months = (now.getFullYear() - year) * 12 + (now.getMonth() + 1 - month);
  if (now.getDate() < day) months -= 1;
  if (months < 0) return 'Edad a confirmar';
  if (months === 0) return 'Menos de 1 mes';
  if (months < 12) return `${months} ${months === 1 ? 'mes' : 'meses'}`;

  const years = Math.floor(months / 12);
  return `${years} ${years === 1 ? 'año' : 'años'}`;
}
