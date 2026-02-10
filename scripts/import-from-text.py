#!/usr/bin/env python3
import mysql.connector
import os
import re
from datetime import datetime
from dotenv import load_dotenv

load_dotenv()

# Parse DATABASE_URL
db_url = os.getenv("DATABASE_URL")
parts = db_url.replace("mysql://", "").split("@")
user_pass = parts[0].split(":")
host_port_db = parts[1].split("/")
host_port = host_port_db[0].split(":")

conn = mysql.connector.connect(
    host=host_port[0],
    port=int(host_port[1]) if len(host_port) > 1 else 3306,
    user=user_pass[0],
    password=user_pass[1],
    database=host_port_db[1].split("?")[0],
    ssl_disabled=False
)

cursor = conn.cursor(dictionary=True)

def clean_price(price_str):
    """Convert 'S/.71,65' to 71.65"""
    if not price_str:
        return 0.0
    # Remove S/., spaces, and replace comma with dot
    cleaned = str(price_str).replace("S/.", "").replace(" ", "").replace(",", ".")
    # Remove any remaining non-numeric characters except dot and minus
    cleaned = re.sub(r'[^\d.-]', '', cleaned)
    try:
        return float(cleaned)
    except:
        return 0.0

def parse_date(date_str):
    """Parse various date formats"""
    if not date_str:
        return None
    
    date_str = str(date_str).strip()
    
    # Try format: 3/08/2025
    try:
        parts = date_str.split("/")
        if len(parts) == 3:
            day, month, year = parts
            return f"{year}-{month.zfill(2)}-{day.zfill(2)}"
    except:
        pass
    
    # Try format: 17 ago 2025
    try:
        months_es = {
            'ene': '01', 'feb': '02', 'mar': '03', 'abr': '04',
            'may': '05', 'jun': '06', 'jul': '07', 'ago': '08',
            'sep': '09', 'sept': '09', 'oct': '10', 'nov': '11', 'dic': '12'
        }
        parts = date_str.split()
        if len(parts) == 3:
            day, month, year = parts
            month_num = months_es.get(month.lower(), '01')
            return f"{year}-{month_num}-{day.zfill(2)}"
    except:
        pass
    
    return date_str

print("Starting data import from text file...\n")

# Read file
with open('/home/ubuntu/upload/pasted_content.txt', 'r', encoding='utf-8') as f:
    lines = f.readlines()

# Get category and product mappings
cursor.execute("SELECT id, code FROM categories")
category_map = {row['code']: row['id'] for row in cursor.fetchall()}

# ============= IMPORT PRODUCTS (from Compras section) =============
print("📦 Extracting and importing products...")

products_data = {}
in_compras = False
for line in lines:
    line = line.strip()
    if line.startswith("Compras"):
        in_compras = True
        continue
    if line.startswith("Ventas"):
        break
    if in_compras and line and not line.startswith("Fecha"):
        parts = line.split("\t")
        if len(parts) >= 4:
            codigo = parts[1].strip()
            categoria = parts[2].strip()
            producto = parts[3].strip()
            if codigo and producto and codigo.startswith(("POK", "DBZ", "MRC", "OPI", "YGO")):
                products_data[codigo] = {"name": producto, "category": categoria}

products_imported = 0
for codigo, data in products_data.items():
    category_code = codigo[:3]
    if category_code not in category_map:
        print(f"  ⚠️  Category not found: {category_code}")
        continue
    
    try:
        cursor.execute(
            "INSERT INTO products (code, name, categoryId) VALUES (%s, %s, %s)",
            (codigo, data["name"], category_map[category_code])
        )
        products_imported += 1
    except mysql.connector.IntegrityError:
        pass  # Product already exists
    except Exception as e:
        print(f"  ❌ Error importing product {codigo}: {e}")

conn.commit()
print(f"✓ Products imported: {products_imported}\n")

# Get product mapping
cursor.execute("SELECT id, code FROM products")
product_map = {row['code']: row['id'] for row in cursor.fetchall()}

# ============= IMPORT PURCHASES =============
print("🛒 Importing purchases...")

purchases_imported = 0
in_compras = False
for line in lines:
    line = line.strip()
    if line.startswith("Compras"):
        in_compras = True
        continue
    if line.startswith("Ventas"):
        break
    if in_compras and line and not line.startswith("Fecha"):
        parts = line.split("\t")
        if len(parts) >= 9:
            fecha = parse_date(parts[0])
            codigo = parts[1].strip()
            cantidad = clean_price(parts[4])
            precio_unitario = clean_price(parts[5])
            total = clean_price(parts[6])
            precio_sugerido = clean_price(parts[7])
            estado = parts[8].strip() if len(parts) > 8 and parts[8].strip() else "Recibido"
            
            if codigo not in product_map:
                continue
            
            try:
                cursor.execute(
                    """INSERT INTO purchases 
                       (purchaseDate, productId, quantity, unitPrice, total, suggestedPrice, status, detail) 
                       VALUES (%s, %s, %s, %s, %s, %s, %s, %s)""",
                    (fecha, product_map[codigo], int(cantidad), precio_unitario, total, 
                     precio_sugerido, estado, "")
                )
                purchases_imported += 1
            except Exception as e:
                print(f"  ❌ Error importing purchase for {codigo}: {e}")

conn.commit()
print(f"✓ Purchases imported: {purchases_imported}\n")

# ============= IMPORT SALES =============
print("💰 Importing sales...")

sales_imported = 0
in_ventas = False
skip_next = False
for line in lines:
    line = line.strip()
    if line.startswith("Ventas"):
        in_ventas = True
        skip_next = True
        continue
    if line.startswith("Inventario"):
        break
    if in_ventas:
        if skip_next:
            skip_next = False
            continue
        if line and not line.startswith("Fecha"):
            parts = line.split("\t")
            if len(parts) >= 6:
                fecha = parse_date(parts[0])
                codigo = parts[1].strip()
                cantidad = clean_price(parts[3])
                precio_unitario = clean_price(parts[4])
                total = clean_price(parts[5])
                comprador = parts[6].strip() if len(parts) > 6 else ""
                correo = parts[7].strip() if len(parts) > 7 else ""
                telefono = parts[8].strip() if len(parts) > 8 else ""
                
                if codigo not in product_map:
                    continue
                
                try:
                    cursor.execute(
                        """INSERT INTO sales 
                           (saleDate, productId, quantity, unitPrice, total, buyerName, buyerEmail, buyerPhone) 
                           VALUES (%s, %s, %s, %s, %s, %s, %s, %s)""",
                        (fecha, product_map[codigo], int(cantidad), precio_unitario, total,
                         comprador, correo, telefono)
                    )
                    sales_imported += 1
                except Exception as e:
                    print(f"  ❌ Error importing sale for {codigo}: {e}")

conn.commit()
print(f"✓ Sales imported: {sales_imported}\n")

# ============= IMPORT INVESTMENTS =============
print("💵 Importing investments...")

investments_imported = 0
in_inversiones = False
for line in lines:
    line = line.strip()
    if line.startswith("Inversiones"):
        in_inversiones = True
        continue
    if line.startswith("Flujo de caja"):
        break
    if in_inversiones and line and not line.startswith("Fecha"):
        parts = line.split("\t")
        if len(parts) >= 4:
            fecha = parse_date(parts[0])
            descripcion = parts[1].strip()
            inversor = parts[2].strip()
            monto = clean_price(parts[3])
            
            if not fecha or not inversor:
                continue
            
            try:
                cursor.execute(
                    """INSERT INTO investments 
                       (investmentDate, description, investor, amount) 
                       VALUES (%s, %s, %s, %s)""",
                    (fecha, descripcion, inversor, monto)
                )
                investments_imported += 1
            except Exception as e:
                print(f"  ❌ Error importing investment: {e}")

conn.commit()
print(f"✓ Investments imported: {investments_imported}\n")

cursor.close()
conn.close()

print("✅ Data import completed successfully!")
print(f"\nSummary:")
print(f"  - Products: {products_imported}")
print(f"  - Purchases: {purchases_imported}")
print(f"  - Sales: {sales_imported}")
print(f"  - Investments: {investments_imported}")
