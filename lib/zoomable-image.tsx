"use client";

import { useRef } from "react";

interface ZoomableImageProps {
  /** Маленькая (thumbnail) версия — то, что видим в гриде. */
  src: string;
  /** Большая версия для модала. */
  fullSrc: string;
  alt: string;
  /** Подпись под изображением в модале (например, ссылка-источник). */
  caption?: React.ReactNode;
  /** className для thumbnail-img. */
  imgClassName?: string;
  width?: number;
  height?: number;
  /** Контейнер-button (по дефолту — inline-block). */
  triggerClassName?: string;
}

/**
 * Открывает изображение в большом размере по клику.
 *
 * Использует native `<dialog>` — браузер сам управляет фокусом, Esc
 * закрывает модал, ::backdrop рисует тёмный фон. Клик в области backdrop
 * (вне самой картинки) тоже закрывает — это известный паттерн с
 * проверкой `event.target === dialog`.
 */
export function ZoomableImage({
  src,
  fullSrc,
  alt,
  caption,
  imgClassName,
  width,
  height,
  triggerClassName,
}: ZoomableImageProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  const open = () => dialogRef.current?.showModal();
  const close = () => dialogRef.current?.close();

  // Клик по самому dialog (а не по картинке внутри него) = клик по
  // backdrop. Закрываем.
  const onBackdropClick = (e: React.MouseEvent<HTMLDialogElement>) => {
    if (e.target === dialogRef.current) close();
  };

  return (
    <>
      <button
        type="button"
        onClick={open}
        className={
          "block cursor-zoom-in p-0 border-0 bg-transparent " +
          (triggerClassName ?? "")
        }
        aria-label={`Открыть в полном размере: ${alt}`}
      >
        <img
          src={src}
          alt={alt}
          width={width}
          height={height}
          loading="lazy"
          className={imgClassName}
        />
      </button>
      <dialog
        ref={dialogRef}
        onClick={onBackdropClick}
        className="backdrop:bg-black/85 bg-transparent text-light p-0 max-w-none max-h-none w-full h-full m-0"
      >
        <div className="w-full h-full flex flex-col items-center justify-center gap-3 p-6">
          <img
            src={fullSrc}
            alt={alt}
            className="max-w-[92vw] max-h-[80vh] object-contain shadow-screen"
          />
          {caption && (
            <div className="text-light/70 text-sm max-w-2xl text-center">
              {caption}
            </div>
          )}
          <button
            type="button"
            onClick={close}
            className="titre text-light/70 hover:text-sepia border border-light/30 px-3 py-1 rounded mt-1"
          >
            Закрыть · Esc
          </button>
        </div>
      </dialog>
    </>
  );
}
