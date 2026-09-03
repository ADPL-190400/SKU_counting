import { useRef, useState } from "react";
import { displayToNatural, getRenderedImageRect } from "../lib/roi";
import type { DisplayRect } from "../lib/roi";
import type { Roi } from "../types";

const MIN_DRAG_PX = 20;

interface Props {
  active: boolean;
  liveImgRef: React.RefObject<HTMLImageElement | null>;
  onConfirm: (roi: Roi) => void;
  onCancel: () => void;
}

/**
 * Lop phu toan bo khung camera (absolute inset-0), chi ve khi active=true:
 * dong bang khung hinh hien tai (giong ky thuat canvas-grab cua nut
 * Capture), roi cho keo chuot ve 1 hinh chu nhat (giong cv2.selectROI ban
 * goc), xac nhan/ve lai/huy. Component ngoai (SkuManagement) so huu nut
 * kich hoat "Select ROI" / "Full Frame" va chi cho `active` on/off.
 */
export function RoiSelector({ active, liveImgRef, onConfirm, onCancel }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const frozenImgRef = useRef<HTMLImageElement>(null);
  const [frozenSrc, setFrozenSrc] = useState<string | null>(null);
  const [dragStart, setDragStart] = useState<{ x: number; y: number } | null>(null);
  const [draftRect, setDraftRect] = useState<DisplayRect | null>(null);

  if (active && frozenSrc === null) {
    const img = liveImgRef.current;
    if (img && img.naturalWidth) {
      const canvas = document.createElement("canvas");
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        setFrozenSrc(canvas.toDataURL("image/jpeg"));
      }
    }
  }
  if (!active && frozenSrc !== null) {
    setFrozenSrc(null);
    setDragStart(null);
    setDraftRect(null);
  }

  if (!active || !frozenSrc) return null;

  function clampToImage(x: number, y: number) {
    const img = frozenImgRef.current;
    if (!img) return { x, y };
    const rendered = getRenderedImageRect(img);
    return {
      x: Math.max(rendered.left, Math.min(x, rendered.left + rendered.width)),
      y: Math.max(rendered.top, Math.min(y, rendered.top + rendered.height)),
    };
  }

  function handlePointerDown(e: React.PointerEvent) {
    e.currentTarget.setPointerCapture(e.pointerId);
    const p = clampToImage(e.clientX, e.clientY);
    setDragStart(p);
    setDraftRect({ left: p.x, top: p.y, width: 0, height: 0 });
  }

  function handlePointerMove(e: React.PointerEvent) {
    if (!dragStart) return;
    const p = clampToImage(e.clientX, e.clientY);
    setDraftRect({
      left: Math.min(dragStart.x, p.x),
      top: Math.min(dragStart.y, p.y),
      width: Math.abs(p.x - dragStart.x),
      height: Math.abs(p.y - dragStart.y),
    });
  }

  function handlePointerUp() {
    setDragStart(null);
    if (draftRect && (draftRect.width < MIN_DRAG_PX || draftRect.height < MIN_DRAG_PX)) {
      setDraftRect(null); // qua nho - coi nhu click nham, cho ve lai
    }
  }

  function handleConfirm() {
    const img = frozenImgRef.current;
    if (!img || !draftRect) return;
    onConfirm(displayToNatural(draftRect, img));
  }

  function handleRedraw() {
    setDraftRect(null);
  }

  const containerBox = containerRef.current?.getBoundingClientRect();
  const draftStyle =
    draftRect && containerBox
      ? {
          left: draftRect.left - containerBox.left,
          top: draftRect.top - containerBox.top,
          width: draftRect.width,
          height: draftRect.height,
        }
      : null;

  const hasDraft = !!draftRect && draftRect.width >= MIN_DRAG_PX && draftRect.height >= MIN_DRAG_PX;

  return (
    <div ref={containerRef} className="absolute inset-0 z-10 flex flex-col">
      <div
        className="relative flex-1 cursor-crosshair touch-none"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
      >
        <img
          ref={frozenImgRef}
          src={frozenSrc}
          alt="frozen frame for ROI selection"
          className="absolute inset-0 w-full h-full object-contain select-none pointer-events-none"
          draggable={false}
        />
        {draftStyle && (
          <div
            className="absolute border-2 border-dashed border-accent bg-accent/15 pointer-events-none"
            style={draftStyle}
          />
        )}
        <span className="absolute top-2 left-2 text-xs font-semibold bg-warn/90 text-slate-950 px-2 py-0.5 rounded pointer-events-none">
          KÉO CHUỘT ĐỂ CHỌN VÙNG QUAN TÂM (ROI)
        </span>
      </div>

      <div className="flex items-center justify-center gap-2 bg-black/70 py-2">
        <button onClick={handleConfirm} disabled={!hasDraft} className="btn btn-primary btn-sm">
          Xác nhận
        </button>
        <button onClick={handleRedraw} disabled={!hasDraft} className="btn btn-ghost btn-sm">
          Vẽ lại
        </button>
        <button onClick={onCancel} className="btn btn-ghost btn-sm">
          Hủy
        </button>
      </div>
    </div>
  );
}
