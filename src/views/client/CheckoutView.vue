<script setup lang="ts">
import { ref, onMounted, computed, watch } from 'vue'
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

// Helpers de formatação e máscaras
const formatCEP = (value: string) => {
  const clean = value.replace(/\D/g, '')
  const limited = clean.slice(0, 8)
  if (limited.length > 5) {
    return `${limited.slice(0, 5)}-${limited.slice(5)}`
  }
  return limited
}

const formatPhone = (value: string) => {
  const clean = value.replace(/\D/g, '')
  const limited = clean.slice(0, 11)
  
  if (limited.length > 10) {
    // Celular: (XX) XXXXX-XXXX
    return `(${limited.slice(0, 2)}) ${limited.slice(2, 7)}-${limited.slice(7)}`
  } else if (limited.length > 6) {
    // Telefone fixo: (XX) XXXX-XXXX
    return `(${limited.slice(0, 2)}) ${limited.slice(2, 6)}-${limited.slice(6)}`
  } else if (limited.length > 2) {
    return `(${limited.slice(0, 2)}) ${limited.slice(2)}`
  } else if (limited.length > 0) {
    return `(${limited}`
  }
  return limited
}

// Watchers para máscaras automáticas
watch(customerPhone, (newVal) => {
  customerPhone.value = formatPhone(newVal)
})

// Computed para checar se a opção é retirada
const isPickup = computed(() => {
  return selectedShipping.value?.carrier.toLowerCase().includes('retirada') || false
})

const isFetchingCep = ref(false)

// Fluxo de Processamento
const isSubmitting = ref(false)
const submitError = ref('')

// Auto-busca do CEP via ViaCEP
const lookupCep = async (cep: string) => {
  const clean = cep.replace(/\D/g, '')
  if (clean.length !== 8) return
  
  isFetchingCep.value = true
  try {
    const res = await fetch(`https://viacep.com.br/ws/${clean}/json/`)
    const data = await res.json()
    if (!data.erro) {
      addressStreet.value = data.logradouro || ''
      addressNeighborhood.value = data.bairro || ''
      addressCity.value = data.localidade || ''
      addressState.value = data.uf || ''
    }
  } catch (err) {
    console.error('Falha ao autocompletar CEP:', err)
  } finally {
    isFetchingCep.value = false
  }
}

onMounted(async () => {
  cartItems.value = getCart()
  
  // Se o carrinho estiver vazio, manda de volta
  if (cartItems.value.length === 0) {
    router.push('/carrinho')
    return
  }

  // Verifica se a loja está aberta
  try {
    const status = await checkStoreOpen()
    isStoreOpen.value = status.isOpen
    storeOpenTime.value = status.openTime
    storeCloseTime.value = status.closeTime
  } catch (e) {
    console.error('Erro ao verificar horário de funcionamento:', e)
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
    shippingCep.value = formatCEP(cachedCep)
    if (!isPickup.value) {
      lookupCep(cachedCep)
    }
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
  // Valida horário de funcionamento
  if (!isStoreOpen.value) {
    submitError.value = `Não é possível finalizar pedidos fora do horário de funcionamento (${storeOpenTime.value} às ${storeCloseTime.value}).`
    return
  }

  // Valida campos básicos
  if (!customerName.value || !customerPhone.value) {
    submitError.value = 'Por favor, preencha todos os dados de contato.'
    return
  }
  
  // Se não for retirada, valida campos de endereço
  if (!isPickup.value && (!addressStreet.value || !addressNumber.value || !addressNeighborhood.value || !addressCity.value || !addressState.value)) {
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
    const fullAddress = isPickup.value
      ? `Retirada na Loja - ${selectedShipping.value.carrier}`
      : `${addressStreet.value}, nº ${addressNumber.value}${addressComplement.value ? ' (' + addressComplement.value + ')' : ''} - ${addressNeighborhood.value}, ${addressCity.value} - ${addressState.value}`
    
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
        <h1 class="text-2xl md:text-3xl font-extrabold text-slate-850 flex items-center gap-2">
          <CreditCard class="w-6 h-6 text-primary" />
          Finalizar Pedido
        </h1>
        <p class="text-slate-500 text-xs md:text-sm">
          Preencha suas informações de contato e endereço para entrega do seu pacote.
        </p>
      </div>
      <router-link to="/carrinho" class="text-xs md:text-sm font-bold text-primary hover:opacity-80 flex items-center gap-1 group">
        <ArrowLeft class="w-4 h-4 group-hover:-translate-x-0.5 transition-transform duration-200" />
        Voltar ao carrinho
      </router-link>
    </div>

    <!-- Aviso de Loja Fechada -->
    <div v-if="!isStoreOpen" class="p-4.5 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-600 flex items-start gap-3 animate-in fade-in duration-300">
      <AlertTriangle class="w-5 h-5 shrink-0 mt-0.5 text-amber-500" />
      <div>
        <h4 class="font-extrabold text-sm text-amber-600">Loja Fechada no Momento</h4>
        <p class="text-xs text-slate-500 mt-1 leading-relaxed">
          Nosso horário de funcionamento é das <strong>{{ storeOpenTime }}</strong> às <strong>{{ storeCloseTime }}</strong>. Você não conseguirá finalizar sua compra no momento. Agradecemos a sua compreensão!
        </p>
      </div>
    </div>

    <div class="grid grid-cols-1 lg:grid-cols-3 gap-8">
      <!-- Formulários de Cadastro (2 Colunas) -->
      <div class="lg:col-span-2 space-y-6">
        <!-- 1. Informações de Contato -->
        <Card class="bg-white border border-slate-200 rounded-2xl shadow-sm">
          <CardHeader class="pb-3 border-b border-slate-100">
            <CardTitle class="text-base font-bold text-slate-800 flex items-center gap-2">
              <span class="w-5 h-5 rounded-lg bg-primary/10 text-primary flex items-center justify-center text-xs font-black">1</span>
              Dados de Contato
            </CardTitle>
          </CardHeader>
          <CardContent class="p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
            <div class="space-y-1.5 md:col-span-2">
              <label class="text-xs font-semibold text-slate-500">Nome Completo</label>
              <Input 
                v-model="customerName"
                placeholder="Ex: Henrique Souza"
                class="bg-white border-slate-350 text-slate-900 rounded-xl placeholder:text-slate-400 focus-visible:ring-primary"
              />
            </div>
            <!-- <div class="space-y-1.5">
              <label class="text-xs font-semibold text-slate-500">E-mail</label>
              <Input 
                v-model="customerEmail"
                type="email"
                placeholder="Ex: henrique@exemplo.com"
                class="bg-white border-slate-350 text-slate-900 rounded-xl placeholder:text-slate-400 focus-visible:ring-primary"
              />
            </div> -->
            <div class="space-y-1.5">
              <label class="text-xs font-semibold text-slate-500">Celular (com DDD)</label>
              <Input 
                v-model="customerPhone"
                maxLength="15"
                placeholder="Ex: (16) 99999-9999"
                class="bg-white border-slate-350 text-slate-900 rounded-xl placeholder:text-slate-400 focus-visible:ring-primary"
              />
            </div>
          </CardContent>
        </Card>

        <!-- 2. Endereço de Entrega ou Retirada -->
        <Card class="bg-white border border-slate-200 rounded-2xl shadow-sm transition-all duration-300">
          <CardHeader class="pb-3 border-b border-slate-100">
            <CardTitle class="text-base font-bold text-slate-800 flex items-center gap-2">
              <span class="w-5 h-5 rounded-lg bg-primary/10 text-primary flex items-center justify-center text-xs font-black">2</span>
              {{ isPickup ? 'Retirada do Pedido' : 'Endereço para Entrega' }}
            </CardTitle>
          </CardHeader>
          <CardContent class="p-6 space-y-4">
            <!-- Caso seja Retirada -->
            <div v-if="isPickup" class="space-y-4 py-2">
              <div class="p-4 rounded-xl bg-primary/5 border border-primary/20 text-slate-800 space-y-2">
                <h4 class="font-extrabold text-sm flex items-center gap-1.5 text-primary">
                  <Truck class="w-4 h-4" />
                  Opção de Retirada na Loja Ativa
                </h4>
                <p class="text-xs text-slate-500 leading-relaxed">
                  Você escolheu retirar os produtos pessoalmente. Não é necessário preencher dados de entrega física.
                </p>
                <div class="border-t border-primary/10 pt-2 mt-2">
                  <span class="text-[10px] uppercase font-bold text-primary tracking-wider">Endereço da Tabacaria</span>
                  <p class="text-xs font-bold text-slate-900 mt-0.5">
                    {{ selectedShipping?.carrier.replace('Retirada na Loja (', '').replace(')', '') }}
                  </p>
                </div>
              </div>
            </div>

            <!-- Caso seja Entrega -->
            <div v-else class="space-y-4">
              <div v-if="isFetchingCep" class="text-xs text-primary flex items-center gap-2 animate-pulse py-1">
                <Loader2 class="w-3.5 h-3.5 animate-spin" />
                <span>Buscando CEP via ViaCEP...</span>
              </div>
              <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div class="space-y-1.5">
                  <label class="text-xs font-semibold text-slate-500">CEP</label>
                  <Input 
                    v-model="shippingCep"
                    disabled
                    class="bg-slate-50 border-slate-200 text-slate-500 rounded-xl cursor-not-allowed"
                  />
                </div>
                <div class="space-y-1.5 md:col-span-2">
                  <label class="text-xs font-semibold text-slate-500">Logradouro (Rua/Avenida)</label>
                  <Input 
                    v-model="addressStreet"
                    placeholder="Ex: Avenida Paulista"
                    class="bg-white border-slate-350 text-slate-900 rounded-xl placeholder:text-slate-400 focus-visible:ring-primary"
                  />
                </div>
              </div>

              <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div class="space-y-1.5">
                  <label class="text-xs font-semibold text-slate-500">Número</label>
                  <Input 
                    v-model="addressNumber"
                    placeholder="Ex: 1000"
                    class="bg-white border-slate-350 text-slate-900 rounded-xl placeholder:text-slate-400 focus-visible:ring-primary"
                  />
                </div>
                <div class="space-y-1.5 md:col-span-2">
                  <label class="text-xs font-semibold text-slate-500">Complemento (Opcional)</label>
                  <Input 
                    v-model="addressComplement"
                    placeholder="Ex: Apto 101, Bloco B"
                    class="bg-white border-slate-350 text-slate-900 rounded-xl placeholder:text-slate-400 focus-visible:ring-primary"
                  />
                </div>
              </div>

              <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div class="space-y-1.5">
                  <label class="text-xs font-semibold text-slate-500">Bairro</label>
                  <Input 
                    v-model="addressNeighborhood"
                    placeholder="Ex: Bela Vista"
                    class="bg-white border-slate-350 text-slate-900 rounded-xl placeholder:text-slate-400 focus-visible:ring-primary"
                  />
                </div>
                <div class="space-y-1.5">
                  <label class="text-xs font-semibold text-slate-500">Cidade</label>
                  <Input 
                    v-model="addressCity"
                    placeholder="Ex: São Paulo"
                    class="bg-white border-slate-350 text-slate-900 rounded-xl placeholder:text-slate-400 focus-visible:ring-primary"
                  />
                </div>
                <div class="space-y-1.5">
                  <label class="text-xs font-semibold text-slate-500">Estado</label>
                  <Input 
                    v-model="addressState"
                    placeholder="Ex: SP"
                    class="bg-white border-slate-350 text-slate-900 rounded-xl placeholder:text-slate-400 focus-visible:ring-primary"
                  />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <!-- Resumo e Ação (1 Coluna) -->
      <div class="space-y-4">
        <!-- Detalhes do Frete -->
        <Card v-if="selectedShipping" class="bg-white border border-slate-200 rounded-2xl shadow-sm p-5 flex items-center gap-3">
          <Truck class="w-5 h-5 text-primary shrink-0" />
          <div class="text-xs">
            <h5 class="font-bold text-slate-800">Entrega via {{ selectedShipping.carrier }}</h5>
            <p class="text-slate-500 mt-0.5">Prazo estimado de entrega: {{ selectedShipping.deliveryDays }} {{ selectedShipping.deliveryDays === 1 ? 'dia útil' : 'dias úteis' }}.</p>
          </div>
        </Card>

        <!-- Resumo do Pedido -->
        <Card class="bg-white border border-slate-200 rounded-2xl shadow-sm sticky top-24">
          <CardHeader class="pb-3 border-b border-slate-100">
            <CardTitle class="text-base font-bold text-slate-800">Resumo do Pedido</CardTitle>
          </CardHeader>
          <CardContent class="p-6 space-y-6">
            <!-- Lista reduzida dos itens -->
            <div class="max-h-40 overflow-y-auto space-y-3 pr-2 scrollbar-thin scrollbar-thumb-slate-200 text-xs">
              <div 
                v-for="item in cartItems" 
                :key="item.product.id"
                class="flex items-center justify-between gap-3 text-slate-500"
              >
                <div class="flex items-center gap-2 min-w-0">
                  <span class="font-bold text-primary shrink-0">{{ item.quantity }}x</span>
                  <span class="truncate text-slate-700 font-medium">{{ item.product.name }}</span>
                </div>
                <span class="shrink-0 font-semibold text-slate-800">{{ formatPrice(item.product.price * item.quantity) }}</span>
              </div>
            </div>

            <!-- Divisor -->
            <div class="border-t border-slate-100 my-2"></div>

            <!-- Custos Finais -->
            <div class="space-y-2.5 text-xs md:text-sm">
              <div class="flex justify-between text-slate-500">
                <span>Subtotal Itens</span>
                <span class="font-semibold text-slate-750">{{ formatPrice(itemsCost) }}</span>
              </div>
              <div class="flex justify-between text-slate-500">
                <span>Taxa de Entrega</span>
                <span class="font-semibold text-slate-750">{{ formatPrice(shippingCost) }}</span>
              </div>
              
              <div class="border-t border-slate-100 my-2"></div>
              
              <div class="flex justify-between items-baseline">
                <span class="font-bold text-slate-800">Total Geral</span>
                <span class="font-black text-xl text-slate-900">
                  {{ formatPrice(totalCost) }}
                </span>
              </div>
            </div>

            <!-- Feedbacks e Erros -->
            <div v-if="submitError" class="p-3 rounded-xl bg-red-50 border border-red-200 text-red-500 text-xs flex items-center gap-2 animate-shake">
              <AlertTriangle class="w-4 h-4 shrink-0" />
              <span>{{ submitError }}</span>
            </div>

            <!-- Botão de Finalizar -->
            <Button 
              class="w-full rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground font-extrabold py-5 shadow-lg shadow-primary/20 flex items-center justify-center gap-1.5"
              :disabled="isSubmitting || !isStoreOpen"
              @click="handleSubmitOrder"
            >
              <Loader2 v-if="isSubmitting" class="w-4 h-4 animate-spin mr-1" />
              <span>{{ isSubmitting ? 'Processando Pedido...' : 'Confirmar &amp; Pagar' }}</span>
            </Button>

            <!-- Proteção de Compra -->
            <div class="text-[10px] text-slate-400 text-center leading-relaxed">
              Pagamento simulado. Os produtos não serão enviados de fato. Pedido será registrado na tabela `orders` do Turso DB.
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  </div>
</template>
