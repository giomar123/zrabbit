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

  return <><style>{`${pencilSelector}{min-width:44px;min-height:44px;touch-action:manipulation;display:inline-grid;place-items:center}.min-w-170{min-width:0!important;table-layout:fixed}.min-w-170 th:nth-child(2),.min-w-170 td:nth-child(2),.min-w-170 th:nth-child(3),.min-w-170 td:nth-child(3),.min-w-170 th:nth-child(4),.min-w-170 td:nth-child(4){display:none}.min-w-170 th:first-child{width:auto}.min-w-170 th:nth-child(5){width:6.2rem}.min-w-170 th:last-child{width:3.5rem}.min-w-170 td:first-child{padding-right:.75rem}.min-w-170 td:nth-child(5){white-space:nowrap}.min-w-170 td:last-child{padding-left:.25rem}#product-content-editor{align-self:start;max-width:100%}#product-content-editor>section{border-radius:1.25rem;border-color:#d9dee7;padding:1.25rem;box-shadow:0 8px 24px rgba(15,23,42,.06)}#product-content-editor>section:first-child{border-color:#efd4ae;background:linear-gradient(145deg,#fffdf9 0%,#fff 55%,#fffbf4 100%)}#product-content-editor>section:first-child>div:first-child{padding-bottom:1rem;border-bottom:1px solid #f0dfc8}#product-content-editor .form-label{display:grid;gap:.45rem;color:#334155;font-size:.8rem;font-weight:700}#product-content-editor .form-input{border-radius:.75rem;border-color:#cbd5e1;background:#fff;padding:.75rem .85rem;line-height:1.4}#product-content-editor button{min-height:2.75rem}#product-content-editor img{background:#fff} @media(max-width:1279px){html[data-mobile-product-editor="open"] ${editorSelector}{order:-1;position:relative!important;z-index:1;background:#fff;padding:0;border:0;border-radius:1.25rem;box-shadow:0 18px 45px rgba(15,23,42,.14)}html[data-mobile-product-editor="open"] ${editorSelector}>section{margin-bottom:1rem}html[data-mobile-product-editor="open"] ${editorSelector}>section:last-child{margin-bottom:0}}@media(max-width:640px){.min-w-170 th,.min-w-170 td{padding-top:.75rem!important;padding-bottom:.75rem!important}.min-w-170 td:first-child p:first-child{font-size:.8rem;line-height:1.2}.min-w-170 td:first-child p:last-child{font-size:.68rem}.min-w-170 td:nth-child(5){font-size:.65rem}.min-w-170 button[aria-label^="Editar contenido"]{border-radius:.75rem;background:#fffaf2;border-color:#efd4ae}}`}</style>{open && <button type="button" onClick={close} className="fixed right-6 top-24 z-[100] grid h-11 w-11 place-items-center rounded-full border border-slate-200 bg-white text-2xl leading-none text-slate-500 shadow-lg" aria-label="Cerrar configuración">×</button>}</>;
}
