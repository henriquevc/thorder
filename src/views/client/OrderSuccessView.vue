<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
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
  Loader2,
  Copy,
  Check,
  Wallet,
  Coins,
  Clock
} from 'lucide-vue-next'
import { fetchOrders, fetchSetting, type Order } from '@/services/store'
import { gerarPayloadPix } from '@/services/pix'
import { Button } from '@/components/ui/button'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'

const route = useRoute()
const router = useRouter()

const orderId = Number(route.params.id)
const order = ref<Order | null>(null)
const isLoading = ref(true)
const storeWhatsappNumber = ref('5516999999999')

// Configurações do Pix
const pixEnabled = ref(false)
const pixKey = ref('')
const pixName = ref('')
const pixCity = ref('Cajuru')
const isCopied = ref(false)

// Refs para o cronômetro do Pix
const countdownText = ref('10:00')
const isExpired = ref(false)
const timerId = ref<any>(null)

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

// Mapeamento visual das formas de pagamento
const getPaymentLabel = (method?: string) => {
  if (!method) return 'Não especificado'
  return {
    pix: 'Pix',
    cartao: 'Cartão (Crédito/Débito)',
    dinheiro: 'Dinheiro'
  }[method] || method
}

// Função para gerar o link do WhatsApp com mensagem rica
const getWhatsappUrl = () => {
  if (!order.value) return '#'
  
  const o = order.value
  
  let itemText = ''
  if (o.items && o.items.length > 0) {
    itemText = o.items.map(item => `• *${item.quantity}x ${item.product_name}* - ${formatPrice(item.price * item.quantity)}`).join('\n')
  }

  let couponText = ''
  if (o.coupon_code) {
    couponText = `\n• *Cupom:* ${o.coupon_code} (- ${formatPrice(o.discount_amount || 0)})`
  }

  const paymentLabel = getPaymentLabel(o.payment_method)
  let paymentDetailsText = `\n• *Forma de Pagamento:* ${paymentLabel}`
  if (o.payment_method === 'dinheiro' && o.change_amount && o.change_amount > 0) {
    const troco = o.change_amount - o.total_cost
    paymentDetailsText += `\n• *Troco para:* ${formatPrice(o.change_amount)} (Levar ${formatPrice(troco)} de troco)`
  }
  
  const rawMessage = `Olá, X-Smoke! Acabei de fazer um pedido no site:

📦 *PEDIDO #${o.id}*
📅 *Data:* ${formatDate(o.created_at)}

👤 *CLIENTE:*
• *Nome:* ${o.customer_name}
• *Celular:* ${o.customer_phone}
${o.customer_email ? `• *E-mail:* ${o.customer_email}\n` : ''}
🚚 *ENTREGA:*
• *Método:* ${o.shipping_carrier}
• *Endereço:* ${o.shipping_address}

🛒 *ITENS COMPRADOS:*
${itemText}

💰 *RESUMO FINANCEIRO:*
• *Subtotal:* ${formatPrice(o.items_cost)}
• *Taxa de Entrega:* ${formatPrice(o.shipping_cost)}${couponText}
*Total Geral: ${formatPrice(o.total_cost)}*${paymentDetailsText}

Aguardando confirmação do pagamento / retirada! 💨`

  const encodedMessage = encodeURIComponent(rawMessage)
  const cleanPhone = storeWhatsappNumber.value.replace(/\D/g, '')
  
  return `https://api.whatsapp.com/send?phone=${cleanPhone}&text=${encodedMessage}`
}

// Enviar manualmente pro whatsapp
const handleSendToWhatsapp = () => {
  const url = getWhatsappUrl()
  if (url !== '#') {
    window.open(url, '_blank')
  }
}

// Helper para obter payload Pix Copia e Cola
const getPixPayloadString = () => {
  if (!order.value || !pixKey.value) return ''
  return gerarPayloadPix(
    pixKey.value,
    pixName.value || 'LOJA THORDER',
    pixCity.value || 'CAJURU',
    order.value.total_cost,
    `TH${order.value.id}`
  )
}

// Helper para obter imagem do QR Code
const getPixQrCodeUrl = () => {
  const payload = getPixPayloadString()
  if (!payload) return ''
  return `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(payload)}`
}

// Copiar código do Pix
const handleCopyPix = () => {
  const payload = getPixPayloadString()
  if (!payload) return
  
  navigator.clipboard.writeText(payload).then(() => {
    isCopied.value = true
    setTimeout(() => {
      isCopied.value = false
    }, 2000)
  }).catch(err => {
    console.error('Erro ao copiar código Pix:', err)
  })
}
// Lógica do cronômetro de 10 minutos para Pix
const startCountdown = () => {
  if (!order.value || (order.value.payment_method && order.value.payment_method !== 'pix')) return

  const createdAt = new Date(order.value.created_at).getTime()
  const expirationTime = createdAt + 10 * 60 * 1000 // 10 minutos em ms

  const updateTimer = () => {
    const now = new Date().getTime()
    const distance = expirationTime - now

    if (distance < 0) {
      isExpired.value = true
      countdownText.value = 'Expirado'
      if (timerId.value) clearInterval(timerId.value)
    } else {
      const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60))
      const seconds = Math.floor((distance % (1000 * 60)) / 1000)
      countdownText.value = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
    }
  }

  updateTimer()
  timerId.value = setInterval(updateTimer, 1000)
}

// Limpa timer ao sair da página para evitar memory leaks
onUnmounted(() => {
  if (timerId.value) {
    clearInterval(timerId.value)
  }
})

onMounted(async () => {
  try {
    // Busca os pedidos e as configurações remotas em paralelo
    const [ordersList, whatsapp, storePixEnabled, storePixKey, storePixName, storePixCity] = await Promise.all([
      fetchOrders(),
      fetchSetting('store_whatsapp', '5516999999999'),
      fetchSetting('store_pix_enabled', 'false'),
      fetchSetting('store_pix_key', ''),
      fetchSetting('store_pix_name', ''),
      fetchSetting('store_pix_city', 'Cajuru')
    ])
    
    storeWhatsappNumber.value = whatsapp
    pixEnabled.value = storePixEnabled === 'true'
    pixKey.value = storePixKey
    pixName.value = storePixName
    pixCity.value = storePixCity
    
    const found = ordersList.find(o => o.id === orderId)
    
    if (found) {
      order.value = found
      startCountdown()
      // Auto redirecionamento após 1.5s se a forma de pagamento NÃO for Pix, ou se o Pix não estiver ativo na loja
      if (order.value.payment_method !== 'pix' || !pixEnabled.value) {
        setTimeout(() => {
          handleSendToWhatsapp()
        }, 1500)
      }
    }
  } catch (err) {
    console.error('Erro ao buscar detalhes do pedido:', err)
  } finally {
    isLoading.value = false
  }
})
</script>

<template>
  <div class="max-w-2xl mx-auto space-y-8 animate-in fade-in slide-in-from-top-4 duration-500">
    <!-- Loader -->
    <div v-if="isLoading" class="flex flex-col items-center justify-center py-20 gap-3">
      <Loader2 class="w-10 h-10 text-primary animate-spin" />
      <p class="text-slate-500 text-sm">Carregando confirmação do seu pedido...</p>
    </div>

    <!-- Pedido Não Encontrado -->
    <div v-else-if="!order" class="text-center py-16 bg-slate-100 border border-slate-200 rounded-3xl space-y-4">
      <CheckCircle class="w-16 h-16 text-emerald-500 mx-auto animate-pulse" />
      <h2 class="text-2xl font-extrabold text-slate-800">Obrigado pela sua compra!</h2>
      <p class="text-slate-550 text-sm max-w-sm mx-auto leading-relaxed">
        Seu pedido foi registrado com sucesso. (ID: #{{ orderId }}). Porém não foi possível carregar os detalhes estruturados.
      </p>
      <Button 
        class="rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground font-bold px-6 shadow-lg shadow-primary/20"
        @click="router.push('/')"
      >
        Voltar à Loja
      </Button>
    </div>

    <!-- Pedido Encontrado -->
    <div v-else class="space-y-6">
      <!-- Mensagem de Sucesso -->
      <div class="text-center space-y-3">
        <div class="inline-flex items-center justify-center w-16 h-16 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-600 shadow-lg shadow-emerald-500/10 animate-bounce">
          <CheckCircle class="w-10 h-10" />
        </div>
        <h1 class="text-3xl font-extrabold text-slate-900 tracking-tight leading-tight">
          Pedido Realizado com Sucesso!
        </h1>
        <p class="text-slate-500 text-xs md:text-sm max-w-md mx-auto leading-relaxed">
          Seu pedido foi registrado e já está sendo processado por nossa equipe.
        </p>
        
        <div class="inline-block px-4 py-1 bg-primary-100 border border-primary-200 rounded-full font-mono text-xs font-bold text-primary shadow-inner mt-2">
          CÓDIGO DO PEDIDO: #{{ order.id }}
        </div>
      </div>

      <!-- Detalhamento do Pedido -->
      <Card class="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
        <CardHeader class="pb-3 border-b border-slate-100 bg-slate-50/50">
          <CardTitle class="text-sm font-bold text-slate-550 uppercase tracking-wider">Dados da Entrega &amp; Contato</CardTitle>
        </CardHeader>
        <CardContent class="p-6 space-y-4 text-xs md:text-sm text-slate-800">
          <!-- Nome e Contato -->
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div class="flex items-center gap-2.5">
              <User class="w-4 h-4 text-primary shrink-0" />
              <span><strong class="text-slate-500">Cliente:</strong> {{ order.customer_name }}</span>
            </div>
            <div class="flex items-center gap-2.5">
              <Mail class="w-4 h-4 text-primary shrink-0" />
              <span><strong class="text-slate-500">E-mail:</strong> {{ order.customer_email }}</span>
            </div>
            <div class="flex items-center gap-2.5">
              <Phone class="w-4 h-4 text-primary shrink-0" />
              <span><strong class="text-slate-500">Celular:</strong> {{ order.customer_phone }}</span>
            </div>
            <div class="flex items-center gap-2.5">
              <Truck class="w-4 h-4 text-primary shrink-0" />
              <span><strong class="text-slate-500">Entrega:</strong> {{ order.shipping_carrier }}</span>
            </div>
            <div class="flex items-center gap-2.5 md:col-span-2">
              <Wallet class="w-4 h-4 text-primary shrink-0" />
              <span><strong class="text-slate-500">Forma de Pagamento:</strong> {{ getPaymentLabel(order.payment_method) }}</span>
            </div>
          </div>

          <!-- Divisor -->
          <div class="border-t border-slate-100 my-2"></div>

          <!-- Endereço -->
          <div class="flex items-start gap-2.5">
            <MapPin class="w-4 h-4 text-primary shrink-0 mt-0.5" />
            <div class="space-y-0.5">
              <span><strong class="text-slate-500">Endereço Completo:</strong></span>
              <p class="text-slate-700 text-xs leading-relaxed">{{ order.shipping_address }}</p>
              <p class="text-[10px] text-slate-400 font-mono mt-0.5">CEP: {{ order.shipping_cep }}</p>
            </div>
          </div>

          <!-- Informações de Troco em Dinheiro -->
          <div v-if="order.payment_method === 'dinheiro' && order.change_amount && order.change_amount > 0" 
            class="flex items-start gap-2.5 p-3.5 bg-amber-500/5 border border-amber-500/10 rounded-xl text-xs text-amber-800 animate-in fade-in duration-300"
          >
            <Coins class="w-4 h-4 shrink-0 text-amber-600 mt-0.5" />
            <div class="space-y-0.5">
              <span class="font-bold block text-amber-900">Solicitação de Troco:</span>
              <p class="text-amber-800 text-xs">
                O cliente pagará em dinheiro com <strong>{{ formatPrice(order.change_amount) }}</strong>. 
                O entregador deverá levar <strong>{{ formatPrice(order.change_amount - order.total_cost) }}</strong> de troco.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <!-- Itens Comprados -->
      <Card class="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
        <CardHeader class="pb-3 border-b border-slate-100 bg-slate-50/50 flex flex-row items-center justify-between">
          <CardTitle class="text-sm font-bold text-slate-550 uppercase tracking-wider">Itens Comprados</CardTitle>
          <span class="text-[10px] text-slate-400 font-bold uppercase">{{ formatDate(order.created_at) }}</span>
        </CardHeader>
        <CardContent class="p-6 space-y-4">
          <!-- Lista dos itens -->
          <div class="divide-y divide-slate-100 text-xs md:text-sm">
            <div 
              v-for="item in order.items" 
              :key="item.id"
              class="flex items-center justify-between py-2.5 first:pt-0 last:pb-0"
            >
              <div class="flex items-center gap-3">
                <span class="font-bold text-primary">{{ item.quantity }}x</span>
                <span class="text-slate-800 font-semibold">{{ item.product_name }}</span>
              </div>
              <span class="font-extrabold text-slate-900">{{ formatPrice(item.price * item.quantity) }}</span>
            </div>
          </div>

          <!-- Divisor -->
          <div class="border-t border-slate-100 pt-4"></div>

          <!-- Custos totais -->
          <div class="space-y-2.5 text-xs md:text-sm">
            <div class="flex justify-between text-slate-500">
              <span>Subtotal dos Itens</span>
              <span class="font-medium text-slate-800">{{ formatPrice(order.items_cost) }}</span>
            </div>
            <!-- Cupom de Desconto -->
            <div v-if="order.coupon_code" class="flex justify-between text-red-650 font-medium animate-in fade-in duration-300">
              <span>Desconto (Cupom: {{ order.coupon_code }})</span>
              <span class="font-bold">- {{ formatPrice(order.discount_amount || 0) }}</span>
            </div>
            <div class="flex justify-between text-slate-500">
              <span>Taxa de Entrega (Frete)</span>
              <span class="font-medium text-slate-800">{{ formatPrice(order.shipping_cost) }}</span>
            </div>
            
            <div class="border-t border-slate-100 my-2"></div>
            
            <div class="flex justify-between items-baseline">
              <span class="font-bold text-slate-600">Valor Total</span>
              <span class="font-black text-lg text-slate-900">
                {{ formatPrice(order.total_cost) }}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      <!-- Card do Pix -->
      <Card v-if="pixEnabled && pixKey && (!order.payment_method || order.payment_method === 'pix')" class="bg-white border border-amber-200 rounded-2xl shadow-sm overflow-hidden animate-in fade-in slide-in-from-bottom-3 duration-500">
        <CardHeader class="pb-3 border-b border-amber-100 bg-amber-50/50 flex flex-row items-center gap-2">
          <div class="p-1.5 rounded-lg bg-amber-100 text-amber-700">
            <!-- Ícone Pix customizado -->
            <svg class="w-5 h-5 fill-current" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 .024c-.218 0-.427.086-.58.24L7.545 4.14a.82.82 0 0 0 0 1.157L11.42 9.17c.32.32.84.32 1.16 0l3.876-3.873a.82.82 0 0 0 0-1.157L12.58.264a.818.818 0 0 0-.58-.24zm-4.736 4.71a.822.822 0 0 0-.58.24L2.808 8.85a.82.82 0 0 0 0 1.157l3.876 3.876a.82.82 0 0 0 1.157 0l3.873-3.876a.82.82 0 0 0 0-1.157L7.844 4.974a.82.82 0 0 0-.58-.24zm9.472 0a.82.82 0 0 0-.58.24l-3.876 3.876a.82.82 0 0 0 0 1.157l3.876 3.876a.82.82 0 0 0 1.157 0l3.876-3.876a.82.82 0 0 0 0-1.157L17.316 4.974c-.154-.154-.363-.24-.58-.24zM12 14.83a.818.818 0 0 0-.58.24l-3.876 3.876a.82.82 0 0 0 0 1.157l3.876 3.873a.82.82 0 0 0 1.16 0l3.876-3.873a.82.82 0 0 0 0-1.157L12.58 15.07c-.153-.154-.362-.24-.58-.24z"/>
            </svg>
          </div>
          <CardTitle class="text-sm font-bold text-amber-800 uppercase tracking-wider">Pagamento via Pix</CardTitle>
        </CardHeader>
        <CardContent class="p-6 flex flex-col items-center gap-4 text-center">
          <!-- Temporizador de Expiração -->
          <div class="px-3.5 py-1.5 rounded-full border text-[10px] font-bold tracking-wide uppercase inline-flex items-center gap-1.5"
            :class="isExpired 
              ? 'bg-red-500/10 border-red-500/20 text-red-650' 
              : 'bg-amber-500/10 border-amber-500/20 text-amber-600 animate-pulse'"
          >
            <Clock class="w-3.5 h-3.5" :class="{'text-red-500': isExpired, 'text-amber-500 animate-spin': !isExpired}" />
            <span>{{ isExpired ? 'QR Code Expirado' : `Expira em: ${countdownText}` }}</span>
          </div>

          <p v-if="!isExpired" class="text-xs text-slate-500 max-w-sm leading-relaxed">
            Pague agora com o Pix para agilizar o envio! Use o aplicativo do seu banco para ler o QR Code abaixo ou copie a chave do Copia e Cola.
          </p>

          <!-- Banner Informativo de Expiração -->
          <div v-else class="p-4 rounded-xl border border-red-250 bg-red-50/50 text-xs text-red-800 text-left max-w-md animate-in fade-in duration-300 space-y-1">
            <h5 class="font-extrabold flex items-center gap-1.5 text-red-900">
              <Clock class="w-4 h-4 text-red-600 shrink-0" />
              Tempo Limite Excedido
            </h5>
            <p class="text-red-700 leading-relaxed text-[11px]">
              O tempo limite de 10 minutos para pagamento online via QR Code expirou. Para dar andamento ao seu pedido, clique no botão de **WhatsApp** abaixo para enviar os detalhes e combinar o pagamento diretamente com a loja.
            </p>
          </div>

          <!-- QR Code Container -->
          <div class="relative p-3 bg-white border-2 border-slate-100 rounded-2xl shadow-inner group overflow-hidden">
            <img 
              :src="getPixQrCodeUrl()" 
              alt="QR Code Pix" 
              class="w-48 h-48 md:w-56 md:h-56 select-none transition-all duration-300 rounded-lg"
              :class="isExpired ? 'filter grayscale contrast-50 opacity-20' : ''"
            />
            <!-- Overlay de Expiração -->
            <div v-if="isExpired" class="absolute inset-0 bg-white/20 flex flex-col items-center justify-center animate-in fade-in duration-350">
              <span class="text-xs font-black text-red-650 bg-white border border-red-200 px-3 py-1.5 rounded-xl shadow-md uppercase tracking-wider scale-105">Código Expirado</span>
            </div>
            <!-- Overlay Normal -->
            <div v-else class="absolute inset-0 bg-white/90 backdrop-blur-xs flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-2xl">
              <span class="text-xs font-bold text-slate-700 bg-slate-100 border px-3 py-1.5 rounded-xl shadow-sm">Escaneie pelo App do Banco</span>
            </div>
          </div>

          <!-- Valor e Detalhes da Conta -->
          <div class="space-y-1">
            <span class="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Valor do Pix</span>
            <div class="text-2xl font-black text-amber-850 leading-tight" :class="isExpired ? 'text-slate-450 line-through' : 'text-amber-850'">
              {{ formatPrice(order.total_cost) }}
            </div>
            <div class="text-[10px] text-slate-500 flex items-center justify-center gap-1">
              <span>Beneficiário:</span>
              <strong class="text-slate-700">{{ pixName || 'LOJA THORDER' }}</strong>
            </div>
          </div>

          <!-- Botões Copia e Cola -->
          <div class="w-full max-w-md pt-2 space-y-2">
            <!-- Botão Copiar -->
            <Button 
              variant="outline"
              class="w-full rounded-xl py-5 border-amber-300 bg-amber-50/30 hover:bg-amber-50 text-amber-900 font-bold text-xs md:text-sm flex items-center justify-center gap-2 transition-transform"
              :disabled="isExpired"
              :class="isExpired ? 'opacity-45 cursor-not-allowed border-slate-200 bg-slate-50 text-slate-400' : 'cursor-pointer hover:scale-[1.01]'"
              @click="handleCopyPix"
            >
              <component :is="isCopied ? Check : Copy" class="w-4 h-4 animate-in zoom-in duration-200" :class="isExpired ? 'text-slate-400' : 'text-amber-700'" />
              <span>{{ isExpired ? 'Chave Expirada' : (isCopied ? 'Código Copiado!' : 'Copiar Código Pix Copia e Cola') }}</span>
            </Button>

            <!-- Preview do Copia e Cola -->
            <div 
              v-if="!isExpired" 
              class="p-2 border border-dashed border-slate-200 bg-slate-50 rounded-xl text-[10px] font-mono text-slate-500 truncate text-left px-3 select-all"
            >
              {{ getPixPayloadString() }}
            </div>
          </div>
        </CardContent>
      </Card>

      <!-- Botão do WhatsApp Primário -->
      <div class="p-5 bg-emerald-50 border border-emerald-100 rounded-2xl flex flex-col items-center gap-3 text-center shadow-sm">
        <div class="text-xs text-emerald-800 font-semibold max-w-sm">
          Seu pedido foi registrado! Para agilizar o atendimento e combinar o pagamento, envie os detalhes do pedido no nosso WhatsApp.
        </div>
        <Button 
          class="rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold px-8 py-6 shadow-lg shadow-emerald-500/20 gap-2 flex items-center justify-center cursor-pointer transition-transform hover:scale-[1.02]"
          @click="handleSendToWhatsapp"
        >
          <!-- SVG Ícone Oficial do WhatsApp -->
          <svg class="w-5 h-5 fill-current" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946C.06 5.348 5.397.01 12.008.01c3.202.001 6.212 1.246 8.477 3.513 2.266 2.268 3.507 5.28 3.505 8.484-.004 6.657-5.34 11.997-11.953 11.997-2.005-.001-3.973-.502-5.724-1.455L0 24zm6.835-2.281c1.554.921 3.403 1.408 5.293 1.41h.005c5.688 0 10.32-4.629 10.323-10.32 0-2.756-1.072-5.347-3.023-7.299-1.952-1.952-4.545-3.024-7.304-3.025-5.69 0-10.322 4.63-10.325 10.321-.001 1.887.493 3.73 1.43 5.362l-.988 3.606 3.692-.968zM17.65 19.3c-.274-.136-1.62-.8-1.87-.89-.252-.09-.436-.136-.62.136-.18.273-.702.89-.86 1.07-.16.18-.316.2-.59.063-.274-.136-1.16-.427-2.207-1.362-.816-.727-1.367-1.626-1.527-1.9-.16-.273-.017-.42.12-.557.123-.122.274-.317.41-.476.138-.16.183-.273.275-.455.092-.18.046-.339-.023-.476-.07-.136-.62-1.49-.85-2.045-.224-.54-.45-.467-.62-.476-.16-.008-.344-.01-.528-.01-.18 0-.476.068-.724.34-.248.273-.948.928-.948 2.262 0 1.333.97 2.62 1.107 2.8.136.18 1.9 2.9 4.606 4.07.643.279 1.146.445 1.536.57.646.205 1.233.176 1.697.107.518-.077 1.62-.662 1.85-1.3.23-.637.23-1.183.162-1.3-.07-.116-.252-.2-.527-.336z"/>
          </svg>
          <span>Enviar Pedido no WhatsApp</span>
        </Button>
        <p v-if="!pixEnabled" class="text-[10px] text-emerald-700 font-medium animate-pulse">
          Redirecionando automaticamente em instantes...
        </p>
      </div>

      <!-- Botões de Ação do Sucesso -->
      <div class="flex items-center gap-3 justify-center pt-2">
        <Button 
          variant="outline"
          class="rounded-xl border-slate-300 hover:bg-slate-100 text-slate-700 font-bold px-6"
          @click="router.push('/')"
        >
          <ShoppingBag class="w-4 h-4 mr-2 text-primary" />
          Voltar ao Catálogo
        </Button>
      </div>
    </div>
  </div>
</template>
