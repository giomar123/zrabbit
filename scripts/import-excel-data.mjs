import XLSX from "xlsx";
import { drizzle } from "drizzle-orm/mysql2";
import { categories, products, purchases, sales, investments } from "../drizzle/schema.js";
import * as dotenv from "dotenv";

dotenv.config();

const db = drizzle(process.env.DATABASE_URL);

async function importData() {
  console.log("Starting Excel import...\n");
  
  // Read Excel file
  const workbook = XLSX.readFile("/home/ubuntu/upload/VentadeFigurasv2(1).xlsx");
  
  // ============= IMPORT PRODUCTS FROM "Listas" SHEET =============
  console.log("📦 Importing products from 'Listas' sheet...");
  const listasSheet = workbook.Sheets["Listas"];
  const listasData = XLSX.utils.sheet_to_json(listasSheet);
  
  let productsImported = 0;
  for (const row of listasData) {
    const codigo = row["CODIGO"];
    const nombre = row["NOMBRE"];
    
    if (!codigo || !nombre) continue;
    
    // Extract category code from product code (first 3 letters)
    const categoryCode = codigo.substring(0, 3);
    
    // Find category ID
    const categoryResult = await db.select().from(categories).where({ code: categoryCode }).limit(1);
    if (categoryResult.length === 0) {
      console.log(`  ⚠️  Category not found for code: ${categoryCode}`);
      continue;
    }
    
    const categoryId = categoryResult[0].id;
    
    try {
      await db.insert(products).values({
        code: codigo,
        name: nombre,
        categoryId: categoryId,
      });
      productsImported++;
    } catch (error) {
      if (error.code === 'ER_DUP_ENTRY') {
        console.log(`  ⚠️  Product already exists: ${codigo}`);
      } else {
        console.error(`  ❌ Error importing product ${codigo}:`, error.message);
      }
    }
  }
  console.log(`✓ Products imported: ${productsImported}\n`);
  
  // ============= IMPORT PURCHASES FROM "Compras" SHEET =============
  console.log("🛒 Importing purchases from 'Compras' sheet...");
  const comprasSheet = workbook.Sheets["Compras"];
  const comprasData = XLSX.utils.sheet_to_json(comprasSheet);
  
  let purchasesImported = 0;
  for (const row of comprasData) {
    const fecha = row["FECHA"];
    const codigo = row["CODIGO"];
    const cantidad = row["CANTIDAD"];
    const precioUnitario = row["PRECIO UNITARIO"];
    const total = row["TOTAL"];
    const precioSugerido = row["PRECIO SUGERIDO 25%"];
    const estado = row["ESTADO"];
    const detalle = row["DETALLE"];
    
    if (!fecha || !codigo) continue;
    
    // Find product by code
    const productResult = await db.select().from(products).where({ code: codigo }).limit(1);
    if (productResult.length === 0) {
      console.log(`  ⚠️  Product not found: ${codigo}`);
      continue;
    }
    
    const productId = productResult[0].id;
    
    // Convert Excel date to YYYY-MM-DD
    let dateStr = "";
    if (typeof fecha === "number") {
      const excelDate = XLSX.SSF.parse_date_code(fecha);
      dateStr = `${excelDate.y}-${String(excelDate.m).padStart(2, '0')}-${String(excelDate.d).padStart(2, '0')}`;
    } else {
      dateStr = fecha;
    }
    
    try {
      await db.insert(purchases).values({
        purchaseDate: dateStr,
        productId: productId,
        quantity: cantidad || 0,
        unitPrice: precioUnitario || 0,
        total: total || 0,
        suggestedPrice: precioSugerido || 0,
        status: estado || "Recibido",
        detail: detalle || "",
      });
      purchasesImported++;
    } catch (error) {
      console.error(`  ❌ Error importing purchase:`, error.message);
    }
  }
  console.log(`✓ Purchases imported: ${purchasesImported}\n`);
  
  // ============= IMPORT SALES FROM "Ventas" SHEET =============
  console.log("💰 Importing sales from 'Ventas' sheet...");
  const ventasSheet = workbook.Sheets["Ventas"];
  const ventasData = XLSX.utils.sheet_to_json(ventasSheet);
  
  let salesImported = 0;
  for (const row of ventasData) {
    const fecha = row["FECHA"];
    const codigo = row["CODIGO"];
    const cantidad = row["CANTIDAD"];
    const precioUnitario = row["PRECIO UNITARIO"];
    const total = row["TOTAL"];
    const comprador = row["COMPRADOR"];
    const correo = row["CORREO"];
    const telefono = row["TELEFONO"];
    
    if (!fecha || !codigo) continue;
    
    // Find product by code
    const productResult = await db.select().from(products).where({ code: codigo }).limit(1);
    if (productResult.length === 0) {
      console.log(`  ⚠️  Product not found: ${codigo}`);
      continue;
    }
    
    const productId = productResult[0].id;
    
    // Convert Excel date to YYYY-MM-DD
    let dateStr = "";
    if (typeof fecha === "number") {
      const excelDate = XLSX.SSF.parse_date_code(fecha);
      dateStr = `${excelDate.y}-${String(excelDate.m).padStart(2, '0')}-${String(excelDate.d).padStart(2, '0')}`;
    } else {
      dateStr = fecha;
    }
    
    try {
      await db.insert(sales).values({
        saleDate: dateStr,
        productId: productId,
        quantity: cantidad || 0,
        unitPrice: precioUnitario || 0,
        total: total || 0,
        buyerName: comprador || "",
        buyerEmail: correo || "",
        buyerPhone: telefono || "",
      });
      salesImported++;
    } catch (error) {
      console.error(`  ❌ Error importing sale:`, error.message);
    }
  }
  console.log(`✓ Sales imported: ${salesImported}\n`);
  
  // ============= IMPORT INVESTMENTS FROM "Inversiones" SHEET =============
  console.log("💵 Importing investments from 'Inversiones' sheet...");
  const inversionesSheet = workbook.Sheets["Inversiones"];
  const inversionesData = XLSX.utils.sheet_to_json(inversionesSheet);
  
  let investmentsImported = 0;
  for (const row of inversionesData) {
    const fecha = row["FECHA"];
    const descripcion = row["DESCRIPCION"];
    const inversor = row["INVERSOR"];
    const monto = row["MONTO"];
    
    if (!fecha || !inversor || !monto) continue;
    
    // Convert Excel date to YYYY-MM-DD
    let dateStr = "";
    if (typeof fecha === "number") {
      const excelDate = XLSX.SSF.parse_date_code(fecha);
      dateStr = `${excelDate.y}-${String(excelDate.m).padStart(2, '0')}-${String(excelDate.d).padStart(2, '0')}`;
    } else {
      dateStr = fecha;
    }
    
    try {
      await db.insert(investments).values({
        investmentDate: dateStr,
        description: descripcion || "",
        investor: inversor,
        amount: monto || 0,
      });
      investmentsImported++;
    } catch (error) {
      console.error(`  ❌ Error importing investment:`, error.message);
    }
  }
  console.log(`✓ Investments imported: ${investmentsImported}\n`);
  
  console.log("✅ Excel import completed successfully!");
  console.log(`\nSummary:`);
  console.log(`  - Products: ${productsImported}`);
  console.log(`  - Purchases: ${purchasesImported}`);
  console.log(`  - Sales: ${salesImported}`);
  console.log(`  - Investments: ${investmentsImported}`);
}

importData()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Import failed:", error);
    process.exit(1);
  });
