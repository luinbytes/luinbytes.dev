import { useEffect } from "react";
import { Skeleton } from "skullet/react";
import "skullet/styles.css";

type SkulletOverlayProps = {
  label: string;
  className: string;
  blockClassName: string;
  radius?: string;
  inset?: string;
  onReady: () => void;
};

export default function SkulletOverlay({
  label,
  className,
  blockClassName,
  radius,
  inset,
  onReady,
}: SkulletOverlayProps) {
  useEffect(() => {
    onReady();
  }, [onReady]);

  return (
    <Skeleton loading label={label} className={className}>
      <span
        {...{ "skullet-block": "" }}
        className={blockClassName}
        style={{
          ...(radius ? { borderRadius: radius } : {}),
          ...(inset ? { inset } : {}),
        }}
      />
    </Skeleton>
  );
}
