type MetaEventName = "ViewContent" | "AddToCart" | "InitiateCheckout" | "Purchase";

type MetaPayload = {
  content_ids: string[];
  content_name: string;
  content_type: "product";
  currency: "PEN";
  value: number;
};

declare global {
  interface Window { fbq?: (action: "track", event: MetaEventName, payload: MetaPayload) => void; }
}

/** Envía eventos al píxel cuando se active y mantiene un evento local verificable mientras tanto. */
export function trackMetaEvent(event: MetaEventName, payload: MetaPayload) {
  if (typeof window === "undefined") return;
  window.fbq?.("track", event, payload);
  window.dispatchEvent(new CustomEvent("figura-fiebre:conversion", { detail: { event, payload } }));
}
