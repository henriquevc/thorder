<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { 
  FileText, 
  ShoppingBag, 
  DollarSign,
  Boxes,
  Database,
  Loader2,
  Sparkles,
  Check,
  AlertTriangle,
  AlertCircle
} from 'lucide-vue-next'
import { 
  fetchOrders, 
  fetchProducts, 
  isDbConnected,
  getTursoConfig,
  saveTursoConfig,
  clearTursoConfig,
  themeMode,
  themeColor,
  type Order, 
  type Product 
} from '@/services/store'
import AdminProducts from './AdminProducts.vue'
import AdminOrders from './AdminOrders.vue'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

const ordersList = ref<Order[]>([])
const productsList = ref<Product[]>([])
const isLoadingStats = ref(true)

// Configuração do Turso no Admin
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
  // Recarrega para usar fallback local
  window.location.reload()
}

onMounted(async () => {
  try {
    // Carrega estatísticas iniciais em paralelo
    const [orders, products] = await Promise.all([
      fetchOrders(),
      fetchProducts()
    ])
    ordersList.value = orders
    productsList.value = products
  } catch (err) {
    console.error('Falha ao obter dados estatísticos:', err)
  } finally {
    isLoadingStats.value = false
  }
})

// Cálculo de Faturamento Total
const totalRevenue = computed(() => {
  return ordersList.value.reduce((sum, order) => sum + order.total_cost, 0)
})

// Pedidos finalizados / Pagos (Para métricas)
const completedOrdersCount = computed(() => {
  return ordersList.value.filter(o => o.status !== 'Pendente').length
})

const formatPrice = (val: number) => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(val)
}
</script>

<template>
  <div class="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
    <!-- Header Admin -->
    <div class="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b pb-5"
      :class="themeMode === 'dark' ? 'border-slate-900' : 'border-slate-200'"
    >
      <div class="space-y-1">
        <h1 class="text-2xl md:text-3xl font-extrabold flex items-center gap-2.5"
          :class="themeMode === 'dark' ? 'text-slate-100' : 'text-slate-900'"
        >
          <Boxes class="w-7 h-7 text-primary" />
          Painel de Controle
        </h1>
        <p class="text-xs md:text-sm"
          :class="themeMode === 'dark' ? 'text-slate-400' : 'text-slate-600'"
        >
          Acompanhe o faturamento, controle seu estoque e processe pedidos online.
        </p>
      </div>

      <!-- Conectividade Tag -->
      <div class="flex items-center gap-2 border px-4 py-2 rounded-2xl self-start text-xs font-semibold"
        :class="themeMode === 'dark' ? 'bg-slate-900/60 border-slate-800' : 'bg-white border-slate-205 shadow-sm'"
      >
        <Database class="w-4 h-4" :class="isDbConnected ? 'text-emerald-500' : 'text-amber-555'" />
        <span class="text-slate-400" :class="themeMode === 'dark' ? 'text-slate-400' : 'text-slate-500'">Banco de Dados:</span>
        <span class="font-bold" :class="isDbConnected ? 'text-emerald-555' : 'text-amber-500'">
          {{ isDbConnected ? 'Turso Cloud (Ativo)' : 'Local Storage (Offline)' }}
        </span>
      </div>
    </div>

    <!-- Estatísticas Rápidas (Overview Cards) -->
    <div v-if="isLoadingStats" class="grid grid-cols-1 md:grid-cols-3 gap-6">
      <div v-for="i in 3" :key="i" class="h-28 rounded-2xl animate-pulse"
        :class="themeMode === 'dark' ? 'bg-slate-900/10 border border-slate-900/60' : 'bg-slate-100 border border-slate-200'"
      ></div>
    </div>
    
    <div v-else class="grid grid-cols-1 sm:grid-cols-3 gap-6">
      <!-- Faturamento Total -->
      <Card class="rounded-2xl shadow-xl hover:shadow-2xl hover:shadow-primary/5 transition-all duration-300 relative overflow-hidden"
        :class="themeMode === 'dark' ? 'bg-slate-900/30 border-slate-900' : 'bg-white border-slate-200'"
      >
        <div class="absolute top-0 right-0 w-16 h-16 bg-emerald-500/5 rounded-full blur-xl"></div>
        <CardContent class="p-6 flex items-center justify-between">
          <div class="space-y-1">
            <span class="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Faturamento Geral</span>
            <h3 class="text-2xl font-black"
              :class="themeMode === 'dark' ? 'text-slate-100' : 'text-slate-900'"
            >{{ formatPrice(totalRevenue) }}</h3>
            <p class="text-[10px] text-slate-400 mt-1 flex items-center gap-1"
              :class="themeMode === 'dark' ? 'text-slate-400' : 'text-slate-550'"
            >
              <span class="text-emerald-500 font-bold">100% online</span> com Turso
            </p>
          </div>
          <div class="w-12 h-12 rounded-xl bg-emerald-955/40 border border-emerald-500/20 text-emerald-500 flex items-center justify-center">
            <DollarSign class="w-6 h-6" />
          </div>
        </CardContent>
      </Card>

      <!-- Total de Pedidos -->
      <Card class="rounded-2xl shadow-xl hover:shadow-2xl hover:shadow-primary/5 transition-all duration-300 relative overflow-hidden"
        :class="themeMode === 'dark' ? 'bg-slate-900/30 border-slate-900' : 'bg-white border-slate-200'"
      >
        <div class="absolute top-0 right-0 w-16 h-16 bg-primary/5 rounded-full blur-xl"></div>
        <CardContent class="p-6 flex items-center justify-between">
          <div class="space-y-1">
            <span class="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Pedidos Totais</span>
            <h3 class="text-2xl font-black"
              :class="themeMode === 'dark' ? 'text-slate-100' : 'text-slate-900'"
            >{{ ordersList.length }} pedidos</h3>
            <p class="text-[10px] text-slate-450 mt-1"
              :class="themeMode === 'dark' ? 'text-slate-400' : 'text-slate-550'"
            >
              <span class="text-primary font-bold">{{ completedOrdersCount }} processados</span> no sistema
            </p>
          </div>
          <div class="w-12 h-12 rounded-xl bg-primary/10 border border-primary/20 text-primary flex items-center justify-center">
            <FileText class="w-6 h-6" />
          </div>
        </CardContent>
      </Card>

      <!-- Total de Produtos -->
      <Card class="rounded-2xl shadow-xl hover:shadow-2xl hover:shadow-primary/5 transition-all duration-300 relative overflow-hidden"
        :class="themeMode === 'dark' ? 'bg-slate-900/30 border-slate-900' : 'bg-white border-slate-200'"
      >
        <div class="absolute top-0 right-0 w-16 h-16 bg-blue-500/5 rounded-full blur-xl"></div>
        <CardContent class="p-6 flex items-center justify-between">
          <div class="space-y-1">
            <span class="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Produtos Cadastrados</span>
            <h3 class="text-2xl font-black"
              :class="themeMode === 'dark' ? 'text-slate-100' : 'text-slate-900'"
            >{{ productsList.length }} produtos</h3>
            <p class="text-[10px] text-slate-400 mt-1"
              :class="themeMode === 'dark' ? 'text-slate-400' : 'text-slate-550'"
            >
              Catálogo sincronizado na nuvem
            </p>
          </div>
          <div class="w-12 h-12 rounded-xl bg-blue-955/40 border border-blue-500/20 text-blue-500 flex items-center justify-center">
            <ShoppingBag class="w-6 h-6" />
          </div>
        </CardContent>
      </Card>
    </div>

    <!-- Navegação de Abas (Tabs) -->
    <Tabs default-value="produtos" class="space-y-6">
      <div class="border-b pb-3"
        :class="themeMode === 'dark' ? 'border-slate-900' : 'border-slate-200'"
      >
        <TabsList class="border rounded-xl p-1 shrink-0 self-start transition-colors duration-300"
          :class="themeMode === 'dark' ? 'bg-slate-950 border-slate-900' : 'bg-slate-100 border-slate-200'"
        >
          <TabsTrigger value="produtos" class="rounded-lg text-xs md:text-sm font-bold px-5 py-2 transition-all"
            :class="themeMode === 'dark' ? 'text-slate-400 hover:text-white' : 'text-slate-655 hover:text-slate-900'"
          >
            Produtos
          </TabsTrigger>
          <TabsTrigger value="pedidos" class="rounded-lg text-xs md:text-sm font-bold px-5 py-2 transition-all"
            :class="themeMode === 'dark' ? 'text-slate-400 hover:text-white' : 'text-slate-655 hover:text-slate-900'"
          >
            Pedidos
          </TabsTrigger>
          <TabsTrigger value="banco" class="rounded-lg text-xs md:text-sm font-bold px-5 py-2 transition-all"
            :class="themeMode === 'dark' ? 'text-slate-400 hover:text-white' : 'text-slate-655 hover:text-slate-900'"
          >
            Banco de Dados
          </TabsTrigger>
        </TabsList>
      </div>

      <!-- Tab Conteúdo: Produtos -->
      <TabsContent value="produtos" class="outline-none">
        <AdminProducts />
      </TabsContent>

      <!-- Tab Conteúdo: Pedidos -->
      <TabsContent value="pedidos" class="outline-none">
        <AdminOrders />
      </TabsContent>

      <!-- Tab Conteúdo: Banco de Dados -->
      <TabsContent value="banco" class="outline-none space-y-6">
        <Card class="rounded-2xl shadow-xl transition-colors duration-300 relative overflow-hidden"
          :class="themeMode === 'dark' ? 'bg-slate-900/30 border-slate-900' : 'bg-white border-slate-200'"
        >
          <CardHeader class="border-b pb-4" :class="themeMode === 'dark' ? 'border-slate-800/80' : 'border-slate-100'">
            <CardTitle class="text-xl font-extrabold flex items-center gap-2"
              :class="themeMode === 'dark' ? 'text-slate-100' : 'text-slate-900'"
            >
              <Database class="w-5 h-5 text-primary" />
              Sincronização de Banco de Dados (Turso Cloud)
            </CardTitle>
            <p class="text-slate-400 text-xs mt-1">
              Conecte sua loja virtual ao banco de dados Turso remoto para persistir produtos e pedidos de forma integrada e segura em qualquer dispositivo.
            </p>
          </CardHeader>
          
          <CardContent class="p-6 space-y-6">
            <!-- Status de Conexão -->
            <div class="p-4 rounded-xl border flex items-start gap-3" 
              :class="isDbConnected 
                ? (themeMode === 'dark' ? 'bg-emerald-950/20 border-emerald-500/20 text-emerald-400' : 'bg-emerald-50/60 border-emerald-200 text-slate-850') 
                : (themeMode === 'dark' ? 'bg-amber-955/20 border-amber-500/20 text-amber-400' : 'bg-amber-50/60 border-amber-200 text-slate-850')"
            >
              <AlertCircle class="w-5 h-5 mt-0.5 shrink-0" :class="isDbConnected ? 'text-emerald-500' : 'text-amber-555'" />
              <div>
                <h4 class="font-bold text-sm" :class="isDbConnected ? 'text-emerald-500' : 'text-amber-555'">
                  {{ isDbConnected ? 'Status: Conectado à Nuvem (Online)' : 'Status: Modo Offline (Local Storage)' }}
                </h4>
                <p class="text-xs text-slate-400 mt-1 leading-relaxed"
                  :class="themeMode === 'dark' ? 'text-slate-400' : 'text-slate-500'"
                >
                  {{ isDbConnected 
                    ? 'A conexão com o Turso DB está configurada e ativa neste navegador. Suas alterações de estoque, produtos e novos pedidos serão gravadas diretamente e compartilhadas em tempo real.' 
                    : 'A loja está rodando localmente (Offline). Os dados estão salvos apenas no armazenamento temporário deste navegador. Para sincronizar e acessar os mesmos dados em outros dispositivos (como celular e computador), preencha os dados do banco Turso abaixo ou configure as variáveis de ambiente.' 
                  }}
                </p>
              </div>
            </div>

            <!-- Formulário de Credenciais -->
            <div class="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
              <div class="space-y-2">
                <label class="text-xs font-bold uppercase tracking-wider text-slate-400"
                  :class="themeMode === 'dark' ? 'text-slate-400' : 'text-slate-500'"
                >Database URL (libsql://...)</label>
                <Input 
                  v-model="dbUrl" 
                  placeholder="libsql://seu-banco-usuario.turso.io" 
                  class="rounded-xl"
                  :class="themeMode === 'dark' ? 'bg-slate-950 border-slate-800 text-white focus:ring-primary' : 'bg-slate-100 border-slate-300 text-slate-900 focus:ring-primary'"
                />
                <p class="text-[10px] text-slate-500">Endereço libSQL fornecido no painel do Turso.</p>
              </div>
              
              <div class="space-y-2">
                <label class="text-xs font-bold uppercase tracking-wider text-slate-400"
                  :class="themeMode === 'dark' ? 'text-slate-400' : 'text-slate-500'"
                >Auth Token</label>
                <Input 
                  v-model="dbToken" 
                  type="password"
                  placeholder="eyJhbGciOiJ..." 
                  class="rounded-xl"
                  :class="themeMode === 'dark' ? 'bg-slate-950 border-slate-800 text-white focus:ring-primary' : 'bg-slate-100 border-slate-300 text-slate-900 focus:ring-primary'"
                />
                <p class="text-[10px] text-slate-500">Token de acesso seguro (Auth Token) correspondente ao banco.</p>
              </div>
            </div>

            <!-- Feedbacks -->
            <div v-if="connectError" class="p-3.5 rounded-xl bg-red-950/30 border border-red-500/30 text-red-400 text-xs flex items-center gap-2 animate-shake">
              <AlertTriangle class="w-4 h-4 shrink-0" />
              <span>{{ connectError }}</span>
            </div>

            <div v-if="connectSuccess" class="p-3.5 rounded-xl bg-emerald-955/30 border border-emerald-500/30 text-emerald-450 text-xs flex items-center gap-2">
              <Check class="w-4 h-4 shrink-0" />
              <span>Conexão estabelecida com sucesso! As tabelas foram migradas e sincronizadas.</span>
            </div>

            <!-- Ações -->
            <div class="flex items-center justify-between border-t pt-6"
              :class="themeMode === 'dark' ? 'border-slate-800/80' : 'border-slate-150'"
            >
              <div class="text-xs text-slate-400" :class="themeMode === 'dark' ? 'text-slate-500' : 'text-slate-400'">
                * Configurações de banco por navegador. Utilize arquivos <code class="px-1.5 py-0.5 rounded bg-slate-950 font-mono text-primary text-[10px] border border-slate-800">.env</code> para sincronização global sem login.
              </div>
              
              <div class="flex items-center gap-3">
                <Button 
                  v-if="isDbConnected"
                  variant="outline" 
                  size="sm"
                  class="rounded-xl font-bold bg-red-950/20 hover:bg-red-900/40 border-red-500/30 hover:border-red-500/50 text-red-450"
                  @click="handleDisconnect"
                >
                  Desconectar Banco
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
            </div>
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  </div>
</template>
