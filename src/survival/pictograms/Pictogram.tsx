import { PICTOGRAMS } from "./catalog";

export function Pictogram({ id, className }: { id: string; className?: string }) {
  const spec = PICTOGRAMS[id];
  const label = spec?.label ?? "Unknown pictogram";
  return (
    <svg
      viewBox="0 0 24 24"
      role="img"
      aria-label={label}
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {spec ? (
        spec.paths.map((d) => <path key={d} d={d} />)
      ) : (
        <circle cx="12" cy="12" r="7" />
      )}
    </svg>
  );
}
