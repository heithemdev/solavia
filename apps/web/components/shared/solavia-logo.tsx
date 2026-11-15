import { useId } from "react";
export default function SolaviaLogo({
  className = "",
  dark = false,
}: {
  className?: string;
  dark?: boolean;
}) {
  const id = `solavia-logo-${useId().replace(/:/g, "")}`;
  return (
    <svg
      viewBox="230 220 620 220"
      role="img"
      aria-label="Solavia"
      className={className}
    >
      <defs>
        <filter id={id} colorInterpolationFilters="sRGB">
          <feColorMatrix
            type="matrix"
            values={
              dark
                ? "0 0 0 0 0.09  0 0 0 0 0.231  0 0 0 0 0.169  1.2 0 0 0 -0.2"
                : "1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  1.2 0 0 0 -0.2"
            }
          />
        </filter>
      </defs>
      <image
        href="/images/solavia/logo-source.webp"
        width="1067"
        height="683"
        filter={`url(#${id})`}
      />
    </svg>
  );
}
