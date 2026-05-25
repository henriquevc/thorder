import { createRouter, createWebHistory } from "vue-router";
import CatalogView from "@/views/client/CatalogView.vue";
import CartView from "@/views/client/CartView.vue";
import CheckoutView from "@/views/client/CheckoutView.vue";
import OrderSuccessView from "@/views/client/OrderSuccessView.vue";
import LoginView from "@/views/admin/LoginView.vue";
import AdminDashboard from "@/views/admin/AdminDashboard.vue";

const routes = [
  {
    path: "/",
    name: "catalog",
    component: CatalogView,
    meta: { title: "Catálogo de Produtos | Thorder" }
  },
  {
    path: "/carrinho",
    name: "cart",
    component: CartView,
    meta: { title: "Seu Carrinho | Thorder" }
  },
  {
    path: "/checkout",
    name: "checkout",
    component: CheckoutView,
    meta: { title: "Finalizar Pedido | Thorder" }
  },
  {
    path: "/pedido-confirmado/:id",
    name: "order-success",
    component: OrderSuccessView,
    meta: { title: "Pedido Confirmado! | Thorder" }
  },
  {
    path: "/admin/login",
    name: "admin-login",
    component: LoginView,
    meta: { title: "Acesso Administrativo | Thorder" }
  },
  {
    path: "/admin",
    name: "admin-dashboard",
    component: AdminDashboard,
    meta: { 
      requiresAuth: true,
      title: "Painel Administrativo | Thorder" 
    }
  },
  // Redireciona qualquer rota inválida para o catálogo
  {
    path: "/:pathMatch(.*)*",
    redirect: "/"
  }
];

const router = createRouter({
  history: createWebHistory(),
  routes
});

// Guard de navegação para proteger a área administrativa
router.beforeEach((to, _from, next) => {
  // Define o título da página
  if (to.meta.title) {
    document.title = to.meta.title as string;
  }

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
