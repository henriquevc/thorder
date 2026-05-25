<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { 
  FileText, 
  Eye, 
  Check, 
  Truck, 
  MapPin, 
  Mail, 
  Phone, 
  User,
  Loader2,
  Calendar,
  DollarSign,
  Clock,
  ChevronDown
} from 'lucide-vue-next'
import { 
  fetchOrders, 
  updateOrderStatus, 
  themeMode,
  themeColor,
  type Order 
} from '@/services/store'
import { Button } from '@/components/ui/button'
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle,
  DialogFooter
} from '@/components/ui/dialog'
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table'
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select'

const orders = ref<Order[]>([])
const isLoading = ref(true)

// Visualizador de Detalhes do Pedido
const selectedOrder = ref<Order | null>(null)
const showDetailsDialog = ref(false)
const isUpdatingStatus = ref(false)

onMounted(async () => {
  await loadOrders()
})

const loadOrders = async () => {
  isLoading.value = true
  try {
    orders.value = await fetchOrders()
  } catch (err) {
    console.error('Falha ao carregar pedidos:', err)
  } finally {
    isLoading.value = false
  }
}

// Formatação do Preço
const formatPrice = (val: number) => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(val)
}

// Formatação de data
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

// Abrir modal de detalhes
const openDetailsDialog = (order: Order) => {
  selectedOrder.value = order
  showDetailsDialog.value = true
}

// Atualizar status do pedido
const handleStatusChange = async (newStatus: Order["status"]) => {
  if (!selectedOrder.value) return
  
  isUpdatingStatus.value = true
  try {
    await updateOrderStatus(selectedOrder.value.id!, newStatus)
    
    // Atualiza status no modal local
    selectedOrder.value.status = newStatus
    
    // Recarrega lista principal
    await loadOrders()
  } catch (err) {
    alert('Erro ao atualizar status do pedido.')
  } finally {
    isUpdatingStatus.value = false
  }
}
</script>

<template>
  <div class="space-y-6">
    <!-- Cabeçalho -->
    <div>
      <h2 class="text-lg md:text-xl font-bold"
        :class="themeMode === 'dark' ? 'text-slate-200' : 'text-slate-800'"
      >Gerenciar Pedidos</h2>
      <p class="text-xs text-slate-400">Monitore as compras dos clientes, controle faturamento e atualize os status de rastreamento no Turso DB.</p>
    </div>

    <!-- Tabela Loader -->
    <div v-if="isLoading" class="flex flex-col items-center justify-center py-20 gap-3">
      <Loader2 class="w-8 h-8 text-primary animate-spin" />
      <p class="text-slate-400 text-xs font-medium">Lendo pedidos do Turso DB...</p>
    </div>

    <!-- Tabela Vazia -->
    <div v-else-if="orders.length === 0" class="text-center py-16 bg-slate-900/10 border border-dashed border-slate-800 rounded-2xl space-y-3">
      <FileText class="w-10 h-10 text-slate-700 mx-auto" />
      <h4 class="font-bold text-slate-350">Sem pedidos registrados no banco</h4>
      <p class="text-xs text-slate-500 max-w-xs mx-auto leading-relaxed">
        Os pedidos efetuados no fluxo de checkout dos clientes aparecerão aqui automaticamente.
      </p>
    </div>

    <!-- Tabela CRUD de Pedidos -->
    <div class="border rounded-2xl overflow-hidden shadow-xl transition-colors duration-300"
      v-else
      :class="themeMode === 'dark' ? 'bg-slate-900/30 border-slate-900' : 'bg-white border-slate-200'"
    >
      <div class="overflow-x-auto">
        <Table>
          <TableHeader class="border-b transition-colors"
            :class="themeMode === 'dark' ? 'bg-slate-950/60 border-slate-900' : 'bg-slate-50 border-slate-200'"
          >
            <TableRow>
              <TableHead class="text-slate-500 font-bold uppercase text-[10px] tracking-wider w-20">Pedido</TableHead>
              <TableHead class="text-slate-500 font-bold uppercase text-[10px] tracking-wider">Cliente</TableHead>
              <TableHead class="text-slate-500 font-bold uppercase text-[10px] tracking-wider">Data</TableHead>
              <TableHead class="text-center text-slate-500 font-bold uppercase text-[10px] tracking-wider">Itens</TableHead>
              <TableHead class="text-center text-slate-500 font-bold uppercase text-[10px] tracking-wider">Total</TableHead>
              <TableHead class="text-center text-slate-500 font-bold uppercase text-[10px] tracking-wider">Status</TableHead>
              <TableHead class="text-right text-slate-500 font-bold uppercase text-[10px] tracking-wider w-24">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow 
              v-for="order in orders" 
              :key="order.id"
              class="border-b transition-colors"
              :class="themeMode === 'dark' ? 'border-slate-900/50 hover:bg-slate-900/10' : 'border-slate-100 hover:bg-slate-50'"
            >
              <!-- ID Pedido -->
              <TableCell class="font-mono font-bold"
                :class="themeMode === 'dark' ? 'text-slate-300' : 'text-slate-700'"
              >
                #{{ order.id }}
              </TableCell>

              <!-- Cliente -->
              <TableCell class="font-bold"
                :class="themeMode === 'dark' ? 'text-slate-200' : 'text-slate-800'"
              >
                {{ order.customer_name }}
              </TableCell>

              <!-- Data -->
              <TableCell class="text-xs text-slate-400">
                {{ formatDate(order.created_at) }}
              </TableCell>

              <!-- Qtd. Itens -->
              <TableCell class="text-center text-slate-350 text-xs">
                {{ order.items?.reduce((sum, item) => sum + item.quantity, 0) || 0 }}
              </TableCell>

              <!-- Total -->
              <TableCell class="text-center font-extrabold text-xs md:text-sm"
                :class="themeMode === 'dark' ? 'text-slate-300' : 'text-slate-700'"
              >
                {{ formatPrice(order.total_cost) }}
              </TableCell>

              <!-- Status -->
              <TableCell class="text-center">
                <span 
                  class="inline-block px-2 py-0.5 rounded-full text-[10px] font-bold"
                  :class="{
                    'bg-amber-955/40 text-amber-455 border border-amber-900/30': order.status === 'Pendente',
                    'bg-emerald-955/40 text-emerald-455 border border-emerald-900/30': order.status === 'Pago',
                    'bg-blue-955/40 text-blue-455 border border-blue-900/30': order.status === 'Enviado',
                    'bg-slate-950/60 text-slate-400 border border-slate-800': order.status === 'Entregue'
                  }"
                >
                  {{ order.status }}
                </span>
              </TableCell>

              <!-- Detalhes Ação -->
              <TableCell class="text-right">
                <Button 
                  variant="ghost" 
                  size="icon" 
                  class="h-8 w-8 rounded-lg"
                  :class="themeMode === 'dark' ? 'text-slate-400 hover:text-white hover:bg-slate-800' : 'text-slate-450 hover:text-slate-900 hover:bg-slate-100'"
                  @click="openDetailsDialog(order)"
                >
                  <Eye class="w-3.5 h-3.5" />
                </Button>
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </div>
    </div>

    <!-- Modal Detalhes do Pedido -->
    <Dialog v-model:open="showDetailsDialog">
      <DialogContent v-if="selectedOrder" class="sm:max-w-[620px] rounded-2xl shadow-2xl overflow-y-auto max-h-[90vh] transition-colors duration-300"
        :class="themeMode === 'dark' ? 'bg-slate-900 border-slate-800 text-slate-100' : 'bg-white border-slate-200 text-slate-900'"
      >
        <DialogHeader class="border-b pb-3 flex flex-row items-center justify-between"
          :class="themeMode === 'dark' ? 'border-slate-800/80' : 'border-slate-150'"
        >
          <DialogTitle class="text-base font-bold flex items-center gap-2">
            <FileText class="w-5 h-5 text-primary" />
            Detalhamento do Pedido #{{ selectedOrder.id }}
          </DialogTitle>
          <span class="text-[10px] text-slate-500 font-bold font-mono mr-6">{{ formatDate(selectedOrder.created_at) }}</span>
        </DialogHeader>

        <div class="space-y-5 my-4 text-xs md:text-sm">
          <!-- Bloco do Status Dinâmico -->
          <div class="p-4 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-colors"
            :class="themeMode === 'dark' ? 'bg-slate-950/40 border-slate-850' : 'bg-slate-50 border-slate-200'"
          >
            <div class="space-y-0.5">
              <span class="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Status de Rastreamento</span>
              <p class="text-xs text-slate-400"
                :class="themeMode === 'dark' ? 'text-slate-400' : 'text-slate-500'"
              >Selecione para atualizar o status do pedido na nuvem.</p>
            </div>
            
            <div class="flex items-center gap-2.5 shrink-0">
              <Loader2 v-if="isUpdatingStatus" class="w-4 h-4 animate-spin text-primary" />
              <Select :model-value="selectedOrder.status" @update:model-value="(val: any) => handleStatusChange(val as Order['status'])" :disabled="isUpdatingStatus">
                <SelectTrigger class="w-36 text-xs rounded-xl"
                  :class="themeMode === 'dark' ? 'bg-slate-950 border-slate-800 text-slate-350' : 'bg-white border-slate-200 text-slate-700'"
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent class="bg-slate-900 border-slate-800 text-slate-300 rounded-xl"
                  :class="themeMode === 'dark' ? 'bg-slate-900 border-slate-800 text-slate-300' : 'bg-white border-slate-200 text-slate-750'"
                >
                  <SelectItem value="Pendente" class="hover:bg-slate-850 text-xs">Pendente</SelectItem>
                  <SelectItem value="Pago" class="hover:bg-slate-850 text-xs">Pago</SelectItem>
                  <SelectItem value="Enviado" class="hover:bg-slate-850 text-xs">Enviado</SelectItem>
                  <SelectItem value="Entregue" class="hover:bg-slate-850 text-xs">Entregue</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <!-- Perfil do Cliente -->
          <div class="space-y-2.5 p-4 rounded-xl border transition-colors"
            :class="themeMode === 'dark' ? 'bg-slate-950/30 border-slate-900' : 'bg-slate-50 border-slate-150'"
          >
            <h4 class="text-xs font-bold uppercase tracking-wider flex items-center gap-1.5"
              :class="themeMode === 'dark' ? 'text-slate-400' : 'text-slate-700'"
            >
              <User class="w-3.5 h-3.5 text-primary" />
              Informações do Cliente
            </h4>
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-3"
              :class="themeMode === 'dark' ? 'text-slate-300' : 'text-slate-650'"
            >
              <div><strong class="text-slate-500">Nome:</strong> {{ selectedOrder.customer_name }}</div>
              <div class="flex items-center gap-1.5"><strong class="text-slate-500">Celular:</strong> {{ selectedOrder.customer_phone }}</div>
              <div class="sm:col-span-2 flex items-center gap-1.5"><strong class="text-slate-500">E-mail:</strong> {{ selectedOrder.customer_email }}</div>
            </div>
          </div>

          <!-- Endereço de Entrega -->
          <div class="space-y-2.5 p-4 rounded-xl border transition-colors"
            :class="themeMode === 'dark' ? 'bg-slate-950/30 border-slate-900' : 'bg-slate-50 border-slate-150'"
          >
            <h4 class="text-xs font-bold uppercase tracking-wider flex items-center gap-1.5"
              :class="themeMode === 'dark' ? 'text-slate-400' : 'text-slate-700'"
            >
              <MapPin class="w-3.5 h-3.5 text-primary" />
              Destino do Envio
            </h4>
            <div class="space-y-1"
              :class="themeMode === 'dark' ? 'text-slate-350' : 'text-slate-650'"
            >
              <div><strong class="text-slate-500">Endereço:</strong> {{ selectedOrder.shipping_address }}</div>
              <div class="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-1.5">
                <div><strong class="text-slate-500">CEP:</strong> {{ selectedOrder.shipping_cep }}</div>
                <div><strong class="text-slate-500">Transportadora:</strong> {{ selectedOrder.shipping_carrier }}</div>
              </div>
            </div>
          </div>

          <!-- Itens Comprados -->
          <div class="space-y-2">
            <h4 class="text-xs font-bold uppercase tracking-wider"
              :class="themeMode === 'dark' ? 'text-slate-400' : 'text-slate-500'"
            >Itens do Pedido</h4>
            <div class="border rounded-xl overflow-hidden"
              :class="themeMode === 'dark' ? 'border-slate-900' : 'border-slate-150'"
            >
              <div class="divide-y px-4 bg-slate-950/10"
                :class="themeMode === 'dark' ? 'divide-slate-900' : 'divide-slate-150'"
              >
                <div 
                  v-for="item in selectedOrder.items" 
                  :key="item.id"
                  class="flex items-center justify-between py-3 text-slate-300"
                >
                  <div class="flex items-center gap-2">
                    <span class="font-bold text-primary text-xs shrink-0">{{ item.quantity }}x</span>
                    <span class="text-xs font-semibold truncate max-w-xs"
                      :class="themeMode === 'dark' ? 'text-slate-200' : 'text-slate-800'"
                    >{{ item.product_name }}</span>
                  </div>
                  <span class="font-bold text-xs"
                    :class="themeMode === 'dark' ? 'text-slate-300' : 'text-slate-700'"
                  >{{ formatPrice(item.price * item.quantity) }}</span>
                </div>
              </div>
            </div>
          </div>

          <!-- Sumário Financeiro -->
          <div class="border-t pt-3 space-y-2 text-xs md:text-sm"
            :class="themeMode === 'dark' ? 'border-slate-800/80' : 'border-slate-150'"
          >
            <div class="flex justify-between text-slate-500">
              <span>Subtotal dos Itens</span>
              <span class="font-semibold text-slate-300"
                :class="themeMode === 'dark' ? 'text-slate-300' : 'text-slate-700'"
              >{{ formatPrice(selectedOrder.items_cost) }}</span>
            </div>
            <div class="flex justify-between text-slate-500">
              <span>Custo de Frete</span>
              <span class="font-semibold text-slate-300"
                :class="themeMode === 'dark' ? 'text-slate-300' : 'text-slate-700'"
              >{{ formatPrice(selectedOrder.shipping_cost) }}</span>
            </div>
            <div class="flex justify-between items-baseline pt-1.5 border-t"
              :class="themeMode === 'dark' ? 'border-slate-900' : 'border-slate-150'"
            >
              <span class="font-bold text-slate-300"
                :class="themeMode === 'dark' ? 'text-slate-300' : 'text-slate-600'"
              >Total Faturado</span>
              <span class="font-black text-base text-primary">
                {{ formatPrice(selectedOrder.total_cost) }}
              </span>
            </div>
          </div>
        </div>

        <DialogFooter class="border-t pt-4 mt-2"
          :class="themeMode === 'dark' ? 'border-slate-800/80' : 'border-slate-150'"
        >
          <Button 
            class="rounded-xl font-bold border transition-colors duration-250"
            :class="themeMode === 'dark' 
              ? 'bg-slate-850 hover:bg-slate-800 border-slate-800 text-slate-200' 
              : 'bg-white hover:bg-slate-100 border-slate-200 text-slate-750'"
            @click="showDetailsDialog = false"
          >
            Fechar Detalhes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  </div>
</template>
