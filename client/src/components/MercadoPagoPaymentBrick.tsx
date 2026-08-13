import { trpc } from "@/lib/trpc";
import { Loader2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";

declare global {
  interface Window { MercadoPago?: new (publicKey: string, options?: { locale?: string }) => { bricks: () => { create: (type: string, container: string, settings: any) => Promise<{ unmount: () => void }> } } }
}

type PaymentResult = { status: "awaiting_payment" | "paid" | "cancelled"; detail: string | null; orderNumber: string };

function loadMercadoPagoSdk() {
  if (window.MercadoPago) return Promise.resolve();
  const existing = document.querySelector<HTMLScriptElement>('script[data-mercado-pago-sdk]');
  const script = existing ?? document.createElement("script");
  if (!existing) { script.src = "https://sdk.mercadopago.com/js/v2"; script.dataset.mercadoPagoSdk = "true"; document.head.appendChild(script); }
  return new Promise<void>((resolve, reject) => {
    const timeout = window.setTimeout(() => reject(new Error("El SDK de Mercado Pago no respondió.")), 10_000);
    const ready = () => { window.clearTimeout(timeout); window.MercadoPago ? resolve() : reject(new Error("El SDK no está disponible.")); };
    script.addEventListener("load", ready, { once: true }); script.addEventListener("error", () => { window.clearTimeout(timeout); reject(new Error("No se pudo descargar el SDK.")); }, { once: true });
  });
}

export function MercadoPagoPaymentBrick({ order, onResult }: { order: { id: number; totalInCents: number; customerEmail: string }; onResult: (result: PaymentResult) => void }) {
  const brickRef = useRef<{ unmount: () => void } | null>(null);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const pay = trpc.checkout.pay.useMutation();

  useEffect(() => {
    const key = import.meta.env.VITE_MERCADOPAGO_PUBLIC_KEY as string | undefined;
    if (!key) { setError("Falta la clave pública de Mercado Pago. Configura VITE_MERCADOPAGO_PUBLIC_KEY en Railway y vuelve a desplegar."); return; }
    let active = true;
    loadMercadoPagoSdk().then(() => {
    if (!active || !window.MercadoPago) return;
    const mp = new window.MercadoPago(key, { locale: "es-PE" });
    return mp.bricks().create("payment", "mercadoPagoPaymentBrick", {
      initialization: { amount: order.totalInCents / 100, payer: { email: order.customerEmail } },
      customization: { paymentMethods: { creditCard: "all", debitCard: "all", mercadoPago: "all" } },
      callbacks: {
        onReady: () => { if (active) setReady(true); },
        onError: (brickError: unknown) => { console.error("[Mercado Pago Brick]", brickError); if (active) setError("No fue posible cargar los medios de pago."); },
        onSubmit: ({ formData }: { formData: Record<string, any> }) => new Promise<void>((resolve, reject) => {
          const payer = formData.payer ?? {};
          pay.mutate({ orderId: order.id, token: String(formData.token ?? ""), paymentMethodId: String(formData.payment_method_id ?? ""), issuerId: formData.issuer_id ? String(formData.issuer_id) : undefined, installments: Number(formData.installments ?? 1), payerEmail: String(payer.email ?? order.customerEmail), identificationType: payer.identification_type ? String(payer.identification_type) : undefined, identificationNumber: payer.identification_number ? String(payer.identification_number) : undefined }, { onSuccess: result => { onResult(result); resolve(); }, onError: paymentError => { setError(paymentError.message); reject(paymentError); } });
        }),
      },
    }).then(brick => { if (brick) brickRef.current = brick; });
    }).catch((sdkError: Error) => { if (active) setError(`No fue posible cargar Mercado Pago: ${sdkError.message}`); });
    return () => { active = false; brickRef.current?.unmount(); brickRef.current = null; };
  }, [order.id, order.totalInCents, order.customerEmail]);

  return <section className="mt-6 rounded-xl border border-[#deded7] bg-white p-5"><div className="flex items-center gap-2"><div><p className="editorial-label">Pago seguro</p><h2 className="mt-1 font-serif text-2xl">Elige cómo pagar</h2></div>{!ready && !error && <Loader2 className="ml-auto animate-spin" size={20} />}</div><p className="mt-2 text-xs leading-relaxed text-ink/60">Los datos de pago se procesan directamente con Mercado Pago.</p>{error && <p className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}<div id="mercadoPagoPaymentBrick" className="mt-5" /></section>;
}
