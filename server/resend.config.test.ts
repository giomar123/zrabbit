import { describe, expect, it } from "vitest";

async function fetchWithRetry(url: string, options?: RequestInit): Promise<Response> {
  let lastError: unknown;
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      return await fetch(url, options);
    } catch (error) {
      lastError = error;
      await new Promise(resolve => setTimeout(resolve, 500));
    }
  }
  throw lastError;
}

describe("configuración de Resend", () => {
  it.runIf(process.env.RUN_RESEND_DOMAIN_TEST === "true")("consulta los dominios de la cuenta sin enviar correos", async () => {
    const apiKey = process.env.RESEND_API_KEY;
    const fromAddress = process.env.RESEND_FROM_EMAIL;
    expect(apiKey, "RESEND_API_KEY debe estar configurada").toBeTruthy();
    expect(fromAddress, "RESEND_FROM_EMAIL debe estar configurado").toBeTruthy();

    const response = await fetchWithRetry("https://api.resend.com/domains", {
      headers: { Authorization: `Bearer ${apiKey}` },
    });

    expect(response.ok, "La API key debe permitir consultar los dominios de Resend").toBe(true);
    const payload = (await response.json()) as { data?: Array<{ name?: string; status?: string }> };
    expect(payload.data, "Resend debe devolver los dominios de la cuenta").toBeDefined();

    const senderDomain = fromAddress!
      .split("@")
      .at(-1)
      ?.replace(/[^a-z0-9.-].*$/i, "")
      .toLowerCase();
    expect(senderDomain, "El remitente debe contener un dominio válido").toBeTruthy();
    const verified = payload.data?.some(
      domain => domain.name?.toLowerCase() === senderDomain && domain.status === "verified",
    );
    expect(verified, `El dominio ${senderDomain} debe estar verificado para enviar`).toBe(true);
  }, 10_000);

  it.runIf(process.env.RUN_RESEND_SEND_TEST === "true")(
    "envía una única prueba autorizada con una clave de Sending access",
    async () => {
      const apiKey = process.env.RESEND_API_KEY;
      const fromAddress = process.env.RESEND_FROM_EMAIL;
      const recipient = process.env.ORDER_NOTIFICATION_EMAIL;

      expect(apiKey, "RESEND_API_KEY debe estar configurada").toBeTruthy();
      expect(fromAddress, "RESEND_FROM_EMAIL debe estar configurado").toBeTruthy();
      expect(recipient, "ORDER_NOTIFICATION_EMAIL debe estar configurado").toBeTruthy();

      const response = await fetchWithRetry("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: fromAddress,
          to: [recipient],
          subject: "Prueba de notificaciones zRabbit",
          text: "La configuración de correo transaccional de zRabbit está lista.",
        }),
      });

      expect(response.ok, "Resend debe aceptar el correo de prueba autorizado").toBe(true);
      const payload = (await response.json()) as { id?: string };
      expect(payload.id, "Resend debe devolver el ID del correo enviado").toBeTruthy();
    },
    10_000,
  );
});
