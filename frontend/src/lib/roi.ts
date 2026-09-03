import type { Roi } from "../types";

/** Hinh chu nhat theo toa do VIEWPORT (nhu getBoundingClientRect()). */
export interface DisplayRect {
  left: number;
  top: number;
  width: number;
  height: number;
}

/**
 * Vung anh THUC SU hien thi ben trong khung <img> (object-contain co the de
 * lai vien den 2 ben/tren-duoi - "letterbox" - can loai tru khi tinh toa do).
 */
export function getRenderedImageRect(img: HTMLImageElement): DisplayRect {
  const box = img.getBoundingClientRect();
  const naturalW = img.naturalWidth || box.width;
  const naturalH = img.naturalHeight || box.height;
  if (!naturalW || !naturalH) return box;

  const scale = Math.min(box.width / naturalW, box.height / naturalH);
  const width = naturalW * scale;
  const height = naturalH * scale;
  return {
    left: box.left + (box.width - width) / 2,
    top: box.top + (box.height - height) / 2,
    width,
    height,
  };
}

/** roi (pixel goc cua frame) -> hinh chu nhat theo toa do viewport de ve len man hinh. */
export function naturalToDisplay(roi: Roi, img: HTMLImageElement): DisplayRect {
  const rendered = getRenderedImageRect(img);
  const scaleX = rendered.width / (img.naturalWidth || 1);
  const scaleY = rendered.height / (img.naturalHeight || 1);
  const [x0, y0, x1, y1] = roi;
  return {
    left: rendered.left + x0 * scaleX,
    top: rendered.top + y0 * scaleY,
    width: (x1 - x0) * scaleX,
    height: (y1 - y0) * scaleY,
  };
}

/** hinh chu nhat theo toa do viewport (vd tu keo chuot) -> roi pixel goc, da clamp trong bien anh. */
export function displayToNatural(rect: DisplayRect, img: HTMLImageElement): Roi {
  const rendered = getRenderedImageRect(img);
  const scaleX = (img.naturalWidth || 1) / (rendered.width || 1);
  const scaleY = (img.naturalHeight || 1) / (rendered.height || 1);

  const clampX = (v: number) => Math.max(0, Math.min(v, img.naturalWidth));
  const clampY = (v: number) => Math.max(0, Math.min(v, img.naturalHeight));

  const x0 = clampX((rect.left - rendered.left) * scaleX);
  const y0 = clampY((rect.top - rendered.top) * scaleY);
  const x1 = clampX((rect.left + rect.width - rendered.left) * scaleX);
  const y1 = clampY((rect.top + rect.height - rendered.top) * scaleY);

  return [Math.round(x0), Math.round(y0), Math.round(x1), Math.round(y1)];
}
