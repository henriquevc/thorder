<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { 
  FileText, 
  ShoppingBag, 
  DollarSign,
  Boxes,
  Database,
  Loader2,
  Sparkles
} from 'lucide-vue-next'
import { 
  fetchOrders, 
  fetchProducts, 
  isDbConnected,
  themeMode,
  themeColor,
  type Order, 
  type Product 
} from '@/services/store'
import AdminProducts from './AdminProducts.vue'
import AdminOrders from './AdminOrders.vue'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'

const ordersList = ref<Order[]>([])
const productsList = ref<Product[]>([])
const isLoadingStats = ref(true)

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
            :class="themeMode === 'dark' ? 'text-slate-400 hover:text-white' : 'text-slate-650 hover:text-slate-900'"
          >
            Produtos
          </TabsTrigger>
          <TabsTrigger value="pedidos" class="rounded-lg text-xs md:text-sm font-bold px-5 py-2 transition-all"
            :class="themeMode === 'dark' ? 'text-slate-400 hover:text-white' : 'text-slate-650 hover:text-slate-900'"
          >
            Pedidos
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
    </Tabs>
  </div>
</template>
