<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { 
  CheckCircle, 
  ArrowLeft, 
  ShoppingBag, 
  Truck, 
  MapPin, 
  Mail, 
  Phone,
  User,
  Loader2
} from 'lucide-vue-next'
import { fetchOrders, type Order } from '@/services/store'
import { Button } from '@/components/ui/button'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'

const route = useRoute()
const router = useRouter()

const orderId = Number(route.params.id)
const order = ref<Order | null>(null)
const isLoading = ref(true)

onMounted(async () => {
  try {
    // Busca os pedidos para encontrar o recém-criado
    const ordersList = await fetchOrders()
    const found = ordersList.find(o => o.id === orderId)
    
    if (found) {
      order.value = found
    }
  } catch (err) {
    console.error('Erro ao buscar detalhes do pedido:', err)
  } finally {
    isLoading.value = false
  }
})

const formatPrice = (value: number) => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(value)
}

const formatDate = (isoString: string) => {
  try {
    return new Intl.DateTimeFormat('pt-BR', {
      dateStyle: 'short',
      timeStyle: 'short'
    }).format(new Date(isoString))
  } catch(e) {
    return isoString
  }
}
</script>

<template>
  <div class="max-w-2xl mx-auto space-y-8 animate-in fade-in slide-in-from-top-4 duration-500">
    <!-- Loader -->
    <div v-if="isLoading" class="flex flex-col items-center justify-center py-20 gap-3">
      <Loader2 class="w-10 h-10 text-purple-500 animate-spin" />
      <p class="text-slate-400 text-sm">Carregando confirmação do seu pedido...</p>
    </div>

    <!-- Pedido Não Encontrado -->
    <div v-else-if="!order" class="text-center py-16 bg-slate-900/10 border border-slate-800 rounded-3xl space-y-4">
      <CheckCircle class="w-16 h-16 text-emerald-500 mx-auto animate-pulse" />
      <h2 class="text-2xl font-extrabold text-slate-100">Obrigado pela sua compra!</h2>
      <p class="text-slate-400 text-sm max-w-sm mx-auto leading-relaxed">
        Seu pedido foi registrado com sucesso. (ID: #{{ orderId }}). Porém não foi possível carregar os detalhes estruturados.
      </p>
      <Button 
        class="rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold px-6"
        @click="router.push('/')"
      >
        Voltar à Loja
      </Button>
    </div>

    <!-- Pedido Encontrado -->
    <div v-else class="space-y-6">
      <!-- Mensagem de Sucesso -->
      <div class="text-center space-y-3">
        <div class="inline-flex items-center justify-center w-16 h-16 rounded-full bg-emerald-950/40 border border-emerald-500/20 text-emerald-400 shadow-xl shadow-emerald-500/10">
          <CheckCircle class="w-10 h-10" />
        </div>
        <h1 class="text-3xl font-extrabold text-slate-100 tracking-tight leading-tight">
          Pedido Realizado com Sucesso!
        </h1>
        <p class="text-slate-400 text-xs md:text-sm max-w-md mx-auto leading-relaxed">
          Seu pedido foi registrado na tabela <code class="text-purple-400 bg-slate-900 px-1.5 py-0.5 rounded font-mono">orders</code> do Turso DB e está sendo processado.
        </p>
        
        <div class="inline-block px-4 py-1 bg-slate-900 border border-slate-800 rounded-full font-mono text-xs font-bold text-slate-300 shadow-inner mt-2">
          CÓDIGO DO PEDIDO: #{{ order.id }}
        </div>
      </div>

      <!-- Detalhamento do Pedido -->
      <Card class="bg-slate-900/30 border-slate-900 rounded-2xl shadow-xl overflow-hidden">
        <CardHeader class="pb-3 border-b border-slate-900/60 bg-slate-950/40">
          <CardTitle class="text-sm font-bold text-slate-300 uppercase tracking-wider">Dados da Entrega &amp; Contato</CardTitle>
        </CardHeader>
        <CardContent class="p-6 space-y-4 text-xs md:text-sm">
          <!-- Nome e Contato -->
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div class="flex items-center gap-2.5 text-slate-300">
              <User class="w-4 h-4 text-purple-400 shrink-0" />
              <span><strong class="text-slate-450">Cliente:</strong> {{ order.customer_name }}</span>
            </div>
            <div class="flex items-center gap-2.5 text-slate-300">
              <Mail class="w-4 h-4 text-purple-400 shrink-0" />
              <span><strong class="text-slate-450">E-mail:</strong> {{ order.customer_email }}</span>
            </div>
            <div class="flex items-center gap-2.5 text-slate-300">
              <Phone class="w-4 h-4 text-purple-400 shrink-0" />
              <span><strong class="text-slate-450">Celular:</strong> {{ order.customer_phone }}</span>
            </div>
            <div class="flex items-center gap-2.5 text-slate-300">
              <Truck class="w-4 h-4 text-purple-400 shrink-0" />
              <span><strong class="text-slate-450">Entrega:</strong> {{ order.shipping_carrier }}</span>
            </div>
          </div>

          <!-- Divisor -->
          <div class="border-t border-slate-900 my-2"></div>

          <!-- Endereço -->
          <div class="flex items-start gap-2.5 text-slate-300">
            <MapPin class="w-4 h-4 text-purple-400 shrink-0 mt-0.5" />
            <div class="space-y-0.5">
              <span><strong class="text-slate-450">Endereço Completo:</strong></span>
              <p class="text-slate-400 text-xs leading-relaxed">{{ order.shipping_address }}</p>
              <p class="text-[10px] text-slate-500 font-mono mt-0.5">CEP: {{ order.shipping_cep }}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <!-- Itens Comprados -->
      <Card class="bg-slate-900/30 border-slate-900 rounded-2xl shadow-xl overflow-hidden">
        <CardHeader class="pb-3 border-b border-slate-900/60 bg-slate-950/40 flex flex-row items-center justify-between">
          <CardTitle class="text-sm font-bold text-slate-300 uppercase tracking-wider">Itens Comprados</CardTitle>
          <span class="text-[10px] text-slate-500 font-bold uppercase">{{ formatDate(order.created_at) }}</span>
        </CardHeader>
        <CardContent class="p-6 space-y-4">
          <!-- Lista dos itens -->
          <div class="divide-y divide-slate-900/60 text-xs md:text-sm">
            <div 
              v-for="item in order.items" 
              :key="item.id"
              class="flex items-center justify-between py-2.5 first:pt-0 last:pb-0"
            >
              <div class="flex items-center gap-3">
                <span class="font-bold text-purple-400">{{ item.quantity }}x</span>
                <span class="text-slate-200 font-semibold">{{ item.product_name }}</span>
              </div>
              <span class="font-extrabold text-slate-300">{{ formatPrice(item.price * item.quantity) }}</span>
            </div>
          </div>

          <!-- Divisor -->
          <div class="border-t border-slate-900 pt-4"></div>

          <!-- Custos totais -->
          <div class="space-y-2.5 text-xs md:text-sm">
            <div class="flex justify-between text-slate-500">
              <span>Subtotal dos Itens</span>
              <span class="font-medium text-slate-300">{{ formatPrice(order.items_cost) }}</span>
            </div>
            <div class="flex justify-between text-slate-500">
              <span>Taxa de Entrega (Frete)</span>
              <span class="font-medium text-slate-300">{{ formatPrice(order.shipping_cost) }}</span>
            </div>
            
            <div class="border-t border-slate-900/80 my-2"></div>
            
            <div class="flex justify-between items-baseline">
              <span class="font-bold text-slate-350">Valor Total</span>
              <span class="font-black text-lg text-slate-200">
                {{ formatPrice(order.total_cost) }}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      <!-- Botões de Ação do Sucesso -->
      <div class="flex items-center gap-3 justify-center pt-2">
        <Button 
          variant="outline"
          class="rounded-xl border-slate-800 hover:bg-slate-800 text-slate-300 font-bold px-6"
          @click="router.push('/')"
        >
          <ShoppingBag class="w-4 h-4 mr-2" />
          Voltar ao Catálogo
        </Button>
      </div>
    </div>
  </div>
</template>
