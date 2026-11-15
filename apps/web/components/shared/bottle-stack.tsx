import type { CSSProperties } from "react";
import "./bottle-stack.css";
export default function BottleStack({
  quantity,
  small = false,
}: {
  quantity: number;
  small?: boolean;
}) {
  return (
    <div
      className={`pack-stack${small ? " pack-stack--small" : ""}`}
      aria-label={`${quantity} flacon${quantity > 1 ? "s" : ""}`}
    >
      {[
        [0, 0, 1],
        [-1, -8, 0.9],
        [1, 8, 0.9],
        [-1.7, -12, 0.8],
        [1.7, 12, 0.8],
      ].map(([x, turn, scale], i) => (
        <img
          key={i}
          src={`/images/solavia/purchase/${small ? "product-small" : "product"}.webp`}
          alt=""
          loading={i===0?"eager":"lazy"}
          width={449}
          height={880}
          data-visible={i < Math.min(5, quantity)}
          style={
            {
              "--x": x,
              "--turn": `${turn}deg`,
              "--scale": scale,
              zIndex: 5 - i,
            } as CSSProperties
          }
        />
      ))}
    </div>
  );
}
