import { trpc } from "@/lib/trpc";
import { Loader2 } from "lucide-react";
import { FormEvent, useEffect, useRef, useState } from "react";

declare global {
  interface Window { MercadoPago?: new (publicKey: string, options?: { locale?: string }) => { bricks: () => { create: (type: string, container: string, settings: any) => Promise<{ unmount: () => void }> }; yape: (input: { phoneNumber: string; otp: string }) => { create: () => Promise<{ id?: string; token?: string }> } } }
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

async function shortFingerprint(value: string) {
  const bytes = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest)).map(byte => byte.toString(16).padStart(2, "0")).join("").slice(0, 12);
}

export function MercadoPagoPaymentBrick({ order, onResult }: { order: { id: number; totalInCents: number; customerEmail: string }; onResult: (result: PaymentResult) => void }) {
  const brickRef = useRef<{ unmount: () => void } | null>(null);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [paymentMode, setPaymentMode] = useState<"card" | "yape">("card");
  const [yapePhone, setYapePhone] = useState("");
  const [yapeOtp, setYapeOtp] = useState("");
  const [yapeLoading, setYapeLoading] = useState(false);
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
          void shortFingerprint(key).then(clientPublicKeyFingerprint => {
            pay.mutate({ orderId: order.id, token: String(formData.token ?? ""), paymentMethodId: String(formData.payment_method_id ?? ""), issuerId: formData.issuer_id ? String(formData.issuer_id) : undefined, installments: Number(formData.installments ?? 1), payerEmail: String(payer.email ?? order.customerEmail), identificationType: payer.identification_type ? String(payer.identification_type) : undefined, identificationNumber: payer.identification_number ? String(payer.identification_number) : undefined, clientPublicKeyPrefix: key.slice(0, 12), clientPublicKeyFingerprint }, { onSuccess: result => { onResult(result); resolve(); }, onError: paymentError => { let message = paymentError.message; try { const detail = JSON.parse(message) as { status?: number; code?: string; cause?: string }; message = `Mercado Pago respondió ${detail.status ?? "con un error"}: ${detail.code ?? detail.cause ?? "revisa las credenciales y la tarjeta de prueba"}.`; } catch {} setError(message); reject(paymentError); } });
          }).catch(error => { setError("No fue posible verificar la configuración del pago."); reject(error); });
        }),
      },
    }).then(brick => { if (brick) brickRef.current = brick; });
    }).catch((sdkError: Error) => { if (active) setError(`No fue posible cargar Mercado Pago: ${sdkError.message}`); });
    return () => { active = false; brickRef.current?.unmount(); brickRef.current = null; };
  }, [order.id, order.totalInCents, order.customerEmail]);

  const submitYape = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const key = import.meta.env.VITE_MERCADOPAGO_PUBLIC_KEY as string | undefined;
    if (!key) { setError("Falta la clave pública de Mercado Pago para Yape."); return; }
    if (!/^\d{9}$/.test(yapePhone) || !/^\d{6}$/.test(yapeOtp)) { setError("Ingresa un celular peruano de 9 dígitos y el código de compra de 6 dígitos de Yape."); return; }
    setYapeLoading(true); setError(null);
    try {
      await loadMercadoPagoSdk();
      if (!window.MercadoPago) throw new Error("El SDK de Mercado Pago no está disponible.");
      const mp = new window.MercadoPago(key, { locale: "es-PE" });
      const tokenized = await mp.yape({ phoneNumber: yapePhone, otp: yapeOtp }).create();
      const token = String(tokenized.id ?? tokenized.token ?? "");
      if (token.length < 10) throw new Error("Mercado Pago no devolvió un token válido de Yape.");
      const clientPublicKeyFingerprint = await shortFingerprint(key);
      pay.mutate({ orderId: order.id, token, paymentMethodId: "yape", installments: 1, payerEmail: order.customerEmail, clientPublicKeyPrefix: key.slice(0, 12), clientPublicKeyFingerprint }, {
        onSuccess: result => onResult(result),
        onError: paymentError => { let message = paymentError.message; try { const detail = JSON.parse(message) as { status?: number; code?: string; cause?: string }; message = `Mercado Pago respondió ${detail.status ?? "con un error"}: ${detail.code ?? detail.cause ?? "revisa Yape"}.`; } catch {} setError(message); },
        onSettled: () => setYapeLoading(false),
      });
    } catch (yapeError) { setError(yapeError instanceof Error ? yapeError.message : "No fue posible preparar Yape."); setYapeLoading(false); }
  };

  return <section className="mt-6 rounded-xl border border-[#deded7] bg-white p-5"><div className="flex items-center gap-2"><div><p className="editorial-label">Pago seguro</p><h2 className="mt-1 font-serif text-2xl">Elige cómo pagar</h2></div>{!ready && !error && <Loader2 className="ml-auto animate-spin" size={20} />}</div><p className="mt-2 text-xs leading-relaxed text-ink/60">Los datos de pago se procesan directamente con Mercado Pago.</p><div className="mt-5 grid grid-cols-2 border border-[#deded7] p-1"><button type="button" onClick={() => setPaymentMode("card")} className={`px-3 py-2 text-xs font-extrabold uppercase tracking-[.11em] ${paymentMode === "card" ? "bg-ink text-white" : "text-ink/65"}`}>Tarjeta</button><button type="button" onClick={() => setPaymentMode("yape")} className={`px-3 py-2 text-xs font-extrabold uppercase tracking-[.11em] ${paymentMode === "yape" ? "bg-[#6827c7] text-white" : "text-ink/65"}`}>Yape</button></div>{error && <p className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}<div className={paymentMode === "card" ? "mt-5" : "hidden"}><div id="mercadoPagoPaymentBrick" /></div>{paymentMode === "yape" && <form onSubmit={submitYape} className="mt-5 space-y-4"><div className="rounded-lg bg-[#f7f0ff] p-4 text-sm leading-relaxed text-[#3c1772]"><strong>Paga con Yape de forma segura.</strong> El comprador consulta el código de compra de 6 dígitos en su propia app Yape y lo ingresa aquí. zRabbit no genera ni almacena ese código.</div><label className="form-label">Celular Yape<input required inputMode="numeric" maxLength={9} value={yapePhone} onChange={event => setYapePhone(event.target.value.replace(/\D/g, "").slice(0, 9))} className="form-input" placeholder="999 999 999" /></label><label className="form-label">Código de compra Yape<input required inputMode="numeric" maxLength={6} value={yapeOtp} onChange={event => setYapeOtp(event.target.value.replace(/\D/g, "").slice(0, 6))} className="form-input" placeholder="Código de 6 dígitos de la app Yape" /></label><button disabled={yapeLoading || pay.isPending} className="memphis-button w-full bg-[#6827c7] text-white disabled:opacity-50">{yapeLoading || pay.isPending ? "Procesando Yape..." : "Pagar con Yape"}</button><p className="text-xs leading-relaxed text-ink/55">La simulación de Mercado Pago usa 111111111 y 123456, pero requiere las credenciales de prueba de la aplicación. Con credenciales de producción, utiliza los datos reales del comprador yapeador.</p></form>}</section>;
}
