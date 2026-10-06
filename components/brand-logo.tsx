const LOGO_RATIO = 600 / 329;

export function BrandLogo({ height = 44, className = "" }: { height?: number; className?: string }) {
  return (
    <span className={`brand-plate ${className}`}>
      <img
        src="/brand/logolim.png"
        alt="LingkarIDE Manajemen"
        width={Math.round(height * LOGO_RATIO)}
        height={height}
        draggable={false}
        className="block"
        style={{ height, width: "auto" }}
      />
    </span>
  );
}
