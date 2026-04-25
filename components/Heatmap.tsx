import { boxColor } from "@/lib/leitner";
import { cn } from "@/lib/utils";

type Fact = { a: number; b: number; box: number };

export function Heatmap({ facts }: { facts: Fact[] }) {
  const lookup = new Map<string, number>();
  for (const f of facts) lookup.set(`${f.a}-${f.b}`, f.box);

  const rows = Array.from({ length: 10 }, (_, i) => i + 1);
  const cols = Array.from({ length: 10 }, (_, i) => i + 1);

  return (
    <div className="overflow-x-auto">
      <table className="border-separate border-spacing-1">
        <thead>
          <tr>
            <th className="w-8 h-8" aria-hidden />
            {cols.map((c) => (
              <th
                key={c}
                className="w-8 h-8 text-xs text-muted-foreground font-medium"
              >
                {c}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((a) => (
            <tr key={a}>
              <th className="w-8 h-8 text-xs text-muted-foreground font-medium">
                {a}
              </th>
              {cols.map((b) => {
                const box = lookup.get(`${a}-${b}`) ?? 0;
                return (
                  <td
                    key={b}
                    title={`${a}×${b} = ${a * b} (låda ${box || "—"})`}
                    className={cn(
                      "w-8 h-8 rounded-md text-[10px] text-white/90 text-center align-middle",
                      box ? boxColor(box) : "bg-slate-200"
                    )}
                  >
                    {a * b}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
      <div className="flex items-center gap-2 text-xs text-muted-foreground mt-3">
        <span>Mästerskap:</span>
        <span className="inline-flex items-center gap-1">
          <span className="inline-block h-3 w-3 rounded bg-red-500" /> 1
        </span>
        <span className="inline-flex items-center gap-1">
          <span className="inline-block h-3 w-3 rounded bg-orange-400" /> 2
        </span>
        <span className="inline-flex items-center gap-1">
          <span className="inline-block h-3 w-3 rounded bg-yellow-400" /> 3
        </span>
        <span className="inline-flex items-center gap-1">
          <span className="inline-block h-3 w-3 rounded bg-lime-400" /> 4
        </span>
        <span className="inline-flex items-center gap-1">
          <span className="inline-block h-3 w-3 rounded bg-green-500" /> 5
        </span>
      </div>
    </div>
  );
}
