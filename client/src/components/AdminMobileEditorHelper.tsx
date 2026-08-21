import { useEffect, useState } from "react";

const editorSelector = "#product-content-editor";
const pencilSelector = 'button[aria-label^="Editar contenido de"]';

export function AdminMobileEditorHelper() {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    const openEditor = (event: MouseEvent) => {
      const trigger = (event.target as Element | null)?.closest(pencilSelector);
      if (!trigger || !window.matchMedia("(max-width: 1279px)").matches) return;
      setOpen(true);
    };
    document.addEventListener("click", openEditor);
    return () => document.removeEventListener("click", openEditor);
  }, []);

  useEffect(() => {
    if (!open) return;
    document.documentElement.dataset.mobileProductEditor = "open";
    return () => {
      delete document.documentElement.dataset.mobileProductEditor;
    };
  }, [open]);

  const close = () => {
    setOpen(false);
    window.dispatchEvent(new Event("zrabbit:close-product-editor"));
  };

  return <><style>{`${pencilSelector}{min-width:44px;min-height:44px;touch-action:manipulation;display:inline-grid;place-items:center}@media(max-width:1279px){html[data-mobile-product-editor="open"] ${editorSelector}{order:-1;position:relative!important;z-index:1;background:#fff;padding:1.25rem;border:1px solid #d9dee7;border-radius:1.25rem;box-shadow:0 18px 45px rgba(15,23,42,.14)}html[data-mobile-product-editor="open"] ${editorSelector}>section{margin-bottom:1rem}}`}</style>{open && <button type="button" onClick={close} className="fixed right-6 top-24 z-[100] grid h-11 w-11 place-items-center rounded-full border border-slate-200 bg-white text-2xl leading-none text-slate-500 shadow-lg" aria-label="Cerrar configuración">×</button>}</>;
}
