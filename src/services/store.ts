import { createClient } from "@libsql/client/web";
import { ref } from "vue";

// Interface para Empresa (Tenant)
export interface Company {
  id?: number;
  slug: string;
  name: string;
  description: string;
  theme_color: string; // gold | purple | emerald | blue | orange | red
  image_data?: string;
  created_at?: string;
}

// Interface para Usuário (Administrador ou Super Admin)
export interface User {
  id?: number;
  name: string;
  username: string;
  email?: string;
  password_hash?: string;
  role: 'superadmin' | 'store_admin';
  company_slug?: string | null;
  created_at?: string;
}

// Interface para Métricas Globais da Plataforma
export interface PlatformStats {
  totalCompanies: number;
  totalOrders: number;
  totalRevenue: number;
  totalProducts: number;
}

// Empresa com Métricas Consolidadas para o Super Admin
export interface CompanyWithStats extends Company {
  productsCount: number;
  ordersCount: number;
  totalRevenue: number;
}

// Interface para Produto
export interface Product {
  id?: number;
  name: string;
  description: string;
  price: number;
  category: string;
  stock: number;
  image_data: string; // Base64 ou SVG inline
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
  coupon_code?: string;
  discount_amount?: number;
  payment_method?: 'pix' | 'cartao' | 'dinheiro';
  change_amount?: number;
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

// Interface para Opção de Frete
export interface ShippingOption {
  carrier: string;
  price: number;
  deliveryDays: number;
  distanceKm?: number;
  isBeyondMaxRadius?: boolean;
  freeShippingApplied?: boolean;
}

// Interface para Faixas de Raio / Distância de Entrega
export interface DeliveryTier {
  maxKm: number;
  price: number;
}

// Interface para Configurações Completas de Entrega da Loja
export interface DeliverySettings {
  storeCep: string;
  storeAddress: string;
  storeLat: number | null;
  storeLng: number | null;
  storeWhatsapp: string;
  maxRadiusKm: number;
  tiers: DeliveryTier[];
  freeShippingMin: number;
  pickupEnabled: boolean;
}

// Interface para Cupom
export interface Coupon {
  id?: number;
  code: string;
  discount_type: 'fixed' | 'percentage';
  discount_value: number;
  min_purchase_cost?: number;
  expiration_date?: string; // Formato YYYY-MM-DD
  limit_uses?: number;
  used_count: number;
  is_active: boolean;
}

// Chaves de LocalStorage (Serão parametrizadas com o slug da empresa ativa)
const TURSO_CONFIG_KEY = "thorder_turso_config";

// ==========================================
// ESTADO DE AUTENTICAÇÃO E SESSÃO
// ==========================================

export const AUTH_USER_KEY = "thorder_auth_user";
export const IMPERSONATE_KEY = "thorder_impersonate_slug";

export const currentUser = ref<User | null>(null);
export const isImpersonating = ref<boolean>(false);

// Restaura usuário e impersonate salvos na inicialização
if (typeof window !== 'undefined') {
  try {
    const saved = sessionStorage.getItem(AUTH_USER_KEY);
    if (saved) {
      currentUser.value = JSON.parse(saved);
    }
    const imp = sessionStorage.getItem(IMPERSONATE_KEY);
    if (imp) {
      isImpersonating.value = true;
    }
  } catch (e) {}
}

export async function sha256(message: string): Promise<string> {
  if (typeof window !== 'undefined' && window.crypto && window.crypto.subtle) {
    const msgBuffer = new TextEncoder().encode(message);
    const hashBuffer = await window.crypto.subtle.digest('SHA-256', msgBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }
  return message;
}

// ==========================================
// ESTADO MULTI-EMPRESA E RESOLUÇÃO DE SUBDOMÍNIO
// ==========================================

export const currentCompanySlug = ref<string>('');
export const currentCompany = ref<Company | null>(null);

export const INITIAL_COMPANIES: Company[] = [
  {
    slug: "tabacaria",
    name: "X-Smoke Tabacaria",
    description: "Hookah Shop & Tabacaria Premium",
    theme_color: "gold"
  },
  {
    slug: "doceria",
    name: "Doceria Gourmet",
    description: "Doces finos, bolos decorados e brigadeiros artesanais",
    theme_color: "purple"
  },
  {
    slug: "pizzaria",
    name: "Pizzaria Bella Italia",
    description: "Pizzas artesanais assadas no forno de pedra",
    theme_color: "red"
  }
];

// Extrai o slug da empresa ativa a partir do hostname ou de query parameter
export function getCompanySlugFromHostname(): string | null {
  if (typeof window === 'undefined') return null;
  const hostname = window.location.hostname.toLowerCase();
  
  // Suporte a query parameter (ex: localhost:5173/?company=xsmoke)
  const urlParams = new URLSearchParams(window.location.search);
  const companyQuery = urlParams.get('company');
  if (companyQuery) return companyQuery.toLowerCase();

  // Se for localhost puro ou IP local
  if (hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '0.0.0.0') {
    return null;
  }

  // Se termina com .localhost (ex: xsmoke.localhost)
  if (hostname.endsWith('.localhost')) {
    const sub = hostname.replace('.localhost', '');
    if (sub && sub !== 'localhost') return sub;
    return null;
  }

  const parts = hostname.split('.');
  const filteredParts = parts[0] === 'www' ? parts.slice(1) : parts;
  
  // Trata ccTLDs comuns de 2 níveis (ex: .com.br, .net.br, .co.uk)
  const isSecondLevelCctld = filteredParts.length >= 3 && ['com.br', 'org.br', 'net.br', 'co.uk', 'com.ar'].includes(`${filteredParts[filteredParts.length - 2]}.${filteredParts[filteredParts.length - 1]}`);
  const baseDomainPartsCount = isSecondLevelCctld ? 3 : 2;

  // Se tem partes a mais que o domínio base, a primeira parte é o subdomínio da loja
  if (filteredParts.length > baseDomainPartsCount) {
    const subdomain = filteredParts[0];
    if (subdomain && !['admin', 'api', 'portal', 'mail', 'app'].includes(subdomain)) {
      return subdomain;
    }
  }

  return null;
}

// Retorna os formatos de URL e subdomínio da loja para visualização e links
export function getStoreUrls(slug: string): { 
  subdomainUrl: string; 
  pathUrl: string; 
  fullSubdomainUrl: string; 
  fullPathUrl: string;
  rootDomain: string;
} {
  const isBrowser = typeof window !== 'undefined';
  const protocol = isBrowser ? window.location.protocol : 'https:';
  const hostname = isBrowser ? window.location.hostname.toLowerCase() : 'thorder.com';
  const port = isBrowser && window.location.port ? `:${window.location.port}` : '';

  let rootDomain = 'thorder.com';
  if (isBrowser) {
    if (hostname === 'localhost' || hostname === '127.0.0.1') {
      rootDomain = `localhost${port}`;
    } else {
      const parts = hostname.split('.');
      const filtered = parts[0] === 'www' ? parts.slice(1) : parts;
      const isSecondLevelCctld = filtered.length >= 3 && ['com.br', 'org.br', 'net.br', 'co.uk', 'com.ar'].includes(`${filtered[filtered.length - 2]}.${filtered[filtered.length - 1]}`);
      const baseCount = isSecondLevelCctld ? 3 : 2;
      rootDomain = filtered.slice(-baseCount).join('.');
    }
  }

  const subdomainUrl = `${slug}.${rootDomain}`;
  const pathUrl = `/${slug}`;
  const fullSubdomainUrl = `${protocol}//${slug}.${rootDomain}`;
  const fullPathUrl = isBrowser ? `${window.location.origin}/${slug}` : `https://${rootDomain}/${slug}`;

  return {
    subdomainUrl,
    pathUrl,
    fullSubdomainUrl,
    fullPathUrl,
    rootDomain
  };
}

export function clearCurrentCompanySlug() {
  currentCompanySlug.value = '';
  currentCompany.value = null;
  setThemeColor('purple'); // Tema neutro da Landing Page
}

export async function setCurrentCompanySlug(slug: string) {
  currentCompanySlug.value = slug;
  const company = await fetchCompanyBySlug(slug);
  if (company) {
    currentCompany.value = company;
    setThemeColor(company.theme_color);
  } else {
    currentCompany.value = {
      slug,
      name: slug.charAt(0).toUpperCase() + slug.slice(1),
      description: "Catálogo de Produtos",
      theme_color: "gold"
    };
    setThemeColor("gold");
  }
  
  // Recarrega o contador do carrinho com base no carrinho da nova empresa ativa
  cartCount.value = getCart().reduce((sum, item) => sum + item.quantity, 0);
}

// ==========================================
// CONTROLE DE TEMAS, PALETAS E ACESSIBILIDADE
// ==========================================
export const themeMode = ref<'dark' | 'light'>('light');
export const themeColor = ref<string>('gold');

export interface ThemePreset {
  id: string;
  name: string;
  subtitle: string;
  hex: string;
  category: 'luxo' | 'alimentos' | 'moderno' | 'natureza' | 'minimalista';
}

export const THEME_PRESETS: ThemePreset[] = [
  // 1. Luxo & Sofisticação
  { id: 'gold', name: 'Dourado Champagne', subtitle: 'Luxo, Tabacarias e Joalherias', hex: '#C5A880', category: 'luxo' },
  { id: 'wine', name: 'Vinho / Burgundy', subtitle: 'Adegas, Vinhos e Alta Gastronomia', hex: '#881337', category: 'luxo' },
  { id: 'rose', name: 'Rosé / Millennial', subtitle: 'Doces Finos, Cosméticos e Moda', hex: '#EC4899', category: 'luxo' },
  
  // 2. Alimentos & Gastronomia
  { id: 'red', name: 'Vermelho Carmesim', subtitle: 'Pizzarias, Hamburguerias e Carnes', hex: '#EF4444', category: 'alimentos' },
  { id: 'orange', name: 'Laranja Sunset', subtitle: 'Fast-food, Lanches e Açaí', hex: '#F97316', category: 'alimentos' },
  { id: 'amber', name: 'Âmbar Dourado', subtitle: 'Padarias, Cervejarias e Cafeterias', hex: '#F59E0B', category: 'alimentos' },

  // 3. Moderno & Tecnologia
  { id: 'purple', name: 'Roxo Elétrico', subtitle: 'Criatividade, Tech e Tabacarias', hex: '#8B5CF6', category: 'moderno' },
  { id: 'blue', name: 'Azul Royal', subtitle: 'Corporativo, Confiança e Conveniência', hex: '#3B82F6', category: 'moderno' },
  { id: 'cyan', name: 'Ciano Tropical', subtitle: 'Bebidas, Sorveterias e Verão', hex: '#06B6D4', category: 'moderno' },
  { id: 'indigo', name: 'Índigo Neon', subtitle: 'Moda Jovem, Eletrônicos e Games', hex: '#6366F1', category: 'moderno' },

  // 4. Natureza & Bem-estar
  { id: 'emerald', name: 'Verde Esmeralda', subtitle: 'Saúde, Orgânicos e Farmácias', hex: '#10B981', category: 'natureza' },
  { id: 'forest', name: 'Verde Floresta', subtitle: 'Botânica, Sustentabilidade e Chás', hex: '#15803D', category: 'natureza' },
  { id: 'sage', name: 'Verde Sálvia / Oliva', subtitle: 'Minimalismo, Decoração e Plantas', hex: '#65A30D', category: 'natureza' },

  // 5. Minimalista & Urbano
  { id: 'navy', name: 'Azul Midnight Navy', subtitle: 'Elegância Clássica e Vestuário', hex: '#1E3A8A', category: 'minimalista' },
  { id: 'slate', name: 'Grafite / Carvão', subtitle: 'Streetwear, Barber Shop e Urbano', hex: '#334155', category: 'minimalista' },
  { id: 'black', name: 'Preto Ônix / Obsidian', subtitle: 'Ultra Luxo, Design e Monocromático', hex: '#18181B', category: 'minimalista' },
];

// Converte qualquer identificador de cor ou preset para código HEX canônico
export function resolveThemeHex(color: string): string {
  if (!color) return '#C5A880';
  const trimmed = color.trim();
  if (trimmed.startsWith('#')) {
    // Normaliza hex de 3 para 6 dígitos se necessário
    if (trimmed.length === 4) {
      return `#${trimmed[1]}${trimmed[1]}${trimmed[2]}${trimmed[2]}${trimmed[3]}${trimmed[3]}`;
    }
    return trimmed;
  }
  const found = THEME_PRESETS.find(p => p.id === trimmed.toLowerCase());
  if (found) return found.hex;

  // Fallbacks para compatibilidade
  const legacyMap: Record<string, string> = {
    gold: '#C5A880',
    purple: '#8B5CF6',
    emerald: '#10B981',
    blue: '#3B82F6',
    orange: '#F97316',
    red: '#EF4444'
  };
  return legacyMap[trimmed.toLowerCase()] || '#C5A880';
}

// Calcula a luminância relativa sRGB (WCAG 2.1)
export function getRelativeLuminance(hex: string): number {
  const clean = hex.replace('#', '');
  const r = (parseInt(clean.substring(0, 2), 16) || 0) / 255;
  const g = (parseInt(clean.substring(2, 4), 16) || 0) / 255;
  const b = (parseInt(clean.substring(4, 6), 16) || 0) / 255;

  const sR = r <= 0.03928 ? r / 12.92 : Math.pow((r + 0.055) / 1.055, 2.4);
  const sG = g <= 0.03928 ? g / 12.92 : Math.pow((g + 0.055) / 1.055, 2.4);
  const sB = b <= 0.03928 ? b / 12.92 : Math.pow((b + 0.055) / 1.055, 2.4);

  return 0.2126 * sR + 0.7152 * sG + 0.0722 * sB;
}

// Determina se a cor de texto acessível em cima deste fundo deve ser Branco ou Preto
export function getContrastTextColor(hex: string): '#09090b' | '#ffffff' {
  const lum = getRelativeLuminance(hex);
  // Se a luminância for maior que 0.36 (cores claras como amarelo, dourado claro, limão),
  // texto preto/escuro oferece maior taxa de contraste (>= 4.5:1 / 7:1)
  return lum > 0.36 ? '#09090b' : '#ffffff';
}

// Ajusta brilho da cor para compor gradientes harmônicos
export function adjustColorBrightness(hex: string, percent: number): string {
  const clean = hex.replace('#', '');
  const num = parseInt(clean, 16) || 0;
  let r = (num >> 16) + Math.round(255 * (percent / 100));
  let g = ((num >> 8) & 0x00FF) + Math.round(255 * (percent / 100));
  let b = (num & 0x0000FF) + Math.round(255 * (percent / 100));

  r = Math.min(255, Math.max(0, r));
  g = Math.min(255, Math.max(0, g));
  b = Math.min(255, Math.max(0, b));

  return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
}

export function applyTheme() {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  
  // Força modo claro
  root.classList.add('light');
  root.classList.remove('dark');
  
  const current = themeColor.value || 'gold';
  const hex = resolveThemeHex(current);
  const textColor = getContrastTextColor(hex);
  const brandEnd = adjustColorBrightness(hex, -25);

  // Aplica as variáveis CSS dinâmicas diretamente no :root
  root.style.setProperty('--theme-primary', hex);
  root.style.setProperty('--theme-primary-foreground', textColor);
  root.style.setProperty('--theme-ring', hex);
  root.style.setProperty('--brand-start', hex);
  root.style.setProperty('--brand-end', brandEnd);
  
  // Limpa classes anteriores de tema e adiciona a ativa
  const knownClasses = THEME_PRESETS.map(p => `theme-${p.id}`);
  knownClasses.push('theme-custom');
  knownClasses.forEach(c => root.classList.remove(c));

  if (current.startsWith('#')) {
    root.classList.add('theme-custom');
  } else {
    root.classList.add(`theme-${current}`);
  }
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

// ==========================================
// PRODUTOS INICIAIS E SVGs ELEGANTES
// ==========================================

const HOOKAH_SVG = `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 300" width="100%" height="100%"><defs><linearGradient id="hk-grad" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" style="stop-color:%23151515;stop-opacity:1" /><stop offset="100%" style="stop-color:%23050505;stop-opacity:1" /></linearGradient><linearGradient id="gold" x1="0%" y1="0%" x2="100%" y2="0%"><stop offset="0%" style="stop-color:%23c5a880;stop-opacity:1" /><stop offset="50%" style="stop-color:%23e2d1b9;stop-opacity:1" /><stop offset="100%" style="stop-color:%239a7b56;stop-opacity:1" /></linearGradient></defs><rect width="400" height="300" rx="16" fill="url(%23hk-grad)" /><g stroke="url(%23gold)" fill="none" stroke-linecap="round" opacity="0.15" stroke-width="1.5"><path d="M50 150 Q100 100 200 150 T350 150" /><path d="M50 120 Q100 70 200 120 T350 120" /><path d="M50 180 Q100 130 200 180 T350 180" /></g><g fill="none" stroke="url(%23gold)" stroke-width="2.5"><path d="M190 60 C190 60, 195 40, 190 35 C185 30, 200 25, 200 15" stroke-width="1.5" opacity="0.6" /><path d="M210 60 C210 60, 215 45, 210 40 C205 35, 215 30, 215 20" stroke-width="1.5" opacity="0.6" /><path d="M185 85 L215 85" stroke-width="4" /><path d="M185 105 L215 105" stroke-width="4" /><path d="M200 65 L200 210" stroke-width="5" /><rect x="180" y="65" width="40" height="15" rx="3" fill="url(%23gold)" /><ellipse cx="200" cy="115" rx="30" ry="10" fill="url(%23gold)" /><ellipse cx="200" cy="165" rx="35" ry="12" fill="url(%23gold)" /><path d="M170 215 C170 170, 230 170, 230 215 C230 240, 220 250, 200 250 C180 250, 170 240, 170 215 Z" fill="%230f0f0f" stroke="url(%23gold)" stroke-width="3" /><path d="M178 185 C160 185, 140 200, 140 220 C140 230, 145 235, 150 235" stroke-width="3" /><path d="M140 220 L110 210 Q90 200 100 170 L115 130" stroke-width="4" /><rect x="110" y="115" width="10" height="20" rx="2" fill="url(%23gold)" /></g><text x="200" y="275" font-family="sans-serif" font-weight="bold" font-size="16" fill="%23FAF7F2" text-anchor="middle">Narguilé Triton Hookah Gold</text><text x="200" y="290" font-family="sans-serif" font-size="10" fill="%23c5a880" text-anchor="middle">Sopros de Ouro &amp; Obsidian</text></svg>`;

const ESSENCE_SVG = `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 300" width="100%" height="100%"><defs><linearGradient id="es-grad" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" style="stop-color:%231c1917;stop-opacity:1" /><stop offset="100%" style="stop-color:%230c0a09;stop-opacity:1" /></linearGradient><linearGradient id="gold-bright" x1="0%" y1="0%" x2="100%" y2="0%"><stop offset="0%" style="stop-color:%23d4af37;stop-opacity:1" /><stop offset="100%" style="stop-color:%23f3e5ab;stop-opacity:1" /></linearGradient></defs><rect width="400" height="300" rx="16" fill="url(%23es-grad)" /><rect x="110" y="60" width="180" height="150" rx="12" fill="%231a1a1a" stroke="url(%23gold-bright)" stroke-width="2" /><rect x="125" y="75" width="150" height="120" rx="6" fill="%230c0a09" opacity="0.8" /><path d="M200 95 C190 95, 175 105, 175 120 C175 135, 200 135, 200 145 C200 155, 185 160, 185 160" fill="none" stroke="url(%23gold-bright)" stroke-width="2" stroke-linecap="round" opacity="0.3" /><text x="200" y="125" font-family="sans-serif" font-weight="black" font-size="24" fill="url(%23gold-bright)" text-anchor="middle">NAY</text><text x="200" y="145" font-family="sans-serif" font-weight="bold" font-size="11" fill="%23ffffff" tracking-wider="3" text-anchor="middle">SECRET</text><rect x="140" y="165" width="120" height="18" rx="4" fill="%23d4af37" /><text x="200" y="178" font-family="sans-serif" font-weight="bold" font-size="8" fill="%231a1a1a" text-anchor="middle">PREMIUM SHISHA</text><text x="200" y="250" font-family="sans-serif" font-weight="bold" font-size="18" fill="%23FAF7F2" text-anchor="middle">Essência Nay Secret (10 un.)</text><text x="200" y="270" font-family="sans-serif" font-size="10" fill="%23FAF7F2" opacity="0.6" text-anchor="middle">Fardo Fechado de Alta Duração</text></svg>`;

const CHARCOAL_SVG = `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 300" width="100%" height="100%"><defs><linearGradient id="ch-grad" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" style="stop-color:%230f172a;stop-opacity:1" /><stop offset="100%" style="stop-color:%23020617;stop-opacity:1" /></linearGradient><linearGradient id="ember" x1="0%" y1="100%" x2="0%" y2="0%"><stop offset="0%" style="stop-color:%23ef4444;stop-opacity:1" /><stop offset="50%" style="stop-color:%23f97316;stop-opacity:1" /><stop offset="100%" style="stop-color:%23eab308;stop-opacity:1" /></linearGradient></defs><rect width="400" height="300" rx="16" fill="url(%23ch-grad)" /><g transform="translate(0, -10)"><polygon points="150,110 200,85 250,110 200,135" fill="%231e293b" stroke="%23334155" stroke-width="1.5" /><polygon points="150,110 200,135 200,195 150,170" fill="%230f172a" stroke="%231e293b" stroke-width="1.5" /><polygon points="250,110 200,135 200,195 250,170" fill="%23020617" stroke="%230f172a" stroke-width="1.5" /><polygon points="175,138 200,125 225,138 200,150" fill="url(%23ember)" opacity="0.85" /><polygon points="175,138 200,150 200,185 175,173" fill="url(%23ember)" opacity="0.6" /><polygon points="225,138 200,150 200,185 225,173" fill="url(%23ember)" opacity="0.7" /><circle cx="200" cy="143" r="10" fill="%23ffffff" filter="blur(4px)" opacity="0.3" /><path d="M190 70 Q200 50 195 40 T210 20" stroke="%23ffffff" fill="none" opacity="0.3" stroke-width="1.5" /></g><text x="200" y="250" font-family="sans-serif" font-weight="bold" font-size="18" fill="%23FAF7F2" text-anchor="middle">Carvão de Coco Art Coco (1kg)</text><text x="200" y="270" font-family="sans-serif" font-size="10" fill="%23f97316" font-weight="bold" text-anchor="middle">Sem Cheiro &amp; Longa Constância Térmica</text></svg>`;

const ROSH_SVG = `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 300" width="100%" height="100%"><defs><linearGradient id="rs-grad" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" style="stop-color:%231e1e24;stop-opacity:1" /><stop offset="100%" style="stop-color:%230f0f12;stop-opacity:1" /></linearGradient><linearGradient id="gold-bowl" x1="0%" y1="0%" x2="0%" y2="100%"><stop offset="0%" style="stop-color:%23c5a880;stop-opacity:1" /><stop offset="100%" style="stop-color:%23785a38;stop-opacity:1" /></linearGradient></defs><rect width="400" height="300" rx="16" fill="url(%23rs-grad)" /><g stroke="url(%23gold-bowl)" stroke-linecap="round" fill="none" opacity="0.1"><line x1="50" y1="50" x2="350" y2="250" stroke-width="1" /><line x1="50" y1="250" x2="350" y2="50" stroke-width="1" /></g><g fill="none" stroke="url(%23gold-bowl)" stroke-width="2.5"><path d="M150 80 C150 80, 200 95, 250 80 C270 120, 250 140, 200 140 C150 140, 130 120, 150 80 Z" fill="url(%23gold-bowl)" stroke="%23FAF7F2" stroke-width="1.5" /><ellipse cx="200" cy="80" rx="50" ry="15" fill="%231a1a1a" stroke="url(%23gold-bowl)" stroke-width="2" /><path d="M170 140 L180 220 L220 220 L230 140 Z" fill="%23121212" stroke="url(%23gold-bowl)" stroke-width="2.5" /><rect x="175" y="220" width="50" height="15" rx="2" fill="url(%23gold-bowl)" /><circle cx="200" cy="80" r="6" fill="url(%23gold-bowl)" /><circle cx="180" cy="80" r="3" fill="url(%23gold-bowl)" /><circle cx="220" cy="80" r="3" fill="url(%23gold-bowl)" /></g><text x="200" y="260" font-family="sans-serif" font-weight="bold" font-size="18" fill="%23FAF7F2" text-anchor="middle">Rosh Cerâmica Pro Hookah</text><text x="200" y="278" font-family="sans-serif" font-size="10" fill="%23c5a880" text-anchor="middle">Queima Uniforme de Alta Performance</text></svg>`;

const CAKE_SVG = `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 300" width="100%" height="100%"><defs><linearGradient id="cake-grad" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" style="stop-color:%232e1065;stop-opacity:1" /><stop offset="100%" style="stop-color:%230f052d;stop-opacity:1" /></linearGradient><linearGradient id="frosting" x1="0%" y1="0%" x2="0%" y2="100%"><stop offset="0%" style="stop-color:%23db2777;stop-opacity:1" /><stop offset="100%" style="stop-color:%239d174d;stop-opacity:1" /></linearGradient></defs><rect width="400" height="300" rx="16" fill="url(%23cake-grad)" /><g transform="translate(0, 10)"><rect x="100" y="140" width="200" height="80" rx="10" fill="%234c1d95" stroke="%237c3aed" stroke-width="2" /><path d="M100 140 Q150 120 200 140 T300 140 L300 160 Q250 170 200 160 T100 160 Z" fill="url(%23frosting)" /><circle cx="200" cy="90" r="8" fill="%23eab308" /><path d="M200 110 L200 130" stroke="%23facc15" stroke-width="4" stroke-linecap="round" /><path d="M195 80 Q200 65 205 80 Z" fill="%23ef4444" /></g><text x="200" y="260" font-family="sans-serif" font-weight="bold" font-size="18" fill="%23FAF7F2" text-anchor="middle">Bolo de Cenoura com Chocolate</text><text x="200" y="280" font-family="sans-serif" font-size="10" fill="%23db2777" font-weight="bold" text-anchor="middle">Cobertura Cremosa Gourmet</text></svg>`;

const BRIGADEIRO_SVG = `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 300" width="100%" height="100%"><defs><linearGradient id="brig-grad" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" style="stop-color:%231e1b4b;stop-opacity:1" /><stop offset="100%" style="stop-color:%23020617;stop-opacity:1" /></linearGradient></defs><rect width="400" height="300" rx="16" fill="url(%23brig-grad)" /><g transform="translate(0, -10)"><circle cx="200" cy="140" r="50" fill="%23431407" stroke="%237c2d12" stroke-width="3" /><circle cx="180" cy="120" r="4" fill="%2378350f" /><circle cx="220" cy="120" r="4" fill="%2378350f" /><circle cx="190" cy="150" r="5" fill="%239a3412" /><circle cx="210" cy="160" r="4" fill="%239a3412" /><circle cx="230" cy="140" r="4" fill="%2378350f" /><ellipse cx="200" cy="195" rx="60" ry="12" fill="%231e293b" opacity="0.4" /><path d="M140 180 Q200 200 260 180" stroke="%237c3aed" stroke-width="2" fill="none" /></g><text x="200" y="250" font-family="sans-serif" font-weight="bold" font-size="18" fill="%23FAF7F2" text-anchor="middle">Brigadeiro Gourmet Belga</text><text x="200" y="270" font-family="sans-serif" font-size="10" fill="%23818cf8" font-weight="bold" text-anchor="middle">Chocolate 100% Callebaut</text></svg>`;

const PIZZA_MARGHERITA_SVG = `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 300" width="100%" height="100%"><defs><linearGradient id="piz-grad" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" style="stop-color:%23450a0a;stop-opacity:1" /><stop offset="100%" style="stop-color:%23180202;stop-opacity:1" /></linearGradient></defs><rect width="400" height="300" rx="16" fill="url(%23piz-grad)" /><g transform="translate(0, -10)"><circle cx="200" cy="140" r="70" fill="%23facc15" stroke="%23c2410c" stroke-width="8" /><circle cx="170" cy="110" r="14" fill="%23ffffff" stroke="%23e11d48" stroke-width="3" /><circle cx="230" cy="120" r="16" fill="%23ffffff" stroke="%23e11d48" stroke-width="3" /><circle cx="190" cy="170" r="15" fill="%23ffffff" stroke="%23e11d48" stroke-width="3" /><path d="M190 120 Q195 110 200 120" stroke="%2316a34a" stroke-width="4" fill="none" stroke-linecap="round" /><path d="M210 160 Q215 150 220 160" stroke="%2316a34a" stroke-width="4" fill="none" stroke-linecap="round" /><path d="M165 150 Q170 140 175 150" stroke="%2316a34a" stroke-width="3" fill="none" stroke-linecap="round" /></g><text x="200" y="250" font-family="sans-serif" font-weight="bold" font-size="18" fill="%23FAF7F2" text-anchor="middle">Pizza Margherita Premium</text><text x="200" y="270" font-family="sans-serif" font-size="10" fill="%23ef4444" font-weight="bold" text-anchor="middle">Mozzarella de Búfala &amp; Manjericão</text></svg>`;

const PIZZA_CALABRESA_SVG = `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 300" width="100%" height="100%"><defs><linearGradient id="pizc-grad" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" style="stop-color:%23450a0a;stop-opacity:1" /><stop offset="100%" style="stop-color:%23180202;stop-opacity:1" /></linearGradient></defs><rect width="400" height="300" rx="16" fill="url(%23pizc-grad)" /><g transform="translate(0, -10)"><circle cx="200" cy="140" r="70" fill="%23facc15" stroke="%23c2410c" stroke-width="8" /><circle cx="160" cy="120" r="10" fill="%23b91c1c" /><circle cx="180" cy="160" r="10" fill="%23b91c1c" /><circle cx="220" cy="150" r="10" fill="%23b91c1c" /><circle cx="220" cy="110" r="10" fill="%23b91c1c" /><circle cx="190" cy="100" r="10" fill="%23b91c1c" /><circle cx="150" cy="150" r="4" fill="%23020617" /><circle cx="230" cy="130" r="4" fill="%23020617" /><circle cx="190" cy="135" r="4" fill="%23020617" /><path d="M170 100 Q180 105 175 110" stroke="%233f3f46" stroke-width="2.5" fill="none" /><path d="M210 160 Q220 165 215 170" stroke="%233f3f46" stroke-width="2.5" fill="none" /></g><text x="200" y="250" font-family="sans-serif" font-weight="bold" font-size="18" fill="%23FAF7F2" text-anchor="middle">Pizza Calabresa Especial</text><text x="200" y="270" font-family="sans-serif" font-size="10" fill="%23f97316" font-weight="bold" text-anchor="middle">Calabresa Defumada Artesanal</text></svg>`;

export function getInitialProducts(companySlug: string): Product[] {
  if (companySlug === "tabacaria") {
    return [
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
  } else if (companySlug === "doceria") {
    return [
      {
        name: "Bolo de Cenoura com Chocolate",
        description: "Bolo caseiro de cenoura super fofinho com cobertura generosa de brigadeiro gourmet de chocolate belga.",
        price: 15.00,
        category: "Bolos",
        stock: 10,
        image_data: CAKE_SVG
      },
      {
        name: "Brigadeiro Gourmet Belga (6 un.)",
        description: "Caixa com 6 brigadeiros gourmet feitos com puro chocolate belga e confeitos Callebaut de alta qualidade.",
        price: 18.00,
        category: "Doces",
        stock: 30,
        image_data: BRIGADEIRO_SVG
      }
    ];
  } else if (companySlug === "pizzaria") {
    return [
      {
        name: "Pizza Margherita Premium",
        description: "Molho de tomate artesanal, mozzarella de búfala, manjericão fresco e fio de azeite extra virgem sobre massa de fermentação natural.",
        price: 59.00,
        category: "Pizzas",
        stock: 20,
        image_data: PIZZA_MARGHERITA_SVG
      },
      {
        name: "Pizza Calabresa Especial",
        description: "Molho de tomate caseiro, calabresa defumada artesanal fatiada, cebola roxa, azeitonas pretas carnudas e orégano fresco.",
        price: 55.00,
        category: "Pizzas",
        stock: 25,
        image_data: PIZZA_CALABRESA_SVG
      }
    ];
  }
  return [];
}

const INITIAL_COUPONS: Coupon[] = [
  {
    code: "BEMVINDO10",
    discount_type: "percentage",
    discount_value: 10,
    min_purchase_cost: 50.00,
    used_count: 0,
    is_active: true
  },
  {
    code: "DESCONTO15",
    discount_type: "fixed",
    discount_value: 15.00,
    min_purchase_cost: 100.00,
    used_count: 0,
    is_active: true
  },
  {
    code: "VIP30",
    discount_type: "percentage",
    discount_value: 30,
    min_purchase_cost: 200.00,
    used_count: 0,
    is_active: true
  }
];

// ==========================================
// CONFIGURAÇÃO TURSO E INICIALIZAÇÃO DE TABELAS
// ==========================================

export async function saveTursoConfig(config: TursoConfig): Promise<boolean> {
  try {
    const client = createClient({
      url: config.url,
      authToken: config.token
    });
    
    await client.execute("SELECT 1");
    localStorage.setItem(TURSO_CONFIG_KEY, JSON.stringify(config));
    
    await initializeTables(client);
    await migrateLocalDataToTurso(client);
    
    isDbConnected.value = true;
    return true;
  } catch (e) {
    console.error("Falha ao conectar no Turso DB:", e);
    throw e;
  }
}

export function clearTursoConfig() {
  localStorage.removeItem(TURSO_CONFIG_KEY);
  isDbConnected.value = false;
}

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

export function getDbClient() {
  const envUrl = import.meta.env.VITE_TURSO_DB_URL;
  const envToken = import.meta.env.VITE_TURSO_DB_TOKEN;
  
  if (envUrl && envToken) {
    return createClient({
      url: envUrl,
      authToken: envToken
    });
  }

  const config = getTursoConfig();
  if (!config) return null;
  return createClient({
    url: config.url,
    authToken: config.token
  });
}

export const isDbConnected = ref(
  (import.meta.env.VITE_TURSO_DB_URL !== undefined && import.meta.env.VITE_TURSO_DB_URL !== '') ||
  localStorage.getItem(TURSO_CONFIG_KEY) !== null
);

async function initializeTables(client: any) {
  // 1. Cria tabelas essenciais (incluindo a de empresas)
  await client.batch([
    `CREATE TABLE IF NOT EXISTS companies (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      slug TEXT UNIQUE,
      name TEXT,
      description TEXT,
      theme_color TEXT DEFAULT 'gold',
      image_data TEXT,
      created_at TEXT
    )`,
    `CREATE TABLE IF NOT EXISTS products (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT,
      description TEXT,
      price REAL,
      category TEXT,
      stock INTEGER,
      image_data TEXT,
      company_slug TEXT DEFAULT 'tabacaria'
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
      created_at TEXT,
      coupon_code TEXT,
      discount_amount REAL DEFAULT 0,
      payment_method TEXT,
      change_amount REAL DEFAULT 0,
      company_slug TEXT DEFAULT 'tabacaria'
    )`,
    `CREATE TABLE IF NOT EXISTS order_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      order_id INTEGER,
      product_id INTEGER,
      product_name TEXT,
      quantity INTEGER,
      price REAL
    )`,
    `CREATE TABLE IF NOT EXISTS coupons (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      code TEXT,
      discount_type TEXT,
      discount_value REAL,
      min_purchase_cost REAL DEFAULT 0,
      expiration_date TEXT,
      limit_uses INTEGER,
      used_count INTEGER DEFAULT 0,
      is_active INTEGER DEFAULT 1,
      company_slug TEXT DEFAULT 'tabacaria',
      UNIQUE (company_slug, code)
    )`
  ], "write");

  // 2. Retrocompatibilidade: adicionar colunas se as tabelas já existirem sem elas
  try { await client.execute("ALTER TABLE products ADD COLUMN company_slug TEXT DEFAULT 'tabacaria'"); } catch (e) {}
  try { await client.execute("ALTER TABLE orders ADD COLUMN company_slug TEXT DEFAULT 'tabacaria'"); } catch (e) {}
  try { await client.execute("ALTER TABLE coupons ADD COLUMN company_slug TEXT DEFAULT 'tabacaria'"); } catch (e) {}

  // 3. Retrocompatibilidade para orders (outros campos legados)
  try { await client.execute("ALTER TABLE orders ADD COLUMN coupon_code TEXT"); } catch (e) {}
  try { await client.execute("ALTER TABLE orders ADD COLUMN discount_amount REAL DEFAULT 0"); } catch (e) {}
  try { await client.execute("ALTER TABLE orders ADD COLUMN payment_method TEXT"); } catch (e) {}
  try { await client.execute("ALTER TABLE orders ADD COLUMN change_amount REAL DEFAULT 0"); } catch (e) {}

  // 4. Migração e tratamento da tabela de settings para suportar chave composta (company_slug, key)
  try {
    const tableInfo = await client.execute("PRAGMA table_info(settings)");
    const hasCompanySlug = tableInfo.rows.some((row: any) => row.name === 'company_slug');
    if (!hasCompanySlug) {
      await client.execute("ALTER TABLE settings RENAME TO settings_old");
      await client.execute(`
        CREATE TABLE settings (
          company_slug TEXT DEFAULT 'tabacaria',
          key TEXT,
          value TEXT,
          PRIMARY KEY (company_slug, key)
        )
      `);
      await client.execute("INSERT INTO settings (company_slug, key, value) SELECT 'tabacaria', key, value FROM settings_old");
      await client.execute("DROP TABLE settings_old");
    }
  } catch (e) {
    try {
      await client.execute(`
        CREATE TABLE IF NOT EXISTS settings (
          company_slug TEXT DEFAULT 'tabacaria',
          key TEXT,
          value TEXT,
          PRIMARY KEY (company_slug, key)
        )
      `);
    } catch (err) {}
  }

  // 4b. Migração da tabela coupons para suportar UNIQUE (company_slug, code)
  try {
    const couponsTableRes = await client.execute("SELECT sql FROM sqlite_master WHERE type='table' AND name='coupons'");
    const couponsSql = String(couponsTableRes.rows[0]?.sql || "");
    if (couponsSql.includes("code TEXT UNIQUE")) {
      await client.execute("ALTER TABLE coupons RENAME TO coupons_old");
      await client.execute(`
        CREATE TABLE coupons (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          code TEXT,
          discount_type TEXT,
          discount_value REAL,
          min_purchase_cost REAL DEFAULT 0,
          expiration_date TEXT,
          limit_uses INTEGER,
          used_count INTEGER DEFAULT 0,
          is_active INTEGER DEFAULT 1,
          company_slug TEXT DEFAULT 'tabacaria',
          UNIQUE (company_slug, code)
        )
      `);
      await client.execute(`
        INSERT OR IGNORE INTO coupons (id, code, discount_type, discount_value, min_purchase_cost, expiration_date, limit_uses, used_count, is_active, company_slug)
        SELECT id, code, discount_type, discount_value, min_purchase_cost, expiration_date, limit_uses, used_count, is_active, COALESCE(company_slug, 'tabacaria')
        FROM coupons_old
      `);
      await client.execute("DROP TABLE coupons_old");
    }
  } catch (e) {
    console.error("Falha ao migrar constraint de coupons no Turso:", e);
  }

  // 5. Semear empresas iniciais caso esteja vazia
  try {
    const compCountRes = await client.execute("SELECT COUNT(*) as count FROM companies");
    const compCount = Number(compCountRes.rows[0]?.count || 0);
    if (compCount === 0) {
      for (const comp of INITIAL_COMPANIES) {
        await client.execute({
          sql: "INSERT INTO companies (slug, name, description, theme_color, created_at) VALUES (?, ?, ?, ?, ?)",
          args: [comp.slug, comp.name, comp.description, comp.theme_color, new Date().toISOString()]
        });
      }
    }
  } catch (e) {
    console.error("Erro ao semear empresas iniciais:", e);
  }

    try { await client.execute("ALTER TABLE companies ADD COLUMN image_data TEXT"); } catch (e) {}
    try { await client.execute("ALTER TABLE users ADD COLUMN username TEXT"); } catch (e) {}
    try { await client.execute("CREATE UNIQUE INDEX IF NOT EXISTS idx_users_username ON users(username)"); } catch (e) {}

    // 6. Criar tabela de usuários e semear Super Admin mestre
    try {
      await client.execute(`
        CREATE TABLE IF NOT EXISTS users (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT,
          username TEXT UNIQUE,
          email TEXT,
          password_hash TEXT,
          role TEXT DEFAULT 'store_admin',
          company_slug TEXT,
          created_at TEXT
        )
      `);

      const masterRes = await client.execute({
        sql: "SELECT id FROM users WHERE username = ? OR email = ?",
        args: ['admin', 'master@thorder.com']
      });
      if (masterRes.rows.length === 0) {
        await client.execute({
          sql: "INSERT INTO users (name, username, email, password_hash, role, company_slug, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
          args: [
            'Super Admin',
            'admin',
            'master@thorder.com',
            'a36aef5a11c4073fbe60314fc9df530a9d5f986533594d1f5190742ff9e0e408',
            'superadmin',
            null,
            new Date().toISOString()
          ]
        });
      }
    } catch (e) {
      console.error("Erro ao verificar/semear superadmin no Turso:", e);
    }
  }

  export function initLocalUsers() {
    if (typeof window === 'undefined') return;
    const stored = localStorage.getItem('thorder_local_users');
    if (!stored) {
      const initialUsers: User[] = [
        {
          id: 1,
          name: 'Super Admin',
          username: 'admin',
          email: 'master@thorder.com',
          password_hash: 'a36aef5a11c4073fbe60314fc9df530a9d5f986533594d1f5190742ff9e0e408',
          role: 'superadmin',
          company_slug: null,
          created_at: new Date().toISOString()
        }
      ];
      localStorage.setItem('thorder_local_users', JSON.stringify(initialUsers));
    }
  }

let dbInitPromise: Promise<void> | null = null;
export function ensureDbInitialized(): Promise<void> {
  if (!dbInitPromise) {
    const client = getDbClient();
    if (client) {
      dbInitPromise = initializeTables(client).catch(err => {
        console.error("Erro ao inicializar tabelas:", err);
      });
    } else {
      initLocalUsers();
      dbInitPromise = Promise.resolve();
    }
  }
  return dbInitPromise;
}

if (typeof window !== 'undefined') {
  ensureDbInitialized();
}

async function migrateLocalDataToTurso(client: any) {
  // Migra produtos para cada uma das empresas iniciais
  for (const comp of INITIAL_COMPANIES) {
    try {
      const testRes = await client.execute({
        sql: "SELECT COUNT(*) as count FROM products WHERE company_slug = ?",
        args: [comp.slug]
      });
      const count = Number(testRes.rows[0]?.count || 0);
      
      if (count === 0) {
        let localProducts = getInitialProducts(comp.slug);
        // Tenta buscar do LocalStorage da empresa
        const stored = localStorage.getItem(`thorder_local_products_${comp.slug}`);
        if (stored) {
          try { localProducts = JSON.parse(stored); } catch (e) {}
        }
        
        const statements = localProducts.map(p => ({
          sql: "INSERT INTO products (name, description, price, category, stock, image_data, company_slug) VALUES (?, ?, ?, ?, ?, ?, ?)",
          args: [p.name, p.description, p.price, p.category, p.stock, p.image_data, comp.slug]
        }));
        
        if (statements.length > 0) {
          await client.batch(statements, "write");
        }
      }
    } catch (e) {
      console.error(`Erro ao migrar produtos da empresa ${comp.slug} para o Turso:`, e);
    }
  }

  // Migra cupons
  for (const comp of INITIAL_COMPANIES) {
    try {
      const couponTest = await client.execute({
        sql: "SELECT COUNT(*) as count FROM coupons WHERE company_slug = ?",
        args: [comp.slug]
      });
      const couponCount = Number(couponTest.rows[0]?.count || 0);
      
      if (couponCount === 0) {
        let localCoupons = INITIAL_COUPONS;
        const storedCoupons = localStorage.getItem(`thorder_local_coupons_${comp.slug}`);
        if (storedCoupons) {
          try { localCoupons = JSON.parse(storedCoupons); } catch (e) {}
        }
        
        const statements = localCoupons.map(c => ({
          sql: `INSERT OR IGNORE INTO coupons (code, discount_type, discount_value, min_purchase_cost, expiration_date, limit_uses, used_count, is_active, company_slug) 
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          args: [
            c.code.toUpperCase().trim(),
            c.discount_type,
            c.discount_value,
            c.min_purchase_cost ?? 0,
            c.expiration_date ?? null,
            c.limit_uses ?? null,
            c.used_count ?? 0,
            c.is_active ? 1 : 0,
            comp.slug
          ]
        }));
        
        if (statements.length > 0) {
          await client.batch(statements, "write");
        }
      }
    } catch (e) {
      console.error(`Erro ao migrar cupons da empresa ${comp.slug} para o Turso:`, e);
    }
  }
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

// ==========================================
// CRUD DE EMPRESAS (TENANTS)
// ==========================================

export async function fetchCompanies(): Promise<Company[]> {
  const client = getDbClient();
  if (client) {
    try {
      const res = await client.execute("SELECT * FROM companies ORDER BY id ASC");
      return res.rows.map((row: any) => ({
        id: Number(row.id),
        slug: String(row.slug),
        name: String(row.name),
        description: String(row.description),
        theme_color: String(row.theme_color),
        image_data: row.image_data ? String(row.image_data) : undefined,
        created_at: row.created_at ? String(row.created_at) : undefined
      }));
    } catch (e) {
      console.error("Falha ao buscar empresas no Turso, usando fallback local", e);
    }
  }

  // Fallback Local Storage
  const stored = localStorage.getItem("thorder_local_companies");
  if (!stored) {
    localStorage.setItem("thorder_local_companies", JSON.stringify(INITIAL_COMPANIES));
    return INITIAL_COMPANIES.map((c, idx) => ({ ...c, id: idx + 1 }));
  }
  try {
    return JSON.parse(stored);
  } catch (e) {
    return INITIAL_COMPANIES.map((c, idx) => ({ ...c, id: idx + 1 }));
  }
}

export async function fetchCompanyBySlug(slug: string): Promise<Company | null> {
  const client = getDbClient();
  if (client) {
    try {
      const res = await client.execute({
        sql: "SELECT * FROM companies WHERE slug = ?",
        args: [slug]
      });
      if (res.rows.length > 0) {
        const row = res.rows[0];
        return {
          id: Number(row.id),
          slug: String(row.slug),
          name: String(row.name),
          description: String(row.description),
          theme_color: String(row.theme_color),
          image_data: row.image_data ? String(row.image_data) : undefined,
          created_at: row.created_at ? String(row.created_at) : undefined
        };
      }
    } catch (e) {
      console.error(`Falha ao buscar empresa ${slug} no Turso:`, e);
    }
  }

  const companies = await fetchCompanies();
  return companies.find(c => c.slug === slug) || null;
}

export async function createCompany(company: Omit<Company, "id">): Promise<Company> {
  const client = getDbClient();
  const cleanSlug = company.slug.toLowerCase().replace(/[^a-z0-9-]/g, '');
  if (client) {
    try {
      const res = await client.execute({
        sql: "INSERT INTO companies (slug, name, description, theme_color, created_at) VALUES (?, ?, ?, ?, ?) RETURNING id",
        args: [cleanSlug, company.name, company.description, company.theme_color, new Date().toISOString()]
      });
      const newId = Number(res.rows[0]?.id);
      return { ...company, slug: cleanSlug, id: newId };
    } catch (e) {
      console.error("Falha ao criar empresa no Turso, inserindo local", e);
    }
  }

  // Fallback Local Storage
  const companies = await fetchCompanies();
  const newId = companies.length > 0 ? Math.max(...companies.map(c => c.id || 0)) + 1 : 1;
  const newCompany = { ...company, slug: cleanSlug, id: newId };
  companies.push(newCompany);
  localStorage.setItem("thorder_local_companies", JSON.stringify(companies));
  return newCompany;
}

export async function updateCompany(company: Company, oldSlug?: string): Promise<Company> {
  await ensureDbInitialized();
  const prevSlug = (oldSlug || company.slug).trim().toLowerCase();
  const newSlug = company.slug.trim().toLowerCase().replace(/[^a-z0-9-]/g, '');

  if (!newSlug || newSlug.length < 2) {
    throw new Error("A rota da loja deve ter pelo menos 2 caracteres (apenas letras minúsculas, números e hífens).");
  }

  const reservedSlugs = ['admin', 'api', 'portal', 'login', 'carrinho', 'checkout', 'pedido-confirmado', 'pedidos', 'produtos', 'cupons', 'configuracoes'];
  if (reservedSlugs.includes(newSlug)) {
    throw new Error(`A rota "${newSlug}" é reservada pelo sistema. Escolha outro identificador.`);
  }

  const client = getDbClient();

  // Se o slug mudou, verifica duplicidade com outras empresas
  if (newSlug !== prevSlug) {
    if (client) {
      const checkRes = await client.execute({
        sql: "SELECT id FROM companies WHERE LOWER(slug) = ? AND LOWER(slug) != ?",
        args: [newSlug, prevSlug]
      });
      if (checkRes.rows.length > 0) {
        throw new Error(`Já existe outra loja cadastrada com a rota "${newSlug}". Escolha outro nome.`);
      }
    } else {
      const companies = await fetchCompanies();
      if (companies.some(c => c.slug.toLowerCase() === newSlug && c.slug.toLowerCase() !== prevSlug)) {
        throw new Error(`Já existe outra loja cadastrada com a rota "${newSlug}". Escolha outro nome.`);
      }
    }
  }

  // Atualiza no Turso
  if (client) {
    try {
      if (newSlug !== prevSlug) {
        // Atualização em cascata nas tabelas filhas
        await client.batch([
          {
            sql: "UPDATE companies SET slug = ?, name = ?, description = ?, theme_color = ?, image_data = ? WHERE slug = ?",
            args: [newSlug, company.name, company.description, company.theme_color, company.image_data || null, prevSlug]
          },
          {
            sql: "UPDATE products SET company_slug = ? WHERE company_slug = ?",
            args: [newSlug, prevSlug]
          },
          {
            sql: "UPDATE orders SET company_slug = ? WHERE company_slug = ?",
            args: [newSlug, prevSlug]
          },
          {
            sql: "UPDATE coupons SET company_slug = ? WHERE company_slug = ?",
            args: [newSlug, prevSlug]
          },
          {
            sql: "UPDATE settings SET company_slug = ? WHERE company_slug = ?",
            args: [newSlug, prevSlug]
          },
          {
            sql: "UPDATE users SET company_slug = ? WHERE company_slug = ?",
            args: [newSlug, prevSlug]
          }
        ], "write");
      } else {
        await client.execute({
          sql: "UPDATE companies SET name = ?, description = ?, theme_color = ?, image_data = ? WHERE slug = ?",
          args: [company.name, company.description, company.theme_color, company.image_data || null, prevSlug]
        });
      }
    } catch (e: any) {
      console.error("Falha ao atualizar empresa no Turso:", e);
      throw new Error(e.message || "Falha ao atualizar dados da empresa no banco de dados.");
    }
  }

  // Sincroniza Local Storage
  try {
    const stored = localStorage.getItem("thorder_local_companies");
    if (stored) {
      const companies: Company[] = JSON.parse(stored);
      const idx = companies.findIndex(c => c.slug === prevSlug);
      if (idx !== -1) {
        companies[idx] = { ...companies[idx], ...company, slug: newSlug };
        localStorage.setItem("thorder_local_companies", JSON.stringify(companies));
      }
    }

    if (newSlug !== prevSlug) {
      // Migra chaves de dados locais
      const keysToMigrate = ['products', 'orders', 'order_items', 'coupons', 'cart'];
      for (const k of keysToMigrate) {
        const oldKey = k === 'cart' ? `thorder_cart_${prevSlug}` : `thorder_local_${k}_${prevSlug}`;
        const newKey = k === 'cart' ? `thorder_cart_${newSlug}` : `thorder_local_${k}_${newSlug}`;
        const val = localStorage.getItem(oldKey);
        if (val !== null) {
          localStorage.setItem(newKey, val);
          localStorage.removeItem(oldKey);
        }
      }

      // Atualiza company_slug nos usuários locais
      const storedUsers = localStorage.getItem('thorder_local_users');
      if (storedUsers) {
        const users: User[] = JSON.parse(storedUsers);
        users.forEach(u => {
          if (u.company_slug === prevSlug) u.company_slug = newSlug;
        });
        localStorage.setItem('thorder_local_users', JSON.stringify(users));
      }

      // Atualiza sessão ativa
      if (currentUser.value?.company_slug === prevSlug) {
        currentUser.value.company_slug = newSlug;
        sessionStorage.setItem(AUTH_USER_KEY, JSON.stringify(currentUser.value));
      }

      const imp = sessionStorage.getItem(IMPERSONATE_KEY);
      if (imp === prevSlug) {
        sessionStorage.setItem(IMPERSONATE_KEY, newSlug);
      }
    }
  } catch (e) {}

  const updatedCompany: Company = { ...company, slug: newSlug };
  currentCompany.value = updatedCompany;
  currentCompanySlug.value = newSlug;
  return updatedCompany;
}

export async function deleteCompany(slug: string): Promise<void> {
  const client = getDbClient();
  if (client) {
    try {
      await client.batch([
        { sql: "DELETE FROM companies WHERE slug = ?", args: [slug] },
        { sql: "DELETE FROM products WHERE company_slug = ?", args: [slug] },
        { sql: "DELETE FROM orders WHERE company_slug = ?", args: [slug] },
        { sql: "DELETE FROM coupons WHERE company_slug = ?", args: [slug] },
        { sql: "DELETE FROM settings WHERE company_slug = ?", args: [slug] },
        { sql: "DELETE FROM users WHERE company_slug = ?", args: [slug] }
      ], "write");
      return;
    } catch (e) {
      console.error("Erro ao deletar empresa no Turso:", e);
    }
  }

  // Fallback Local Storage
  let companies = await fetchCompanies();
  companies = companies.filter(c => c.slug !== slug);
  localStorage.setItem("thorder_local_companies", JSON.stringify(companies));
  localStorage.removeItem(`thorder_local_products_${slug}`);
  localStorage.removeItem(`thorder_local_orders_${slug}`);
  localStorage.removeItem(`thorder_local_order_items_${slug}`);
  localStorage.removeItem(`thorder_local_coupons_${slug}`);
  localStorage.removeItem(`thorder_cart_${slug}`);
}

// ==========================================
// AUTENTICAÇÃO E GESTÃO DE USUÁRIOS
// ==========================================

export async function loginUser(identifier: string, password: string): Promise<User> {
  await ensureDbInitialized();
  const cleanId = identifier.trim().toLowerCase();
  const enteredHash = await sha256(password);

  const client = getDbClient();
  if (client) {
    try {
      const res = await client.execute({
        sql: "SELECT * FROM users WHERE LOWER(username) = ? OR LOWER(email) = ?",
        args: [cleanId, cleanId]
      });
      if (res.rows.length > 0) {
        const row = res.rows[0];
        if (row.password_hash === enteredHash) {
          const user: User = {
            id: Number(row.id),
            name: String(row.name),
            username: row.username ? String(row.username).trim() : cleanId,
            email: row.email ? String(row.email).trim() : undefined,
            role: (row.role ? String(row.role).trim() : 'store_admin') as 'superadmin' | 'store_admin',
            company_slug: row.company_slug ? String(row.company_slug).trim() : null,
            created_at: row.created_at ? String(row.created_at) : undefined
          };
          currentUser.value = user;
          sessionStorage.setItem(AUTH_USER_KEY, JSON.stringify(user));
          sessionStorage.setItem("admin_authenticated", "true");

          if (user.role === 'store_admin') {
            leaveImpersonation();
            if (user.company_slug) {
              await setCurrentCompanySlug(user.company_slug);
            }
          } else if (user.role === 'superadmin') {
            leaveImpersonation();
          }

          return user;
        }
      }
    } catch (e) {
      console.error("Falha ao autenticar no Turso, tentando local", e);
    }
  }

  // Fallback Local Storage
  initLocalUsers();
  const stored = localStorage.getItem('thorder_local_users');
  if (stored) {
    try {
      const users: User[] = JSON.parse(stored);
      const found = users.find(u => 
        (u.username && u.username.toLowerCase() === cleanId) || 
        (u.email && u.email.toLowerCase() === cleanId)
      );
      if (found && found.password_hash === enteredHash) {
        const user: User = {
          id: found.id,
          name: found.name,
          username: found.username || cleanId,
          email: found.email,
          role: (found.role ? String(found.role).trim() : 'store_admin') as 'superadmin' | 'store_admin',
          company_slug: found.company_slug ? String(found.company_slug).trim() : null,
          created_at: found.created_at
        };
        currentUser.value = user;
        sessionStorage.setItem(AUTH_USER_KEY, JSON.stringify(user));
        sessionStorage.setItem("admin_authenticated", "true");

        if (user.role === 'store_admin') {
          leaveImpersonation();
          if (user.company_slug) {
            await setCurrentCompanySlug(user.company_slug);
          }
        } else if (user.role === 'superadmin') {
          leaveImpersonation();
        }

        return user;
      }
    } catch (e) {}
  }

  throw new Error("Usuário ou senha incorretos.");
}

export async function fetchUsers(companySlug?: string): Promise<User[]> {
  await ensureDbInitialized();
  const client = getDbClient();

  if (client) {
    try {
      let sql = "SELECT id, name, username, email, role, company_slug, created_at FROM users";
      const args: any[] = [];
      if (companySlug) {
        sql += " WHERE company_slug = ?";
        args.push(companySlug);
      }
      sql += " ORDER BY id ASC";
      const res = await client.execute({ sql, args });
      return res.rows.map((row: any) => ({
        id: Number(row.id),
        name: String(row.name),
        username: row.username ? String(row.username).trim() : (row.email ? String(row.email).split('@')[0] : 'user'),
        email: row.email ? String(row.email).trim() : undefined,
        role: (row.role ? String(row.role).trim() : 'store_admin') as 'superadmin' | 'store_admin',
        company_slug: row.company_slug ? String(row.company_slug).trim() : null,
        created_at: row.created_at ? String(row.created_at) : undefined
      }));
    } catch (e) {
      console.error("Falha ao buscar usuários no Turso:", e);
    }
  }

  // Fallback Local Storage
  initLocalUsers();
  const stored = localStorage.getItem('thorder_local_users');
  if (!stored) return [];
  try {
    let users: User[] = JSON.parse(stored);
    if (companySlug) {
      users = users.filter(u => u.company_slug === companySlug);
    }
    return users.map(u => ({
      id: u.id,
      name: u.name,
      username: u.username || (u.email ? u.email.split('@')[0] : 'user'),
      email: u.email,
      role: (u.role ? String(u.role).trim() : 'store_admin') as 'superadmin' | 'store_admin',
      company_slug: u.company_slug ? String(u.company_slug).trim() : null,
      created_at: u.created_at
    }));
  } catch {
    return [];
  }
}

export async function createUser(params: {
  name: string;
  username: string;
  email?: string;
  password: string;
  role?: 'superadmin' | 'store_admin';
  company_slug?: string | null;
}): Promise<User> {
  await ensureDbInitialized();
  const cleanUsername = params.username.trim().toLowerCase().replace(/[^a-z0-9_.-]/g, '');
  const cleanName = params.name.trim();
  const cleanEmail = params.email ? params.email.trim().toLowerCase() : undefined;
  const role = params.role || 'store_admin';
  const companySlug = role === 'superadmin' ? null : (params.company_slug ? params.company_slug.trim() : null);

  if (!cleanName) throw new Error("O nome é obrigatório.");
  if (!cleanUsername || cleanUsername.length < 3) {
    throw new Error("O nome de usuário deve ter no mínimo 3 caracteres (apenas letras, números, hífen, underline ou ponto).");
  }
  if (!params.password || params.password.length < 4) {
    throw new Error("A senha deve conter no mínimo 4 caracteres.");
  }
  if (role === 'store_admin' && !companySlug) {
    throw new Error("Usuários lojistas devem ser vinculados a uma loja.");
  }

  const passHash = await sha256(params.password);
  const client = getDbClient();

  // Verifica duplicidade de username
  if (client) {
    const checkRes = await client.execute({
      sql: "SELECT id FROM users WHERE LOWER(username) = ?",
      args: [cleanUsername]
    });
    if (checkRes.rows.length > 0) {
      throw new Error(`O usuário "${cleanUsername}" já está em uso. Escolha outro.`);
    }

    try {
      const insertRes = await client.execute({
        sql: "INSERT INTO users (name, username, email, password_hash, role, company_slug, created_at) VALUES (?, ?, ?, ?, ?, ?, ?) RETURNING id",
        args: [cleanName, cleanUsername, cleanEmail || null, passHash, role, companySlug, new Date().toISOString()]
      });

      return {
        id: Number(insertRes.rows[0]?.id),
        name: cleanName,
        username: cleanUsername,
        email: cleanEmail,
        role,
        company_slug: companySlug,
        created_at: new Date().toISOString()
      };
    } catch (e: any) {
      console.error("Erro ao inserir usuário no Turso:", e);
      throw new Error(e.message || "Falha ao cadastrar o usuário no banco.");
    }
  }

  // Fallback Local Storage
  initLocalUsers();
  const stored = localStorage.getItem('thorder_local_users') || '[]';
  const users: User[] = JSON.parse(stored);
  if (users.some(u => u.username && u.username.toLowerCase() === cleanUsername)) {
    throw new Error(`O usuário "${cleanUsername}" já está em uso. Escolha outro.`);
  }

  const newUser: User = {
    id: Date.now(),
    name: cleanName,
    username: cleanUsername,
    email: cleanEmail,
    password_hash: passHash,
    role,
    company_slug: companySlug,
    created_at: new Date().toISOString()
  };
  users.push(newUser);
  localStorage.setItem('thorder_local_users', JSON.stringify(users));
  return newUser;
}

export async function deleteUser(userId: number): Promise<void> {
  await ensureDbInitialized();
  if (currentUser.value?.id === userId) {
    throw new Error("Você não pode excluir a sua própria conta conectada.");
  }

  const client = getDbClient();
  if (client) {
    // Protege contra exclusão do último superadmin
    const userRes = await client.execute({
      sql: "SELECT role FROM users WHERE id = ?",
      args: [userId]
    });
    if (userRes.rows.length > 0 && String(userRes.rows[0]?.role).trim() === 'superadmin') {
      const countRes = await client.execute("SELECT COUNT(*) as count FROM users WHERE role = 'superadmin'");
      if (Number(countRes.rows[0]?.count || 0) <= 1) {
        throw new Error("Não é possível excluir o único Super Administrador da plataforma.");
      }
    }

    try {
      await client.execute({
        sql: "DELETE FROM users WHERE id = ?",
        args: [userId]
      });
      return;
    } catch (e: any) {
      console.error("Falha ao deletar usuário no Turso:", e);
      throw new Error("Falha ao remover o usuário.");
    }
  }

  // Local Storage
  initLocalUsers();
  const stored = localStorage.getItem('thorder_local_users') || '[]';
  let users: User[] = JSON.parse(stored);
  users = users.filter(u => u.id !== userId);
  localStorage.setItem('thorder_local_users', JSON.stringify(users));
}

export async function changeUserPassword(currentPassword: string, newPassword: string): Promise<void> {
  await ensureDbInitialized();
  if (!currentUser.value || !currentUser.value.id) {
    throw new Error("Você precisa estar autenticado para alterar a senha.");
  }
  if (!currentPassword) {
    throw new Error("Informe sua senha atual.");
  }
  if (!newPassword || newPassword.length < 4) {
    throw new Error("A nova senha deve conter pelo menos 4 caracteres.");
  }
  if (currentPassword === newPassword) {
    throw new Error("A nova senha não pode ser idêntica à senha atual.");
  }

  const currentHash = await sha256(currentPassword);
  const newHash = await sha256(newPassword);
  const userId: number = currentUser.value.id;
  const client = getDbClient();

  if (client) {
    try {
      const res = await client.execute({
        sql: "SELECT password_hash FROM users WHERE id = ?",
        args: [userId]
      });
      if (res.rows.length === 0) {
        throw new Error("Usuário não encontrado.");
      }
      const existingHash = String(res.rows[0]?.password_hash || '');
      if (existingHash !== currentHash) {
        throw new Error("A senha atual informada está incorreta.");
      }

      await client.execute({
        sql: "UPDATE users SET password_hash = ? WHERE id = ?",
        args: [newHash, userId]
      });

      // Também sincroniza o fallback se existir no localStorage
      try {
        const stored = localStorage.getItem('thorder_local_users');
        if (stored) {
          const users: any[] = JSON.parse(stored);
          const idx = users.findIndex(u => u.id === userId);
          if (idx !== -1) {
            users[idx].password_hash = newHash;
            localStorage.setItem('thorder_local_users', JSON.stringify(users));
          }
        }
      } catch {}

      return;
    } catch (e: any) {
      if (e.message && (e.message.includes("incorreta") || e.message.includes("não encontrado"))) {
        throw e;
      }
      console.error("Erro ao alterar senha no Turso, tentando fallback local:", e);
    }
  }

  // Fallback Local Storage
  initLocalUsers();
  const stored = localStorage.getItem('thorder_local_users') || '[]';
  let users: any[] = JSON.parse(stored);
  const idx = users.findIndex(u => u.id === userId);
  if (idx === -1) {
    throw new Error("Usuário não encontrado.");
  }
  if (users[idx].password_hash !== currentHash) {
    throw new Error("A senha atual informada está incorreta.");
  }
  users[idx].password_hash = newHash;
  localStorage.setItem('thorder_local_users', JSON.stringify(users));
}

export async function resetUserPassword(userId: number, newPassword: string): Promise<void> {
  await ensureDbInitialized();
  if (!currentUser.value) {
    throw new Error("Acesso não autorizado.");
  }
  if (!newPassword || newPassword.length < 4) {
    throw new Error("A nova senha deve conter pelo menos 4 caracteres.");
  }

  const newHash = await sha256(newPassword);
  const client = getDbClient();

  if (client) {
    try {
      const res = await client.execute({
        sql: "SELECT id, role, company_slug FROM users WHERE id = ?",
        args: [userId]
      });
      if (res.rows.length === 0) {
        throw new Error("Usuário não encontrado.");
      }
      const targetUser = res.rows[0];

      // Verificação de permissão: Lojista só pode redefinir senhas da sua própria loja
      if (currentUser.value.role !== 'superadmin') {
        if (!currentUser.value.company_slug || targetUser.company_slug !== currentUser.value.company_slug) {
          throw new Error("Você não tem permissão para alterar a senha deste usuário.");
        }
      }

      await client.execute({
        sql: "UPDATE users SET password_hash = ? WHERE id = ?",
        args: [newHash, userId]
      });

      // Também sincroniza fallback se existir
      try {
        const stored = localStorage.getItem('thorder_local_users');
        if (stored) {
          const users: any[] = JSON.parse(stored);
          const idx = users.findIndex(u => u.id === userId);
          if (idx !== -1) {
            users[idx].password_hash = newHash;
            localStorage.setItem('thorder_local_users', JSON.stringify(users));
          }
        }
      } catch {}

      return;
    } catch (e: any) {
      if (e.message && (e.message.includes("permissão") || e.message.includes("não encontrado"))) {
        throw e;
      }
      console.error("Erro ao redefinir senha no Turso, tentando fallback local:", e);
    }
  }

  // Fallback Local Storage
  initLocalUsers();
  const stored = localStorage.getItem('thorder_local_users') || '[]';
  let users: any[] = JSON.parse(stored);
  const idx = users.findIndex(u => u.id === userId);
  if (idx === -1) {
    throw new Error("Usuário não encontrado.");
  }

  if (currentUser.value.role !== 'superadmin') {
    if (!currentUser.value.company_slug || users[idx].company_slug !== currentUser.value.company_slug) {
      throw new Error("Você não tem permissão para alterar a senha deste usuário.");
    }
  }

  users[idx].password_hash = newHash;
  localStorage.setItem('thorder_local_users', JSON.stringify(users));
}


export async function registerStoreAndAdmin(params: {
  companyName: string;
  companySlug: string;
  description: string;
  themeColor: string;
  ownerName: string;
  username?: string;
  email?: string;
  password: string;
}): Promise<{ company: Company; user: User }> {
  await ensureDbInitialized();
  const cleanSlug = params.companySlug.trim().toLowerCase().replace(/[^a-z0-9-]/g, '');
  const cleanUsername = (params.username || cleanSlug).trim().toLowerCase().replace(/[^a-z0-9_.-]/g, '');
  const cleanEmail = params.email ? params.email.trim().toLowerCase() : undefined;

  if (!cleanSlug) throw new Error("Slug da empresa inválido.");
  if (!cleanUsername) throw new Error("Nome de usuário inválido.");

  // Valida duplicidade de slug
  const existingCompany = await fetchCompanyBySlug(cleanSlug);
  if (existingCompany) {
    throw new Error("Já existe uma loja cadastrada com este link / subdomínio.");
  }

  const passHash = await sha256(params.password);
  const client = getDbClient();

  // Valida duplicidade de username
  if (client) {
    try {
      const userCheck = await client.execute({
        sql: "SELECT id FROM users WHERE LOWER(username) = ?",
        args: [cleanUsername]
      });
      if (userCheck.rows.length > 0) {
        throw new Error(`O usuário "${cleanUsername}" já está em uso.`);
      }
    } catch (e: any) {
      if (e.message?.includes("já está em uso")) throw e;
    }
  } else {
    initLocalUsers();
    const stored = localStorage.getItem('thorder_local_users');
    if (stored) {
      const users: User[] = JSON.parse(stored);
      if (users.some(u => u.username && u.username.toLowerCase() === cleanUsername)) {
        throw new Error(`O usuário "${cleanUsername}" já está em uso.`);
      }
    }
  }

  // 1. Cria a Empresa
  const company = await createCompany({
    name: params.companyName.trim(),
    slug: cleanSlug,
    description: params.description.trim(),
    theme_color: params.themeColor || 'gold'
  });

  // 2. Cria o Usuário Administrador da Loja
  let newUser: User;
  if (client) {
    try {
      const userRes = await client.execute({
        sql: "INSERT INTO users (name, username, email, password_hash, role, company_slug, created_at) VALUES (?, ?, ?, ?, ?, ?, ?) RETURNING id",
        args: [params.ownerName.trim(), cleanUsername, cleanEmail || null, passHash, 'store_admin', cleanSlug, new Date().toISOString()]
      });
      newUser = {
        id: Number(userRes.rows[0]?.id),
        name: params.ownerName.trim(),
        username: cleanUsername,
        email: cleanEmail,
        role: 'store_admin',
        company_slug: cleanSlug,
        created_at: new Date().toISOString()
      };
    } catch (e) {
      console.error("Falha ao salvar user no Turso, inserindo local", e);
      newUser = {
        id: Date.now(),
        name: params.ownerName.trim(),
        username: cleanUsername,
        email: cleanEmail,
        password_hash: passHash,
        role: 'store_admin',
        company_slug: cleanSlug,
        created_at: new Date().toISOString()
      };
    }
  } else {
    initLocalUsers();
    const stored = localStorage.getItem('thorder_local_users') || '[]';
    const users: User[] = JSON.parse(stored);
    newUser = {
      id: Date.now(),
      name: params.ownerName.trim(),
      username: cleanUsername,
      email: cleanEmail,
      password_hash: passHash,
      role: 'store_admin',
      company_slug: cleanSlug,
      created_at: new Date().toISOString()
    };
    users.push(newUser);
    localStorage.setItem('thorder_local_users', JSON.stringify(users));
  }

  // 3. Autentica e ativa a empresa criada
  currentUser.value = {
    id: newUser.id,
    name: newUser.name,
    username: newUser.username,
    email: newUser.email,
    role: newUser.role,
    company_slug: newUser.company_slug,
    created_at: newUser.created_at
  };
  sessionStorage.setItem(AUTH_USER_KEY, JSON.stringify(currentUser.value));
  sessionStorage.setItem("admin_authenticated", "true");
  await setCurrentCompanySlug(cleanSlug);

  return { company, user: currentUser.value };
}

export function logoutUser(): void {
  sessionStorage.removeItem(AUTH_USER_KEY);
  sessionStorage.removeItem(IMPERSONATE_KEY);
  sessionStorage.removeItem("admin_authenticated");
  currentUser.value = null;
  isImpersonating.value = false;
  clearCurrentCompanySlug();
}

export async function impersonateCompany(slug: string): Promise<void> {
  if (currentUser.value?.role !== 'superadmin') return;
  sessionStorage.setItem(IMPERSONATE_KEY, slug);
  isImpersonating.value = true;
  await setCurrentCompanySlug(slug);
}

export function leaveImpersonation(): void {
  sessionStorage.removeItem(IMPERSONATE_KEY);
  isImpersonating.value = false;
  clearCurrentCompanySlug();
}

// ==========================================
// MÉTRICAS GLOBAIS DA PLATAFORMA (SUPER ADMIN)
// ==========================================

export async function fetchPlatformStats(): Promise<PlatformStats> {
  await ensureDbInitialized();
  const client = getDbClient();

  if (client) {
    try {
      const [compRes, ordRes, prodRes] = await Promise.all([
        client.execute("SELECT COUNT(*) as count FROM companies"),
        client.execute("SELECT COUNT(*) as count, COALESCE(SUM(total_cost), 0) as total_rev FROM orders"),
        client.execute("SELECT COUNT(*) as count FROM products")
      ]);

      return {
        totalCompanies: Number(compRes.rows[0]?.count || 0),
        totalOrders: Number(ordRes.rows[0]?.count || 0),
        totalRevenue: Number(ordRes.rows[0]?.total_rev || 0),
        totalProducts: Number(prodRes.rows[0]?.count || 0)
      };
    } catch (e) {
      console.error("Falha ao buscar estatísticas globais no Turso, usando local", e);
    }
  }

  // Fallback Local Storage
  const companies = await fetchCompanies();
  let totalOrders = 0;
  let totalRevenue = 0;
  let totalProducts = 0;

  for (const c of companies) {
    const pKey = `thorder_local_products_${c.slug}`;
    const oKey = `thorder_local_orders_${c.slug}`;
    try {
      const prods = JSON.parse(localStorage.getItem(pKey) || '[]');
      totalProducts += prods.length;
      const ords = JSON.parse(localStorage.getItem(oKey) || '[]');
      totalOrders += ords.length;
      totalRevenue += ords.reduce((sum: number, o: any) => sum + (Number(o.total_cost) || 0), 0);
    } catch (e) {}
  }

  return {
    totalCompanies: companies.length,
    totalOrders,
    totalRevenue,
    totalProducts
  };
}

export async function fetchAllCompaniesWithStats(): Promise<CompanyWithStats[]> {
  await ensureDbInitialized();
  const companies = await fetchCompanies();
  const client = getDbClient();

  if (client) {
    try {
      const result: CompanyWithStats[] = [];
      for (const comp of companies) {
        const [prodRes, ordRes] = await Promise.all([
          client.execute({
            sql: "SELECT COUNT(*) as count FROM products WHERE company_slug = ?",
            args: [comp.slug]
          }),
          client.execute({
            sql: "SELECT COUNT(*) as count, COALESCE(SUM(total_cost), 0) as total_rev FROM orders WHERE company_slug = ?",
            args: [comp.slug]
          })
        ]);

        result.push({
          ...comp,
          productsCount: Number(prodRes.rows[0]?.count || 0),
          ordersCount: Number(ordRes.rows[0]?.count || 0),
          totalRevenue: Number(ordRes.rows[0]?.total_rev || 0)
        });
      }
      return result;
    } catch (e) {
      console.error("Erro ao consolidar estatísticas das empresas:", e);
    }
  }

  // Fallback Local Storage
  return companies.map(comp => {
    let productsCount = 0;
    let ordersCount = 0;
    let totalRevenue = 0;
    try {
      const prods = JSON.parse(localStorage.getItem(`thorder_local_products_${comp.slug}`) || '[]');
      productsCount = prods.length;
      const ords = JSON.parse(localStorage.getItem(`thorder_local_orders_${comp.slug}`) || '[]');
      ordersCount = ords.length;
      totalRevenue = ords.reduce((sum: number, o: any) => sum + (Number(o.total_cost) || 0), 0);
    } catch (e) {}

    return {
      ...comp,
      productsCount,
      ordersCount,
      totalRevenue
    };
  });
}


// ==========================================
// CRUD de PRODUTOS POR EMPRESA
// ==========================================

export async function fetchProducts(): Promise<Product[]> {
  const client = getDbClient();
  const companySlug = currentCompanySlug.value;
  if (!companySlug) return [];

  if (client) {
    try {
      const res = await client.execute({
        sql: "SELECT * FROM products WHERE company_slug = ? ORDER BY id DESC",
        args: [companySlug]
      });
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
  const key = `thorder_local_products_${companySlug}`;
  const stored = localStorage.getItem(key);
  if (!stored) {
    const initialProds = getInitialProducts(companySlug);
    localStorage.setItem(key, JSON.stringify(initialProds));
    return initialProds.map((p, idx) => ({ ...p, id: idx + 1 }));
  }
  try {
    return JSON.parse(stored);
  } catch (e) {
    const initialProds = getInitialProducts(companySlug);
    return initialProds.map((p, idx) => ({ ...p, id: idx + 1 }));
  }
}

export async function createProduct(product: Omit<Product, "id">): Promise<Product> {
  const client = getDbClient();
  const companySlug = currentCompanySlug.value;
  if (!companySlug) throw new Error("Nenhuma empresa selecionada.");

  if (client) {
    try {
      const res = await client.execute({
        sql: "INSERT INTO products (name, description, price, category, stock, image_data, company_slug) VALUES (?, ?, ?, ?, ?, ?, ?) RETURNING id",
        args: [product.name, product.description, product.price, product.category, product.stock, product.image_data, companySlug]
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
  products.unshift(newProduct);
  const key = `thorder_local_products_${companySlug}`;
  localStorage.setItem(key, JSON.stringify(products));
  return newProduct;
}

export async function updateProduct(product: Product): Promise<void> {
  const client = getDbClient();
  const companySlug = currentCompanySlug.value;
  if (!companySlug) throw new Error("Nenhuma empresa selecionada.");

  if (client) {
    try {
      await client.execute({
        sql: "UPDATE products SET name = ?, description = ?, price = ?, category = ?, stock = ?, image_data = ? WHERE id = ? AND company_slug = ?",
        args: [product.name, product.description, product.price, product.category, product.stock, product.image_data, product.id!, companySlug]
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
    const key = `thorder_local_products_${companySlug}`;
    localStorage.setItem(key, JSON.stringify(products));
  }
}

export async function deleteProduct(productId: number): Promise<void> {
  const client = getDbClient();
  const companySlug = currentCompanySlug.value;
  if (!companySlug) throw new Error("Nenhuma empresa selecionada.");

  if (client) {
    try {
      await client.execute({
        sql: "DELETE FROM products WHERE id = ? AND company_slug = ?",
        args: [productId, companySlug]
      });
      return;
    } catch (e) {
      console.error("Falha ao deletar produto no Turso, deletando local", e);
    }
  }
  
  // Fallback Local Storage
  let products = await fetchProducts();
  products = products.filter(p => p.id !== productId);
  const key = `thorder_local_products_${companySlug}`;
  localStorage.setItem(key, JSON.stringify(products));
}

// ==========================================
// CRUD de PEDIDOS POR EMPRESA
// ==========================================

export async function fetchOrders(): Promise<Order[]> {
  const client = getDbClient();
  const companySlug = currentCompanySlug.value;
  if (!companySlug) return [];

  if (client) {
    try {
      const ordersRes = await client.execute({
        sql: "SELECT * FROM orders WHERE company_slug = ? ORDER BY id DESC",
        args: [companySlug]
      });
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
        coupon_code: row.coupon_code ? String(row.coupon_code) : undefined,
        discount_amount: row.discount_amount !== null ? Number(row.discount_amount) : undefined,
        payment_method: row.payment_method ? String(row.payment_method) as any : undefined,
        change_amount: row.change_amount !== null ? Number(row.change_amount) : undefined,
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
  const keyOrders = `thorder_local_orders_${companySlug}`;
  const keyItems = `thorder_local_order_items_${companySlug}`;
  const storedOrders = localStorage.getItem(keyOrders);
  const storedItems = localStorage.getItem(keyItems);
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
  const companySlug = currentCompanySlug.value;
  if (!companySlug) throw new Error("Nenhuma empresa selecionada.");
  
  if (client) {
    try {
      const orderInsertRes = await client.execute({
        sql: `INSERT INTO orders (customer_name, customer_email, customer_phone, shipping_cep, shipping_address, shipping_carrier, shipping_cost, items_cost, total_cost, status, created_at, coupon_code, discount_amount, payment_method, change_amount, company_slug) 
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?) RETURNING id`,
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
          order.created_at,
          order.coupon_code ?? null,
          order.discount_amount ?? 0,
          order.payment_method ?? 'pix',
          order.change_amount ?? 0,
          companySlug
        ]
      });
      
      const newOrderId = Number(orderInsertRes.rows[0]?.id);
      const batchCommands: any[] = [];
      
      for (const item of items) {
        batchCommands.push({
          sql: "INSERT INTO order_items (order_id, product_id, product_name, quantity, price) VALUES (?, ?, ?, ?, ?)",
          args: [newOrderId, item.product_id, item.product_name, item.quantity, item.price]
        });
        batchCommands.push({
          sql: "UPDATE products SET stock = MAX(0, stock - ?) WHERE id = ? AND company_slug = ?",
          args: [item.quantity, item.product_id, companySlug]
        });
      }
      
      if (batchCommands.length > 0) {
        await client.batch(batchCommands, "write");
      }

      if (order.coupon_code) {
        await incrementCouponUses(order.coupon_code);
      }
      
      return newOrderId;
    } catch (e) {
      console.error("Falha ao criar pedido no Turso, criando local", e);
    }
  }
  
  // Fallback Local Storage
  const keyOrders = `thorder_local_orders_${companySlug}`;
  const keyItems = `thorder_local_order_items_${companySlug}`;
  const keyProducts = `thorder_local_products_${companySlug}`;

  const orders = localStorage.getItem(keyOrders) ? JSON.parse(localStorage.getItem(keyOrders)!) : [];
  const storedItems = localStorage.getItem(keyItems) ? JSON.parse(localStorage.getItem(keyItems)!) : [];
  
  const newOrderId = orders.length > 0 ? Math.max(...orders.map((o: any) => o.id || 0)) + 1 : 10001;
  const newOrder = { ...order, id: newOrderId };
  orders.push(newOrder);
  localStorage.setItem(keyOrders, JSON.stringify(orders));
  
  const newItems = items.map((item, index) => ({
    ...item,
    id: storedItems.length + index + 1,
    order_id: newOrderId
  }));
  storedItems.push(...newItems);
  localStorage.setItem(keyItems, JSON.stringify(storedItems));
  
  // Atualiza estoques dos produtos locais
  const localProducts = await fetchProducts();
  for (const item of items) {
    const prod = localProducts.find(p => p.id === item.product_id);
    if (prod) {
      prod.stock = Math.max(0, prod.stock - item.quantity);
    }
  }
  localStorage.setItem(keyProducts, JSON.stringify(localProducts));

  if (order.coupon_code) {
    await incrementCouponUses(order.coupon_code);
  }
  
  return newOrderId;
}

export async function updateOrderStatus(orderId: number, status: Order["status"]): Promise<void> {
  const client = getDbClient();
  const companySlug = currentCompanySlug.value;
  if (!companySlug) throw new Error("Nenhuma empresa selecionada.");

  if (client) {
    try {
      await client.execute({
        sql: "UPDATE orders SET status = ? WHERE id = ? AND company_slug = ?",
        args: [status, orderId, companySlug]
      });
      return;
    } catch (e) {
      console.error("Falha ao atualizar status do pedido no Turso, atualizando local", e);
    }
  }
  
  // Fallback Local Storage
  const keyOrders = `thorder_local_orders_${companySlug}`;
  const orders = localStorage.getItem(keyOrders) ? JSON.parse(localStorage.getItem(keyOrders)!) : [];
  const idx = orders.findIndex((o: any) => o.id === orderId);
  if (idx !== -1) {
    orders[idx].status = status;
    localStorage.setItem(keyOrders, JSON.stringify(orders));
  }
}

// ==========================================
// CRUD de CONFIGURAÇÕES (SETTINGS) POR EMPRESA
// ==========================================

export async function fetchSetting(key: string, defaultValue: string): Promise<string> {
  const client = getDbClient();
  const companySlug = currentCompanySlug.value || "tabacaria";
  
  if (client) {
    try {
      const res = await client.execute({
        sql: "SELECT value FROM settings WHERE company_slug = ? AND key = ?",
        args: [companySlug, key]
      });
      if (res.rows.length > 0 && res.rows[0].value !== null) {
        return String(res.rows[0].value);
      }
    } catch (e) {
      console.error(`Falha ao buscar setting ${key} no Turso, usando local`, e);
    }
  }
  
  // Fallback Local Storage
  const localVal = localStorage.getItem(`thorder_setting_${companySlug}_${key}`);
  if (localVal !== null) return localVal;
  
  localStorage.setItem(`thorder_setting_${companySlug}_${key}`, defaultValue);
  return defaultValue;
}

export async function saveSetting(key: string, value: string): Promise<void> {
  const client = getDbClient();
  const companySlug = currentCompanySlug.value || "tabacaria";
  
  if (client) {
    try {
      await client.execute({
        sql: "INSERT OR REPLACE INTO settings (company_slug, key, value) VALUES (?, ?, ?)",
        args: [companySlug, key, value]
      });
      localStorage.setItem(`thorder_setting_${companySlug}_${key}`, value);
      return;
    } catch (e) {
      console.error(`Falha ao salvar setting ${key} no Turso, salvando local`, e);
    }
  }
  
  // Fallback Local Storage
  localStorage.setItem(`thorder_setting_${companySlug}_${key}`, value);
}

// ==========================================
// CÁLCULO DE FRETE POR RAIO / DISTÂNCIA E HORÁRIO DE FUNCIONAMENTO
// ==========================================

export const DEFAULT_DELIVERY_TIERS: DeliveryTier[] = [
  { maxKm: 3, price: 5.00 },
  { maxKm: 6, price: 8.00 },
  { maxKm: 10, price: 12.00 },
  { maxKm: 15, price: 18.00 }
];

const geocodeCache = new Map<string, { lat: number; lng: number; address?: string; city?: string; state?: string }>();

// Geocodificação automática de CEP brasileiro usando APIs abertas sem necessidade de chave
export async function geocodeCep(cep: string): Promise<{ lat: number; lng: number; address?: string; city?: string; state?: string } | null> {
  const clean = cep.replace(/\D/g, "");
  if (clean.length !== 8) return null;

  if (geocodeCache.has(clean)) {
    return geocodeCache.get(clean)!;
  }

  // 1. Tenta BrasilAPI v2 (rápida, retorna coordenadas)
  try {
    const res = await fetch(`https://brasilapi.com.br/api/cep/v2/${clean}`, {
      headers: { "Accept": "application/json" }
    });
    if (res.ok) {
      const data = await res.json();
      if (data.location?.coordinates?.latitude && data.location?.coordinates?.longitude) {
        const lat = parseFloat(data.location.coordinates.latitude);
        const lng = parseFloat(data.location.coordinates.longitude);
        if (!isNaN(lat) && !isNaN(lng)) {
          const result = {
            lat,
            lng,
            address: data.street ? `${data.street}${data.neighborhood ? ' - ' + data.neighborhood : ''}`.trim() : undefined,
            city: data.city,
            state: data.state
          };
          geocodeCache.set(clean, result);
          return result;
        }
      }
    }
  } catch (e) {}

  // 2. Tenta AwesomeAPI CEP (retorna lat e lng diretamente)
  try {
    const res = await fetch(`https://cep.awesomeapi.com.br/json/${clean}`);
    if (res.ok) {
      const data = await res.json();
      if (data.lat && data.lng) {
        const lat = parseFloat(data.lat);
        const lng = parseFloat(data.lng);
        if (!isNaN(lat) && !isNaN(lng)) {
          const result = {
            lat,
            lng,
            address: data.address ? `${data.address}${data.district ? ' - ' + data.district : ''}`.trim() : undefined,
            city: data.city,
            state: data.state
          };
          geocodeCache.set(clean, result);
          return result;
        }
      }
    }
  } catch (e) {}

  // 3. Fallback: ViaCEP para obter dados textuais e OpenStreetMap Nominatim para geocodificação
  try {
    const viaRes = await fetch(`https://viacep.com.br/ws/${clean}/json/`);
    if (viaRes.ok) {
      const viaData = await viaRes.json();
      if (!viaData.erro) {
        const query = encodeURIComponent(`${viaData.logradouro ? viaData.logradouro + ', ' : ''}${viaData.localidade}, ${viaData.uf}, Brasil`);
        const nomRes = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${query}&limit=1`, {
          headers: { "User-Agent": "ThorderApp/1.0" }
        });
        if (nomRes.ok) {
          const nomData = await nomRes.json();
          if (nomData && nomData.length > 0) {
            const lat = parseFloat(nomData[0].lat);
            const lng = parseFloat(nomData[0].lon);
            if (!isNaN(lat) && !isNaN(lng)) {
              const result = {
                lat,
                lng,
                address: viaData.logradouro ? `${viaData.logradouro}, ${viaData.bairro || ''}` : undefined,
                city: viaData.localidade,
                state: viaData.uf
              };
              geocodeCache.set(clean, result);
              return result;
            }
          }
        }
      }
    }
  } catch (e) {}

  return null;
}

// Geocodificação de endereço em texto completo (para lojas que especificam rua e número)
export async function geocodeAddress(addressText: string): Promise<{ lat: number; lng: number } | null> {
  if (!addressText.trim()) return null;
  try {
    const query = encodeURIComponent(`${addressText.trim()}, Brasil`);
    const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${query}&limit=1`, {
      headers: { "User-Agent": "ThorderApp/1.0" }
    });
    if (res.ok) {
      const data = await res.json();
      if (data && data.length > 0) {
        const lat = parseFloat(data[0].lat);
        const lng = parseFloat(data[0].lon);
        if (!isNaN(lat) && !isNaN(lng)) {
          return { lat, lng };
        }
      }
    }
  } catch (e) {}
  return null;
}

export interface AddressSuggestion {
  displayName: string;
  street: string;
  number?: string;
  neighborhood?: string;
  city?: string;
  state?: string;
  cep?: string;
  lat: number;
  lng: number;
}

// Autocomplete de endereços reais em tempo real (estilo iFood e Uber) via Nominatim
export async function searchAddressSuggestions(query: string): Promise<AddressSuggestion[]> {
  if (!query || query.trim().length < 3) return [];
  try {
    const encoded = encodeURIComponent(`${query.trim()}, Brasil`);
    const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&addressdetails=1&countrycodes=br&limit=6&q=${encoded}`, {
      headers: { "User-Agent": "ThorderApp/1.0" }
    });
    if (!res.ok) return [];
    const data = await res.json();
    if (!Array.isArray(data)) return [];

    return data.map((item: any) => {
      const addr = item.address || {};
      const street = addr.road || addr.street || addr.pedestrian || addr.footway || addr.avenue || "";
      const number = addr.house_number || "";
      const neighborhood = addr.suburb || addr.neighbourhood || addr.city_district || addr.quarter || "";
      const city = addr.city || addr.town || addr.municipality || addr.village || "";
      const state = addr.state || "";
      const cep = addr.postcode ? addr.postcode.replace(/\D/g, "") : "";

      return {
        displayName: item.display_name,
        street,
        number: number || undefined,
        neighborhood: neighborhood || undefined,
        city: city || undefined,
        state: state || undefined,
        cep: cep || undefined,
        lat: parseFloat(item.lat),
        lng: parseFloat(item.lon)
      };
    }).filter(item => !isNaN(item.lat) && !isNaN(item.lng));
  } catch (e) {
    console.error("Falha ao buscar sugestões de endereço:", e);
    return [];
  }
}

// Geocodificação reversa (ao arrastar o pino ou clicar no mapa, busca rua, número, bairro e cidade)
export async function reverseGeocode(lat: number, lng: number): Promise<{
  street?: string;
  number?: string;
  neighborhood?: string;
  city?: string;
  state?: string;
  cep?: string;
  formattedAddress?: string;
} | null> {
  try {
    const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&addressdetails=1`, {
      headers: { "User-Agent": "ThorderApp/1.0" }
    });
    if (!res.ok) return null;
    const data = await res.json();
    if (!data || !data.address) return null;

    const addr = data.address;
    const street = addr.road || addr.street || addr.pedestrian || addr.footway || addr.avenue || "";
    const number = addr.house_number || "";
    const neighborhood = addr.suburb || addr.neighbourhood || addr.city_district || addr.quarter || "";
    const city = addr.city || addr.town || addr.municipality || addr.village || "";
    const state = addr.state || "";
    const cep = addr.postcode ? addr.postcode.replace(/\D/g, "") : "";

    let formatted = "";
    if (street) formatted += street;
    if (number) formatted += `, ${number}`;
    if (neighborhood) formatted += ` - ${neighborhood}`;
    if (city) formatted += `, ${city}`;
    if (state) formatted += ` - ${state}`;

    return {
      street: street || undefined,
      number: number || undefined,
      neighborhood: neighborhood || undefined,
      city: city || undefined,
      state: state || undefined,
      cep: cep || undefined,
      formattedAddress: formatted || data.display_name
    };
  } catch (e) {
    console.error("Falha na geocodificação reversa:", e);
    return null;
  }
}

// Fórmula de Haversine para cálculo de distância precisa em linha reta (em km)
export function calculateDistanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Raio da Terra em km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c;
  return Math.round(distance * 10) / 10; // 1 casa decimal (ex: 4.2 km)
}

// Busca as configurações de entrega da loja ativa
export async function fetchDeliverySettings(): Promise<DeliverySettings> {
  const storeCep = await fetchSetting("store_cep", "14240-000");
  const storeAddress = await fetchSetting("store_address", "Rua Marechal Deodoro, 150 - Centro, Cajuru - SP");
  const storeLatStr = await fetchSetting("store_lat", "-21.2755425");
  const storeLngStr = await fetchSetting("store_lng", "-47.3013532");
  const storeWhatsapp = await fetchSetting("store_whatsapp", "5516999999999");
  const maxRadiusStr = await fetchSetting("delivery_max_radius_km", "15");
  const tiersJson = await fetchSetting("delivery_tiers", JSON.stringify(DEFAULT_DELIVERY_TIERS));
  const freeShippingMinStr = await fetchSetting("delivery_free_shipping_min", "0");
  const pickupEnabledStr = await fetchSetting("delivery_pickup_enabled", "true");

  let tiers: DeliveryTier[] = DEFAULT_DELIVERY_TIERS;
  try {
    const parsed = JSON.parse(tiersJson);
    if (Array.isArray(parsed) && parsed.length > 0) {
      tiers = parsed;
    }
  } catch {
    tiers = DEFAULT_DELIVERY_TIERS;
  }

  return {
    storeCep,
    storeAddress,
    storeLat: storeLatStr && !isNaN(parseFloat(storeLatStr)) ? parseFloat(storeLatStr) : null,
    storeLng: storeLngStr && !isNaN(parseFloat(storeLngStr)) ? parseFloat(storeLngStr) : null,
    storeWhatsapp,
    maxRadiusKm: parseFloat(maxRadiusStr) || 15,
    tiers: tiers.sort((a, b) => a.maxKm - b.maxKm),
    freeShippingMin: parseFloat(freeShippingMinStr) || 0,
    pickupEnabled: pickupEnabledStr !== "false"
  };
}

// Salva as configurações de entrega da loja ativa
export async function saveDeliverySettings(settings: DeliverySettings): Promise<void> {
  await Promise.all([
    saveSetting("store_cep", settings.storeCep.trim()),
    saveSetting("store_address", settings.storeAddress.trim()),
    saveSetting("store_lat", settings.storeLat !== null ? String(settings.storeLat) : ""),
    saveSetting("store_lng", settings.storeLng !== null ? String(settings.storeLng) : ""),
    saveSetting("store_whatsapp", settings.storeWhatsapp.trim()),
    saveSetting("delivery_max_radius_km", String(settings.maxRadiusKm)),
    saveSetting("delivery_tiers", JSON.stringify(settings.tiers.sort((a, b) => a.maxKm - b.maxKm))),
    saveSetting("delivery_free_shipping_min", String(settings.freeShippingMin)),
    saveSetting("delivery_pickup_enabled", settings.pickupEnabled ? "true" : "false")
  ]);
}

// Calcula o frete de forma dinâmica baseado na distância em km (sem restrição fixa de cidade)
export async function calculateShipping(cep: string, cartTotal: number = 0): Promise<ShippingOption[]> {
  const cleanCep = cep.replace(/\D/g, "");
  if (cleanCep.length !== 8) {
    throw new Error("CEP inválido. Digite um CEP com 8 dígitos.");
  }

  const deliverySettings = await fetchDeliverySettings();
  let storeLat = deliverySettings.storeLat;
  let storeLng = deliverySettings.storeLng;

  // Se a loja não tiver coordenadas gravadas, tenta geocodificar seu endereço/CEP
  if (!storeLat || !storeLng) {
    const storeGeo = await geocodeCep(deliverySettings.storeCep || "14240000");
    if (storeGeo) {
      storeLat = storeGeo.lat;
      storeLng = storeGeo.lng;
      saveSetting("store_lat", String(storeLat));
      saveSetting("store_lng", String(storeLng));
    }
  }

  // Geocodifica o CEP do cliente
  const customerGeo = await geocodeCep(cleanCep);

  const options: ShippingOption[] = [];

  if (storeLat && storeLng && customerGeo) {
    const distanceKm = calculateDistanceKm(storeLat, storeLng, customerGeo.lat, customerGeo.lng);
    const isWithinRadius = distanceKm <= deliverySettings.maxRadiusKm;

    if (isWithinRadius) {
      // Identifica a faixa de preço adequada
      const sortedTiers = [...deliverySettings.tiers].sort((a, b) => a.maxKm - b.maxKm);
      let matchedTier = sortedTiers.find(t => distanceKm <= t.maxKm);
      if (!matchedTier && sortedTiers.length > 0) {
        matchedTier = sortedTiers[sortedTiers.length - 1];
      }

      let price = matchedTier ? matchedTier.price : 5.00;
      let freeShippingApplied = false;

      // Validação de Frete Grátis por valor mínimo de pedido
      if (deliverySettings.freeShippingMin > 0 && cartTotal >= deliverySettings.freeShippingMin) {
        price = 0.00;
        freeShippingApplied = true;
      }

      options.push({
        carrier: freeShippingApplied 
          ? `Entrega Local (${distanceKm} km) - Frete Grátis!` 
          : `Entrega Local (${distanceKm} km da loja)`,
        price,
        deliveryDays: 1,
        distanceKm,
        freeShippingApplied
      });
    } else {
      // Endereço além do raio máximo permitido
      if (deliverySettings.pickupEnabled) {
        options.push({
          carrier: `Retirada na Loja (${deliverySettings.storeAddress})`,
          price: 0.00,
          deliveryDays: 0,
          distanceKm,
          isBeyondMaxRadius: true
        });
        return options;
      } else {
        throw new Error(`Seu endereço está a ${distanceKm} km da loja, além do nosso raio máximo de entrega de ${deliverySettings.maxRadiusKm} km.`);
      }
    }
  } else {
    // Fallback caso a API de geocodificação do CEP esteja temporariamente indisponível
    const defaultPrice = deliverySettings.tiers[0]?.price ?? 5.00;
    const isFree = deliverySettings.freeShippingMin > 0 && cartTotal >= deliverySettings.freeShippingMin;
    options.push({
      carrier: isFree ? "Entrega Local - Frete Grátis!" : "Entrega Local (Estimada)",
      price: isFree ? 0 : defaultPrice,
      deliveryDays: 1,
      freeShippingApplied: isFree
    });
  }

  // Opção de Retirada na Loja
  if (deliverySettings.pickupEnabled && !options.some(o => o.carrier.toLowerCase().includes("retirada"))) {
    options.push({
      carrier: `Retirada na Loja (${deliverySettings.storeAddress})`,
      price: 0.00,
      deliveryDays: 0
    });
  }

  return options;
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
  const [closeHr, closeMin] = closeTime.split(':').map(Number);
  const closeTimeInMinutes = closeHr * 60 + closeMin;
  
  let isOpen = false;
  if (closeTimeInMinutes >= openTimeInMinutes) {
    isOpen = currentTimeInMinutes >= openTimeInMinutes && currentTimeInMinutes <= closeTimeInMinutes;
  } else {
    isOpen = currentTimeInMinutes >= openTimeInMinutes || currentTimeInMinutes <= closeTimeInMinutes;
  }
  
  return { isOpen, openTime, closeTime, isEnabled };
}

// ==========================================
// CRUD DE CUPONS POR EMPRESA
// ==========================================

export async function fetchCoupons(): Promise<Coupon[]> {
  const client = getDbClient();
  const companySlug = currentCompanySlug.value;
  if (!companySlug) return [];

  if (client) {
    try {
      const res = await client.execute({
        sql: "SELECT * FROM coupons WHERE company_slug = ? ORDER BY code ASC",
        args: [companySlug]
      });
      return res.rows.map((row: any) => ({
        id: Number(row.id),
        code: String(row.code),
        discount_type: row.discount_type as Coupon["discount_type"],
        discount_value: Number(row.discount_value),
        min_purchase_cost: row.min_purchase_cost !== null ? Number(row.min_purchase_cost) : undefined,
        expiration_date: row.expiration_date !== null && row.expiration_date !== '' ? String(row.expiration_date) : undefined,
        limit_uses: row.limit_uses !== null && row.limit_uses !== '' ? Number(row.limit_uses) : undefined,
        used_count: Number(row.used_count),
        is_active: Number(row.is_active) === 1
      }));
    } catch (e) {
      console.error("Falha ao buscar cupons no Turso, usando fallback local", e);
    }
  }

  // Fallback Local Storage
  const key = `thorder_local_coupons_${companySlug}`;
  const stored = localStorage.getItem(key);
  if (!stored) {
    localStorage.setItem(key, JSON.stringify(INITIAL_COUPONS));
    return INITIAL_COUPONS.map((c, idx) => ({ ...c, id: idx + 1 }));
  }
  try {
    const list: Coupon[] = JSON.parse(stored);
    return list;
  } catch (e) {
    return INITIAL_COUPONS.map((c, idx) => ({ ...c, id: idx + 1 }));
  }
}

export async function createCoupon(coupon: Omit<Coupon, "id">): Promise<Coupon> {
  const client = getDbClient();
  const companySlug = currentCompanySlug.value;
  if (!companySlug) throw new Error("Nenhuma empresa selecionada.");
  const cleanCode = coupon.code.toUpperCase().trim();

  if (client) {
    try {
      const existing = await client.execute({
        sql: "SELECT id FROM coupons WHERE code = ? AND company_slug = ?",
        args: [cleanCode, companySlug]
      });
      if (existing.rows.length > 0) {
        throw new Error(`O cupom "${cleanCode}" já existe nesta loja.`);
      }

      const res = await client.execute({
        sql: `INSERT INTO coupons (code, discount_type, discount_value, min_purchase_cost, expiration_date, limit_uses, used_count, is_active, company_slug) 
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?) RETURNING id`,
        args: [
          cleanCode,
          coupon.discount_type,
          coupon.discount_value,
          coupon.min_purchase_cost ?? 0,
          coupon.expiration_date ?? null,
          coupon.limit_uses ?? null,
          coupon.used_count ?? 0,
          coupon.is_active ? 1 : 0,
          companySlug
        ]
      });
      const newId = Number(res.rows[0]?.id);
      return { ...coupon, id: newId, code: cleanCode };
    } catch (e: any) {
      if (e.message?.includes("já existe")) throw e;
      console.error("Falha ao inserir cupom no Turso, inserindo local", e);
    }
  }

  // Fallback Local Storage
  const coupons = await fetchCoupons();
  if (coupons.some(c => c.code === cleanCode)) {
    throw new Error(`O cupom "${cleanCode}" já existe nesta loja.`);
  }
  const newId = coupons.length > 0 ? Math.max(...coupons.map(c => c.id || 0)) + 1 : 1;
  const newCoupon = { 
    ...coupon, 
    id: newId, 
    code: cleanCode 
  };
  coupons.push(newCoupon);
  const key = `thorder_local_coupons_${companySlug}`;
  localStorage.setItem(key, JSON.stringify(coupons));
  return newCoupon;
}

export async function updateCoupon(coupon: Coupon): Promise<void> {
  const client = getDbClient();
  const companySlug = currentCompanySlug.value;
  if (!companySlug) throw new Error("Nenhuma empresa selecionada.");

  if (client) {
    try {
      await client.execute({
        sql: `UPDATE coupons 
              SET code = ?, discount_type = ?, discount_value = ?, min_purchase_cost = ?, expiration_date = ?, limit_uses = ?, used_count = ?, is_active = ? 
              WHERE id = ? AND company_slug = ?`,
        args: [
          coupon.code.toUpperCase().trim(),
          coupon.discount_type,
          coupon.discount_value,
          coupon.min_purchase_cost ?? 0,
          coupon.expiration_date ?? null,
          coupon.limit_uses ?? null,
          coupon.used_count,
          coupon.is_active ? 1 : 0,
          coupon.id!,
          companySlug
        ]
      });
      return;
    } catch (e) {
      console.error("Falha ao atualizar cupom no Turso, atualizando local", e);
    }
  }

  // Fallback Local Storage
  const coupons = await fetchCoupons();
  const idx = coupons.findIndex(c => c.id === coupon.id);
  if (idx !== -1) {
    coupons[idx] = {
      ...coupon,
      code: coupon.code.toUpperCase().trim()
    };
    const key = `thorder_local_coupons_${companySlug}`;
    localStorage.setItem(key, JSON.stringify(coupons));
  }
}

export async function deleteCoupon(couponId: number): Promise<void> {
  const client = getDbClient();
  const companySlug = currentCompanySlug.value;
  if (!companySlug) throw new Error("Nenhuma empresa selecionada.");

  if (client) {
    try {
      await client.execute({
        sql: "DELETE FROM coupons WHERE id = ? AND company_slug = ?",
        args: [couponId, companySlug]
      });
      return;
    } catch (e) {
      console.error("Falha ao deletar cupom no Turso, deletando local", e);
    }
  }

  // Fallback Local Storage
  let coupons = await fetchCoupons();
  coupons = coupons.filter(c => c.id !== couponId);
  const key = `thorder_local_coupons_${companySlug}`;
  localStorage.setItem(key, JSON.stringify(coupons));
}

export async function validateCoupon(code: string, cartTotal: number): Promise<{ valid: boolean; coupon?: Coupon; error?: string }> {
  const cleanCode = code.toUpperCase().trim();
  if (!cleanCode) {
    return { valid: false, error: "Código do cupom não pode ser vazio." };
  }

  const coupons = await fetchCoupons();
  const found = coupons.find(c => c.code === cleanCode);

  if (!found) {
    return { valid: false, error: "Cupom não encontrado ou inválido." };
  }

  if (!found.is_active) {
    return { valid: false, error: "Este cupom foi desativado." };
  }

  if (found.limit_uses !== undefined && found.limit_uses !== null && found.limit_uses > 0) {
    if (found.used_count >= found.limit_uses) {
      return { valid: false, error: "Este cupom atingiu o limite de usos." };
    }
  }

  if (found.expiration_date) {
    const todayStr = new Date().toISOString().split('T')[0];
    if (todayStr > found.expiration_date) {
      return { valid: false, error: "Este cupom expirou." };
    }
  }

  if (found.min_purchase_cost !== undefined && found.min_purchase_cost !== null && found.min_purchase_cost > 0) {
    if (cartTotal < found.min_purchase_cost) {
      return { 
        valid: false, 
        error: `Compra mínima para este cupom é de R$ ${found.min_purchase_cost.toFixed(2).replace('.', ',')}.` 
      };
    }
  }

  return { valid: true, coupon: found };
}

export async function incrementCouponUses(code: string): Promise<void> {
  const cleanCode = code.toUpperCase().trim();
  const client = getDbClient();
  const companySlug = currentCompanySlug.value;
  if (!companySlug) return;

  if (client) {
    try {
      await client.execute({
        sql: "UPDATE coupons SET used_count = used_count + 1 WHERE code = ? AND company_slug = ?",
        args: [cleanCode, companySlug]
      });
      return;
    } catch (e) {
      console.error("Falha ao incrementar uso de cupom no Turso, atualizando local", e);
    }
  }

  // Fallback Local Storage
  const coupons = await fetchCoupons();
  const idx = coupons.findIndex(c => c.code === cleanCode);
  if (idx !== -1) {
    coupons[idx].used_count += 1;
    const key = `thorder_local_coupons_${companySlug}`;
    localStorage.setItem(key, JSON.stringify(coupons));
  }
}

// ==========================================
// OPERAÇÕES DO CARRINHO (CART) POR EMPRESA
// ==========================================

export function getCart(): CartItem[] {
  const companySlug = currentCompanySlug.value;
  if (!companySlug) return [];
  
  const key = `thorder_cart_${companySlug}`;
  const stored = localStorage.getItem(key);
  if (!stored) return [];
  try {
    return JSON.parse(stored);
  } catch (e) {
    return [];
  }
}

export const cartCount = ref(0);

export function saveCart(cart: CartItem[]): void {
  const companySlug = currentCompanySlug.value;
  if (!companySlug) return;

  const key = `thorder_cart_${companySlug}`;
  localStorage.setItem(key, JSON.stringify(cart));
  cartCount.value = cart.reduce((sum, item) => sum + item.quantity, 0);
}

export function clearCart(): void {
  const companySlug = currentCompanySlug.value;
  if (!companySlug) return;

  const key = `thorder_cart_${companySlug}`;
  localStorage.removeItem(key);
  cartCount.value = 0;
}
