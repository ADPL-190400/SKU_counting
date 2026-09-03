import { useEffect, useRef, useState } from "react";
import { naturalToDisplay } from "../lib/roi";
import type { Roi } from "../types";

interface Props {
  imgRef: React.RefObject<HTMLImageElement | null>;
  roi: Roi | null;
}

/**
 * Ve 1 khung net dut mo len tren <img> dang hien (live stream hoac anh
 * dong bang) the hien vung ROI dang duoc dung de crop truoc khi chay SAM2.
 * Chi hien thi - khong tuong tac (xem RoiSelector cho phan ve/chinh ROI).
 */
export function RoiOverlay({ imgRef, roi }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [style, setStyle] = useState<React.CSSProperties | null>(null);

  useEffect(() => {
    if (!roi) {
      setStyle(null);
      return;
    }

    function recompute() {
      const img = imgRef.current;
      const container = containerRef.current;
      if (!img || !container || !roi || !img.naturalWidth) {
        setStyle(null);
        return;
      }
      const display = naturalToDisplay(roi, img);
      const containerBox = container.getBoundingClientRect();
      setStyle({
        left: display.left - containerBox.left,
        top: display.top - containerBox.top,
        width: display.width,
        height: display.height,
      });
    }

    recompute();

    const img = imgRef.current;
    img?.addEventListener("load", recompute);
    window.addEventListener("resize", recompute);

    let observer: ResizeObserver | null = null;
    if (containerRef.current) {
      observer = new ResizeObserver(recompute);
      observer.observe(containerRef.current);
    }

    return () => {
      img?.removeEventListener("load", recompute);
      window.removeEventListener("resize", recompute);
      observer?.disconnect();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roi, imgRef.current]);

  return (
    <div ref={containerRef} className="absolute inset-0 pointer-events-none">
      {style && (
        <div
          className="absolute border-2 border-dashed border-accent/70 bg-accent/5 rounded-sm"
          style={style}
        />
      )}
    </div>
  );
}
