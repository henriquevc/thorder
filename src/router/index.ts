import { createRouter, createWebHistory } from "vue-router";
import HomeView from "@/views/HomeView.vue";
import CartView from "@/views/client/CartView.vue";
import CheckoutView from "@/views/client/CheckoutView.vue";
import OrderSuccessView from "@/views/client/OrderSuccessView.vue";
import LoginView from "@/views/admin/LoginView.vue";
import AdminDashboard from "@/views/admin/AdminDashboard.vue";
import { 
  getCompanySlugFromHostname, 
  setCurrentCompanySlug, 
  clearCurrentCompanySlug,
  currentCompanySlug,
  currentCompany,
  currentUser
} from "@/services/store";

const routes = [
  // 1. Rotas do Portal Raiz e Subdomínios
  {
    path: "/",
    name: "home",
    component: HomeView,
    meta: { title: "Portal de Compras" }
  },
  {
    path: "/carrinho",
    name: "cart",
    component: CartView,
    meta: { title: "Seu Carrinho" }
  },
  {
    path: "/checkout",
    name: "checkout",
    component: CheckoutView,
    meta: { title: "Finalizar Pedido" }
  },
  {
    path: "/pedido-confirmado/:id",
    name: "order-success",
    component: OrderSuccessView,
    meta: { title: "Pedido Confirmado!" }
  },

  // 2. Rotas Administrativas
  {
    path: "/admin/login",
    name: "admin-login",
    component: LoginView,
    meta: { title: "Acesso Administrativo" }
  },
  {
    path: "/admin",
    name: "admin-dashboard",
    component: AdminDashboard,
    meta: { 
      requiresAuth: true,
      title: "Painel Administrativo" 
    }
  },

  // 3. Rotas Híbridas por Caminho Dinâmico da Loja (ex: /doceria, /doceria/carrinho)
  {
    path: "/:companySlug",
    name: "company-home",
    component: HomeView,
    meta: { title: "Catálogo" }
  },
  {
    path: "/:companySlug/carrinho",
    name: "company-cart",
    component: CartView,
    meta: { title: "Seu Carrinho" }
  },
  {
    path: "/:companySlug/checkout",
    name: "company-checkout",
    component: CheckoutView,
    meta: { title: "Finalizar Pedido" }
  },
  {
    path: "/:companySlug/pedido-confirmado/:id",
    name: "company-order-success",
    component: OrderSuccessView,
    meta: { title: "Pedido Confirmado!" }
  },

  // Redireciona qualquer rota inválida para a raiz
  {
    path: "/:pathMatch(.*)*",
    redirect: "/"
  }
];

const router = createRouter({
  history: createWebHistory(),
  routes
});

// Guard de navegação para resolver empresa (caminho ou subdomínio) e proteger rotas
router.beforeEach(async (to, from, next) => {
  // 1. Identifica a empresa pelo path param se houver
  const pathSlug = to.params.companySlug ? String(to.params.companySlug).toLowerCase() : null;
  const hostnameSlug = getCompanySlugFromHostname();

  // Intercepta rotas de cliente acessadas sem prefixo de empresa (ex: /carrinho, /checkout, /pedido-confirmado/:id)
  // quando já existe uma loja ativa, redirecionando para a rota canônica da loja
  const isClientDirectRoute = (to.name === 'cart' || to.name === 'checkout' || to.name === 'order-success') && !pathSlug && !hostnameSlug;
  if (isClientDirectRoute) {
    const storedSlug = typeof window !== 'undefined' ? sessionStorage.getItem('thorder_active_store_slug') : null;
    const fallbackSlug = currentCompanySlug.value || (from.params.companySlug ? String(from.params.companySlug).toLowerCase() : null) || storedSlug;
    if (fallbackSlug) {
      const cleanPath = to.path.startsWith('/') ? to.path.substring(1) : to.path;
      next({ path: `/${fallbackSlug}/${cleanPath}` });
      return;
    }
  }

  const slug = pathSlug || hostnameSlug;

  if (slug) {
    await setCurrentCompanySlug(slug);
  } else if (!to.path.startsWith('/admin')) {
    // Se não estiver no admin e não tem empresa definida pelo path/subdomínio, limpa
    clearCurrentCompanySlug();
  } else if (to.path.startsWith('/admin')) {
    // Se for rota de admin, define a empresa conforme a sessão do usuário
    const user = currentUser.value;
    const impSlug = sessionStorage.getItem("thorder_impersonate_slug");

    if (user?.role === 'store_admin' && user.company_slug) {
      await setCurrentCompanySlug(user.company_slug);
    } else if (user?.role === 'superadmin' && impSlug) {
      await setCurrentCompanySlug(impSlug);
    } else if (user?.role === 'superadmin' && !impSlug) {
      clearCurrentCompanySlug();
    }
  }

  // 2. Define o título dinamicamente com base na loja ativa
  const companyName = currentCompany.value ? currentCompany.value.name : "Thorder";
  if (to.name === 'home' && !currentCompanySlug.value) {
    document.title = "Thorder | Plataforma Multi-Lojas";
  } else if (to.meta.title) {
    document.title = `${to.meta.title} | ${companyName}`;
  } else {
    document.title = companyName;
  }

  // 3. Restrição da Tela Inicial (/): Apenas o Super Admin pode visualizar o portal multi-empresas
  if (to.path === '/' && !slug) {
    const user = currentUser.value;
    if (user?.role === 'superadmin') {
      next();
      return;
    } else if (user?.role === 'store_admin' && user.company_slug) {
      next({ path: `/${user.company_slug}` });
      return;
    } else {
      next({ name: "admin-login" });
      return;
    }
  }

  // 4. Segurança do Carrinho/Checkout: Impede acesso a rotas do cliente caso esteja na raiz sem empresa
  const clientRoutesWithoutCompany = (to.name === 'cart' || to.name === 'checkout' || to.name === 'order-success') && !currentCompanySlug.value;
  if (clientRoutesWithoutCompany) {
    next({ name: "admin-login" });
    return;
  }

  // 5. Guard de Autenticação Administrativa
  const isAuthenticated = sessionStorage.getItem("admin_authenticated") === "true";

  if (to.meta.requiresAuth && !isAuthenticated) {
    next({ name: "admin-login" });
  } else if (to.name === "admin-login" && isAuthenticated) {
    next({ name: "admin-dashboard" });
  } else {
    next();
  }
});

export default router;
