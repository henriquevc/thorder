<script setup lang="ts">
import { ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { 
  ShoppingBag, 
  Check, 
  UserCheck, 
  Moon, 
  Sun, 
  Palette 
} from 'lucide-vue-next'
import { 
  cartCount, 
  themeMode,
  themeColor,
  setThemeMode,
  setThemeColor
} from '@/services/store'
import { Button } from '@/components/ui/button'
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger 
} from '@/components/ui/dialog'

const router = useRouter()

// Configuração do Tema no Modal
const showSettings = ref(false)

// Animação de "bounce" temporária ao alterar contagem do carrinho
const animateCart = ref(false)
watch(cartCount, (newVal, oldVal) => {
  if (newVal > oldVal) {
    animateCart.value = true
    setTimeout(() => {
      animateCart.value = false
    }, 800)
  }
})

// Função para verificar se a rota ativa é Admin
const isAdminRoute = () => {
  return router.currentRoute.value.path.startsWith('/admin')
}

// Logout do Admin
const handleAdminLogout = () => {
  sessionStorage.removeItem('admin_authenticated')
  router.push('/')
}
</script>

<template>
  <div class="min-h-screen flex flex-col font-sans antialiased transition-colors duration-300"
    :class="themeMode === 'dark' ? 'bg-slate-950 text-slate-100 selection:bg-primary selection:text-primary-foreground' : 'bg-slate-50 text-slate-900 selection:bg-primary selection:text-primary-foreground'"
  >
    <!-- Efeito de Background Abstrato Premium (Apenas no Modo Escuro para não lavar as cores) -->
    <div v-if="themeMode === 'dark'" class="fixed inset-0 overflow-hidden pointer-events-none z-0">
      <div class="absolute -top-[40%] -left-[20%] w-[80%] h-[80%] rounded-full bg-primary/10 blur-[120px]"></div>
      <div class="absolute -bottom-[40%] -right-[20%] w-[80%] h-[80%] rounded-full bg-blue-900/5 blur-[120px]"></div>
    </div>
    
    <!-- Cabeçalho Glassmorphic Fixo -->
    <header class="sticky top-0 z-40 w-full border-b backdrop-blur-md transition-colors duration-300"
      :class="themeMode === 'dark' ? 'border-slate-800/60 bg-slate-950/80' : 'border-slate-200/60 bg-white/80'"
    >
      <div class="container mx-auto px-4 h-16 flex items-center justify-between">
        <!-- Logo e Links -->
        <div class="flex items-center gap-8">
          <router-link to="/" class="flex items-center group py-1">
            <img 
              src="/logo_horizontal.jpg" 
              alt="Tabacaria X-Smoke" 
              class="h-10 md:h-12 w-auto object-contain transition-transform duration-300 group-hover:scale-102"
            />
          </router-link>
        </div>

        <!-- Ações do Cabeçalho -->
        <div class="flex items-center gap-3">
          <!-- Ícone do Carrinho (Apenas para rotas Cliente) -->
          <router-link 
            v-if="!isAdminRoute()"
            to="/carrinho" 
            class="relative w-10 h-10 rounded-xl border flex items-center justify-center transition-all duration-300"
            :class="[
              themeMode === 'dark' ? 'bg-slate-900 hover:bg-slate-800 border-slate-800 hover:border-slate-700 text-slate-300 hover:text-white' : 'bg-white hover:bg-slate-50 border-slate-200 hover:border-slate-300 text-slate-700 hover:text-slate-900',
              animateCart ? 'scale-110 border-primary bg-primary/10 text-primary' : ''
            ]"
          >
            <ShoppingBag class="w-5 h-5 transition-transform duration-300" :class="{ 'animate-bounce': animateCart }" />
            <!-- Contador animado -->
            <span 
              v-if="cartCount > 0"
              class="absolute -top-1.5 -right-1.5 flex h-5 min-w-[20px] items-center justify-center rounded-full bg-gradient-to-r from-brand-start to-brand-end px-1 text-[10px] font-bold text-white shadow-md shadow-brand-end/30 transition-transform duration-300"
            >
              {{ cartCount }}
            </span>
          </router-link>

          <!-- Botão Sair (Somente se logado e no Admin) -->
          <Button 
            v-if="isAdminRoute() && $route.name !== 'admin-login'"
            variant="ghost" 
            size="sm"
            class="text-red-400 hover:text-red-300 hover:bg-red-950/30 rounded-xl gap-2 font-bold"
            @click="handleAdminLogout"
          >
            <UserCheck class="w-4 h-4" />
            <span>Sair</span>
          </Button>
        </div>
      </div>
    </header>

    <!-- Conteúdo Principal Dinâmico -->
    <main class="flex-1 container mx-auto px-4 py-6 md:py-8 z-10">
      <router-view v-slot="{ Component }">
        <transition name="fade" mode="out-in">
          <component :is="Component" />
        </transition>
      </router-view>
    </main>

    <!-- Rodapé -->
    <footer class="border-t transition-colors duration-300 py-8 z-10"
      :class="themeMode === 'dark' ? 'border-slate-900 bg-slate-950/90' : 'border-slate-200 bg-white/90'"
    >
      <div class="container mx-auto px-4 text-center space-y-3">
        <p class="text-sm font-semibold tracking-wide"
          :class="themeMode === 'dark' ? 'bg-gradient-to-r from-slate-200 to-slate-400 bg-clip-text text-transparent' : 'text-slate-700'"
        >
          Tabacaria X-Smoke &copy; 2026
        </p>
      </div>
    </footer>
  </div>
</template>

<style>
/* Transições de Rota Fluida */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.25s ease, transform 0.25s ease;
}

.fade-enter-from {
  opacity: 0;
  transform: translateY(6px);
}

.fade-leave-to {
  opacity: 0;
  transform: translateY(-6px);
}

/* Animação para erros do formulário */
@keyframes shake {
  0%, 100% { transform: translateX(0); }
  25% { transform: translateX(-4px); }
  75% { transform: translateX(4px); }
}

.animate-shake {
  animation: shake 0.3s ease-in-out;
}
</style>
