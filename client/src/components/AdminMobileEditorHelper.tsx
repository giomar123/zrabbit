import { useEffect } from "react";

const editorSelector = "#product-content-editor";
const pencilSelector = 'button[aria-label^="Editar contenido de"]';

export function AdminMobileEditorHelper() {
  useEffect(() => {
    const moveToEditor = (event: MouseEvent) => {
      const trigger = (event.target as Element | null)?.closest(pencilSelector);
      if (!trigger || !window.matchMedia("(max-width: 1279px)").matches) return;
      window.setTimeout(() => document.querySelector(editorSelector)?.scrollIntoView({ behavior: "smooth", block: "start" }), 0);
    };
    document.addEventListener("click", moveToEditor);
    return () => document.removeEventListener("click", moveToEditor);
  }, []);

  return <style>{`${pencilSelector}{min-width:44px;min-height:44px;touch-action:manipulation;display:inline-grid;place-items:center}`}</style>;
}
