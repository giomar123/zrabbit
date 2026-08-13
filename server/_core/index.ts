import "dotenv/config";
import express from "express";
import { createServer } from "http";
import net from "net";
import { readFile } from "fs/promises";
import path from "path";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { registerOAuthRoutes } from "./oauth";
import { registerStorageProxy } from "./storageProxy";
import { appRouter } from "../routers";
import { getCatalogProductBySlug } from "../catalog";
import { createContext } from "./context";
import { serveStatic, setupVite } from "./vite";

function isPortAvailable(port: number): Promise<boolean> {
  return new Promise(resolve => {
    const server = net.createServer();
    server.listen(port, () => {
      server.close(() => resolve(true));
    });
    server.on("error", () => resolve(false));
  });
}

async function findAvailablePort(startPort: number = 3000): Promise<number> {
  for (let port = startPort; port < startPort + 20; port++) {
    if (await isPortAvailable(port)) {
      return port;
    }
  }
  throw new Error(`No available port found starting from ${startPort}`);
}

function escapeHtml(value: string) {
  return value.replace(/[&<>'"]/g, character => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" })[character] ?? character);
}

async function registerProductSharingRoutes(app: express.Express) {
  if (process.env.NODE_ENV === "development") return;
  app.get("/productos/:slug", async (req, res, next) => {
    try {
      const record = await getCatalogProductBySlug(req.params.slug);
      if (!record) return next();
      const origin = (process.env.CANONICAL_ORIGIN || `${req.protocol}://${req.get("host")}`).replace(/\/$/, "");
      const title = record.product.metaTitle || `${record.product.name} | Figura Fiebre`;
      const description = record.product.metaDescription || record.product.shortDescription;
      const canonical = `${origin}/productos/${record.product.slug}`;
      const imagePath = record.product.mainImageUrl || record.images.find(item => item.isPrimary)?.url || "/manus-storage/golden-frieza-dragon-stars_47413f5e.png";
      const image = imagePath.startsWith("http") ? imagePath : `${origin}${imagePath}`;
      const templatePath = process.env.NODE_ENV === "development" ? path.join(process.cwd(), "client/index.html") : path.join(process.cwd(), "dist/public/index.html");
      let html = await readFile(templatePath, "utf8");
      html = html.replace(/<title>[\s\S]*?<\/title>/, `<title>${escapeHtml(title)}</title>`).replace(/<meta name="description"[^>]*>/, `<meta name="description" content="${escapeHtml(description)}" />`);
      const data = { "@context": "https://schema.org", "@type": "Product", name: record.product.name, description, image: [image], sku: record.product.sku || undefined, offers: { "@type": "Offer", priceCurrency: "PEN", price: (record.product.priceInCents / 100).toFixed(2), availability: record.product.stock > 0 ? "https://schema.org/InStock" : "https://schema.org/OutOfStock", url: canonical } };
      const head = `<link rel="canonical" href="${escapeHtml(canonical)}" />\n<meta property="og:type" content="product" />\n<meta property="og:site_name" content="Figura Fiebre" />\n<meta property="og:title" content="${escapeHtml(title)}" />\n<meta property="og:description" content="${escapeHtml(description)}" />\n<meta property="og:url" content="${escapeHtml(canonical)}" />\n<meta property="og:image" content="${escapeHtml(image)}" />\n<meta property="og:image:alt" content="${escapeHtml(record.product.name)}" />\n<meta name="twitter:card" content="summary_large_image" />\n<meta name="twitter:title" content="${escapeHtml(title)}" />\n<meta name="twitter:description" content="${escapeHtml(description)}" />\n<meta name="twitter:image" content="${escapeHtml(image)}" />\n<script type="application/ld+json">${JSON.stringify(data).replace(/</g, "\\u003c")}</script>`;
      res.setHeader("Cache-Control", "no-cache");
      return res.status(200).send(html.replace("</head>", `${head}\n</head>`));
    } catch (error) { return next(error); }
  });
}

async function startServer() {
  const app = express();
  const server = createServer(app);
  // Configure body parser with larger size limit for file uploads
  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));
  registerStorageProxy(app);
  registerOAuthRoutes(app);
  await registerProductSharingRoutes(app);
  // tRPC API
  app.use(
    "/api/trpc",
    createExpressMiddleware({
      router: appRouter,
      createContext,
    })
  );
  // development mode uses Vite, production mode uses static files
  if (process.env.NODE_ENV === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  const preferredPort = parseInt(process.env.PORT || "3000");
  const port = await findAvailablePort(preferredPort);

  if (port !== preferredPort) {
    console.log(`Port ${preferredPort} is busy, using port ${port} instead`);
  }

  server.listen(port, () => {
    console.log(`Server running on http://localhost:${port}/`);
  });
}

startServer().catch(console.error);
