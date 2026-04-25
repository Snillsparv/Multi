/**
 * Korta minnesregler för svåra fakta.
 * Returnerar en strängbeskrivning eller null.
 */
export function strategyFor(a: number, b: number): string | null {
  const [x, y] = a <= b ? [a, b] : [b, a];
  const key = `${x}x${y}`;

  const map: Record<string, string> = {
    "9x1": "9× = sänk första, höj andra till 9. T.ex. 9×1: 0 och 9 → 09.",
    "9x2": "9×2: sänk 2 till 1, höj till 9 → 18.",
    "9x3": "9×3: sänk 3 till 2, höj till 9 → 27.",
    "9x4": "9×4: sänk 4 till 3, höj till 9 → 36.",
    "9x5": "9×5: sänk 5 till 4, höj till 9 → 45.",
    "9x6": "9×6: sänk 6 till 5, höj till 9 → 54.",
    "9x7": "9×7: sänk 7 till 6, höj till 9 → 63.",
    "9x8": "9×8: sänk 8 till 7, höj till 9 → 72.",
    "9x9": "9×9 = 81. Tänk 10×9 − 9 = 81.",
    "9x10": "9×10 = 90.",
    "6x7": "6×7 = 42. 'Sex sju är fyrtitvå' — säg det högt.",
    "7x8": "7×8 = 56. Tänk 5, 6, 7, 8: 56 = 7×8.",
    "8x8": "8×8 = 64. 'Eight times eight fell on the floor, picked it up — sixty-four.'",
    "7x7": "7×7 = 49. En mindre än 50 (= 5×10).",
    "8x9": "8×9 = 72. Använd 9×-tricket: 8 → 7 och 2 → 72.",
    "6x8": "6×8 = 48. Tänk 6×4 = 24, fördubbla → 48.",
    "5x5": "5×5 = 25.",
    "11x11": "Inte i tabellerna, men kul: 121.",
  };

  return map[key] ?? doublingHint(x, y);
}

function doublingHint(x: number, y: number): string | null {
  if (x === 4) return `4×${y} = ${y}+${y}+${y}+${y}, eller dubbelt 2×${y}.`;
  if (x === 2) return `2×${y} = ${y} + ${y}.`;
  if (x === 5) return `5×${y} = halva av 10×${y} = ${10 * y / 2}.`;
  if (x === 10) return `10×${y} = ${y}0. Lägg en nolla.`;
  return null;
}
