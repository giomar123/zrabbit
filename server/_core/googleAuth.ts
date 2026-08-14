import type { Express, Request, Response } from "express";
import { parse as parseCookieHeader } from "cookie";
import { randomBytes } from "node:crypto";
import { createRemoteJWKSet, jwtVerify, SignJWT } from "jose";
import type { User } from "../../drizzle/schema";
import { getGoogleEmailAccess, getUserByOpenId, upsertUser } from "../db";
import { getSessionCookieOptions } from "./cookies";

const GOOGLE_STATE_COOKIE = "zrabbit_google_state";
export const GOOGLE_SESSION_COOKIE = "zrabbit_google_admin";
export const GOOGLE_CUSTOMER_SESSION_COOKIE = "zrabbit_google_customer";
const GOOGLE_ISSUERS = ["https://accounts.google.com", "accounts.google.com"];
const googleKeys = createRemoteJWKSet(new URL("https://www.googleapis.com/oauth2/v3/certs"));

type LoginKind = "admin" | "customer";
type StatePayload = { state: string; nonce: string; kind: LoginKind };
type GoogleToken = { id_token?: string };
export type GoogleCustomerIdentity = { email: string; name: string; openId: string };

function config() {
  return {
    clientId: process.env.GOOGLE_CLIENT_ID ?? "",
    clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? "",
    adminEmail: (process.env.GOOGLE_ADMIN_EMAIL ?? "").trim().toLowerCase(),
    redirectUri: process.env.GOOGLE_OAUTH_REDIRECT_URI ?? "",
    jwtSecret: process.env.JWT_SECRET ?? "",
  };
}

function secret() { const value = config().jwtSecret; return value ? new TextEncoder().encode(value) : null; }
function decodeState(value?: string): StatePayload | null {
  try {
    const decoded = Buffer.from(value ?? "", "base64url").toString("utf8");
    const result = JSON.parse(decoded) as Partial<StatePayload>;
    return typeof result.state === "string" && typeof result.nonce === "string" && (result.kind === "admin" || result.kind === "customer") ? result as StatePayload : null;
  } catch { return null; }
}
function encodeState(value: StatePayload) { return Buffer.from(JSON.stringify(value)).toString("base64url"); }
function hasOAuthCredentials() { const value = config(); return Boolean(value.clientId && value.clientSecret && value.redirectUri && value.jwtSecret); }

export function isGoogleAuthConfigured() { return Boolean(hasOAuthCredentials() && config().adminEmail); }
export function isGoogleCustomerAuthConfigured() { return hasOAuthCredentials(); }

async function accessRoleFor(email: string): Promise<"admin" | "editor" | null> {
  const { adminEmail } = config();
  return email === adminEmail ? "admin" : getGoogleEmailAccess(email);
}

async function issueAdminSession(openId: string, email: string, role: "admin" | "editor") {
  const key = secret();
  if (!key) throw new Error("JWT_SECRET no está configurado.");
  return new SignJWT({ kind: "google_admin", email, role }).setProtectedHeader({ alg: "HS256" }).setSubject(openId).setIssuedAt().setExpirationTime("12h").sign(key);
}

async function issueCustomerSession(identity: GoogleCustomerIdentity) {
  const key = secret();
  if (!key) throw new Error("JWT_SECRET no está configurado.");
  return new SignJWT({ kind: "google_customer", email: identity.email, name: identity.name }).setProtectedHeader({ alg: "HS256" }).setSubject(identity.openId).setIssuedAt().setExpirationTime("12h").sign(key);
}

export async function authenticateGoogleAdmin(req: Request): Promise<User | null> {
  const key = secret(); const { adminEmail } = config(); const token = parseCookieHeader(req.headers.cookie ?? "")[GOOGLE_SESSION_COOKIE];
  if (!key || !adminEmail || !token) return null;
  try {
    const { payload } = await jwtVerify(token, key, { algorithms: ["HS256"] });
    const email = String(payload.email ?? "").toLowerCase(); const openId = String(payload.sub ?? ""); const role = await accessRoleFor(email);
    if (payload.kind !== "google_admin" || !openId || !role) return null;
    const user = await getUserByOpenId(openId);
    return user?.role === role ? user : null;
  } catch { return null; }
}

export async function authenticateGoogleCustomer(req: Request): Promise<GoogleCustomerIdentity | null> {
  const key = secret(); const token = parseCookieHeader(req.headers.cookie ?? "")[GOOGLE_CUSTOMER_SESSION_COOKIE];
  if (!key || !token) return null;
  try {
    const { payload } = await jwtVerify(token, key, { algorithms: ["HS256"] });
    const email = String(payload.email ?? "").trim().toLowerCase(); const openId = String(payload.sub ?? ""); const name = typeof payload.name === "string" ? payload.name.slice(0, 160) : "Cliente zRabbit";
    if (payload.kind !== "google_customer" || !email || !openId) return null;
    return { email, name, openId };
  } catch { return null; }
}

export function logoutGoogleAdmin(req: Request, res: Response) { res.clearCookie(GOOGLE_SESSION_COOKIE, { ...getSessionCookieOptions(req), maxAge: -1 }); }
export function logoutGoogleCustomer(req: Request, res: Response) { res.clearCookie(GOOGLE_CUSTOMER_SESSION_COOKIE, { ...getSessionCookieOptions(req), maxAge: -1 }); }

export function registerGoogleAuthRoutes(app: Express) {
  const beginLogin = (kind: LoginKind) => (req: Request, res: Response) => {
    const { clientId, adminEmail, redirectUri } = config();
    const configured = kind === "admin" ? isGoogleAuthConfigured() : isGoogleCustomerAuthConfigured();
    if (!configured) return res.status(503).send("Google OAuth aún no está configurado en este entorno.");
    const state = randomBytes(32).toString("hex"); const nonce = randomBytes(32).toString("hex");
    res.cookie(GOOGLE_STATE_COOKIE, encodeState({ state, nonce, kind }), { ...getSessionCookieOptions(req), maxAge: 10 * 60 * 1000 });
    const params = new URLSearchParams({ client_id: clientId, redirect_uri: redirectUri, response_type: "code", scope: "openid email profile", state, nonce, prompt: "select_account" });
    if (kind === "admin" && adminEmail) params.set("login_hint", adminEmail);
    res.redirect(302, `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`);
  };

  app.get("/api/auth/google/login", beginLogin("admin"));
  app.get("/api/auth/customer/google/login", beginLogin("customer"));

  app.get("/api/auth/google/callback", async (req, res) => {
    const code = typeof req.query.code === "string" ? req.query.code : ""; const state = typeof req.query.state === "string" ? req.query.state : "";
    const saved = decodeState(parseCookieHeader(req.headers.cookie ?? "")[GOOGLE_STATE_COOKIE]);
    res.clearCookie(GOOGLE_STATE_COOKIE, { ...getSessionCookieOptions(req), maxAge: -1 });
    if (!code || !saved || state !== saved.state) return res.status(403).send("No se pudo validar la solicitud de Google.");
    const { clientId, clientSecret, redirectUri } = config();
    try {
      const body = new URLSearchParams({ code, client_id: clientId, client_secret: clientSecret, redirect_uri: redirectUri, grant_type: "authorization_code" });
      const tokenResponse = await fetch("https://oauth2.googleapis.com/token", { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body });
      if (!tokenResponse.ok) throw new Error("Google no aceptó el código de autorización.");
      const token = await tokenResponse.json() as GoogleToken;
      if (!token.id_token) throw new Error("Google no entregó una identidad válida.");
      const { payload } = await jwtVerify(token.id_token, googleKeys, { audience: clientId, issuer: GOOGLE_ISSUERS });
      const email = String(payload.email ?? "").trim().toLowerCase(); const openId = `google:${String(payload.sub ?? "")}`;
      if (!payload.sub || payload.nonce !== saved.nonce || payload.email_verified !== true || !email) return res.status(403).send("No se pudo validar la cuenta Google.");

      if (saved.kind === "customer") {
        const name = typeof payload.name === "string" ? payload.name : "Cliente zRabbit";
        const session = await issueCustomerSession({ email, name, openId });
        res.cookie(GOOGLE_CUSTOMER_SESSION_COOKIE, session, { ...getSessionCookieOptions(req), maxAge: 12 * 60 * 60 * 1000 });
        return res.redirect(302, "/mis-pedidos");
      }

      const role = await accessRoleFor(email);
      if (!role) return res.status(403).send("Esta cuenta Google no está autorizada para administrar zRabbit.");
      await upsertUser({ openId, name: typeof payload.name === "string" ? payload.name : "Usuario zRabbit", email, loginMethod: "google", role, lastSignedIn: new Date() });
      const session = await issueAdminSession(openId, email, role);
      res.cookie(GOOGLE_SESSION_COOKIE, session, { ...getSessionCookieOptions(req), maxAge: 12 * 60 * 60 * 1000 });
      return res.redirect(302, "/admin");
    } catch (error) { console.error("[Google OAuth]", error); return res.status(500).send("No se pudo completar el inicio de sesión con Google."); }
  });
}
