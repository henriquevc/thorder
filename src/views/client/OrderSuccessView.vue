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
import { fetchOrders, fetchSetting, type Order } from '@/services/store'
import { Button } from '@/components/ui/button'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'

const route = useRoute()
const router = useRouter()

const orderId = Number(route.params.id)
const order = ref<Order | null>(null)
const isLoading = ref(true)
const storeWhatsappNumber = ref('5516999999999')

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

// Função para gerar o link do WhatsApp com mensagem rica
const getWhatsappUrl = () => {
  if (!order.value) return '#'
  
  const o = order.value
  
  let itemText = ''
  if (o.items && o.items.length > 0) {
    itemText = o.items.map(item => `• *${item.quantity}x ${item.product_name}* - ${formatPrice(item.price * item.quantity)}`).join('\n')
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
• *Taxa de Entrega:* ${formatPrice(o.shipping_cost)}
*Total Geral: ${formatPrice(o.total_cost)}*

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

onMounted(async () => {
  try {
    // Busca os pedidos e o whatsapp nas configurações remotas
    const [ordersList, whatsapp] = await Promise.all([
      fetchOrders(),
      fetchSetting('store_whatsapp', '5516999999999')
    ])
    storeWhatsappNumber.value = whatsapp
    
    const found = ordersList.find(o => o.id === orderId)
    
    if (found) {
      order.value = found
      // Auto redirecionamento após 1.5s para uma experiência fluída
      setTimeout(() => {
        handleSendToWhatsapp()
      }, 1500)
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
          Seu pedido foi registrado na tabela <code class="text-primary bg-slate-100 px-1.5 py-0.5 rounded font-mono">orders</code> do Turso DB e está sendo processado.
        </p>
        
        <div class="inline-block px-4 py-1 bg-slate-100 border border-slate-200 rounded-full font-mono text-xs font-bold text-slate-700 shadow-inner mt-2">
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
        <p class="text-[10px] text-emerald-700 font-medium animate-pulse">
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
