<script setup lang="ts">
import { ref, onMounted, computed, watch } from 'vue'
import { useRouter } from 'vue-router'
import { 
  ShoppingBag, 
  Trash2, 
  Plus, 
  Minus, 
  Truck, 
  ArrowLeft, 
  ChevronRight, 
  Loader2,
  AlertTriangle
} from 'lucide-vue-next'
import { 
  getCart, 
  saveCart, 
  calculateShipping, 
  checkStoreOpen,
  type CartItem, 
  type ShippingOption 
} from '@/services/store'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'

const router = useRouter()
const cartItems = ref<CartItem[]>([])

// Status de Funcionamento da Loja
const isStoreOpen = ref(true)
const storeOpenTime = ref('18:00')
const storeCloseTime = ref('23:59')

// Cálculo de Frete
const cepInput = ref('')
const isCalculatingShipping = ref(false)
const shippingOptions = ref<ShippingOption[]>([])
const selectedShipping = ref<ShippingOption | null>(null)
const shippingError = ref('')

const formatCEP = (value: string) => {
  const clean = value.replace(/\D/g, '')
  const limited = clean.slice(0, 8)
  if (limited.length > 5) {
    return `${limited.slice(0, 5)}-${limited.slice(5)}`
  }
  return limited
}

watch(cepInput, (newVal) => {
  cepInput.value = formatCEP(newVal)
})

onMounted(async () => {
  cartItems.value = getCart()
  
  // Verifica se a loja está aberta
  try {
    const status = await checkStoreOpen()
    isStoreOpen.value = status.isOpen
    storeOpenTime.value = status.openTime
    storeCloseTime.value = status.closeTime
  } catch (e) {
    console.error('Erro ao verificar horário de funcionamento:', e)
  }
  
  // Se já havia um frete calculado persistido no sessionStorage, recupera
  const cachedShipping = sessionStorage.getItem('selected_shipping')
  const cachedOptions = sessionStorage.getItem('shipping_options')
  const cachedCep = sessionStorage.getItem('shipping_cep')
  
  if (cachedCep) cepInput.value = cachedCep
  if (cachedOptions) {
    try {
      shippingOptions.value = JSON.parse(cachedOptions)
    } catch(e){}
  }
  if (cachedShipping) {
    try {
      selectedShipping.value = JSON.parse(cachedShipping)
    } catch(e){}
  }
})

// Subtotal dos itens do carrinho
const subtotal = computed(() => {
  return cartItems.value.reduce((sum, item) => sum + (item.product.price * item.quantity), 0)
})

// Total final (Itens + Frete)
const total = computed(() => {
  const shippingCost = selectedShipping.value ? selectedShipping.value.price : 0
  return subtotal.value + shippingCost
})

// Formatar moeda BRL
const formatPrice = (value: number) => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(value)
}

// Alterar quantidade
const updateQuantity = (item: CartItem, delta: number) => {
  const newQty = item.quantity + delta
  
  if (newQty <= 0) {
    handleRemoveItem(item.product.id!)
    return
  }
  
  // Limita pelo estoque disponível
  if (newQty > item.product.stock) {
    alert(`Desculpe, o estoque máximo deste produto é de ${item.product.stock} unidades.`)
    return
  }
  
  item.quantity = newQty
  saveCart(cartItems.value)
}

// Excluir item do carrinho
const handleRemoveItem = (productId: number) => {
  cartItems.value = cartItems.value.filter(item => item.product.id !== productId)
  saveCart(cartItems.value)
  
  // Se o carrinho ficar vazio, limpa fretes selecionados
  if (cartItems.value.length === 0) {
    handleResetShipping()
  }
}

const handleResetShipping = () => {
  selectedShipping.value = null
  shippingOptions.value = []
  shippingError.value = ''
  sessionStorage.removeItem('selected_shipping')
  sessionStorage.removeItem('shipping_options')
  sessionStorage.removeItem('shipping_cep')
}

// Lógica de Executar Cálculo de Frete
const handleCalculateShipping = () => {
  const cleanCep = cepInput.value.replace(/\D/g, '')
  
  if (cleanCep.length !== 8) {
    shippingError.value = 'Digite um CEP válido com 8 dígitos.'
    shippingOptions.value = []
    selectedShipping.value = null
    return
  }
  
  isCalculatingShipping.value = true
  shippingError.value = ''
  
  // Simula atraso na rede de 800ms para premium feel
  setTimeout(async () => {
    try {
      const options = await calculateShipping(cleanCep)
      shippingOptions.value = options
      // Seleciona a primeira opção por padrão (mais econômica)
      selectedShipping.value = options[0]
      
      // Salva no sessionStorage para persistir navegação do checkout
      sessionStorage.setItem('shipping_cep', cleanCep)
      sessionStorage.setItem('shipping_options', JSON.stringify(options))
      sessionStorage.setItem('selected_shipping', JSON.stringify(options[0]))
    } catch (err: any) {
      shippingError.value = err.message || 'Erro ao calcular frete.'
      shippingOptions.value = []
      selectedShipping.value = null
    } finally {
      isCalculatingShipping.value = false
    }
  }, 800)
}

// Selecionar Opção de Frete
const handleSelectShipping = (option: ShippingOption) => {
  selectedShipping.value = option
  sessionStorage.setItem('selected_shipping', JSON.stringify(option))
}

// Direcionar para Checkout
const handleGoToCheckout = () => {
  if (!isStoreOpen.value) return
  if (cartItems.value.length === 0) return
  if (!selectedShipping.value) {
    shippingError.value = 'Por favor, calcule e selecione uma opção de frete antes de finalizar.'
    // Foca ou scrolla no input de CEP
    document.getElementById('cep-input')?.focus()
    return
  }
  router.push('/checkout')
}
</script>

<template>
  <div class="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
    <!-- Cabeçalho da Página -->
    <div class="flex items-center justify-between">
      <div class="space-y-1">
        <h1 class="text-2xl md:text-3xl font-extrabold text-slate-850 flex items-center gap-2">
          <ShoppingBag class="w-6 h-6 text-primary" />
          Seu Carrinho de Compras
        </h1>
        <p class="text-slate-500 text-xs md:text-sm">
          Gerencie os itens do seu pedido e calcule a taxa de entrega.
        </p>
      </div>
      <router-link to="/" class="text-xs md:text-sm font-bold text-primary hover:opacity-80 flex items-center gap-1 group">
        <ArrowLeft class="w-4 h-4 group-hover:-translate-x-0.5 transition-transform duration-200" />
        Voltar à loja
      </router-link>
    </div>

    <!-- Aviso de Loja Fechada -->
    <div v-if="!isStoreOpen" class="p-4.5 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-600 flex items-start gap-3 animate-in fade-in duration-300">
      <AlertTriangle class="w-5 h-5 shrink-0 mt-0.5 text-amber-500" />
      <div>
        <h4 class="font-extrabold text-sm text-amber-600">Loja Fechada no Momento</h4>
        <p class="text-xs text-slate-500 mt-1 leading-relaxed">
          Nosso horário de funcionamento é das <strong>{{ storeOpenTime }}</strong> às <strong>{{ storeCloseTime }}</strong>. Você ainda pode gerenciar seu carrinho, mas o checkout e a finalização de novos pedidos estão temporariamente bloqueados. Agradecemos a sua compreensão!
        </p>
      </div>
    </div>

    <!-- Carrinho Vazio -->
    <div v-if="cartItems.length === 0" class="text-center py-20 bg-slate-100/50 border border-dashed border-slate-200 rounded-3xl space-y-4">
      <ShoppingBag class="w-16 h-16 text-slate-300 mx-auto" />
      <h3 class="text-lg font-bold text-slate-800">Seu carrinho está vazio</h3>
      <p class="text-slate-550 text-xs md:text-sm max-w-xs mx-auto leading-relaxed">
        Parece que você ainda não adicionou produtos. Explore nosso catálogo premium e faça suas escolhas.
      </p>
      <Button 
        class="rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground font-bold px-6 shadow-lg shadow-primary/20"
        @click="router.push('/')"
      >
        Ver Catálogo
      </Button>
    </div>

    <!-- Carrinho Preenchido (Estrutura em Colunas) -->
    <div v-else class="grid grid-cols-1 lg:grid-cols-3 gap-8">
      <!-- Lista de Itens (2 Colunas no desktop) -->
      <div class="lg:col-span-2 space-y-4">
        <!-- Tabela Responsiva de Itens -->
        <div class="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
          <!-- Cabeçalho Oculto em Mobile -->
          <div class="hidden sm:grid grid-cols-12 gap-4 px-6 py-3.5 bg-slate-50 border-b border-slate-100 text-xs font-bold uppercase tracking-wider text-slate-500">
            <span class="col-span-6">Produto</span>
            <span class="col-span-2 text-center">Preço</span>
            <span class="col-span-2 text-center">Qtd.</span>
            <span class="col-span-2 text-right">Total</span>
          </div>

          <div class="divide-y divide-slate-100">
            <div 
              v-for="item in cartItems" 
              :key="item.product.id"
              class="grid grid-cols-1 sm:grid-cols-12 gap-4 p-5 sm:p-6 items-center hover:bg-slate-50/40 transition-colors duration-200"
            >
              <!-- Info Produto + Foto -->
              <div class="col-span-1 sm:col-span-6 flex items-center gap-4">
                <div class="w-16 h-16 rounded-xl bg-slate-50 overflow-hidden border border-slate-100 shrink-0">
                  <img :src="item.product.image_data" :alt="item.product.name" class="w-full h-full object-cover" />
                </div>
                <div class="space-y-1">
                  <h4 class="font-bold text-slate-800 text-sm md:text-base leading-tight">{{ item.product.name }}</h4>
                  <span class="inline-block px-2 py-0.5 rounded bg-slate-100 text-[10px] text-primary font-semibold border border-slate-200 uppercase tracking-wide">
                    {{ item.product.category }}
                  </span>
                </div>
              </div>

              <!-- Preço unitário -->
              <div class="col-span-1 sm:col-span-2 flex sm:flex-col justify-between sm:justify-center items-center text-sm">
                <span class="sm:hidden text-slate-500 font-medium">Preço</span>
                <span class="font-semibold text-slate-700">{{ formatPrice(item.product.price) }}</span>
              </div>

              <!-- Quantidade -->
              <div class="col-span-1 sm:col-span-2 flex sm:justify-center justify-between items-center">
                <span class="sm:hidden text-slate-500 font-medium">Quantidade</span>
                <div class="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-xl p-1 shrink-0">
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    class="h-6 w-6 rounded-lg text-slate-500 hover:bg-slate-200 hover:text-slate-800"
                    @click="updateQuantity(item, -1)"
                  >
                    <Minus class="w-3.5 h-3.5" />
                  </Button>
                  <span class="w-6 text-center text-xs font-bold text-slate-800">{{ item.quantity }}</span>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    class="h-6 w-6 rounded-lg text-slate-500 hover:bg-slate-200 hover:text-slate-800"
                    @click="updateQuantity(item, 1)"
                  >
                    <Plus class="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>

              <!-- Total do Item + Excluir -->
              <div class="col-span-1 sm:col-span-2 flex justify-between sm:justify-end items-center gap-4">
                <span class="sm:hidden text-slate-500 font-medium">Total</span>
                <div class="flex items-center gap-3">
                  <span class="font-extrabold text-sm md:text-base text-slate-800">
                    {{ formatPrice(item.product.price * item.quantity) }}
                  </span>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    class="h-8 w-8 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50"
                    @click="handleRemoveItem(item.product.id!)"
                  >
                    <Trash2 class="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Seção do Simulador de Frete -->
        <Card class="bg-white border border-slate-200 rounded-2xl shadow-sm">
          <CardHeader class="pb-3 border-b border-slate-100">
            <CardTitle class="text-base font-bold flex items-center gap-2 text-slate-800">
              <Truck class="w-4 h-4 text-primary" />
              Simular Valor de Entrega (CEP)
            </CardTitle>
          </CardHeader>
          <CardContent class="p-6 space-y-4">
            <div class="flex items-center gap-3 max-w-sm">
              <Input 
                id="cep-input"
                v-model="cepInput"
                maxLength="9"
                placeholder="Ex: 14240-000"
                class="bg-white border-slate-300 text-slate-900 placeholder:text-slate-400 rounded-xl focus-visible:ring-primary"
                @keyup.enter="handleCalculateShipping"
              />
              <Button 
                class="rounded-xl bg-slate-100 hover:bg-slate-200 border border-slate-350 text-slate-700 hover:text-slate-900 font-bold shrink-0"
                :disabled="isCalculatingShipping"
                @click="handleCalculateShipping"
              >
                <Loader2 v-if="isCalculatingShipping" class="w-4 h-4 animate-spin mr-1.5" />
                Calcular
              </Button>
            </div>

            <!-- Feedbacks e Erros -->
            <div v-if="shippingError" class="text-xs text-red-500 flex items-center gap-1.5">
              <AlertTriangle class="w-4 h-4 animate-bounce" />
              <span>{{ shippingError }}</span>
            </div>

            <!-- Opções de Entrega Calculadas -->
            <div v-if="shippingOptions.length > 0" class="space-y-2 mt-2">
              <div 
                v-for="option in shippingOptions" 
                :key="option.carrier"
                class="flex items-center justify-between p-3.5 rounded-xl border cursor-pointer transition-all duration-200"
                :class="selectedShipping?.carrier === option.carrier 
                  ? 'bg-primary/5 border-primary shadow-sm' 
                  : 'bg-slate-50/40 border-slate-200 hover:border-slate-300'"
                @click="handleSelectShipping(option)"
              >
                <div class="flex items-center gap-3">
                  <div class="w-4 h-4 rounded-full border flex items-center justify-center shrink-0"
                    :class="selectedShipping?.carrier === option.carrier ? 'border-primary bg-primary text-primary-foreground' : 'border-slate-300 bg-white'"
                  >
                    <span v-if="selectedShipping?.carrier === option.carrier" class="w-1.5 h-1.5 rounded-full bg-white"></span>
                  </div>
                  <div>
                    <h5 class="text-xs md:text-sm font-bold text-slate-800">{{ option.carrier }}</h5>
                    <p class="text-[10px] md:text-xs text-slate-500 mt-0.5">Prazo estimado: {{ option.deliveryDays }} {{ option.deliveryDays === 1 ? 'dia útil' : 'dias úteis' }}</p>
                  </div>
                </div>
                <span class="font-extrabold text-xs md:text-sm text-primary">
                  {{ formatPrice(option.price) }}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <!-- Resumo de Custos (1 Coluna) -->
      <div class="space-y-4">
        <Card class="bg-white border border-slate-200 rounded-2xl shadow-sm sticky top-24">
          <CardHeader class="pb-3 border-b border-slate-100">
            <CardTitle class="text-base font-bold text-slate-800">Resumo da Compra</CardTitle>
          </CardHeader>
          <CardContent class="p-6 space-y-6">
            <!-- Detalhe de Custos -->
            <div class="space-y-3 text-xs md:text-sm">
              <div class="flex justify-between text-slate-500">
                <span>Subtotal (Itens)</span>
                <span class="font-semibold text-slate-700">{{ formatPrice(subtotal) }}</span>
              </div>
              <div class="flex justify-between text-slate-500">
                <span>Taxa de Entrega (Frete)</span>
                <span class="font-semibold text-slate-700" :class="selectedShipping ? '' : 'text-slate-400 italic'">
                  {{ selectedShipping ? formatPrice(selectedShipping.price) : 'Não calculado' }}
                </span>
              </div>
              
              <!-- Divisor -->
              <div class="border-t border-slate-100 my-2"></div>
              
              <!-- Total Geral -->
              <div class="flex justify-between items-baseline">
                <span class="font-bold text-slate-800">Valor Total</span>
                <span class="font-black text-xl text-slate-900">
                  {{ formatPrice(total) }}
                </span>
              </div>
            </div>

            <!-- Botão de Ação -->
            <Button 
              class="w-full rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground font-extrabold py-5 shadow-lg shadow-primary/20 flex items-center justify-center gap-1 group"
              :disabled="!isStoreOpen"
              @click="handleGoToCheckout"
            >
              <span>Prosseguir para Checkout</span>
              <ChevronRight class="w-4 h-4 group-hover:translate-x-0.5 transition-transform duration-200" />
            </Button>

            <!-- Políticas Extras -->
            <div class="text-[10px] text-slate-450 leading-relaxed text-center">
              Ao continuar você aceita nossos termos de garantia premium. Entregas simuladas integradas em tempo real com Turso Cloud.
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  </div>
</template>
