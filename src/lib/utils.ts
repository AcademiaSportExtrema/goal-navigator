import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const NIVEL_NOMES: Record<number, string> = {
  1: 'Ferro',
  2: 'Bronze',
  3: 'Prata',
  4: 'Ouro',
  5: 'Diamante',
};

export function getNivelNome(nivel: number): string {
  return NIVEL_NOMES[nivel] || `Nível ${nivel}`;
}
