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
  AlertCircle,
  Palette,
  MapPin,
  Clock,
  QrCode,
  Wallet
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
  setThemeColor,
  fetchSetting,
  saveSetting,
  type Order, 
  type Product 
} from '@/services/store'
import AdminProducts from './AdminProducts.vue'
import AdminOrders from './AdminOrders.vue'
import AdminCoupons from './AdminCoupons.vue'
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

// Configurações do Endereço e WhatsApp da Tabacaria
const storeAddress = ref('')
const storeWhatsapp = ref('')
const isSavingAddress = ref(false)
const saveAddressSuccess = ref(false)
const saveAddressError = ref('')

// Configurações do Horário de Funcionamento
const storeHoursEnabled = ref(false)
const storeOpenTime = ref('18:00')
const storeCloseTime = ref('23:59')
const isSavingHours = ref(false)
const saveHoursSuccess = ref(false)
const saveHoursError = ref('')

// Configurações do Pix da Tabacaria
const storePixEnabled = ref(false)
const storePixKey = ref('')
const storePixName = ref('')
const storePixCity = ref('Cajuru')
const isSavingPix = ref(false)
const savePixSuccess = ref(false)
const savePixError = ref('')

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

// Salvar Configurações Locais (Endereço e WhatsApp)
const handleSaveSettings = async () => {
  if (!storeAddress.value.trim()) {
    saveAddressError.value = 'O endereço não pode ser vazio.'
    return
  }
  if (!storeWhatsapp.value.trim()) {
    saveAddressError.value = 'O WhatsApp não pode ser vazio.'
    return
  }
  
  isSavingAddress.value = true
  saveAddressError.value = ''
  saveAddressSuccess.value = false
  
  try {
    const cleanWhatsapp = storeWhatsapp.value.replace(/\D/g, '')
    if (cleanWhatsapp.length < 10) {
      throw new Error('Por favor, insira um número de WhatsApp válido com DDD (ex: 16999999999).')
    }
    
    await Promise.all([
      saveSetting('store_address', storeAddress.value.trim()),
      saveSetting('store_whatsapp', cleanWhatsapp)
    ])
    
    storeWhatsapp.value = cleanWhatsapp
    
    saveAddressSuccess.value = true
    setTimeout(() => {
      saveAddressSuccess.value = false
    }, 2000)
  } catch (e: any) {
    saveAddressError.value = e.message || 'Falha ao salvar as configurações no banco de dados.'
  } finally {
    isSavingAddress.value = false
  }
}

// Salvar Configurações do Horário de Funcionamento
const handleSaveHours = async () => {
  if (!storeOpenTime.value || !storeCloseTime.value) {
    saveHoursError.value = 'Os horários de abertura e fechamento não podem ser vazios.'
    return
  }
  
  isSavingHours.value = true
  saveHoursError.value = ''
  saveHoursSuccess.value = false
  
  try {
    await Promise.all([
      saveSetting('store_hours_enabled', storeHoursEnabled.value ? 'true' : 'false'),
      saveSetting('store_open_time', storeOpenTime.value),
      saveSetting('store_close_time', storeCloseTime.value)
    ])
    
    saveHoursSuccess.value = true
    setTimeout(() => {
      saveHoursSuccess.value = false
    }, 2000)
  } catch (e: any) {
    saveHoursError.value = e.message || 'Falha ao salvar o horário de funcionamento no banco de dados.'
  } finally {
    isSavingHours.value = false
  }
}

// Salvar Configurações de Recebimento via Pix
const handleSavePix = async () => {
  if (storePixEnabled.value) {
    if (!storePixKey.value.trim()) {
      savePixError.value = 'A Chave Pix não pode ser vazia se o Pix estiver ativado.'
      return
    }
    if (!storePixName.value.trim()) {
      savePixError.value = 'O Nome do Beneficiário não pode ser vazio se o Pix estiver ativado.'
      return
    }
    if (!storePixCity.value.trim()) {
      savePixError.value = 'A Cidade do Beneficiário não pode ser vazia se o Pix estiver ativado.'
      return
    }
  }
  
  isSavingPix.value = true
  savePixError.value = ''
  savePixSuccess.value = false
  
  try {
    await Promise.all([
      saveSetting('store_pix_enabled', storePixEnabled.value ? 'true' : 'false'),
      saveSetting('store_pix_key', storePixKey.value.trim()),
      saveSetting('store_pix_name', storePixName.value.trim()),
      saveSetting('store_pix_city', storePixCity.value.trim())
    ])
    
    savePixSuccess.value = true
    setTimeout(() => {
      savePixSuccess.value = false
    }, 2000)
  } catch (e: any) {
    savePixError.value = e.message || 'Falha ao salvar as configurações de Pix no banco de dados.'
  } finally {
    isSavingPix.value = false
  }
}

onMounted(async () => {
  try {
    // Carrega estatísticas iniciais em paralelo
    const [orders, products, address, whatsapp, hoursEnabled, openTime, closeTime, pixEnabled, pixKey, pixName, pixCity] = await Promise.all([
      fetchOrders(),
      fetchProducts(),
      fetchSetting('store_address', 'Rua Marechal Deodoro, 150 - Centro, Cajuru - SP'),
      fetchSetting('store_whatsapp', '5516999999999'),
      fetchSetting('store_hours_enabled', 'false'),
      fetchSetting('store_open_time', '18:00'),
      fetchSetting('store_close_time', '23:59'),
      fetchSetting('store_pix_enabled', 'false'),
      fetchSetting('store_pix_key', ''),
      fetchSetting('store_pix_name', ''),
      fetchSetting('store_pix_city', 'Cajuru')
    ])
    ordersList.value = orders
    productsList.value = products
    storeAddress.value = address
    storeWhatsapp.value = whatsapp
    storeHoursEnabled.value = hoursEnabled === 'true'
    storeOpenTime.value = openTime
    storeCloseTime.value = closeTime
    storePixEnabled.value = pixEnabled === 'true'
    storePixKey.value = pixKey
    storePixName.value = pixName
    storePixCity.value = pixCity
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
          <TabsTrigger value="cupons" class="rounded-lg text-xs md:text-sm font-bold px-5 py-2 transition-all"
            :class="themeMode === 'dark' ? 'text-slate-400 hover:text-white' : 'text-slate-655 hover:text-slate-900'"
          >
            Cupons
          </TabsTrigger>
          <TabsTrigger value="banco" class="rounded-lg text-xs md:text-sm font-bold px-5 py-2 transition-all"
            :class="themeMode === 'dark' ? 'text-slate-400 hover:text-white' : 'text-slate-655 hover:text-slate-900'"
          >
            Configurações
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

      <!-- Tab Conteúdo: Cupons -->
      <TabsContent value="cupons" class="outline-none animate-in fade-in duration-300">
        <AdminCoupons />
      </TabsContent>

      <!-- Tab Conteúdo: Configurações -->
      <TabsContent value="banco" class="outline-none space-y-6">
        
        <!-- 1. PERSONALIZAÇÃO VISUAL -->
        <Card class="rounded-2xl shadow-xl transition-colors duration-300 relative overflow-hidden"
          :class="themeMode === 'dark' ? 'bg-slate-900/30 border-slate-900' : 'bg-white border-slate-200'"
        >
          <CardHeader class="border-b pb-4" :class="themeMode === 'dark' ? 'border-slate-800/80' : 'border-slate-100'">
            <CardTitle class="text-xl font-extrabold flex items-center gap-2"
              :class="themeMode === 'dark' ? 'text-slate-100' : 'text-slate-900'"
            >
              <Palette class="w-5 h-5 text-primary" />
              Aparência da Loja Virtual
            </CardTitle>
            <p class="text-slate-400 text-xs mt-1">
              Personalize a cor de destaque aplicada a todos os clientes. O visual está fixado no elegante Modo Claro (Creme marfim).
            </p>
          </CardHeader>
          
          <CardContent class="p-6 space-y-6">
            <div class="max-w-xl">
              <!-- Cor de Destaque -->
              <div class="space-y-2">
                <span class="text-xs font-bold uppercase tracking-wider text-slate-400">Cor de Destaque (Accent)</span>
                <p class="text-[10px] text-slate-500 mb-2">Selecione a cor de acento dos botões, badges e ícones.</p>
                <div class="flex items-center gap-2 pt-1">
                  <!-- Gold -->
                  <button 
                    class="w-8 h-8 rounded-full bg-[#C5A880] border-2 transition-transform duration-200 flex items-center justify-center text-white"
                    :class="themeColor === 'gold' ? 'border-primary scale-110 shadow-lg shadow-primary/50' : 'border-transparent hover:scale-105'"
                    title="Dourado Champagne (Padrão)"
                    @click="setThemeColor('gold')"
                  >
                    <Check v-if="themeColor === 'gold'" class="w-4 h-4" />
                  </button>
                  <!-- Purple -->
                  <button 
                    class="w-8 h-8 rounded-full bg-purple-500 border-2 transition-transform duration-200 flex items-center justify-center text-white"
                    :class="themeColor === 'purple' ? 'border-purple-300 scale-110 shadow-lg shadow-purple-500/50' : 'border-transparent hover:scale-105'"
                    title="Roxo Premium"
                    @click="setThemeColor('purple')"
                  >
                    <Check v-if="themeColor === 'purple'" class="w-4 h-4" />
                  </button>
                  <!-- Emerald -->
                  <button 
                    class="w-8 h-8 rounded-full bg-emerald-500 border-2 transition-transform duration-200 flex items-center justify-center text-white"
                    :class="themeColor === 'emerald' ? 'border-emerald-300 scale-110 shadow-lg shadow-emerald-500/50' : 'border-transparent hover:scale-105'"
                    title="Verde Esmeralda"
                    @click="setThemeColor('emerald')"
                  >
                    <Check v-if="themeColor === 'emerald'" class="w-4 h-4" />
                  </button>
                  <!-- Blue -->
                  <button 
                    class="w-8 h-8 rounded-full bg-blue-500 border-2 transition-transform duration-200 flex items-center justify-center text-white"
                    :class="themeColor === 'blue' ? 'border-blue-300 scale-110 shadow-lg shadow-blue-500/50' : 'border-transparent hover:scale-105'"
                    title="Azul Elétrico"
                    @click="setThemeColor('blue')"
                  >
                    <Check v-if="themeColor === 'blue'" class="w-4 h-4" />
                  </button>
                  <!-- Orange -->
                  <button 
                    class="w-8 h-8 rounded-full bg-orange-500 border-2 transition-transform duration-200 flex items-center justify-center text-white"
                    :class="themeColor === 'orange' ? 'border-orange-350 scale-110 shadow-lg shadow-orange-500/50' : 'border-transparent hover:scale-105'"
                    title="Laranja Vibrante"
                    @click="setThemeColor('orange')"
                  >
                    <Check v-if="themeColor === 'orange'" class="w-4 h-4" />
                  </button>
                  <!-- Red -->
                  <button 
                    class="w-8 h-8 rounded-full bg-red-500 border-2 transition-transform duration-200 flex items-center justify-center text-white"
                    :class="themeColor === 'red' ? 'border-red-300 scale-110 shadow-lg shadow-red-500/50' : 'border-transparent hover:scale-105'"
                    title="Vermelho Carmesim"
                    @click="setThemeColor('red')"
                  >
                    <Check v-if="themeColor === 'red'" class="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <!-- 2. ENDEREÇO E WHATSAPP DA TABACARIA -->
        <Card class="rounded-2xl shadow-xl transition-colors duration-300 relative overflow-hidden"
          :class="themeMode === 'dark' ? 'bg-slate-900/30 border-slate-900' : 'bg-white border-slate-200'"
        >
          <CardHeader class="border-b pb-4" :class="themeMode === 'dark' ? 'border-slate-800/80' : 'border-slate-100'">
            <CardTitle class="text-xl font-extrabold flex items-center gap-2"
              :class="themeMode === 'dark' ? 'text-slate-100' : 'text-slate-900'"
            >
              <MapPin class="w-5 h-5 text-primary" />
              Configurações de Retirada &amp; WhatsApp
            </CardTitle>
            <p class="text-slate-400 text-xs mt-1">
              Configure o endereço físico e o número de WhatsApp receptor de pedidos da sua loja. O endereço será exibido para os clientes que escolherem a opção de Retirada, e o WhatsApp receberá os detalhes estruturados de cada pedido. Os dados são salvos diretamente no banco de dados Turso.
            </p>
          </CardHeader>
          
          <CardContent class="p-6 space-y-5">
            <!-- Endereço Completo -->
            <div class="space-y-2">
              <label class="text-xs font-bold uppercase tracking-wider text-slate-400"
                :class="themeMode === 'dark' ? 'text-slate-400' : 'text-slate-500'"
              >Endereço Completo da Tabacaria</label>
              <Input 
                v-model="storeAddress" 
                placeholder="Ex: Rua Marechal Deodoro, 150 - Centro, Cajuru - SP" 
                class="rounded-xl focus:ring-primary w-full"
                :class="themeMode === 'dark' ? 'bg-slate-950 border-slate-800 text-white' : 'bg-slate-100 border-slate-300 text-slate-900'"
                @keyup.enter="handleSaveSettings"
              />
              <p class="text-[10px] text-slate-500">Inclua rua, número, bairro, cidade e estado para facilitar a localização do cliente.</p>
            </div>

            <!-- WhatsApp Receptor de Pedidos -->
            <div class="space-y-2">
              <label class="text-xs font-bold uppercase tracking-wider text-slate-400"
                :class="themeMode === 'dark' ? 'text-slate-400' : 'text-slate-500'"
              >WhatsApp para Receber Pedidos</label>
              <Input 
                v-model="storeWhatsapp" 
                placeholder="Ex: 5516999999999" 
                class="rounded-xl focus:ring-primary w-full"
                :class="themeMode === 'dark' ? 'bg-slate-950 border-slate-800 text-white' : 'bg-slate-100 border-slate-300 text-slate-900'"
                @keyup.enter="handleSaveSettings"
              />
              <p class="text-[10px] text-slate-550">
                Insira o número completo com código do país (55 para Brasil) e DDD, apenas números. Ex: <strong class="text-primary font-bold">5516999999999</strong>.
              </p>
            </div>

            <!-- Feedbacks -->
            <div v-if="saveAddressError" class="p-3 rounded-xl bg-red-950/30 border border-red-500/30 text-red-400 text-xs flex items-center gap-2 animate-shake">
              <AlertTriangle class="w-4 h-4 shrink-0" />
              <span>{{ saveAddressError }}</span>
            </div>

            <div v-if="saveAddressSuccess" class="p-3 rounded-xl bg-emerald-955/30 border border-emerald-500/30 text-emerald-450 text-xs flex items-center gap-2">
              <Check class="w-4 h-4 shrink-0" />
              <span>Configurações locais atualizadas com sucesso no banco de dados Turso!</span>
            </div>

            <!-- Ações -->
            <div class="flex justify-end pt-2 border-t"
              :class="themeMode === 'dark' ? 'border-slate-800/80' : 'border-slate-150'"
            >
              <Button 
                size="sm"
                class="rounded-xl font-bold bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg shadow-primary/20"
                :disabled="isSavingAddress"
                @click="handleSaveSettings"
              >
                <Loader2 v-if="isSavingAddress" class="w-4 h-4 animate-spin mr-1.5" />
                {{ isSavingAddress ? 'Salvando...' : 'Salvar Configurações' }}
              </Button>
            </div>
          </CardContent>
        </Card>

        <!-- HORÁRIO DE FUNCIONAMENTO -->
        <Card class="rounded-2xl shadow-xl transition-colors duration-300 relative overflow-hidden"
          :class="themeMode === 'dark' ? 'bg-slate-900/30 border-slate-900' : 'bg-white border-slate-200'"
        >
          <CardHeader class="border-b pb-4" :class="themeMode === 'dark' ? 'border-slate-800/80' : 'border-slate-100'">
            <CardTitle class="text-xl font-extrabold flex items-center gap-2"
              :class="themeMode === 'dark' ? 'text-slate-100' : 'text-slate-900'"
            >
              <Clock class="w-5 h-5 text-primary" />
              Horário de Funcionamento
            </CardTitle>
            <p class="text-slate-400 text-xs mt-1">
              Defina os horários diários em que a loja está aberta para receber pedidos. Se a restrição estiver ativa, os clientes não poderão finalizar compras fora do intervalo especificado.
            </p>
          </CardHeader>
          
          <CardContent class="p-6 space-y-5">
            <!-- Checkbox de Habilitação -->
            <div class="flex items-center gap-3 p-3 rounded-xl border"
              :class="themeMode === 'dark' ? 'bg-slate-950/40 border-slate-800' : 'bg-slate-50 border-slate-200'"
            >
              <input 
                id="hours-enabled-checkbox"
                v-model="storeHoursEnabled" 
                type="checkbox"
                class="w-4.5 h-4.5 text-primary rounded border-slate-300 focus:ring-primary focus:ring-opacity-50 cursor-pointer"
              />
              <label for="hours-enabled-checkbox" class="text-xs font-bold select-none cursor-pointer flex-1"
                :class="themeMode === 'dark' ? 'text-slate-400' : 'text-slate-650'"
              >
                Habilitar limite de horário de funcionamento
              </label>
            </div>

            <!-- Seletores de Horário (Abertura e Fechamento) -->
            <div class="grid grid-cols-1 md:grid-cols-2 gap-6" :class="{ 'opacity-60 pointer-events-none': !storeHoursEnabled }">
              <div class="space-y-2">
                <label class="text-xs font-bold uppercase tracking-wider text-slate-400"
                  :class="themeMode === 'dark' ? 'text-slate-400' : 'text-slate-500'"
                >Horário de Abertura</label>
                <Input 
                  v-model="storeOpenTime" 
                  type="time" 
                  class="rounded-xl w-full"
                  :class="themeMode === 'dark' ? 'bg-slate-950 border-slate-800 text-white' : 'bg-slate-100 border-slate-300 text-slate-900'"
                />
              </div>

              <div class="space-y-2">
                <label class="text-xs font-bold uppercase tracking-wider text-slate-400"
                  :class="themeMode === 'dark' ? 'text-slate-400' : 'text-slate-500'"
                >Horário de Fechamento</label>
                <Input 
                  v-model="storeCloseTime" 
                  type="time" 
                  class="rounded-xl w-full"
                  :class="themeMode === 'dark' ? 'bg-slate-950 border-slate-800 text-white' : 'bg-slate-100 border-slate-300 text-slate-900'"
                />
              </div>
            </div>

            <!-- Informação Informativa de Virada de Noite -->
            <p v-if="storeHoursEnabled" class="text-[10px] leading-relaxed italic text-slate-550"
              :class="themeMode === 'dark' ? 'text-slate-400' : 'text-slate-500'"
            >
              * O sistema é compatível com turnos noturnos. Por exemplo, se definir abertura às <strong>18:00</strong> e fechamento às <strong>02:00</strong>, a loja ficará aberta das 18:00 até as 23:59 e de 00:00 até as 02:00.
            </p>

            <!-- Feedbacks -->
            <div v-if="saveHoursError" class="p-3 rounded-xl bg-red-950/30 border border-red-500/30 text-red-400 text-xs flex items-center gap-2 animate-shake">
              <AlertTriangle class="w-4 h-4 shrink-0" />
              <span>{{ saveHoursError }}</span>
            </div>

            <div v-if="saveHoursSuccess" class="p-3 rounded-xl bg-emerald-955/30 border border-emerald-500/30 text-emerald-450 text-xs flex items-center gap-2">
              <Check class="w-4 h-4 shrink-0" />
              <span>Horário de funcionamento salvo com sucesso no banco de dados!</span>
            </div>

            <!-- Ações -->
            <div class="flex justify-end pt-2 border-t"
              :class="themeMode === 'dark' ? 'border-slate-800/80' : 'border-slate-150'"
            >
              <Button 
                size="sm"
                class="rounded-xl font-bold bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg shadow-primary/20"
                :disabled="isSavingHours"
                @click="handleSaveHours"
              >
                <Loader2 v-if="isSavingHours" class="w-4 h-4 animate-spin mr-1.5" />
                {{ isSavingHours ? 'Salvando...' : 'Salvar Horário' }}
              </Button>
            </div>
          </CardContent>
        </Card>

        <!-- CONFIGURAÇÕES DE PAGAMENTO VIA PIX -->
        <Card class="rounded-2xl shadow-xl transition-colors duration-300 relative overflow-hidden"
          :class="themeMode === 'dark' ? 'bg-slate-900/30 border-slate-900' : 'bg-white border-slate-200'"
        >
          <CardHeader class="border-b pb-4" :class="themeMode === 'dark' ? 'border-slate-800/80' : 'border-slate-100'">
            <CardTitle class="text-xl font-extrabold flex items-center gap-2"
              :class="themeMode === 'dark' ? 'text-slate-100' : 'text-slate-900'"
            >
              <Wallet class="w-5 h-5 text-primary" />
              Recebimento via Pix (Gratuito)
            </CardTitle>
            <p class="text-slate-400 text-xs mt-1">
              Habilite a exibição automática de um QR Code Pix e do código "Copia e Cola" com o valor exato do pedido na tela de sucesso de compra. O cliente poderá pagar e depois enviar o comprovante via WhatsApp.
            </p>
          </CardHeader>
          
          <CardContent class="p-6 space-y-5">
            <!-- Switch Habilitar Pix -->
            <div class="flex items-center gap-3 p-3 rounded-xl border"
              :class="themeMode === 'dark' ? 'bg-slate-950/40 border-slate-800' : 'bg-slate-50 border-slate-200'"
            >
              <input 
                id="pix-enabled-checkbox"
                v-model="storePixEnabled" 
                type="checkbox"
                class="w-4.5 h-4.5 text-primary rounded border-slate-300 focus:ring-primary focus:ring-opacity-50 cursor-pointer"
              />
              <label for="pix-enabled-checkbox" class="text-xs font-bold select-none cursor-pointer flex-1"
                :class="themeMode === 'dark' ? 'text-slate-400' : 'text-slate-650'"
              >
                Habilitar QR Code Pix dinâmico com valor na tela de sucesso
              </label>
            </div>

            <!-- Dados do Pix (Aparecem desabilitados se Pix desativado) -->
            <div class="space-y-4" :class="{ 'opacity-60 pointer-events-none': !storePixEnabled }">
              <!-- Chave Pix -->
              <div class="space-y-2">
                <label class="text-xs font-bold uppercase tracking-wider text-slate-400"
                  :class="themeMode === 'dark' ? 'text-slate-400' : 'text-slate-500'"
                >Chave Pix de Recebimento</label>
                <Input 
                  v-model="storePixKey" 
                  placeholder="E-mail, Telefone, CPF, CNPJ ou Chave Aleatória" 
                  class="rounded-xl w-full"
                  :class="themeMode === 'dark' ? 'bg-slate-950 border-slate-800 text-white focus:ring-primary' : 'bg-slate-100 border-slate-300 text-slate-900 focus:ring-primary'"
                />
                <p class="text-[10px] text-slate-500">
                  Insira a chave cadastrada no seu banco exatamente como deve ser copiada.
                </p>
              </div>

              <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                <!-- Nome do Beneficiário -->
                <div class="space-y-2">
                  <label class="text-xs font-bold uppercase tracking-wider text-slate-400"
                    :class="themeMode === 'dark' ? 'text-slate-400' : 'text-slate-500'"
                  >Nome do Beneficiário</label>
                  <Input 
                    v-model="storePixName" 
                    placeholder="Ex: Joao Silva ou Nome da Loja" 
                    class="rounded-xl w-full"
                    :class="themeMode === 'dark' ? 'bg-slate-950 border-slate-800 text-white focus:ring-primary' : 'bg-slate-100 border-slate-300 text-slate-900 focus:ring-primary'"
                  />
                  <p class="text-[10px] text-slate-500">Nome cadastrado na conta bancária (máx. 25 letras, sem acentos no QR Code).</p>
                </div>

                <!-- Cidade do Beneficiário -->
                <div class="space-y-2">
                  <label class="text-xs font-bold uppercase tracking-wider text-slate-400"
                    :class="themeMode === 'dark' ? 'text-slate-400' : 'text-slate-500'"
                  >Cidade do Beneficiário</label>
                  <Input 
                    v-model="storePixCity" 
                    placeholder="Ex: Cajuru" 
                    class="rounded-xl w-full"
                    :class="themeMode === 'dark' ? 'bg-slate-950 border-slate-800 text-white focus:ring-primary' : 'bg-slate-100 border-slate-300 text-slate-900 focus:ring-primary'"
                  />
                  <p class="text-[10px] text-slate-500">Cidade cadastrada na conta (máx. 15 letras, sem acentos no QR Code).</p>
                </div>
              </div>
            </div>

            <!-- Feedbacks -->
            <div v-if="savePixError" class="p-3 rounded-xl bg-red-950/30 border border-red-500/30 text-red-400 text-xs flex items-center gap-2 animate-shake">
              <AlertTriangle class="w-4 h-4 shrink-0" />
              <span>{{ savePixError }}</span>
            </div>

            <div v-if="savePixSuccess" class="p-3 rounded-xl bg-emerald-955/30 border border-emerald-500/30 text-emerald-450 text-xs flex items-center gap-2">
              <Check class="w-4 h-4 shrink-0" />
              <span>Configurações do Pix salvas com sucesso no banco de dados Turso!</span>
            </div>

            <!-- Ações -->
            <div class="flex justify-end pt-2 border-t"
              :class="themeMode === 'dark' ? 'border-slate-800/80' : 'border-slate-150'"
            >
              <Button 
                size="sm"
                class="rounded-xl font-bold bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg shadow-primary/20"
                :disabled="isSavingPix"
                @click="handleSavePix"
              >
                <Loader2 v-if="isSavingPix" class="w-4 h-4 animate-spin mr-1.5" />
                {{ isSavingPix ? 'Salvando...' : 'Salvar Configurações Pix' }}
              </Button>
            </div>
          </CardContent>
        </Card>

        <!-- 3. SINCRONIZAÇÃO DE BANCO DE DADOS -->
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
