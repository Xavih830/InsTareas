import { chromium } from "playwright";
import { CANVAS_BASE_URL } from "./scraper/canvas.js";

// Autenticación headless contra el Aula Virtual (SSO OIDC del GTSI).
// El usuario NUNCA instala nada: sus credenciales se guardan cifradas en la
// app (espolPassword) y este módulo abre un navegador invisible para
// obtener la cookie de sesión de Canvas, que luego se usa como credencial
// en la API REST (/api/v1). Al expirar la sesión (días), se re-loguea solo.
//
// El browser solo se descarga/usa cuando ENABLE_CANVAS_LOGIN=1 (workflow de
// contenido). En el workflow de tareas (cada 30 min) se evita Chromium para
// no quemar minutos de GitHub Actions: si la sesión guardada aún vale se usa,
// y si no, el sync cae al feed ICS.

let browser = null;

function browserEnabled() {
  return process.env.ENABLE_CANVAS_LOGIN === "1";
}

async function getBrowser() {
  if (!browser) {
    browser = await chromium.launch({ headless: true });
  }
  return browser;
}

export async function closeBrowser() {
  if (browser) {
    await browser.close().catch(() => {});
    browser = null;
  }
}

export function sessionCookieString(cookies) {
  return cookies.map((c) => `${c.name}=${c.value}`).join("; ");
}

// Devuelve las cookies de sesión de Canvas para el usuario (cookie string).
// Lanza un error si el login no está habilitado o falla la autenticación.
//
// Flujo real del Aula Virtual (verificado 2026-08): el SSO OIDC del GTSI
// tiene TRES pasos: (1) Microsoft Entra — `loginfmt` (email) + botón Next;
// (2) AD FS del GTSI (sts.espol.edu.ec) — `userNameInput` + `passwordInput`;
// (3) de vuelta a Entra puede pedir aprobación en Microsoft Authenticator
// (MFA). Ese paso se espera hasta `MFA_TIMEOUT_MS` para permitir la
// aprobación manual desde el teléfono del usuario.
export async function loginWithCredentials(username, password) {
  if (!browserEnabled()) {
    throw new Error("Login OIDC deshabilitado en este workflow (ENABLE_CANVAS_LOGIN != 1)");
  }
  const browser = await getBrowser();
  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    await page.goto(`${CANVAS_BASE_URL}/login/openid_connect`, {
      waitUntil: "domcontentloaded",
      timeout: 60_000,
    });

    // Paso 1: Microsoft Entra — email + botón "Next".
    const emailInput = page.locator('#i0116, input[name="loginfmt"], input[type="email"]').first();
    await emailInput.waitFor({ state: "visible", timeout: 30_000 });
    await emailInput.fill(username);

    const nextButton = page.locator('#idSIButton9, input[type="submit"], button[type="submit"]').first();
    await nextButton.click();

    // Paso 2: AD FS institucional — usuario y contraseña.
    const portalUser = page.locator('#userNameInput, input[name="UserName"]').first();
    await portalUser.waitFor({ state: "visible", timeout: 30_000 });
    await portalUser.fill(username);
    const passInput = page.locator('#passwordInput, input[name="Password"], input[type="password"]').first();
    await passInput.fill(password);

    await Promise.all([
      page.locator('#submitButton, input[type="submit"], button[type="submit"]').first().click(),
      page.waitForNavigation({ waitUntil: "domcontentloaded", timeout: 60_000 }),
    ]);

    // Paso 3 (opcional): MFA de Entra — "Approve sign in request".
    // Tras AD FS, Entra puede pedir aprobación en Microsoft Authenticator.
    // Como el número varía y no hay selector estable, se hace polling del
    // hostname: si seguimos en login.microsoftonline.com, es el paso MFA.
    // Si seguimos en AD FS (login real fallido), también lo refleja.
    const canvasHost = new URL(CANVAS_BASE_URL).hostname;
    const mfaDeadline = Date.now() + (Number(process.env.MFA_TIMEOUT_MS) || 240_000);
    let authNumber = "";
    while (Date.now() < mfaDeadline) {
      const host = new URL(page.url()).hostname;
      if (host === canvasHost) break;
      const bodyText = await page.evaluate(() => document.body.innerText).catch(() => "");
      const m =
        bodyText.match(/if prompted\.?\s*\.?\s*(\d{2,6})/i) ||
        bodyText.match(/Enter the number[^\d]*(\d{2,6})/i) ||
        bodyText.match(/\b(\d{2,6})\b/);
      const num = m?.[1] || "";
      if (num && num !== authNumber) {
        authNumber = num;
        console.log(`Login: NÚMERO MFA: ${authNumber} — ingrésalo en Microsoft Authenticator`);
        console.log(`Login: página: ${page.url().slice(0, 120)}`);
        const ctx = bodyText.slice(0, 400).replace(/\n+/g, " ");
        console.log(`Login: contexto textual: "${ctx.trim()}"`);
        await page.screenshot({ path: "mfa-screenshot.png", fullPage: false }).catch(() => {});
        console.log(`Login: pantalla guardada en worker/mfa-screenshot.png (ábrila para verificar)`);
      }
      if (host.startsWith("login.microsoftonline.com") && !authNumber) {
        console.log("Login: Entra pide aprobación — esperando MFA...");
      }
      await page.waitForTimeout(3000);
    }
    if (new URL(page.url()).hostname !== canvasHost) {
      if (authNumber) {
        throw new Error(
          `entra en pausa de aprobación (MFA), espera manual agotada. Número: ${authNumber}`
        );
      }
      throw new Error(`no se alcanzó Canvas (hostname: ${new URL(page.url()).hostname})`);
    }

    // Puede haber un redirect final del IdP antes de caer en Canvas.
    await page.waitForTimeout(3000);

    const cookies = await context.cookies(CANVAS_BASE_URL);
    if (!cookies.some((c) => c.name.includes("session"))) {
      throw new Error("Login falló: no se obtuvieron cookies de sesión");
    }
    return sessionCookieString(cookies);
  } catch (err) {
    throw new Error(`Login OIDC falló: ${err.message}`);
  } finally {
    await context.close();
  }
}

// Verifica si una cookie de sesión sigue válida contra la API.
export async function isValidSession(cookie) {
  try {
    const res = await fetch(`${CANVAS_BASE_URL}/api/v1/users/self`, {
      headers: { Cookie: cookie },
    });
    return res.status === 200;
  } catch {
    return false;
  }
}
