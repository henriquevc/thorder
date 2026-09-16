<script setup lang="ts">
import { ref, watch, computed } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { 
  ShoppingBag, 
  UserCheck,
  LogOut,
  ShieldCheck,
  User,
  Store,
  Lock,
  KeyRound
} from 'lucide-vue-next'
import { 
  cartCount, 
  themeMode,
  currentCompany,
  currentCompanySlug,
  currentUser,
  logoutUser
} from '@/services/store'
import { Button } from '@/components/ui/button'
import ChangePasswordModal from '@/components/ChangePasswordModal.vue'

const router = useRouter()
const route = useRoute()

const showChangePasswordModal = ref(false)

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
const isAdminRoute = computed(() => {
  return route.path.startsWith('/admin')
})

// Destino dinâmico da logo no cabeçalho
const logoDestination = computed(() => {
  if (currentCompanySlug.value) {
    return `/${currentCompanySlug.value}`
  }
  if (currentUser.value?.role === 'superadmin') {
    return '/'
  }
  if (currentUser.value?.role === 'store_admin' && currentUser.value.company_slug) {
    return `/${currentUser.value.company_slug}`
  }
  return '/admin/login'
})

// Logout do Admin
const handleAdminLogout = () => {
  logoutUser()
  router.push('/admin/login')
}
</script>

<template>
  <div class="min-h-screen flex flex-col font-sans antialiased transition-colors duration-300"
    :class="themeMode === 'dark' ? 'bg-slate-950 text-slate-100 selection:bg-primary selection:text-primary-foreground' : 'bg-slate-50 text-slate-900 selection:bg-primary selection:text-primary-foreground'"
  >
    <!-- Efeito de Background Abstrato Premium -->
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
          <router-link :to="logoDestination" class="flex items-center group py-1">
            <!-- Logo Dinâmica com base na Loja Ativa -->
            <div v-if="currentCompany" class="flex items-center gap-2.5">
              <div class="w-9 h-9 rounded-xl bg-gradient-to-tr from-brand-start to-brand-end flex items-center justify-center text-white font-bold text-sm shadow-md shrink-0 transition-transform duration-300 group-hover:scale-105 overflow-hidden">
                <img 
                  v-if="currentCompany.image_data" 
                  :src="currentCompany.image_data" 
                  :alt="currentCompany.name" 
                  class="w-full h-full object-cover" 
                />
                <span v-else>
                  {{ currentCompany.name.charAt(0) }}
                </span>
              </div>
              <span class="text-base md:text-lg font-black tracking-tight bg-gradient-to-r from-brand-start to-brand-end bg-clip-text text-transparent group-hover:opacity-90">
                {{ currentCompany.name }}
              </span>
            </div>
            <div v-else class="flex items-center gap-2.5">
              <div class="w-9 h-9 rounded-xl bg-gradient-to-tr from-purple-500 to-indigo-500 flex items-center justify-center text-white font-bold text-sm shadow-md shrink-0">
                T
              </div>
              <span class="text-base md:text-lg font-black tracking-tight bg-gradient-to-r from-purple-500 to-indigo-500 bg-clip-text text-transparent">
                Thorder Portal
              </span>
            </div>
          </router-link>
        </div>

        <!-- Ações do Cabeçalho -->
        <div class="flex items-center gap-3">
          <!-- Ícone do Carrinho (Apenas para rotas Cliente se houver empresa ativa) -->
          <router-link 
            v-if="!isAdminRoute && currentCompanySlug"
            :to="`/${currentCompanySlug}/carrinho`" 
            class="relative w-10 h-10 sm:w-auto sm:px-3.5 rounded-xl border flex items-center justify-center gap-2 transition-all duration-300"
            :class="[
              themeMode === 'dark' ? 'bg-slate-900 hover:bg-slate-800 border-slate-800 hover:border-slate-700 text-slate-300 hover:text-white' : 'bg-white hover:bg-slate-50 border-slate-200 hover:border-slate-300 text-slate-700 hover:text-slate-900',
              animateCart ? 'scale-110 border-primary bg-primary/10 text-primary' : ''
            ]"
          >
            <ShoppingBag class="w-5 h-5 transition-transform duration-300 shrink-0" :class="{ 'animate-bounce': animateCart }" />
            <span class="hidden sm:inline text-xs font-bold uppercase tracking-wider">Carrinho</span>
            <!-- Contador animado -->
            <span 
              v-if="cartCount > 0"
              class="flex h-5 min-w-[20px] items-center justify-center rounded-full bg-gradient-to-r from-brand-start to-brand-end px-1 text-[10px] font-bold text-white shadow-md shadow-brand-end/30 transition-transform duration-300"
              :class="[
                'absolute -top-1.5 -right-1.5 sm:static sm:translate-y-0'
              ]"
            >
              {{ cartCount }}
            </span>
          </router-link>

          <!-- Usuário Logado no Admin -->
          <div v-if="isAdminRoute && currentUser && route.name !== 'admin-login'" class="flex items-center gap-2">
            <div class="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-xl border border-border/60 bg-muted/40 text-xs">
              <div class="w-6 h-6 rounded-full flex items-center justify-center font-black text-white text-[10px]"
                :class="currentUser.role === 'superadmin' ? 'bg-amber-500' : 'bg-primary'"
              >
                {{ currentUser.name.charAt(0) }}
              </div>
              <div class="flex flex-col text-left">
                <span class="font-bold leading-tight truncate max-w-[120px]">{{ currentUser.name }}</span>
                <span class="text-[9px] uppercase font-semibold text-muted-foreground leading-tight">
                  {{ currentUser.role === 'superadmin' ? 'Super Admin' : 'Lojista' }}
                </span>
              </div>
            </div>

            <!-- Botão Trocar Senha -->
            <Button 
              variant="ghost" 
              size="sm"
              class="rounded-xl gap-1.5 font-bold text-xs hover:bg-primary/10 hover:text-primary transition-colors text-muted-foreground"
              title="Alterar Minha Senha"
              @click="showChangePasswordModal = true"
            >
              <KeyRound class="w-4 h-4" />
              <span class="hidden md:inline">Trocar Senha</span>
            </Button>

            <!-- Botão Sair -->
            <Button 
              variant="ghost" 
              size="sm"
              class="text-red-500 hover:text-red-400 hover:bg-red-500/10 rounded-xl gap-1.5 font-bold text-xs"
              @click="handleAdminLogout"
            >
              <LogOut class="w-4 h-4" />
              <span class="hidden sm:inline">Sair</span>
            </Button>
          </div>

          <!-- Link para Painel do Lojista (se na Landing page) -->
          <router-link 
            v-else-if="!isAdminRoute && !currentCompanySlug && currentUser?.role === 'superadmin'"
            to="/admin"
            class="hidden sm:inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold border border-border/80 hover:bg-muted/50 transition-colors"
          >
            <Lock class="w-3.5 h-3.5 text-primary" />
            <span>Painel Master</span>
          </router-link>
        </div>
      </div>
    </header>

    <!-- Conteúdo Principal Dinâmico -->
    <main class="flex-1 container mx-auto px-4 py-6 md:py-8 z-10">
      <router-view v-slot="{ Component, route }">
        <transition name="fade" mode="out-in">
          <component :is="Component" :key="route.path" />
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
          {{ currentCompany ? currentCompany.name : 'Thorder Portal' }} &copy; 2026
        </p>
      </div>
    </footer>

    <!-- Modal Global de Troca de Senha -->
    <ChangePasswordModal 
      :open="showChangePasswordModal" 
      @update:open="showChangePasswordModal = $event" 
    />
  </div>
</template>

<style>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
