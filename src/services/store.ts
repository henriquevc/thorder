import { createClient } from "@libsql/client/web";
import { ref } from "vue";

// Interface para Produto
export interface Product {
  id?: number;
  name: string;
  description: string;
  price: number;
  category: string;
  stock: number;
  image_data: string; // Base64 da imagem ou SVG inline
}

// Interface para Item do Carrinho
export interface CartItem {
  product: Product;
  quantity: number;
}

// Interface para Pedido
export interface Order {
  id?: number;
  customer_name: string;
  customer_email: string;
  customer_phone: string;
  shipping_cep: string;
  shipping_address: string;
  shipping_carrier: string;
  shipping_cost: number;
  items_cost: number;
  total_cost: number;
  status: 'Pendente' | 'Pago' | 'Enviado' | 'Entregue';
  created_at: string;
  items?: OrderItem[];
}

// Interface para Itens de Pedido
export interface OrderItem {
  id?: number;
  order_id?: number;
  product_id: number;
  product_name: string;
  quantity: number;
  price: number;
}

// Interface para Conexão com Turso
export interface TursoConfig {
  url: string;
  token: string;
}

// Chaves de LocalStorage
const TURSO_CONFIG_KEY = "thorder_turso_config";
const CART_KEY = "thorder_cart";
const LOCAL_PRODUCTS_KEY = "thorder_local_products";
const LOCAL_ORDERS_KEY = "thorder_local_orders";
const LOCAL_ORDER_ITEMS_KEY = "thorder_local_order_items";

// ==========================================
// CONTROLE DE TEMAS E CUSTOMIZAÇÃO DE CORES
// ==========================================
export const themeMode = ref<'dark' | 'light'>((localStorage.getItem("theme_mode") as any) || 'dark');
export const themeColor = ref<string>(localStorage.getItem("theme_color") || 'purple');

export function applyTheme() {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  
  // Classe dark/light no elemento raiz (HTML)
  if (themeMode.value === 'dark') {
    root.classList.add('dark');
    root.classList.remove('light');
  } else {
    root.classList.add('light');
    root.classList.remove('dark');
  }
  
  // Classe do tema de cor
  const colorClasses = ['theme-purple', 'theme-emerald', 'theme-blue', 'theme-orange', 'theme-red'];
  colorClasses.forEach(c => root.classList.remove(c));
  root.classList.add(`theme-${themeColor.value}`);
}

export function setThemeMode(mode: 'dark' | 'light') {
  themeMode.value = mode;
  localStorage.setItem("theme_mode", mode);
  applyTheme();
}

export function setThemeColor(color: string) {
  themeColor.value = color;
  localStorage.setItem("theme_color", color);
  applyTheme();
}

// Executa o tema na primeira importação
if (typeof document !== 'undefined') {
  applyTheme();
}


// SVGs elegantes codificados para os produtos de exemplo (fallback)
const KEYBOARD_SVG = `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 300" width="100%" height="100%"><defs><linearGradient id="kb-grad" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" style="stop-color:%231e1b4b;stop-opacity:1" /><stop offset="100%" style="stop-color:%23311042;stop-opacity:1" /></linearGradient><linearGradient id="neon" x1="0%" y1="0%" x2="100%" y2="0%"><stop offset="0%" style="stop-color:%23a855f7;stop-opacity:1" /><stop offset="100%" style="stop-color:%23ec4899;stop-opacity:1" /></linearGradient></defs><rect width="400" height="300" rx="16" fill="url(%23kb-grad)" /><rect x="40" y="80" width="320" height="140" rx="10" fill="%230f172a" stroke="url(%23neon)" stroke-width="2" /><g fill="%23334155" stroke="%23475569" stroke-width="1"><rect x="60" y="100" width="30" height="20" rx="3" /><rect x="100" y="100" width="20" height="20" rx="3" /><rect x="130" y="100" width="20" height="20" rx="3" /><rect x="160" y="100" width="20" height="20" rx="3" /><rect x="190" y="100" width="20" height="20" rx="3" /><rect x="220" y="100" width="20" height="20" rx="3" /><rect x="250" y="100" width="20" height="20" rx="3" /><rect x="280" y="100" width="20" height="20" rx="3" /><rect x="310" y="100" width="30" height="20" rx="3" fill="%23475569" /><rect x="60" y="130" width="25" height="20" rx="3" /><rect x="95" y="130" width="20" height="20" rx="3" /><rect x="125" y="130" width="20" height="20" rx="3" /><rect x="155" y="130" width="20" height="20" rx="3" /><rect x="185" y="130" width="20" height="20" rx="3" /><rect x="215" y="130" width="20" height="20" rx="3" /><rect x="245" y="130" width="20" height="20" rx="3" /><rect x="275" y="130" width="20" height="20" rx="3" /><rect x="305" y="130" width="35" height="20" rx="3" fill="%23475569" /><rect x="60" y="160" width="35" height="20" rx="3" fill="%23475569" /><rect x="105" y="160" width="20" height="20" rx="3" /><rect x="135" y="160" width="20" height="20" rx="3" /><rect x="165" y="160" width="70" height="20" rx="3" fill="%23ec4899" /><rect x="245" y="160" width="20" height="20" rx="3" /><rect x="275" y="160" width="20" height="20" rx="3" /><rect x="305" y="160" width="35" height="20" rx="3" fill="%23a855f7" /></g><text x="200" y="260" font-family="sans-serif" font-weight="bold" font-size="20" fill="%23f8fafc" text-anchor="middle">Teclado Ultra Premium</text><text x="200" y="280" font-family="sans-serif" font-size="12" fill="%2394a3b8" text-anchor="middle">Switches Lubrificados &amp; RGB</text></svg>`;

const MOUSE_SVG = `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 300" width="100%" height="100%"><defs><linearGradient id="ms-grad" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" style="stop-color:%23022c22;stop-opacity:1" /><stop offset="100%" style="stop-color:%23020617;stop-opacity:1" /></linearGradient><linearGradient id="neon-green" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" style="stop-color:%2310b981;stop-opacity:1" /><stop offset="100%" style="stop-color:%2306b6d4;stop-opacity:1" /></linearGradient></defs><rect width="400" height="300" rx="16" fill="url(%23ms-grad)" /><path d="M200 60 C150 60, 140 140, 140 180 C140 230, 170 240, 200 240 C230 240, 260 230, 260 180 C260 140, 250 60, 200 60 Z" fill="%230f172a" stroke="url(%23neon-green)" stroke-width="2" /><path d="M200 60 L200 130" stroke="url(%23neon-green)" stroke-width="1.5" /><rect x="194" y="80" width="12" height="25" rx="6" fill="%2310b981" /><circle cx="200" cy="180" r="15" fill="none" stroke="%2306b6d4" stroke-width="1" stroke-dasharray="4,4" /><text x="200" y="270" font-family="sans-serif" font-weight="bold" font-size="20" fill="%23f8fafc" text-anchor="middle">Mouse Ergonomic Wireless</text></svg>`;

const BACKPACK_SVG = `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 300" width="100%" height="100%"><defs><linearGradient id="bp-grad" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" style="stop-color:%23180828;stop-opacity:1" /><stop offset="100%" style="stop-color:%230b0214;stop-opacity:1" /></linearGradient><linearGradient id="neon-orange" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" style="stop-color:%23f97316;stop-opacity:1" /><stop offset="100%" style="stop-color:%23ef4444;stop-opacity:1" /></linearGradient></defs><rect width="400" height="300" rx="16" fill="url(%23bp-grad)" /><path d="M140 230 L140 100 C140 70, 160 50, 200 50 C240 50, 260 70, 260 100 L260 230 C260 250, 240 260, 200 260 C160 260, 140 250, 140 230 Z" fill="%231e293b" stroke="url(%23neon-orange)" stroke-width="2" /><path d="M140 120 L260 120" stroke="%23f97316" stroke-width="1.5" /><path d="M140 170 L260 170" stroke="%23475569" stroke-width="1" /><rect x="180" y="130" width="40" height="30" rx="4" fill="%230f172a" stroke="%23ef4444" stroke-width="1" /><text x="200" y="285" font-family="sans-serif" font-weight="bold" font-size="18" fill="%23f8fafc" text-anchor="middle">Mochila Developer Pro</text></svg>`;

const MUG_SVG = `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 300" width="100%" height="100%"><defs><linearGradient id="mug-grad" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" style="stop-color:%231e293b;stop-opacity:1" /><stop offset="100%" style="stop-color:%230f172a;stop-opacity:1" /></linearGradient><linearGradient id="neon-cyan" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" style="stop-color:%2306b6d4;stop-opacity:1" /><stop offset="100%" style="stop-color:%233b82f6;stop-opacity:1" /></linearGradient></defs><rect width="400" height="300" rx="16" fill="url(%23mug-grad)" /><rect x="150" y="90" width="100" height="120" rx="12" fill="%23334155" stroke="url(%23neon-cyan)" stroke-width="2" /><path d="M250 110 C280 110, 280 190, 250 190" fill="none" stroke="url(%23neon-cyan)" stroke-width="3" /><path d="M170 60 C170 60, 175 75, 170 80" stroke="%233b82f6" stroke-width="2" stroke-linecap="round" fill="none" /><path d="M200 55 C200 55, 205 70, 200 75" stroke="%2306b6d4" stroke-width="2" stroke-linecap="round" fill="none" /><path d="M230 60 C230 60, 235 75, 230 80" stroke="%233b82f6" stroke-width="2" stroke-linecap="round" fill="none" /><rect x="180" y="170" width="40" height="10" rx="2" fill="%2306b6d4" /><text x="187" y="178" font-family="monospace" font-size="8" fill="%230f172a" font-weight="bold">55°C</text><text x="200" y="260" font-family="sans-serif" font-weight="bold" font-size="20" fill="%23f8fafc" text-anchor="middle">Caneca Smart Termo</text></svg>`;

const INITIAL_PRODUCTS: Product[] = [
  {
    name: "Teclado Ultra Premium",
    description: "Teclado mecânico customizado com switches lineares lubrificados de fábrica, estabilizadores premium, teclas PBT Double-shot e iluminação RGB HSL totalmente programável. Conectividade tripla (Bluetooth, 2.4Ghz e cabo USB-C).",
    price: 1250.00,
    category: "Periféricos",
    stock: 12,
    image_data: KEYBOARD_SVG
  },
  {
    name: "Mouse Ergonomic Wireless",
    description: "Mouse de alta performance com design anatômico para redução de fadiga, sensor PixArt de 26.000 DPI, cliques ópticos ultrarrápidos e bateria recarregável com autonomia de até 150 horas de jogo contínuo.",
    price: 680.00,
    category: "Periféricos",
    stock: 18,
    image_data: MOUSE_SVG
  },
  {
    name: "Mochila Developer Pro",
    description: "Mochila executiva minimalista, produzida com material balístico impermeável. Possui compartimento acolchoado suspenso para notebook de até 16 polegadas, bolsos ocultos de segurança e passagem inteligente para powerbank.",
    price: 450.00,
    category: "Acessórios",
    stock: 25,
    image_data: BACKPACK_SVG
  },
  {
    name: "Caneca Smart Termo",
    description: "Caneca de cerâmica de alta qualidade com elemento aquecedor embutido que mantém sua bebida na temperatura perfeita por até 2 horas. Controlada via display frontal ou aplicativo no smartphone. Acompanha base por indução.",
    price: 290.00,
    category: "Acessórios",
    stock: 8,
    image_data: MUG_SVG
  }
];

// Helper para obter o Carrinho do LocalStorage
export function getCart(): CartItem[] {
  const stored = localStorage.getItem(CART_KEY);
  if (!stored) return [];
  try {
    return JSON.parse(stored);
  } catch (e) {
    return [];
  }
}

// Estado reativo compartilhado
export const cartCount = ref(getCart().reduce((sum, item) => sum + item.quantity, 0));
export const isDbConnected = ref(
  (import.meta.env.VITE_TURSO_DB_URL !== undefined && import.meta.env.VITE_TURSO_DB_URL !== '') ||
  localStorage.getItem(TURSO_CONFIG_KEY) !== null
);

export function saveCart(cart: CartItem[]): void {
  localStorage.setItem(CART_KEY, JSON.stringify(cart));
  cartCount.value = cart.reduce((sum, item) => sum + item.quantity, 0);
}

export function clearCart(): void {
  localStorage.removeItem(CART_KEY);
  cartCount.value = 0;
}

// Helper para obter configuração Turso
export function getTursoConfig(): TursoConfig | null {
  const data = localStorage.getItem(TURSO_CONFIG_KEY);
  if (!data) return null;
  try {
    const config = JSON.parse(data);
    if (config.url && config.token) {
      return config;
    }
  } catch (e) {
    console.error("Erro ao ler configuração do Turso", e);
  }
  return null;
}

// Helper para salvar configuração Turso e testar a conexão
export async function saveTursoConfig(config: TursoConfig): Promise<boolean> {
  try {
    // Tenta criar o cliente e rodar uma query simples de teste
    const client = createClient({
      url: config.url,
      authToken: config.token
    });
    
    await client.execute("SELECT 1");
    
    // Conexão bem-sucedida, salva no localStorage
    localStorage.setItem(TURSO_CONFIG_KEY, JSON.stringify(config));
    
    // Inicializa as tabelas no Turso
    await initializeTables(client);
    
    // Migra produtos do localStorage para o Turso se o Turso estiver vazio
    await migrateLocalDataToTurso(client);
    
    isDbConnected.value = true;
    return true;
  } catch (e) {
    console.error("Falha ao conectar no Turso DB:", e);
    throw e;
  }
}

// Helper para apagar configuração do Turso
export function clearTursoConfig() {
  localStorage.removeItem(TURSO_CONFIG_KEY);
  isDbConnected.value = false;
}

// Criação de tabelas no Turso
async function initializeTables(client: any) {
  await client.batch([
    `CREATE TABLE IF NOT EXISTS products (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT,
      description TEXT,
      price REAL,
      category TEXT,
      stock INTEGER,
      image_data TEXT
    )`,
    `CREATE TABLE IF NOT EXISTS orders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      customer_name TEXT,
      customer_email TEXT,
      customer_phone TEXT,
      shipping_cep TEXT,
      shipping_address TEXT,
      shipping_carrier TEXT,
      shipping_cost REAL,
      items_cost REAL,
      total_cost REAL,
      status TEXT,
      created_at TEXT
    )`,
    `CREATE TABLE IF NOT EXISTS order_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      order_id INTEGER,
      product_id INTEGER,
      product_name TEXT,
      quantity INTEGER,
      price REAL
    )`
  ], "write");
}

// Migrar dados do localStorage para o Turso (rodado apenas uma vez se o Turso estiver sem produtos)
async function migrateLocalDataToTurso(client: any) {
  const testRes = await client.execute("SELECT COUNT(*) as count FROM products");
  const count = testRes.rows[0]?.count || 0;
  
  if (Number(count) === 0) {
    // Pega produtos locais
    let localProducts = INITIAL_PRODUCTS;
    const stored = localStorage.getItem(LOCAL_PRODUCTS_KEY);
    if (stored) {
      try {
        localProducts = JSON.parse(stored);
      } catch (e) {}
    }
    
    // Insere cada produto no Turso
    const statements = localProducts.map(p => ({
      sql: "INSERT INTO products (name, description, price, category, stock, image_data) VALUES (?, ?, ?, ?, ?, ?)",
      args: [p.name, p.description, p.price, p.category, p.stock, p.image_data]
    }));
    
    if (statements.length > 0) {
      await client.batch(statements, "write");
    }
  }
}

// Obtém o cliente libSQL configurado ou retorna null (para usar LocalStorage)
export function getDbClient() {
  // 1. Tenta obter das variáveis de ambiente do Vite (ótimo para deploys em produção Vercel/Netlify)
  const envUrl = import.meta.env.VITE_TURSO_DB_URL;
  const envToken = import.meta.env.VITE_TURSO_DB_TOKEN;
  
  if (envUrl && envToken) {
    return createClient({
      url: envUrl,
      authToken: envToken
    });
  }

  // 2. Fallback para configuração manual no localStorage
  const config = getTursoConfig();
  if (!config) return null;
  return createClient({
    url: config.url,
    authToken: config.token
  });
}

// Inicializa tabelas automaticamente se configurado via variáveis de ambiente
if (typeof document !== 'undefined') {
  const client = getDbClient();
  if (client && import.meta.env.VITE_TURSO_DB_URL) {
    initializeTables(client)
      .then(() => migrateLocalDataToTurso(client))
      .catch(err => console.error("Falha ao inicializar tabelas automáticas do Turso:", err));
  }
}

/* ==========================================
   CRUD de PRODUTOS
   ========================================== */

export async function fetchProducts(): Promise<Product[]> {
  const client = getDbClient();
  if (client) {
    try {
      const res = await client.execute("SELECT * FROM products ORDER BY id DESC");
      return res.rows.map((row: any) => ({
        id: Number(row.id),
        name: String(row.name),
        description: String(row.description),
        price: Number(row.price),
        category: String(row.category),
        stock: Number(row.stock),
        image_data: String(row.image_data)
      }));
    } catch (e) {
      console.error("Falha ao buscar produtos no Turso, usando fallback local", e);
    }
  }
  
  // Fallback Local Storage
  const stored = localStorage.getItem(LOCAL_PRODUCTS_KEY);
  if (!stored) {
    localStorage.setItem(LOCAL_PRODUCTS_KEY, JSON.stringify(INITIAL_PRODUCTS));
    return INITIAL_PRODUCTS.map((p, idx) => ({ ...p, id: idx + 1 }));
  }
  try {
    return JSON.parse(stored);
  } catch (e) {
    return INITIAL_PRODUCTS.map((p, idx) => ({ ...p, id: idx + 1 }));
  }
}

export async function createProduct(product: Omit<Product, "id">): Promise<Product> {
  const client = getDbClient();
  if (client) {
    try {
      const res = await client.execute({
        sql: "INSERT INTO products (name, description, price, category, stock, image_data) VALUES (?, ?, ?, ?, ?, ?) RETURNING id",
        args: [product.name, product.description, product.price, product.category, product.stock, product.image_data]
      });
      const newId = Number(res.rows[0]?.id);
      return { ...product, id: newId };
    } catch (e) {
      console.error("Falha ao inserir produto no Turso, inserindo local", e);
    }
  }
  
  // Fallback Local Storage
  const products = await fetchProducts();
  const newId = products.length > 0 ? Math.max(...products.map(p => p.id || 0)) + 1 : 1;
  const newProduct = { ...product, id: newId };
  products.unshift(newProduct); // Adiciona no início da lista
  localStorage.setItem(LOCAL_PRODUCTS_KEY, JSON.stringify(products));
  return newProduct;
}

export async function updateProduct(product: Product): Promise<void> {
  const client = getDbClient();
  if (client) {
    try {
      await client.execute({
        sql: "UPDATE products SET name = ?, description = ?, price = ?, category = ?, stock = ?, image_data = ? WHERE id = ?",
        args: [product.name, product.description, product.price, product.category, product.stock, product.image_data, product.id!]
      });
      return;
    } catch (e) {
      console.error("Falha ao atualizar produto no Turso, atualizando local", e);
    }
  }
  
  // Fallback Local Storage
  const products = await fetchProducts();
  const idx = products.findIndex(p => p.id === product.id);
  if (idx !== -1) {
    products[idx] = product;
    localStorage.setItem(LOCAL_PRODUCTS_KEY, JSON.stringify(products));
  }
}

export async function deleteProduct(productId: number): Promise<void> {
  const client = getDbClient();
  if (client) {
    try {
      await client.execute({
        sql: "DELETE FROM products WHERE id = ?",
        args: [productId]
      });
      return;
    } catch (e) {
      console.error("Falha ao deletar produto no Turso, deletando local", e);
    }
  }
  
  // Fallback Local Storage
  let products = await fetchProducts();
  products = products.filter(p => p.id !== productId);
  localStorage.setItem(LOCAL_PRODUCTS_KEY, JSON.stringify(products));
}

/* ==========================================
   CRUD de PEDIDOS
   ========================================== */

export async function fetchOrders(): Promise<Order[]> {
  const client = getDbClient();
  if (client) {
    try {
      const ordersRes = await client.execute("SELECT * FROM orders ORDER BY id DESC");
      const ordersList: Order[] = ordersRes.rows.map((row: any) => ({
        id: Number(row.id),
        customer_name: String(row.customer_name),
        customer_email: String(row.customer_email),
        customer_phone: String(row.customer_phone),
        shipping_cep: String(row.shipping_cep),
        shipping_address: String(row.shipping_address),
        shipping_carrier: String(row.shipping_carrier),
        shipping_cost: Number(row.shipping_cost),
        items_cost: Number(row.items_cost),
        total_cost: Number(row.total_cost),
        status: row.status as Order["status"],
        created_at: String(row.created_at),
        items: []
      }));
      
      // Busca todos os itens dos pedidos
      for (const order of ordersList) {
        const itemsRes = await client.execute({
          sql: "SELECT * FROM order_items WHERE order_id = ?",
          args: [order.id!]
        });
        order.items = itemsRes.rows.map((row: any) => ({
          id: Number(row.id),
          order_id: Number(row.order_id),
          product_id: Number(row.product_id),
          product_name: String(row.product_name),
          quantity: Number(row.quantity),
          price: Number(row.price)
        }));
      }
      return ordersList;
    } catch (e) {
      console.error("Falha ao buscar pedidos no Turso, usando local", e);
    }
  }
  
  // Fallback Local Storage
  const storedOrders = localStorage.getItem(LOCAL_ORDERS_KEY);
  const storedItems = localStorage.getItem(LOCAL_ORDER_ITEMS_KEY);
  if (!storedOrders) return [];
  
  try {
    const ordersList: Order[] = JSON.parse(storedOrders);
    const itemsList: OrderItem[] = storedItems ? JSON.parse(storedItems) : [];
    
    return ordersList.map(o => ({
      ...o,
      items: itemsList.filter(i => i.order_id === o.id)
    })).sort((a,b) => (b.id || 0) - (a.id || 0));
  } catch (e) {
    return [];
  }
}

export async function createOrder(order: Omit<Order, "id" | "items">, items: Omit<OrderItem, "id" | "order_id">[]): Promise<number> {
  const client = getDbClient();
  
  if (client) {
    try {
      // Inserção no Turso dentro de uma transação batch
      const orderInsertRes = await client.execute({
        sql: `INSERT INTO orders (customer_name, customer_email, customer_phone, shipping_cep, shipping_address, shipping_carrier, shipping_cost, items_cost, total_cost, status, created_at) 
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?) RETURNING id`,
        args: [
          order.customer_name,
          order.customer_email,
          order.customer_phone,
          order.shipping_cep,
          order.shipping_address,
          order.shipping_carrier,
          order.shipping_cost,
          order.items_cost,
          order.total_cost,
          order.status,
          order.created_at
        ]
      });
      
      const newOrderId = Number(orderInsertRes.rows[0]?.id);
      
      // Cria comandos para inserir os itens do pedido e reduzir o estoque
      const batchCommands: any[] = [];
      
      for (const item of items) {
        batchCommands.push({
          sql: "INSERT INTO order_items (order_id, product_id, product_name, quantity, price) VALUES (?, ?, ?, ?, ?)",
          args: [newOrderId, item.product_id, item.product_name, item.quantity, item.price]
        });
        batchCommands.push({
          sql: "UPDATE products SET stock = MAX(0, stock - ?) WHERE id = ?",
          args: [item.quantity, item.product_id]
        });
      }
      
      if (batchCommands.length > 0) {
        await client.batch(batchCommands, "write");
      }
      
      return newOrderId;
    } catch (e) {
      console.error("Falha ao criar pedido no Turso, criando local", e);
    }
  }
  
  // Fallback Local Storage
  const orders = localStorage.getItem(LOCAL_ORDERS_KEY) ? JSON.parse(localStorage.getItem(LOCAL_ORDERS_KEY)!) : [];
  const storedItems = localStorage.getItem(LOCAL_ORDER_ITEMS_KEY) ? JSON.parse(localStorage.getItem(LOCAL_ORDER_ITEMS_KEY)!) : [];
  
  const newOrderId = orders.length > 0 ? Math.max(...orders.map((o: any) => o.id || 0)) + 1 : 10001;
  const newOrder = { ...order, id: newOrderId };
  orders.push(newOrder);
  localStorage.setItem(LOCAL_ORDERS_KEY, JSON.stringify(orders));
  
  const newItems = items.map((item, index) => ({
    ...item,
    id: storedItems.length + index + 1,
    order_id: newOrderId
  }));
  storedItems.push(...newItems);
  localStorage.setItem(LOCAL_ORDER_ITEMS_KEY, JSON.stringify(storedItems));
  
  // Atualiza estoques dos produtos locais
  const localProducts = await fetchProducts();
  for (const item of items) {
    const prod = localProducts.find(p => p.id === item.product_id);
    if (prod) {
      prod.stock = Math.max(0, prod.stock - item.quantity);
    }
  }
  localStorage.setItem(LOCAL_PRODUCTS_KEY, JSON.stringify(localProducts));
  
  return newOrderId;
}

export async function updateOrderStatus(orderId: number, status: Order["status"]): Promise<void> {
  const client = getDbClient();
  if (client) {
    try {
      await client.execute({
        sql: "UPDATE orders SET status = ? WHERE id = ?",
        args: [status, orderId]
      });
      return;
    } catch (e) {
      console.error("Falha ao atualizar status no Turso, atualizando local", e);
    }
  }
  
  // Fallback Local Storage
  const stored = localStorage.getItem(LOCAL_ORDERS_KEY);
  if (stored) {
    try {
      const orders: Order[] = JSON.parse(stored);
      const idx = orders.findIndex(o => o.id === orderId);
      if (idx !== -1) {
        orders[idx].status = status;
        localStorage.setItem(LOCAL_ORDERS_KEY, JSON.stringify(orders));
      }
    } catch (e) {}
  }
}

/* ==========================================
   CARRINHO DO CLIENTE (Persistido localmente no navegador - Movido para o topo)
   ========================================== */

/* ==========================================
   SIMULADOR DE FRETE BRASILEIRO
   ========================================== */

export interface ShippingOption {
  carrier: string;
  price: number;
  deliveryDays: number;
}

export function calculateShipping(cep: string): ShippingOption[] {
  // Limpa caracteres especiais do CEP
  const cleanCep = cep.replace(/\D/g, "");
  
  if (cleanCep.length !== 8) {
    throw new Error("CEP inválido. Digite um CEP com 8 dígitos.");
  }
  
  // Lógica de cálculo baseada na primeira casa decimal do CEP (regiões do Brasil)
  const firstDigit = cleanCep[0];
  let basePrice = 22.50;
  let baseDays = 5;
  
  switch (firstDigit) {
    case "0": // Grande SP
    case "1": // Interior SP
      basePrice = 14.90;
      baseDays = 2;
      break;
    case "2": // RJ e ES
    case "3": // MG
      basePrice = 18.50;
      baseDays = 4;
      break;
    case "4": // BA, SE
    case "5": // PE, AL, PB, RN
      basePrice = 25.00;
      baseDays = 6;
      break;
    case "6": // CE, PI, MA, AM, RR, PA, AP
      basePrice = 32.80;
      baseDays = 9;
      break;
    case "7": // DF, GO, TO, MT, MS, RO, AC
      basePrice = 28.50;
      baseDays = 7;
      break;
    case "8": // PR, SC
    case "9": // RS
      basePrice = 20.00;
      baseDays = 5;
      break;
  }
  
  return [
    {
      carrier: "Correios PAC (Econômico)",
      price: basePrice,
      deliveryDays: baseDays
    },
    {
      carrier: "Correios SEDEX (Expresso)",
      price: Number((basePrice * 1.8 + 5).toFixed(2)),
      deliveryDays: Math.max(1, baseDays - 3)
    }
  ];
}
