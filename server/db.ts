import { eq, desc, sql, and, gte, lte } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { 
  InsertUser, 
  users, 
  categories, 
  products, 
  purchases, 
  sales, 
  investments,
  expenses,
  InsertCategory,
  InsertProduct,
  InsertPurchase,
  InsertSale,
  InsertInvestment,
  InsertExpense
} from "../drizzle/schema";
import { ENV } from './_core/env';

let _db: ReturnType<typeof drizzle> | null = null;

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

// ============= USER FUNCTIONS =============

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }

  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }

  try {
    const values: InsertUser = {
      openId: user.openId,
    };
    const updateSet: Record<string, unknown> = {};

    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];

    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };

    textFields.forEach(assignNullable);

    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerOpenId) {
      values.role = 'admin';
      updateSet.role = 'admin';
    }

    if (!values.lastSignedIn) {
      values.lastSignedIn = new Date();
    }

    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = new Date();
    }

    await db.insert(users).values(values).onDuplicateKeyUpdate({
      set: updateSet,
    });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);

  return result.length > 0 ? result[0] : undefined;
}

// ============= CATEGORY FUNCTIONS =============

export async function getAllCategories() {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(categories).orderBy(categories.name);
}

export async function getCategoryByCode(code: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(categories).where(eq(categories.code, code)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function createCategory(category: InsertCategory) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(categories).values(category);
  return result;
}

// ============= PRODUCT FUNCTIONS =============

export async function getAllProducts() {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(products).orderBy(products.code);
}

export async function getProductById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(products).where(eq(products.id, id)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function getProductByCode(code: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(products).where(eq(products.code, code)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function getProductsByCategoryId(categoryId: number) {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(products).where(eq(products.categoryId, categoryId)).orderBy(products.code);
}

export async function createProduct(product: InsertProduct) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.insert(products).values(product);
  // Return the created product
  const result = await db.select().from(products).where(eq(products.code, product.code)).limit(1);
  return result[0];
}

export async function updateProduct(id: number, product: Partial<InsertProduct>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.update(products).set(product).where(eq(products.id, id));
  return result;
}

export async function deleteProduct(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.delete(products).where(eq(products.id, id));
  return result;
}

export async function getNextProductCode(categoryId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const category = await db.select().from(categories).where(eq(categories.id, categoryId)).limit(1);
  if (category.length === 0) throw new Error("Category not found");
  
  const categoryCode = category[0].code;
  const existingProducts = await db.select().from(products).where(eq(products.categoryId, categoryId));
  
  const maxNumber = existingProducts.reduce((max, product) => {
    const match = product.code.match(/\d+$/);
    if (match) {
      const num = parseInt(match[0], 10);
      return num > max ? num : max;
    }
    return max;
  }, 0);
  
  const nextNumber = maxNumber + 1;
  return `${categoryCode}${nextNumber.toString().padStart(7, '0')}`;
}

// ============= PURCHASE FUNCTIONS =============

export async function getAllPurchases() {
  const db = await getDb();
  if (!db) return [];
  
  const result = await db
    .select({
      id: purchases.id,
      purchaseDate: purchases.purchaseDate,
      productId: purchases.productId,
      quantity: purchases.quantity,
      unitPrice: purchases.unitPrice,
      total: purchases.total,
      suggestedPrice: purchases.suggestedPrice,
      status: purchases.status,
      detail: purchases.detail,
      createdAt: purchases.createdAt,
      updatedAt: purchases.updatedAt,
      product: {
        id: products.id,
        code: products.code,
        name: products.name,
        categoryId: products.categoryId,
      },
    })
    .from(purchases)
    .leftJoin(products, eq(purchases.productId, products.id))
    .orderBy(desc(purchases.purchaseDate));
  
  return result;
}

export async function getPurchaseById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(purchases).where(eq(purchases.id, id)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function createPurchase(purchase: InsertPurchase) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(purchases).values(purchase);
  return result;
}

export async function updatePurchase(id: number, purchase: Partial<InsertPurchase>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.update(purchases).set(purchase).where(eq(purchases.id, id));
  return result;
}

export async function deletePurchase(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.delete(purchases).where(eq(purchases.id, id));
  return result;
}

// ============= SALE FUNCTIONS =============

export async function getAllSales() {
  const db = await getDb();
  if (!db) return [];
  
  const result = await db
    .select({
      id: sales.id,
      saleDate: sales.saleDate,
      productId: sales.productId,
      quantity: sales.quantity,
      unitPrice: sales.unitPrice,
      total: sales.total,
      buyerName: sales.buyerName,
      buyerEmail: sales.buyerEmail,
      buyerPhone: sales.buyerPhone,
      createdAt: sales.createdAt,
      updatedAt: sales.updatedAt,
      product: {
        id: products.id,
        code: products.code,
        name: products.name,
        categoryId: products.categoryId,
      },
    })
    .from(sales)
    .leftJoin(products, eq(sales.productId, products.id))
    .orderBy(desc(sales.saleDate));
  
  return result;
}

export async function getSaleById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(sales).where(eq(sales.id, id)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function createSale(sale: InsertSale) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(sales).values(sale);
  return result;
}

export async function updateSale(id: number, sale: Partial<InsertSale>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.update(sales).set(sale).where(eq(sales.id, id));
  return result;
}

export async function deleteSale(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.delete(sales).where(eq(sales.id, id));
  return result;
}

// ============= INVESTMENT FUNCTIONS =============

export async function getAllInvestments() {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(investments).orderBy(desc(investments.investmentDate));
}

export async function getInvestmentById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(investments).where(eq(investments.id, id)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function createInvestment(investment: InsertInvestment) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(investments).values(investment);
  return result;
}

export async function updateInvestment(id: number, investment: Partial<InsertInvestment>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.update(investments).set(investment).where(eq(investments.id, id));
  return result;
}

export async function deleteInvestment(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.delete(investments).where(eq(investments.id, id));
  return result;
}

// ============= EXPENSE FUNCTIONS =============

export async function getAllExpenses() {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(expenses).orderBy(desc(expenses.expenseDate));
}

export async function getExpenseById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(expenses).where(eq(expenses.id, id)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function createExpense(expense: InsertExpense) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(expenses).values(expense);
  return result;
}

export async function updateExpense(id: number, expense: Partial<InsertExpense>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.update(expenses).set(expense).where(eq(expenses.id, id));
  return result;
}

export async function deleteExpense(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.delete(expenses).where(eq(expenses.id, id));
  return result;
}

// ============= INVENTORY CALCULATIONS =============

export async function getInventory() {
  const db = await getDb();
  if (!db) return [];
  
  try {
    // Get all products with their purchase and sale quantities using subqueries
    const rawResult: any = await db.execute(sql`
      SELECT 
        p.id as productId,
        p.code as productCode,
        p.name as productName,
        p.categoryId,
        COALESCE(pu_agg.totalPurchased, 0) as totalPurchased,
        COALESCE(s_agg.totalSold, 0) as totalSold,
        COALESCE(pu_agg.totalPurchased, 0) - COALESCE(s_agg.totalSold, 0) as finalStock,
        COALESCE(pu_agg.avgUnitPrice, 0) as avgUnitPrice,
        (COALESCE(pu_agg.totalPurchased, 0) - COALESCE(s_agg.totalSold, 0)) * COALESCE(pu_agg.avgUnitPrice, 0) as inventoryValue
      FROM products p
      LEFT JOIN (
        SELECT 
          productId,
          SUM(CAST(quantity AS SIGNED)) as totalPurchased,
          AVG(CAST(unitPrice AS DECIMAL(10,2))) as avgUnitPrice
        FROM purchases
        GROUP BY productId
      ) pu_agg ON p.id = pu_agg.productId
      LEFT JOIN (
        SELECT 
          productId,
          SUM(CAST(quantity AS SIGNED)) as totalSold
        FROM sales
        GROUP BY productId
      ) s_agg ON p.id = s_agg.productId
      WHERE pu_agg.totalPurchased > 0 OR s_agg.totalSold > 0
      ORDER BY p.code
    `);
    
    // Drizzle returns results in a nested array format: [[row1, row2, ...], metadata]
    // We need to access the first element which contains the actual data
    const rows = Array.isArray(rawResult) && Array.isArray(rawResult[0]) ? rawResult[0] : [];
    console.log('[getInventory] Extracted', rows.length, 'inventory items');
    
    return rows.map((row: any) => {
      const result = {
        productId: Number(row.productId),
        productCode: String(row.productCode || ''),
        productName: String(row.productName || ''),
        categoryId: Number(row.categoryId),
        totalPurchased: Number(row.totalPurchased) || 0,
        totalSold: Number(row.totalSold) || 0,
        finalStock: Number(row.finalStock) || 0,
        avgUnitPrice: parseFloat(row.avgUnitPrice) || 0,
        inventoryValue: parseFloat(row.inventoryValue) || 0
      };
      return result;
    });
  } catch (error) {
    console.error('[getInventory] Error:', error);
    return [];
  }
}

// ============= CASH FLOW CALCULATIONS =============

export async function getCashFlow() {
  const db = await getDb();
  if (!db) return [];
  
  try {
    // Simplified query using GROUP BY instead of loop
    const result = await db.execute(sql`
      WITH all_months AS (
        SELECT DISTINCT SUBSTRING(investmentDate, 1, 7) as month FROM investments WHERE LENGTH(investmentDate) >= 7
        UNION
        SELECT DISTINCT SUBSTRING(purchaseDate, 1, 7) as month FROM purchases WHERE LENGTH(purchaseDate) >= 7
        UNION
        SELECT DISTINCT SUBSTRING(saleDate, 1, 7) as month FROM sales WHERE LENGTH(saleDate) >= 7
        UNION
        SELECT DISTINCT SUBSTRING(expenseDate, 1, 7) as month FROM expenses WHERE LENGTH(expenseDate) >= 7
      ),
      monthly_investments AS (
        SELECT 
          SUBSTRING(investmentDate, 1, 7) as month,
          SUM(CASE WHEN investor = 'Giomar' THEN CAST(amount AS DECIMAL(10,2)) ELSE 0 END) as giomarInvestment,
          SUM(CASE WHEN investor = 'Erick' THEN CAST(amount AS DECIMAL(10,2)) ELSE 0 END) as erickInvestment,
          SUM(CAST(amount AS DECIMAL(10,2))) as totalInvestment
        FROM investments
        WHERE LENGTH(investmentDate) >= 7
        GROUP BY SUBSTRING(investmentDate, 1, 7)
      ),
      monthly_purchases AS (
        SELECT 
          SUBSTRING(purchaseDate, 1, 7) as month,
          SUM(CAST(total AS DECIMAL(10,2))) as totalPurchases
        FROM purchases
        WHERE LENGTH(purchaseDate) >= 7
        GROUP BY SUBSTRING(purchaseDate, 1, 7)
      ),
      monthly_sales AS (
        SELECT 
          SUBSTRING(saleDate, 1, 7) as month,
          SUM(CAST(total AS DECIMAL(10,2))) as totalSales
        FROM sales
        WHERE LENGTH(saleDate) >= 7
        GROUP BY SUBSTRING(saleDate, 1, 7)
      ),
      monthly_expenses AS (
        SELECT 
          SUBSTRING(expenseDate, 1, 7) as month,
          SUM(CAST(amount AS DECIMAL(10,2))) as totalExpenses
        FROM expenses
        WHERE LENGTH(expenseDate) >= 7
        GROUP BY SUBSTRING(expenseDate, 1, 7)
      )
      SELECT 
        m.month,
        COALESCE(i.giomarInvestment, 0) as giomarInvestment,
        COALESCE(i.erickInvestment, 0) as erickInvestment,
        COALESCE(i.totalInvestment, 0) as totalInvestment,
        COALESCE(p.totalPurchases, 0) as totalPurchases,
        COALESCE(s.totalSales, 0) as totalSales,
        COALESCE(e.totalExpenses, 0) as totalExpenses,
        COALESCE(i.totalInvestment, 0) + COALESCE(s.totalSales, 0) - COALESCE(p.totalPurchases, 0) - COALESCE(e.totalExpenses, 0) as netBalance
      FROM all_months m
      LEFT JOIN monthly_investments i ON m.month = i.month
      LEFT JOIN monthly_purchases p ON m.month = p.month
      LEFT JOIN monthly_sales s ON m.month = s.month
      LEFT JOIN monthly_expenses e ON m.month = e.month
      WHERE m.month IS NOT NULL AND m.month != ''
      ORDER BY m.month
    `);
    
    // Drizzle returns results in nested array format: [[row1, row2, ...], metadata]
    const rows = Array.isArray(result) && Array.isArray(result[0]) ? result[0] : [];
    console.log('[getCashFlow] Extracted', rows.length, 'cash flow records');
    
    // Calculate accumulated cash (caja disponible acumulada)
    let accumulatedCash = 0;
    return rows.map((row: any) => {
      const netBalance = parseFloat(row.netBalance) || 0;
      accumulatedCash += netBalance;
      
      return {
        month: String(row.month),
        giomarInvestment: parseFloat(row.giomarInvestment) || 0,
        erickInvestment: parseFloat(row.erickInvestment) || 0,
        totalInvestment: parseFloat(row.totalInvestment) || 0,
        totalPurchases: parseFloat(row.totalPurchases) || 0,
        totalSales: parseFloat(row.totalSales) || 0,
        totalExpenses: parseFloat(row.totalExpenses) || 0,
        netBalance: netBalance,
        accumulatedCash: accumulatedCash
      };
    });
  } catch (error) {
    console.error('[getCashFlow] Error:', error);
    return [];
  }
}
