<script setup lang="ts">
import { ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { 
  ShoppingBag, 
  Database, 
  Check, 
  AlertCircle, 
  Loader2, 
  UserCheck, 
  Settings,
  X,
  AlertTriangle,
  Moon,
  Sun,
  Palette
} from 'lucide-vue-next'
import { 
  cartCount, 
  isDbConnected, 
  getTursoConfig, 
  saveTursoConfig, 
  clearTursoConfig,
  themeMode,
  themeColor,
  setThemeMode,
  setThemeColor
} from '@/services/store'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger 
} from '@/components/ui/dialog'

const router = useRouter()

// Configuração do Turso no Modal
const showSettings = ref(false)
const dbUrl = ref('')
const dbToken = ref('')
const isConnecting = ref(false)
const connectError = ref('')
const connectSuccess = ref(false)

// Carrega as credenciais existentes se houver
const currentConfig = getTursoConfig()
if (currentConfig) {
  dbUrl.value = currentConfig.url
  dbToken.value = currentConfig.token
}

// Lógica de Conexão com o Turso
const handleConnect = async () => {
  if (!dbUrl.value || !dbToken.value) {
    connectError.value = 'Por favor, preencha todos os campos.'
    return
  }
  
  isConnecting.value = true
  connectError.value = ''
  connectSuccess.value = false
  
  try {
    const success = await saveTursoConfig({
      url: dbUrl.value.trim(),
      token: dbToken.value.trim()
    })
    
    if (success) {
      connectSuccess.value = true
      setTimeout(() => {
        showSettings.value = false
        connectSuccess.value = false
        // Recarrega a página atual para recarregar os dados do Turso
        window.location.reload()
      }, 1500)
    }
  } catch (err: any) {
    connectError.value = err.message || 'Falha ao conectar. Verifique as credenciais.'
  } finally {
    isConnecting.value = false
  }
}

// Lógica de Desconexão
const handleDisconnect = () => {
  clearTursoConfig()
  dbUrl.value = ''
  dbToken.value = ''
  showSettings.value = false
  // Recarrega para usar fallback local
  window.location.reload()
}

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
          <router-link to="/" class="flex items-center gap-2 group">
            <div class="w-9 h-9 rounded-xl bg-gradient-to-tr from-brand-start to-brand-end flex items-center justify-center shadow-lg shadow-primary/20 group-hover:scale-105 transition-all duration-300">
              <span class="text-white font-black text-lg">T</span>
            </div>
            <span class="font-extrabold text-xl tracking-tight transition-colors duration-200"
              :class="themeMode === 'dark' ? 'text-white group-hover:text-primary' : 'text-slate-900 group-hover:text-primary'"
            >
              Thorder<span class="text-primary">Store</span>
            </span>
          </router-link>

          <!-- Links de Navegação -->
          <nav class="hidden md:flex items-center gap-1">
            <router-link 
              to="/" 
              class="px-4 py-2 rounded-lg text-sm font-medium border transition-all duration-200"
              :class="!isAdminRoute() 
                ? (themeMode === 'dark' ? 'bg-slate-900 text-white border-slate-800 shadow-inner' : 'bg-slate-100 text-slate-900 border-slate-200 shadow-inner') 
                : (themeMode === 'dark' ? 'text-slate-400 border-transparent hover:text-white hover:bg-slate-900/40' : 'text-slate-500 border-transparent hover:text-slate-900 hover:bg-slate-150/40')"
            >
              Loja Cliente
            </router-link>
            <router-link 
              to="/admin" 
              class="px-4 py-2 rounded-lg text-sm font-medium border transition-all duration-200"
              :class="isAdminRoute() 
                ? (themeMode === 'dark' ? 'bg-slate-900 text-white border-slate-800 shadow-inner' : 'bg-slate-100 text-slate-900 border-slate-200 shadow-inner') 
                : (themeMode === 'dark' ? 'text-slate-400 border-transparent hover:text-white hover:bg-slate-900/40' : 'text-slate-500 border-transparent hover:text-slate-900 hover:bg-slate-150/40')"
            >
              Painel Admin
            </router-link>
          </nav>
        </div>

        <!-- Ações do Cabeçalho -->
        <div class="flex items-center gap-3">
          <!-- Botão Configurações (Tema e Banco) -->
          <Dialog v-model:open="showSettings">
            <DialogTrigger as-child>
              <Button 
                variant="outline" 
                size="sm"
                class="rounded-xl gap-2 transition-all duration-300 font-bold"
                :class="[
                  themeMode === 'dark' ? 'bg-slate-900 hover:bg-slate-800 border-slate-800 hover:border-slate-700 text-slate-350' : 'bg-white hover:bg-slate-50 border-slate-250 hover:border-slate-300 text-slate-700',
                  isDbConnected ? 'border-emerald-500/30 text-emerald-450 hover:text-emerald-400' : ''
                ]"
              >
                <Settings class="w-4 h-4 text-primary" />
                <span class="hidden sm:inline">Configurações</span>
                <span class="w-2 h-2 rounded-full" :class="isDbConnected ? 'bg-emerald-500 shadow-lg shadow-emerald-500/50 animate-pulse' : 'bg-amber-500'"></span>
              </Button>
            </DialogTrigger>
            <DialogContent class="sm:max-w-[480px] rounded-2xl shadow-2xl transition-colors duration-300"
              :class="themeMode === 'dark' ? 'bg-slate-900 border-slate-800 text-slate-100' : 'bg-white border-slate-200 text-slate-900'"
            >
              <DialogHeader>
                <DialogTitle class="text-xl font-extrabold flex items-center gap-2"
                  :class="themeMode === 'dark' ? 'text-slate-100' : 'text-slate-900'"
                >
                  <Settings class="w-5 h-5 text-primary" />
                  Configurações da Loja
                </DialogTitle>
                <p class="text-slate-400 text-xs mt-1">
                  Ajuste a aparência visual do e-commerce e as credenciais de sincronização na nuvem.
                </p>
              </DialogHeader>

              <div class="space-y-5 my-4">
                
                <!-- 1. PERSONALIZAÇÃO VISUAL (TEMA E CORES) -->
                <div class="space-y-3 pb-5 border-b"
                  :class="themeMode === 'dark' ? 'border-slate-800/80' : 'border-slate-100'"
                >
                  <h4 class="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                    <Palette class="w-3.5 h-3.5 text-primary" />
                    Personalização Visual
                  </h4>
                  
                  <!-- Modo Dark/Light -->
                  <div class="flex items-center justify-between text-xs sm:text-sm">
                    <span class="text-slate-400 font-semibold">Tema do Projeto</span>
                    <div class="flex items-center gap-1 border rounded-xl p-1 shrink-0"
                      :class="themeMode === 'dark' ? 'bg-slate-950 border-slate-850' : 'bg-slate-100 border-slate-200'"
                    >
                       <Button 
                        variant="ghost" 
                        size="xs"
                        class="rounded-lg text-[11px] font-bold px-3 py-1 transition-all"
                        :class="themeMode === 'light' 
                          ? 'bg-white text-slate-900 shadow-sm border border-slate-200' 
                          : 'text-slate-450 hover:text-slate-900'"
                        @click="setThemeMode('light')"
                      >
                        <Sun class="w-3 h-3 mr-1 text-amber-500" />
                        Claro
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="xs"
                        class="rounded-lg text-[11px] font-bold px-3 py-1 transition-all"
                        :class="themeMode === 'dark' 
                          ? 'bg-slate-900 text-white shadow-inner border border-slate-800' 
                          : 'text-slate-450 hover:text-slate-100'"
                        @click="setThemeMode('dark')"
                      >
                        <Moon class="w-3 h-3 mr-1 text-purple-400" />
                        Escuro
                      </Button>
                    </div>
                  </div>

                  <!-- Cor de Destaque -->
                  <div class="flex items-center justify-between text-xs sm:text-sm pt-1">
                    <span class="text-slate-400 font-semibold">Cor de Destaque</span>
                    <div class="flex items-center gap-2">
                      <!-- Purple -->
                      <button 
                        class="w-6 h-6 rounded-full bg-purple-500 border-2 transition-transform duration-200 flex items-center justify-center text-white"
                        :class="themeColor === 'purple' ? 'border-purple-300 scale-110 shadow-lg shadow-purple-500/50' : 'border-transparent hover:scale-105'"
                        title="Roxo Premium"
                        @click="setThemeColor('purple')"
                      >
                        <Check v-if="themeColor === 'purple'" class="w-3.5 h-3.5" />
                      </button>
                      <!-- Emerald -->
                      <button 
                        class="w-6 h-6 rounded-full bg-emerald-500 border-2 transition-transform duration-200 flex items-center justify-center text-white"
                        :class="themeColor === 'emerald' ? 'border-emerald-300 scale-110 shadow-lg shadow-emerald-500/50' : 'border-transparent hover:scale-105'"
                        title="Verde Esmeralda"
                        @click="setThemeColor('emerald')"
                      >
                        <Check v-if="themeColor === 'emerald'" class="w-3.5 h-3.5" />
                      </button>
                      <!-- Blue -->
                      <button 
                        class="w-6 h-6 rounded-full bg-blue-500 border-2 transition-transform duration-200 flex items-center justify-center text-white"
                        :class="themeColor === 'blue' ? 'border-blue-300 scale-110 shadow-lg shadow-blue-500/50' : 'border-transparent hover:scale-105'"
                        title="Azul Elétrico"
                        @click="setThemeColor('blue')"
                      >
                        <Check v-if="themeColor === 'blue'" class="w-3.5 h-3.5" />
                      </button>
                      <!-- Orange -->
                      <button 
                        class="w-6 h-6 rounded-full bg-orange-500 border-2 transition-transform duration-200 flex items-center justify-center text-white"
                        :class="themeColor === 'orange' ? 'border-orange-350 scale-110 shadow-lg shadow-orange-500/50' : 'border-transparent hover:scale-105'"
                        title="Laranja Vibrante"
                        @click="setThemeColor('orange')"
                      >
                        <Check v-if="themeColor === 'orange'" class="w-3.5 h-3.5" />
                      </button>
                      <!-- Red -->
                      <button 
                        class="w-6 h-6 rounded-full bg-red-500 border-2 transition-transform duration-200 flex items-center justify-center text-white"
                        :class="themeColor === 'red' ? 'border-red-300 scale-110 shadow-lg shadow-red-500/50' : 'border-transparent hover:scale-105'"
                        title="Vermelho Carmesim"
                        @click="setThemeColor('red')"
                      >
                        <Check v-if="themeColor === 'red'" class="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>

                <!-- 2. CONEXÃO COM TURSO -->
                <div class="space-y-4 pt-1">
                  <h4 class="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                    <Database class="w-3.5 h-3.5 text-primary" />
                    Persistência de Dados (Turso DB)
                  </h4>
                  
                  <!-- Status Atual -->
                  <div class="p-3.5 rounded-xl border flex items-start gap-3" 
                    :class="isDbConnected 
                      ? (themeMode === 'dark' ? 'bg-emerald-950/20 border-emerald-500/20' : 'bg-emerald-50/60 border-emerald-200 text-slate-800') 
                      : (themeMode === 'dark' ? 'bg-amber-950/20 border-amber-500/20' : 'bg-amber-50/60 border-amber-200 text-slate-800')"
                  >
                    <AlertCircle class="w-5 h-5 mt-0.5 shrink-0" :class="isDbConnected ? 'text-emerald-500' : 'text-amber-500'" />
                    <div>
                      <h4 class="font-bold text-sm" :class="isDbConnected ? 'text-emerald-500' : 'text-amber-500'">
                        {{ isDbConnected ? 'Conectado à Nuvem (Online)' : 'Modo Offline (Local Storage)' }}
                      </h4>
                      <p class="text-[11px] text-slate-400 mt-0.5 leading-relaxed"
                        :class="themeMode === 'dark' ? 'text-slate-400' : 'text-slate-500'"
                      >
                        {{ isDbConnected 
                          ? 'Seu e-commerce está rodando online conectado ao Turso DB. Os dados e imagens cadastrados no Admin são persistidos na nuvem.' 
                          : 'Você está no modo offline. Os dados ficam salvos apenas neste navegador. Conecte ao Turso para ter persistência real!' 
                        }}
                      </p>
                    </div>
                  </div>

                  <!-- Formulário -->
                  <div class="space-y-3">
                    <div class="space-y-1">
                      <label class="text-xs font-bold text-slate-400"
                        :class="themeMode === 'dark' ? 'text-slate-400' : 'text-slate-500'"
                      >Database URL (libsql://...)</label>
                      <Input 
                        v-model="dbUrl" 
                        placeholder="libsql://seu-banco-usuario.turso.io" 
                        class="rounded-xl"
                        :class="themeMode === 'dark' ? 'bg-slate-950 border-slate-800 text-white focus:ring-primary' : 'bg-slate-100 border-slate-300 text-slate-900 focus:ring-primary'"
                      />
                    </div>
                    <div class="space-y-1">
                      <label class="text-xs font-bold text-slate-400"
                        :class="themeMode === 'dark' ? 'text-slate-400' : 'text-slate-500'"
                      >Auth Token</label>
                      <Input 
                        v-model="dbToken" 
                        type="password"
                        placeholder="eyJhbGciOiJ..." 
                        class="rounded-xl"
                        :class="themeMode === 'dark' ? 'bg-slate-950 border-slate-800 text-white focus:ring-primary' : 'bg-slate-100 border-slate-300 text-slate-900 focus:ring-primary'"
                      />
                    </div>
                  </div>
                </div>

                <!-- Feedbacks -->
                <div v-if="connectError" class="p-3 rounded-xl bg-red-950/30 border border-red-500/30 text-red-400 text-xs flex items-center gap-2 animate-shake">
                  <AlertTriangle class="w-4 h-4 shrink-0" />
                  <span>{{ connectError }}</span>
                </div>

                <div v-if="connectSuccess" class="p-3 rounded-xl bg-emerald-950/30 border border-emerald-500/30 text-emerald-400 text-xs flex items-center gap-2">
                  <Check class="w-4 h-4 shrink-0" />
                  <span>Conectado com sucesso! Sincronizando tabelas...</span>
                </div>
              </div>

              <!-- Ações -->
              <div class="flex items-center justify-end gap-2 border-t pt-4 mt-2"
                :class="themeMode === 'dark' ? 'border-slate-800/80' : 'border-slate-150'"
              >
                <Button 
                  v-if="isDbConnected"
                  variant="destructive" 
                  size="sm"
                  class="rounded-xl font-bold bg-red-950 hover:bg-red-900 border border-red-800/50 text-red-200"
                  @click="handleDisconnect"
                >
                  Desconectar
                </Button>
                <Button 
                  size="sm"
                  class="rounded-xl font-bold bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg shadow-primary/20"
                  :disabled="isConnecting"
                  @click="handleConnect"
                >
                  <Loader2 v-if="isConnecting" class="w-4 h-4 animate-spin mr-1.5" />
                  {{ isConnecting ? 'Conectando...' : 'Salvar & Conectar' }}
                </Button>
              </div>
            </DialogContent>
          </Dialog>

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

    <!-- Menu Lateral Mobile para alternar de canal -->
    <div class="md:hidden sticky top-16 z-30 w-full border-b flex items-center justify-around py-2.5 px-4 backdrop-blur-sm transition-colors duration-300"
      :class="themeMode === 'dark' ? 'border-slate-900 bg-slate-950/95' : 'border-slate-200 bg-white/95'"
    >
      <router-link 
        to="/" 
        class="text-xs font-bold px-4 py-2 rounded-lg flex-1 text-center transition-all duration-200 border border-transparent"
        :class="!isAdminRoute() 
          ? (themeMode === 'dark' ? 'bg-slate-900 text-primary border-slate-800 shadow-inner' : 'bg-slate-100 text-primary border-slate-200 shadow-inner') 
          : (themeMode === 'dark' ? 'text-slate-400' : 'text-slate-500')"
      >
        Loja do Cliente
      </router-link>
      <router-link 
        to="/admin" 
        class="text-xs font-bold px-4 py-2 rounded-lg flex-1 text-center transition-all duration-200 border border-transparent"
        :class="isAdminRoute() 
          ? (themeMode === 'dark' ? 'bg-slate-900 text-primary border-slate-800 shadow-inner' : 'bg-slate-100 text-primary border-slate-200 shadow-inner') 
          : (themeMode === 'dark' ? 'text-slate-400' : 'text-slate-500')"
      >
        Painel Admin
      </router-link>
    </div>

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
          ThorderStore &copy; 2026 - Conectividade Híbrida Turso DB
        </p>
        <p class="text-xs text-slate-500 max-w-md mx-auto leading-relaxed">
          Feito em Vue 3, shadcn-vue e Tailwind CSS v4. Conexões de banco SQLite distribuídas na nuvem de baixa latência.
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
