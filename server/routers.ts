import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, protectedProcedure, router } from "./_core/trpc";
import { z } from "zod";
import * as db from "./db";

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return {
        success: true,
      } as const;
    }),
  }),

  // ============= CATEGORIES =============
  categories: router({
    list: publicProcedure.query(async () => {
      return await db.getAllCategories();
    }),
    
    create: protectedProcedure
      .input(z.object({
        name: z.string().min(1),
        code: z.string().length(3).toUpperCase(),
      }))
      .mutation(async ({ input }) => {
        return await db.createCategory(input);
      }),
  }),

  // ============= PRODUCTS =============
  products: router({
    list: publicProcedure.query(async () => {
      return await db.getAllProducts();
    }),
    
    getById: publicProcedure
      .input(z.number())
      .query(async ({ input }) => {
        return await db.getProductById(input);
      }),
    
    getByCode: publicProcedure
      .input(z.string())
      .query(async ({ input }) => {
        return await db.getProductByCode(input);
      }),
    
    getByCategoryId: publicProcedure
      .input(z.number())
      .query(async ({ input }) => {
        return await db.getProductsByCategoryId(input);
      }),
    
    create: protectedProcedure
      .input(z.object({
        name: z.string().min(1),
        categoryId: z.number(),
      }))
      .mutation(async ({ input }) => {
        const code = await db.getNextProductCode(input.categoryId);
        return await db.createProduct({
          ...input,
          code,
        });
      }),
    
    update: protectedProcedure
      .input(z.object({
        id: z.number(),
        name: z.string().min(1).optional(),
        categoryId: z.number().optional(),
      }))
      .mutation(async ({ input }) => {
        const { id, ...data } = input;
        return await db.updateProduct(id, data);
      }),
    
    delete: protectedProcedure
      .input(z.number())
      .mutation(async ({ input }) => {
        return await db.deleteProduct(input);
      }),
  }),

  // ============= PURCHASES =============
  purchases: router({
    list: publicProcedure.query(async () => {
      return await db.getAllPurchases();
    }),
    
    getById: publicProcedure
      .input(z.number())
      .query(async ({ input }) => {
        return await db.getPurchaseById(input);
      }),
    
    create: protectedProcedure
      .input(z.object({
        purchaseDate: z.string(), // YYYY-MM-DD format
        productId: z.number(),
        quantity: z.number().min(1),
        unitPrice: z.string(), // decimal as string
        status: z.enum(["Recibido", "Recibido parcial", "Pendiente"]).default("Pendiente"),
        detail: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        const unitPrice = parseFloat(input.unitPrice);
        const total = unitPrice * input.quantity;
        const suggestedPrice = unitPrice * 1.30;
        
        return await db.createPurchase({
          ...input,
          unitPrice: input.unitPrice,
          total: total.toFixed(2),
          suggestedPrice: suggestedPrice.toFixed(2),
        });
      }),
    
    update: protectedProcedure
      .input(z.object({
        id: z.number(),
        purchaseDate: z.string().optional(),
        productId: z.number().optional(),
        quantity: z.number().min(1).optional(),
        unitPrice: z.string().optional(),
        status: z.enum(["Recibido", "Recibido parcial", "Pendiente"]).optional(),
        detail: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        const { id, ...data } = input;
        
        // Recalculate totals if quantity or unitPrice changed
        if (data.quantity || data.unitPrice) {
          const existing = await db.getPurchaseById(id);
          if (existing) {
            const quantity = data.quantity ?? existing.quantity;
            const unitPrice = data.unitPrice ? parseFloat(data.unitPrice) : parseFloat(existing.unitPrice);
            const total = unitPrice * quantity;
            const suggestedPrice = unitPrice * 1.30;
            
            const updateData: any = {
              ...data,
              total: total.toFixed(2),
              suggestedPrice: suggestedPrice.toFixed(2),
            };
            
            return await db.updatePurchase(id, updateData);
          }
        }
        
        return await db.updatePurchase(id, data as any);
      }),
    
    delete: protectedProcedure
      .input(z.number())
      .mutation(async ({ input }) => {
        return await db.deletePurchase(input);
      }),
  }),

  // ============= SALES =============
  sales: router({
    list: publicProcedure.query(async () => {
      return await db.getAllSales();
    }),
    
    getById: publicProcedure
      .input(z.number())
      .query(async ({ input }) => {
        return await db.getSaleById(input);
      }),
    
    create: protectedProcedure
      .input(z.object({
        saleDate: z.string(), // YYYY-MM-DD format
        productId: z.number(),
        quantity: z.number().min(1),
        unitPrice: z.string(), // decimal as string
        buyerName: z.string().optional(),
        buyerEmail: z.string().email().optional(),
        buyerPhone: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        const unitPrice = parseFloat(input.unitPrice);
        const total = unitPrice * input.quantity;
        
        return await db.createSale({
          ...input,
          unitPrice: input.unitPrice,
          total: total.toFixed(2),
        });
      }),
    
    update: protectedProcedure
      .input(z.object({
        id: z.number(),
        saleDate: z.string().optional(),
        productId: z.number().optional(),
        quantity: z.number().min(1).optional(),
        unitPrice: z.string().optional(),
        buyerName: z.string().optional(),
        buyerEmail: z.string().email().optional(),
        buyerPhone: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        const { id, ...data } = input;
        
        // Recalculate total if quantity or unitPrice changed
        if (data.quantity || data.unitPrice) {
          const existing = await db.getSaleById(id);
          if (existing) {
            const quantity = data.quantity ?? existing.quantity;
            const unitPrice = data.unitPrice ? parseFloat(data.unitPrice) : parseFloat(existing.unitPrice);
            const total = unitPrice * quantity;
            
            const updateData: any = {
              ...data,
              total: total.toFixed(2),
            };
            
            return await db.updateSale(id, updateData);
          }
        }
        
        return await db.updateSale(id, data as any);
      }),
    
    delete: protectedProcedure
      .input(z.number())
      .mutation(async ({ input }) => {
        return await db.deleteSale(input);
      }),
  }),

  // ============= INVESTMENTS =============
  investments: router({
    list: publicProcedure.query(async () => {
      return await db.getAllInvestments();
    }),
    
    getById: publicProcedure
      .input(z.number())
      .query(async ({ input }) => {
        return await db.getInvestmentById(input);
      }),
    
    create: protectedProcedure
      .input(z.object({
        investmentDate: z.string(), // YYYY-MM-DD format
        description: z.string().min(1),
        investor: z.enum(["Giomar", "Erick"]),
        amount: z.string(), // decimal as string
      }))
      .mutation(async ({ input }) => {
        return await db.createInvestment(input);
      }),
    
    update: protectedProcedure
      .input(z.object({
        id: z.number(),
        investmentDate: z.string().optional(),
        description: z.string().min(1).optional(),
        investor: z.enum(["Giomar", "Erick"]).optional(),
        amount: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        const { id, ...data } = input;
        return await db.updateInvestment(id, data as any);
      }),
    
    delete: protectedProcedure
      .input(z.number())
      .mutation(async ({ input }) => {
        return await db.deleteInvestment(input);
      }),
  }),

  // ============= INVENTORY =============
  inventory: router({
    list: publicProcedure.query(async () => {
      return await db.getInventory();
    }),
  }),

  // ============= EXPENSES =============
  expenses: router({
    list: publicProcedure.query(async () => {
      return await db.getAllExpenses();
    }),
    
    getById: publicProcedure
      .input(z.number())
      .query(async ({ input }) => {
        return await db.getExpenseById(input);
      }),
    
    create: protectedProcedure
      .input(z.object({
        expenseDate: z.string(), // YYYY-MM-DD format
        description: z.string().min(1),
        category: z.enum(["Publicidad", "Transporte", "Embalaje", "Otros"]),
        amount: z.string(), // decimal as string
      }))
      .mutation(async ({ input }) => {
        return await db.createExpense(input);
      }),
    
    update: protectedProcedure
      .input(z.object({
        id: z.number(),
        expenseDate: z.string().optional(),
        description: z.string().min(1).optional(),
        category: z.enum(["Publicidad", "Transporte", "Embalaje", "Otros"]).optional(),
        amount: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        const { id, ...data } = input;
        return await db.updateExpense(id, data as any);
      }),
    
    delete: protectedProcedure
      .input(z.number())
      .mutation(async ({ input }) => {
        return await db.deleteExpense(input);
      }),
  }),

  // ============= CASH FLOW =============
  cashFlow: router({
    list: publicProcedure.query(async () => {
      return await db.getCashFlow();
    }),
  }),
});

export type AppRouter = typeof appRouter;
