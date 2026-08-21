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
    const previousOverflow = document.body.style.overflow;
    document.documentElement.dataset.mobileProductEditor = "open";
    document.body.style.overflow = "hidden";
    return () => {
      delete document.documentElement.dataset.mobileProductEditor;
      document.body.style.overflow = previousOverflow;
    };
  }, [open]);

  const close = () => {
    setOpen(false);
    window.dispatchEvent(new Event("zrabbit:close-product-editor"));
  };

  return <><style>{`${pencilSelector}{min-width:44px;min-height:44px;touch-action:manipulation;display:inline-grid;place-items:center}@media(max-width:1279px){html[data-mobile-product-editor="open"] ${editorSelector}{position:fixed!important;inset:0!important;z-index:90!important;display:block!important;overflow-y:auto!important;background:#f4f5f7!important;padding:5.25rem 1rem 2rem!important}html[data-mobile-product-editor="open"] ${editorSelector}>section{margin-bottom:1rem}}`}</style>{open && <button type="button" onClick={close} className="fixed right-4 top-4 z-[100] rounded-lg bg-[#101824] px-4 py-3 text-sm font-bold text-white shadow-lg">Cerrar configuración</button>}</>;
}
