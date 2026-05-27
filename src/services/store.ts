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
  customer_email?: string;
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
export const themeMode = ref<'dark' | 'light'>('light');
export const themeColor = ref<string>(localStorage.getItem("theme_color") || 'gold');

export function applyTheme() {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  
  // Sempre força o modo claro (light) no elemento raiz
  root.classList.add('light');
  root.classList.remove('dark');
  
  // Classe do tema de cor
  const colorClasses = ['theme-gold', 'theme-purple', 'theme-emerald', 'theme-blue', 'theme-orange', 'theme-red'];
  colorClasses.forEach(c => root.classList.remove(c));
  root.classList.add(`theme-${themeColor.value}`);
}

export function setThemeMode(mode: 'dark' | 'light') {
  themeMode.value = 'light';
  localStorage.setItem("theme_mode", 'light');
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
const HOOKAH_SVG = `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 300" width="100%" height="100%"><defs><linearGradient id="hk-grad" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" style="stop-color:%23151515;stop-opacity:1" /><stop offset="100%" style="stop-color:%23050505;stop-opacity:1" /></linearGradient><linearGradient id="gold" x1="0%" y1="0%" x2="100%" y2="0%"><stop offset="0%" style="stop-color:%23c5a880;stop-opacity:1" /><stop offset="50%" style="stop-color:%23e2d1b9;stop-opacity:1" /><stop offset="100%" style="stop-color:%239a7b56;stop-opacity:1" /></linearGradient></defs><rect width="400" height="300" rx="16" fill="url(%23hk-grad)" /><g stroke="url(%23gold)" fill="none" stroke-linecap="round" opacity="0.15" stroke-width="1.5"><path d="M50 150 Q100 100 200 150 T350 150" /><path d="M50 120 Q100 70 200 120 T350 120" /><path d="M50 180 Q100 130 200 180 T350 180" /></g><g fill="none" stroke="url(%23gold)" stroke-width="2.5"><path d="M190 60 C190 60, 195 40, 190 35 C185 30, 200 25, 200 15" stroke-width="1.5" opacity="0.6" /><path d="M210 60 C210 60, 215 45, 210 40 C205 35, 215 30, 215 20" stroke-width="1.5" opacity="0.6" /><path d="M185 85 L215 85" stroke-width="4" /><path d="M185 105 L215 105" stroke-width="4" /><path d="M200 65 L200 210" stroke-width="5" /><rect x="180" y="65" width="40" height="15" rx="3" fill="url(%23gold)" /><ellipse cx="200" cy="115" rx="30" ry="10" fill="url(%23gold)" /><ellipse cx="200" cy="165" rx="35" ry="12" fill="url(%23gold)" /><path d="M170 215 C170 170, 230 170, 230 215 C230 240, 220 250, 200 250 C180 250, 170 240, 170 215 Z" fill="%230f0f0f" stroke="url(%23gold)" stroke-width="3" /><path d="M178 185 C160 185, 140 200, 140 220 C140 230, 145 235, 150 235" stroke-width="3" /><path d="M140 220 L110 210 Q90 200 100 170 L115 130" stroke-width="4" /><rect x="110" y="115" width="10" height="20" rx="2" fill="url(%23gold)" /></g><text x="200" y="275" font-family="sans-serif" font-weight="bold" font-size="16" fill="%23FAF7F2" text-anchor="middle">Narguilé Triton Hookah Gold</text><text x="200" y="290" font-family="sans-serif" font-size="10" fill="%23c5a880" text-anchor="middle">Sopros de Ouro &amp; Obsidian</text></svg>`;

const ESSENCE_SVG = `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 300" width="100%" height="100%"><defs><linearGradient id="es-grad" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" style="stop-color:%231c1917;stop-opacity:1" /><stop offset="100%" style="stop-color:%230c0a09;stop-opacity:1" /></linearGradient><linearGradient id="gold-bright" x1="0%" y1="0%" x2="100%" y2="0%"><stop offset="0%" style="stop-color:%23d4af37;stop-opacity:1" /><stop offset="100%" style="stop-color:%23f3e5ab;stop-opacity:1" /></linearGradient></defs><rect width="400" height="300" rx="16" fill="url(%23es-grad)" /><rect x="110" y="60" width="180" height="150" rx="12" fill="%231a1a1a" stroke="url(%23gold-bright)" stroke-width="2" /><rect x="125" y="75" width="150" height="120" rx="6" fill="%230c0a09" opacity="0.8" /><path d="M200 95 C190 95, 175 105, 175 120 C175 135, 200 135, 200 145 C200 155, 185 160, 185 160" fill="none" stroke="url(%23gold-bright)" stroke-width="2" stroke-linecap="round" opacity="0.3" /><text x="200" y="125" font-family="sans-serif" font-weight="black" font-size="24" fill="url(%23gold-bright)" text-anchor="middle">NAY</text><text x="200" y="145" font-family="sans-serif" font-weight="bold" font-size="11" fill="%23ffffff" tracking-wider="3" text-anchor="middle">SECRET</text><rect x="140" y="165" width="120" height="18" rx="4" fill="%23d4af37" /><text x="200" y="178" font-family="sans-serif" font-weight="bold" font-size="8" fill="%231a1a1a" text-anchor="middle">PREMIUM SHISHA</text><text x="200" y="250" font-family="sans-serif" font-weight="bold" font-size="18" fill="%23FAF7F2" text-anchor="middle">Essência Nay Secret (10 un.)</text><text x="200" y="270" font-family="sans-serif" font-size="10" fill="%23FAF7F2" opacity="0.6" text-anchor="middle">Fardo Fechado de Alta Duração</text></svg>`;

const CHARCOAL_SVG = `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 300" width="100%" height="100%"><defs><linearGradient id="ch-grad" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" style="stop-color:%230f172a;stop-opacity:1" /><stop offset="100%" style="stop-color:%23020617;stop-opacity:1" /></linearGradient><linearGradient id="ember" x1="0%" y1="100%" x2="0%" y2="0%"><stop offset="0%" style="stop-color:%23ef4444;stop-opacity:1" /><stop offset="50%" style="stop-color:%23f97316;stop-opacity:1" /><stop offset="100%" style="stop-color:%23eab308;stop-opacity:1" /></linearGradient></defs><rect width="400" height="300" rx="16" fill="url(%23ch-grad)" /><g transform="translate(0, -10)"><polygon points="150,110 200,85 250,110 200,135" fill="%231e293b" stroke="%23334155" stroke-width="1.5" /><polygon points="150,110 200,135 200,195 150,170" fill="%230f172a" stroke="%231e293b" stroke-width="1.5" /><polygon points="250,110 200,135 200,195 250,170" fill="%23020617" stroke="%230f172a" stroke-width="1.5" /><polygon points="175,138 200,125 225,138 200,150" fill="url(%23ember)" opacity="0.85" /><polygon points="175,138 200,150 200,185 175,173" fill="url(%23ember)" opacity="0.6" /><polygon points="225,138 200,150 200,185 225,173" fill="url(%23ember)" opacity="0.7" /><circle cx="200" cy="143" r="10" fill="%23ffffff" filter="blur(4px)" opacity="0.3" /><path d="M190 70 Q200 50 195 40 T210 20" stroke="%23ffffff" fill="none" opacity="0.3" stroke-width="1.5" /></g><text x="200" y="250" font-family="sans-serif" font-weight="bold" font-size="18" fill="%23FAF7F2" text-anchor="middle">Carvão de Coco Art Coco (1kg)</text><text x="200" y="270" font-family="sans-serif" font-size="10" fill="%23f97316" font-weight="bold" text-anchor="middle">Sem Cheiro &amp; Longa Constância Térmica</text></svg>`;

const ROSH_SVG = `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 300" width="100%" height="100%"><defs><linearGradient id="rs-grad" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" style="stop-color:%231e1e24;stop-opacity:1" /><stop offset="100%" style="stop-color:%230f0f12;stop-opacity:1" /></linearGradient><linearGradient id="gold-bowl" x1="0%" y1="0%" x2="0%" y2="100%"><stop offset="0%" style="stop-color:%23c5a880;stop-opacity:1" /><stop offset="100%" style="stop-color:%23785a38;stop-opacity:1" /></linearGradient></defs><rect width="400" height="300" rx="16" fill="url(%23rs-grad)" /><g stroke="url(%23gold-bowl)" stroke-linecap="round" fill="none" opacity="0.1"><line x1="50" y1="50" x2="350" y2="250" stroke-width="1" /><line x1="50" y1="250" x2="350" y2="50" stroke-width="1" /></g><g fill="none" stroke="url(%23gold-bowl)" stroke-width="2.5"><path d="M150 80 C150 80, 200 95, 250 80 C270 120, 250 140, 200 140 C150 140, 130 120, 150 80 Z" fill="url(%23gold-bowl)" stroke="%23FAF7F2" stroke-width="1.5" /><ellipse cx="200" cy="80" rx="50" ry="15" fill="%231a1a1a" stroke="url(%23gold-bowl)" stroke-width="2" /><path d="M170 140 L180 220 L220 220 L230 140 Z" fill="%23121212" stroke="url(%23gold-bowl)" stroke-width="2.5" /><rect x="175" y="220" width="50" height="15" rx="2" fill="url(%23gold-bowl)" /><circle cx="200" cy="80" r="6" fill="url(%23gold-bowl)" /><circle cx="180" cy="80" r="3" fill="url(%23gold-bowl)" /><circle cx="220" cy="80" r="3" fill="url(%23gold-bowl)" /></g><text x="200" y="260" font-family="sans-serif" font-weight="bold" font-size="18" fill="%23FAF7F2" text-anchor="middle">Rosh Cerâmica Pro Hookah</text><text x="200" y="278" font-family="sans-serif" font-size="10" fill="%23c5a880" text-anchor="middle">Queima Uniforme de Alta Performance</text></svg>`;

const INITIAL_PRODUCTS: Product[] = [
  {
    name: "Narguilé Triton Hookah Gold",
    description: "Setup completo Triton Hookah de altíssimo luxo. Conta com stem em alumínio anodizado dourado, base de vidro soprado artesanalmente com detalhes pretos e dourados, prato usinado, mangueira de silicone lavável com piteira de alumínio e vedação perfeita.",
    price: 890.00,
    category: "Narguilés",
    stock: 8,
    image_data: HOOKAH_SVG
  },
  {
    name: "Essência Nay Secret (10 unidades)",
    description: "Blend de tabaco Nay com sabor premium ultra refrescante e notas adocicadas misteriosas de frutas silvestres. Caixa fechada contendo 10 unidades de 50g cada, embaladas a vácuo para preservação total do melaço e do sabor.",
    price: 120.00,
    category: "Essências",
    stock: 24,
    image_data: ESSENCE_SVG
  },
  {
    name: "Carvão de Coco Art Coco (1kg)",
    description: "Carvão premium para narguilé produzido 100% a partir da casca do coco. Totalmente natural, sem cheiro, sem gosto e com mínima produção de cinzas. Garante excelente constância térmica e duração superior a 60 minutos.",
    price: 38.00,
    category: "Carvões",
    stock: 50,
    image_data: CHARCOAL_SVG
  },
  {
    name: "Rosh Cerâmica Pro Hookah",
    description: "Queimador (rosh) cerâmico esmaltado premium. Projetado com canais de fluxo de ar otimizados e parede térmica espessa para distribuir o calor do carvão de forma uniforme, prolongando a vida útil da essência e gerando fumaça densa.",
    price: 95.00,
    category: "Acessórios",
    stock: 15,
    image_data: ROSH_SVG
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
    )`,
    `CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT
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
          order.customer_email ?? null,
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
   SIMULADOR DE FRETE BRASILEIRO
   ========================================== */

export interface ShippingOption {
  carrier: string;
  price: number;
  deliveryDays: number;
}

// Auxiliar para detectar se o CEP pertence a Cajuru-SP ou cidades vizinhas
export function isLocalRegion(cleanCep: string): boolean {
  const cepNum = parseInt(cleanCep, 10);
  if (isNaN(cepNum)) return false;
  
  const localRanges = [
    { name: "Cajuru", min: 14240000, max: 14249999 },
    { name: "Cássia dos Coqueiros", min: 14260000, max: 14269999 },
    { name: "Santa Cruz da Esperança", min: 14250000, max: 14259999 },
    { name: "Santa Rosa de Viterbo", min: 14270000, max: 14279999 },
    { name: "Serra Azul", min: 14230000, max: 14239999 },
    { name: "São Simão", min: 14200000, max: 14209999 },
    { name: "Altinópolis", min: 14350000, max: 14389999 },
    { name: "Santo Antônio da Alegria", min: 14390000, max: 14399999 },
    { name: "Serrana", min: 14150000, max: 14159999 },
    { name: "Mococa", min: 13730000, max: 13759999 },
    { name: "Tambaú", min: 13710000, max: 13714999 }
  ];
  
  return localRanges.some(range => cepNum >= range.min && cepNum <= range.max);
}

// CRUD para Configurações (Settings) no banco Turso ou local
export async function fetchSetting(key: string, defaultValue: string): Promise<string> {
  const client = getDbClient();
  if (client) {
    try {
      const res = await client.execute({
        sql: "SELECT value FROM settings WHERE key = ?",
        args: [key]
      });
      if (res.rows.length > 0 && res.rows[0].value !== null) {
        return String(res.rows[0].value);
      }
    } catch (e) {
      console.error(`Falha ao buscar setting ${key} no Turso, usando local`, e);
    }
  }
  
  // Fallback Local Storage
  const localVal = localStorage.getItem(`thorder_setting_${key}`);
  if (localVal !== null) return localVal;
  
  localStorage.setItem(`thorder_setting_${key}`, defaultValue);
  return defaultValue;
}

export async function saveSetting(key: string, value: string): Promise<void> {
  const client = getDbClient();
  if (client) {
    try {
      await client.execute({
        sql: "INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)",
        args: [key, value]
      });
      localStorage.setItem(`thorder_setting_${key}`, value);
      return;
    } catch (e) {
      console.error(`Falha ao salvar setting ${key} no Turso, salvando local`, e);
    }
  }
  
  // Fallback Local Storage
  localStorage.setItem(`thorder_setting_${key}`, value);
}

export async function calculateShipping(cep: string): Promise<ShippingOption[]> {
  // Limpa caracteres especiais do CEP
  const cleanCep = cep.replace(/\D/g, "");
  
  if (cleanCep.length !== 8) {
    throw new Error("CEP inválido. Digite um CEP com 8 dígitos.");
  }
  
  const isLocal = isLocalRegion(cleanCep);
  const storeAddress = await fetchSetting("store_address", "Rua Marechal Deodoro, 150 - Centro, Cajuru - SP");
  
  if (isLocal) {
    // CEP Local: Entrega Local (R$ 3,00) e Retirada na Loja (R$ 0,00)
    return [
      {
        carrier: "Entrega Local (Cajuru e Região)",
        price: 3.00,
        deliveryDays: 1
      },
      {
        carrier: `Retirada na Loja (${storeAddress})`,
        price: 0.00,
        deliveryDays: 0
      }
    ];
  } else {
    // Fora da região: Apenas Retirada na Loja
    return [
      {
        carrier: `Retirada na Loja (${storeAddress})`,
        price: 0.00,
        deliveryDays: 0
      }
    ];
  }
}

export async function checkStoreOpen(): Promise<{ isOpen: boolean; openTime: string; closeTime: string; isEnabled: boolean }> {
  const isEnabledStr = await fetchSetting('store_hours_enabled', 'false');
  const openTime = await fetchSetting('store_open_time', '18:00');
  const closeTime = await fetchSetting('store_close_time', '23:59');
  
  const isEnabled = isEnabledStr === 'true';
  if (!isEnabled) {
    return { isOpen: true, openTime, closeTime, isEnabled };
  }
  
  const now = new Date();
  const currentHours = now.getHours();
  const currentMinutes = now.getMinutes();
  const currentTimeInMinutes = currentHours * 60 + currentMinutes;
  
  const [openH, openM] = openTime.split(':').map(Number);
  const [closeH, closeM] = closeTime.split(':').map(Number);
  const openTimeInMinutes = openH * 60 + openM;
  const closeTimeInMinutes = closeH * 60 + closeM;
  
  let isOpen = false;
  if (closeTimeInMinutes >= openTimeInMinutes) {
    isOpen = currentTimeInMinutes >= openTimeInMinutes && currentTimeInMinutes <= closeTimeInMinutes;
  } else {
    isOpen = currentTimeInMinutes >= openTimeInMinutes || currentTimeInMinutes <= closeTimeInMinutes;
  }
  
  return { isOpen, openTime, closeTime, isEnabled };
}
