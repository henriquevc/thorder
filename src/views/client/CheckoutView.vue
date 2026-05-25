<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import { 
  CreditCard, 
  Truck, 
  ArrowLeft, 
  Loader2, 
  CheckCircle,
  AlertTriangle
} from 'lucide-vue-next'
import { 
  getCart, 
  clearCart, 
  createOrder, 
  type CartItem, 
  type ShippingOption 
} from '@/services/store'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'

const router = useRouter()
const cartItems = ref<CartItem[]>([])

// Dados do Cliente
const customerName = ref('')
const customerEmail = ref('')
const customerPhone = ref('')

// Dados do Endereço
const shippingCep = ref('')
const addressStreet = ref('')
const addressNumber = ref('')
const addressComplement = ref('')
const addressNeighborhood = ref('')
const addressCity = ref('')
const addressState = ref('')

// Frete Selecionado
const selectedShipping = ref<ShippingOption | null>(null)

// Fluxo de Processamento
const isSubmitting = ref(false)
const submitError = ref('')

onMounted(() => {
  cartItems.value = getCart()
  
  // Se o carrinho estiver vazio, manda de volta
  if (cartItems.value.length === 0) {
    router.push('/carrinho')
    return
  }

  // Pega frete selecionado do sessionStorage
  const cachedShipping = sessionStorage.getItem('selected_shipping')
  const cachedCep = sessionStorage.getItem('shipping_cep')
  
  if (cachedShipping) {
    try {
      selectedShipping.value = JSON.parse(cachedShipping)
    } catch(e){}
  }
  if (cachedCep) {
    shippingCep.value = cachedCep
  }
})

// Custos
const itemsCost = computed(() => {
  return cartItems.value.reduce((sum, item) => sum + (item.product.price * item.quantity), 0)
})

const shippingCost = computed(() => {
  return selectedShipping.value ? selectedShipping.value.price : 0
})

const totalCost = computed(() => {
  return itemsCost.value + shippingCost.value
})

const formatPrice = (value: number) => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(value)
}

// Lógica de Validação e Envio
const handleSubmitOrder = async () => {
  // Valida campos básicos
  if (!customerName.value || !customerEmail.value || !customerPhone.value) {
    submitError.value = 'Por favor, preencha todos os dados de contato.'
    return
  }
  
  if (!addressStreet.value || !addressNumber.value || !addressNeighborhood.value || !addressCity.value || !addressState.value) {
    submitError.value = 'Por favor, preencha o endereço completo para a entrega.'
    return
  }
  
  if (!selectedShipping.value) {
    submitError.value = 'Opção de frete inválida ou não selecionada.'
    return
  }

  isSubmitting.value = true
  submitError.value = ''

  try {
    // Monta string do endereço
    const fullAddress = `${addressStreet.value}, nº ${addressNumber.value}${addressComplement.value ? ' (' + addressComplement.value + ')' : ''} - ${addressNeighborhood.value}, ${addressCity.value} - ${addressState.value}`
    
    const orderData = {
      customer_name: customerName.value.trim(),
      customer_email: customerEmail.value.trim(),
      customer_phone: customerPhone.value.trim(),
      shipping_cep: shippingCep.value.trim(),
      shipping_address: fullAddress,
      shipping_carrier: selectedShipping.value.carrier,
      shipping_cost: shippingCost.value,
      items_cost: itemsCost.value,
      total_cost: totalCost.value,
      status: 'Pendente' as const,
      created_at: new Date().toISOString()
    }
    
    // Mapeia itens do carrinho
    const orderItemsData = cartItems.value.map(item => ({
      product_id: item.product.id!,
      product_name: item.product.name,
      quantity: item.quantity,
      price: item.product.price
    }))
    
    // Envia ao banco Turso/LocalStorage
    const orderId = await createOrder(orderData, orderItemsData)
    
    // Esvazia carrinho e dados locais
    clearCart()
    sessionStorage.removeItem('selected_shipping')
    sessionStorage.removeItem('shipping_options')
    sessionStorage.removeItem('shipping_cep')
    
    // Direciona para tela de confirmação de sucesso
    router.push({ name: 'order-success', params: { id: orderId } })
  } catch (err: any) {
    submitError.value = err.message || 'Falha ao registrar pedido no banco Turso.'
  } finally {
    isSubmitting.value = false
  }
}
</script>

<template>
  <div class="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
    <!-- Cabeçalho -->
    <div class="flex items-center justify-between">
      <div class="space-y-1">
        <h1 class="text-2xl md:text-3xl font-extrabold text-slate-100 flex items-center gap-2">
          <CreditCard class="w-6 h-6 text-purple-500" />
          Finalizar Pedido
        </h1>
        <p class="text-slate-400 text-xs md:text-sm">
          Preencha suas informações de contato e endereço para entrega do seu pacote.
        </p>
      </div>
      <router-link to="/carrinho" class="text-xs md:text-sm font-bold text-purple-400 hover:text-purple-300 flex items-center gap-1 group">
        <ArrowLeft class="w-4 h-4 group-hover:-translate-x-0.5 transition-transform duration-200" />
        Voltar ao carrinho
      </router-link>
    </div>

    <div class="grid grid-cols-1 lg:grid-cols-3 gap-8">
      <!-- Formulários de Cadastro (2 Colunas) -->
      <div class="lg:col-span-2 space-y-6">
        <!-- 1. Informações de Contato -->
        <Card class="bg-slate-900/30 border-slate-900 rounded-2xl shadow-xl">
          <CardHeader class="pb-3 border-b border-slate-900/60">
            <CardTitle class="text-base font-bold text-slate-200 flex items-center gap-2">
              <span class="w-5 h-5 rounded-lg bg-purple-500/10 text-purple-400 flex items-center justify-center text-xs font-black">1</span>
              Dados de Contato
            </CardTitle>
          </CardHeader>
          <CardContent class="p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
            <div class="space-y-1.5 md:col-span-2">
              <label class="text-xs font-semibold text-slate-400">Nome Completo</label>
              <Input 
                v-model="customerName"
                placeholder="Ex: Henrique Souza"
                class="bg-slate-950 border-slate-800 text-white rounded-xl placeholder:text-slate-700 focus-visible:ring-purple-500"
              />
            </div>
            <div class="space-y-1.5">
              <label class="text-xs font-semibold text-slate-400">E-mail</label>
              <Input 
                v-model="customerEmail"
                type="email"
                placeholder="Ex: henrique@exemplo.com"
                class="bg-slate-950 border-slate-800 text-white rounded-xl placeholder:text-slate-700 focus-visible:ring-purple-500"
              />
            </div>
            <div class="space-y-1.5">
              <label class="text-xs font-semibold text-slate-400">Celular (com DDD)</label>
              <Input 
                v-model="customerPhone"
                placeholder="Ex: (11) 99999-9999"
                class="bg-slate-950 border-slate-800 text-white rounded-xl placeholder:text-slate-700 focus-visible:ring-purple-500"
              />
            </div>
          </CardContent>
        </Card>

        <!-- 2. Endereço de Entrega -->
        <Card class="bg-slate-900/30 border-slate-900 rounded-2xl shadow-xl">
          <CardHeader class="pb-3 border-b border-slate-900/60">
            <CardTitle class="text-base font-bold text-slate-200 flex items-center gap-2">
              <span class="w-5 h-5 rounded-lg bg-purple-500/10 text-purple-400 flex items-center justify-center text-xs font-black">2</span>
              Endereço para Entrega
            </CardTitle>
          </CardHeader>
          <CardContent class="p-6 space-y-4">
            <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div class="space-y-1.5">
                <label class="text-xs font-semibold text-slate-400">CEP</label>
                <Input 
                  v-model="shippingCep"
                  disabled
                  class="bg-slate-950/60 border-slate-850 text-slate-400 rounded-xl cursor-not-allowed"
                />
              </div>
              <div class="space-y-1.5 md:col-span-2">
                <label class="text-xs font-semibold text-slate-400">Logradouro (Rua/Avenida)</label>
                <Input 
                  v-model="addressStreet"
                  placeholder="Ex: Avenida Paulista"
                  class="bg-slate-950 border-slate-800 text-white rounded-xl placeholder:text-slate-700 focus-visible:ring-purple-500"
                />
              </div>
            </div>

            <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div class="space-y-1.5">
                <label class="text-xs font-semibold text-slate-400">Número</label>
                <Input 
                  v-model="addressNumber"
                  placeholder="Ex: 1000"
                  class="bg-slate-950 border-slate-800 text-white rounded-xl placeholder:text-slate-700 focus-visible:ring-purple-500"
                />
              </div>
              <div class="space-y-1.5 md:col-span-2">
                <label class="text-xs font-semibold text-slate-400">Complemento (Opcional)</label>
                <Input 
                  v-model="addressComplement"
                  placeholder="Ex: Apto 101, Bloco B"
                  class="bg-slate-950 border-slate-800 text-white rounded-xl placeholder:text-slate-700 focus-visible:ring-purple-500"
                />
              </div>
            </div>

            <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div class="space-y-1.5">
                <label class="text-xs font-semibold text-slate-400">Bairro</label>
                <Input 
                  v-model="addressNeighborhood"
                  placeholder="Ex: Bela Vista"
                  class="bg-slate-950 border-slate-800 text-white rounded-xl placeholder:text-slate-700 focus-visible:ring-purple-500"
                />
              </div>
              <div class="space-y-1.5">
                <label class="text-xs font-semibold text-slate-400">Cidade</label>
                <Input 
                  v-model="addressCity"
                  placeholder="Ex: São Paulo"
                  class="bg-slate-950 border-slate-800 text-white rounded-xl placeholder:text-slate-700 focus-visible:ring-purple-500"
                />
              </div>
              <div class="space-y-1.5">
                <label class="text-xs font-semibold text-slate-400">Estado</label>
                <Input 
                  v-model="addressState"
                  placeholder="Ex: SP"
                  class="bg-slate-950 border-slate-800 text-white rounded-xl placeholder:text-slate-700 focus-visible:ring-purple-500"
                />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <!-- Resumo e Ação (1 Coluna) -->
      <div class="space-y-4">
        <!-- Detalhes do Frete -->
        <Card v-if="selectedShipping" class="bg-slate-900/30 border-slate-900 rounded-2xl shadow-xl p-5 flex items-center gap-3">
          <Truck class="w-5 h-5 text-purple-400 shrink-0" />
          <div class="text-xs">
            <h5 class="font-bold text-slate-200">Entrega via {{ selectedShipping.carrier }}</h5>
            <p class="text-slate-500 mt-0.5">Prazo estimado de entrega: {{ selectedShipping.deliveryDays }} {{ selectedShipping.deliveryDays === 1 ? 'dia útil' : 'dias úteis' }}.</p>
          </div>
        </Card>

        <!-- Resumo do Pedido -->
        <Card class="bg-slate-900/30 border-slate-900 rounded-2xl shadow-xl sticky top-24">
          <CardHeader class="pb-3 border-b border-slate-900/60">
            <CardTitle class="text-base font-bold text-slate-200">Resumo do Pedido</CardTitle>
          </CardHeader>
          <CardContent class="p-6 space-y-6">
            <!-- Lista reduzida dos itens -->
            <div class="max-h-40 overflow-y-auto space-y-3 pr-2 scrollbar-thin scrollbar-thumb-slate-800 text-xs">
              <div 
                v-for="item in cartItems" 
                :key="item.product.id"
                class="flex items-center justify-between gap-3 text-slate-400"
              >
                <div class="flex items-center gap-2 min-w-0">
                  <span class="font-bold text-purple-400 shrink-0">{{ item.quantity }}x</span>
                  <span class="truncate text-slate-300 font-medium">{{ item.product.name }}</span>
                </div>
                <span class="shrink-0 font-semibold">{{ formatPrice(item.product.price * item.quantity) }}</span>
              </div>
            </div>

            <!-- Divisor -->
            <div class="border-t border-slate-900/80 my-2"></div>

            <!-- Custos Finais -->
            <div class="space-y-2.5 text-xs md:text-sm">
              <div class="flex justify-between text-slate-500">
                <span>Subtotal Itens</span>
                <span class="font-semibold text-slate-300">{{ formatPrice(itemsCost) }}</span>
              </div>
              <div class="flex justify-between text-slate-500">
                <span>Taxa de Entrega</span>
                <span class="font-semibold text-slate-300">{{ formatPrice(shippingCost) }}</span>
              </div>
              
              <div class="border-t border-slate-900/60 my-2"></div>
              
              <div class="flex justify-between items-baseline">
                <span class="font-bold text-slate-300">Total Geral</span>
                <span class="font-black text-xl text-slate-200">
                  {{ formatPrice(totalCost) }}
                </span>
              </div>
            </div>

            <!-- Feedbacks e Erros -->
            <div v-if="submitError" class="p-3 rounded-xl bg-red-950/30 border border-red-500/30 text-red-400 text-xs flex items-center gap-2 animate-shake">
              <AlertTriangle class="w-4 h-4 shrink-0" />
              <span>{{ submitError }}</span>
            </div>

            <!-- Botão de Finalizar -->
            <Button 
              class="w-full rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-extrabold py-5 shadow-lg shadow-purple-500/20 flex items-center justify-center gap-1.5"
              :disabled="isSubmitting"
              @click="handleSubmitOrder"
            >
              <Loader2 v-if="isSubmitting" class="w-4 h-4 animate-spin mr-1" />
              <span>{{ isSubmitting ? 'Processando Pedido...' : 'Confirmar &amp; Pagar' }}</span>
            </Button>

            <!-- Proteção de Compra -->
            <div class="text-[10px] text-slate-500 text-center leading-relaxed">
              Pagamento simulado. Os produtos não serão enviados de fato. Pedido será registrado na tabela `orders` do Turso DB.
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  </div>
</template>
