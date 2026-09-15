<script setup lang="ts">
import { ref, onMounted, computed, watch } from 'vue'
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
  Wallet,
  ShieldCheck,
  ShieldAlert,
  ArrowLeft,
  ExternalLink,
  Store,
  UploadCloud,
  Trash2,
  Users,
  UserPlus,
  UserX,
  Globe,
  Copy,
  CheckCheck,
  Pipette,
  Eye,
  Contrast
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
  currentCompany, 
  currentCompanySlug,
  updateCompany,
  getStoreUrls,
  THEME_PRESETS,
  resolveThemeHex,
  getContrastTextColor,
  getRelativeLuminance,
  type ThemePreset,
  currentUser,
  isImpersonating,
  leaveImpersonation,
  fetchUsers,
  createUser,
  deleteUser,
  type Order, 
  type Product,
  type User
} from '@/services/store'
import SuperAdminDashboard from './SuperAdminDashboard.vue'
import AdminProducts from './AdminProducts.vue'
import AdminOrders from './AdminOrders.vue'
import AdminCoupons from './AdminCoupons.vue'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription, 
  DialogFooter 
} from '@/components/ui/dialog'

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

const loadStoreData = async () => {
  isLoadingStats.value = true
  try {
    // Carrega estatísticas da loja ativa em paralelo
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

    if (currentCompany.value) {
      companyNameEdit.value = currentCompany.value.name
      companyDescEdit.value = currentCompany.value.description
      companyLogoEdit.value = currentCompany.value.image_data || ''
      companySlugEdit.value = currentCompany.value.slug
      customHexInput.value = resolveThemeHex(currentCompany.value.theme_color || themeColor.value)
    }

    await loadStoreUsers()
  } catch (err) {
    console.error('Falha ao obter dados estatísticos:', err)
  } finally {
    isLoadingStats.value = false
  }
}

onMounted(async () => {
  if (currentUser.value?.role !== 'superadmin' || isImpersonating.value) {
    await loadStoreData()
  }
})

const handleImpersonateFromChild = async (_slug: string) => {
  await loadStoreData()
}

const handleExitImpersonation = () => {
  leaveImpersonation()
}

watch(isImpersonating, async (newVal) => {
  if (newVal) {
    await loadStoreData()
  }
})

watch(currentCompanySlug, async (newSlug) => {
  if (newSlug) {
    await loadStoreData()
  }
})

watch(currentCompany, (newComp) => {
  if (newComp) {
    companyNameEdit.value = newComp.name
    companyDescEdit.value = newComp.description
    companyLogoEdit.value = newComp.image_data || ''
    companySlugEdit.value = newComp.slug
    customHexInput.value = resolveThemeHex(newComp.theme_color || themeColor.value)
  }
})

const companyNameEdit = ref('')
const companySlugEdit = ref('')
const companyDescEdit = ref('')
const companyLogoEdit = ref('')
const isSavingCompany = ref(false)
const isCompressingLogo = ref(false)
const saveCompanySuccess = ref(false)
const saveCompanyError = ref('')
const copiedUrlType = ref<'subdomain' | 'path' | null>(null)

const storeUrls = computed(() => {
  const clean = companySlugEdit.value.trim().toLowerCase().replace(/[^a-z0-9-]/g, '') || currentCompanySlug.value || 'loja'
  return getStoreUrls(clean)
})

const copyToClipboard = async (text: string, type: 'subdomain' | 'path') => {
  try {
    await navigator.clipboard.writeText(text)
    copiedUrlType.value = type
    setTimeout(() => {
      copiedUrlType.value = null
    }, 2000)
  } catch (err) {
    console.error('Falha ao copiar link:', err)
  }
}

const handleSlugInput = (e: Event) => {
  const target = e.target as HTMLInputElement
  companySlugEdit.value = target.value
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, '-')
    .replace(/-+/g, '-')
}

// Compressão inteligente via Canvas HTML5 (qualquer foto de celular vira ~35KB)
const compressImage = (file: File, maxWidth = 512, maxHeight = 512, quality = 0.85): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.readAsDataURL(file)
    reader.onload = (event) => {
      const img = new Image()
      img.src = event.target?.result as string
      img.onload = () => {
        let width = img.width
        let height = img.height

        if (width > height) {
          if (width > maxWidth) {
            height = Math.round((height * maxWidth) / width)
            width = maxWidth
          }
        } else {
          if (height > maxHeight) {
            width = Math.round((width * maxHeight) / height)
            height = maxHeight
          }
        }

        const canvas = document.createElement('canvas')
        canvas.width = width
        canvas.height = height
        const ctx = canvas.getContext('2d')
        if (!ctx) {
          resolve(event.target?.result as string)
          return
        }
        ctx.drawImage(img, 0, 0, width, height)
        const compressedDataUrl = canvas.toDataURL('image/jpeg', quality)
        resolve(compressedDataUrl)
      }
      img.onerror = () => reject(new Error('Falha ao carregar a imagem.'))
    }
    reader.onerror = () => reject(new Error('Falha ao ler o arquivo de imagem.'))
  })
}

const handleLogoChange = async (event: Event) => {
  const target = event.target as HTMLInputElement
  const file = target.files?.[0]
  if (!file) return

  isCompressingLogo.value = true
  saveCompanyError.value = ''
  try {
    const compressed = await compressImage(file, 512, 512, 0.85)
    companyLogoEdit.value = compressed
  } catch (err: any) {
    console.error('Erro ao processar imagem:', err)
    saveCompanyError.value = 'Falha ao processar a imagem selecionada.'
  } finally {
    isCompressingLogo.value = false
    target.value = ''
  }
}

const handleSaveCompanyDetails = async () => {
  if (!companyNameEdit.value.trim() || !companyDescEdit.value.trim()) {
    saveCompanyError.value = 'Por favor, preencha o nome e a descrição da empresa.'
    return
  }

  const cleanSlug = companySlugEdit.value.trim().toLowerCase().replace(/[^a-z0-9-]/g, '')
  if (!cleanSlug || cleanSlug.length < 2) {
    saveCompanyError.value = 'A rota/subdomínio da loja deve ter pelo menos 2 caracteres (apenas letras minúsculas, números e hífens).'
    return
  }

  isSavingCompany.value = true
  saveCompanyError.value = ''
  saveCompanySuccess.value = false
  try {
    if (currentCompany.value) {
      const oldSlug = currentCompany.value.slug
      const updated = {
        ...currentCompany.value,
        slug: cleanSlug,
        name: companyNameEdit.value.trim(),
        description: companyDescEdit.value.trim(),
        image_data: companyLogoEdit.value || undefined
      }
      await updateCompany(updated, oldSlug)
      currentCompany.value = updated
      currentCompanySlug.value = cleanSlug
      companySlugEdit.value = cleanSlug
      saveCompanySuccess.value = true
      setTimeout(() => {
        saveCompanySuccess.value = false
      }, 3000)
    }
  } catch (e: any) {
    console.error(e)
    saveCompanyError.value = e.message || 'Erro ao salvar os dados da empresa.'
  } finally {
    isSavingCompany.value = false
  }
}

// Gestão de Equipe / Usuários da Loja
const storeUsersList = ref<User[]>([])
const isLoadingStoreUsers = ref(false)
const showAddStoreUserModal = ref(false)
const newStoreUserName = ref('')
const newStoreUserUsername = ref('')
const newStoreUserPass = ref('')
const isAddingStoreUser = ref(false)
const storeUserError = ref('')
const storeUserSuccess = ref('')

const loadStoreUsers = async () => {
  const slug = currentCompanySlug.value
  if (!slug) return
  isLoadingStoreUsers.value = true
  try {
    storeUsersList.value = await fetchUsers(slug)
  } catch (e) {
    console.error('Erro ao carregar usuários da loja:', e)
  } finally {
    isLoadingStoreUsers.value = false
  }
}

const handleAddStoreUser = async () => {
  if (!newStoreUserName.value.trim() || !newStoreUserUsername.value.trim() || !newStoreUserPass.value) {
    storeUserError.value = 'Por favor, preencha todos os campos.'
    return
  }

  isAddingStoreUser.value = true
  storeUserError.value = ''
  storeUserSuccess.value = ''

  try {
    await createUser({
      name: newStoreUserName.value.trim(),
      username: newStoreUserUsername.value.trim(),
      password: newStoreUserPass.value,
      role: 'store_admin',
      company_slug: currentCompanySlug.value
    })

    storeUserSuccess.value = 'Usuário cadastrado com sucesso!'
    newStoreUserName.value = ''
    newStoreUserUsername.value = ''
    newStoreUserPass.value = ''
    await loadStoreUsers()
    setTimeout(() => {
      showAddStoreUserModal.value = false
      storeUserSuccess.value = ''
    }, 1500)
  } catch (e: any) {
    storeUserError.value = e.message || 'Erro ao criar usuário.'
  } finally {
    isAddingStoreUser.value = false
  }
}

const handleDeleteStoreUser = async (user: User) => {
  if (!user.id) return
  if (!confirm(`Deseja realmente remover o usuário "${user.username}" desta loja?`)) return
  try {
    await deleteUser(user.id)
    await loadStoreUsers()
  } catch (e: any) {
    alert(e.message || 'Erro ao remover usuário.')
  }
}

const handleSetThemeColor = async (color: string) => {
  setThemeColor(color)
  try {
    if (currentCompany.value) {
      const updated = {
        ...currentCompany.value,
        theme_color: color
      }
      await updateCompany(updated)
      currentCompany.value = updated
    }
  } catch (e) {
    console.error('Falha ao persistir cor do tema no banco:', e)
  }
}

// Configurações do Color Picker e Paletas Avançadas
const customHexInput = ref(resolveThemeHex(themeColor.value))
const selectedColorCategory = ref<'todas' | 'luxo' | 'alimentos' | 'moderno' | 'natureza' | 'minimalista'>('todas')
const hexInputError = ref('')
const colorSaveSuccess = ref(false)

const colorCategories = [
  { id: 'todas', label: 'Todas as Cores' },
  { id: 'luxo', label: 'Luxo & Vinhos' },
  { id: 'alimentos', label: 'Gastronomia & Fast-food' },
  { id: 'moderno', label: 'Tech & Moderno' },
  { id: 'natureza', label: 'Natureza & Saúde' },
  { id: 'minimalista', label: 'Minimalista & Urbano' },
] as const

const filteredPresets = computed(() => {
  if (selectedColorCategory.value === 'todas') {
    return THEME_PRESETS
  }
  return THEME_PRESETS.filter(p => p.category === selectedColorCategory.value)
})

const activeThemeHex = computed(() => resolveThemeHex(themeColor.value))
const activeThemeTextColor = computed(() => getContrastTextColor(activeThemeHex.value))
const activeThemeLuminance = computed(() => Math.round(getRelativeLuminance(activeThemeHex.value) * 100))

// Aplica preset selecionado
const handleSelectPreset = async (preset: ThemePreset) => {
  customHexInput.value = preset.hex
  hexInputError.value = ''
  await handleSetThemeColor(preset.id)
  colorSaveSuccess.value = true
  setTimeout(() => { colorSaveSuccess.value = false }, 2500)
}

// Aplica cor personalizada via digitação ou botão
const handleApplyCustomColor = async (hexToApply?: string) => {
  let hex = (hexToApply || customHexInput.value || '').trim()
  if (!hex.startsWith('#')) hex = `#${hex}`
  hexInputError.value = ''
  
  if (!/^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/.test(hex)) {
    hexInputError.value = 'Código HEX inválido. Use o formato #RRGGBB (ex: #10B981, #EC4899).'
    return
  }

  const normalized = hex.toUpperCase()
  customHexInput.value = normalized
  await handleSetThemeColor(normalized)
  colorSaveSuccess.value = true
  setTimeout(() => { colorSaveSuccess.value = false }, 2500)
}

// Quando o usuário escolhe cor na paleta nativa do navegador
const handleNativeColorInput = async (e: Event) => {
  const target = e.target as HTMLInputElement
  if (target.value) {
    const val = target.value.toUpperCase()
    customHexInput.value = val
    hexInputError.value = ''
    await handleSetThemeColor(val)
    colorSaveSuccess.value = true
    setTimeout(() => { colorSaveSuccess.value = false }, 2500)
  }
}

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
  <div class="w-full">
    <!-- 1. Painel Master para o Super Admin (quando não estiver operando dentro de uma loja específica) -->
    <SuperAdminDashboard 
      v-if="currentUser?.role === 'superadmin' && !isImpersonating" 
      @impersonate="handleImpersonateFromChild"
    />

    <!-- 2. Painel da Loja Ativa (Lojista ou Super Admin operando como loja) -->
    <div v-else class="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
    <!-- Banner Superior de Modo Super Admin (quando estiver operando em uma loja) -->
    <div 
      v-if="currentUser?.role === 'superadmin' && isImpersonating" 
      class="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex flex-col sm:flex-row items-center justify-between gap-3 text-amber-600 dark:text-amber-400"
    >
      <div class="flex items-center gap-2.5">
        <ShieldAlert class="w-5 h-5 shrink-0 text-amber-500" />
        <span class="text-xs sm:text-sm font-bold">
          Modo Super Admin: Visualizando a loja <strong>{{ currentCompany?.name }}</strong> (<code>/{{ currentCompany?.slug }}</code>)
        </span>
      </div>
      <Button 
        @click="handleExitImpersonation" 
        size="sm" 
        variant="outline" 
        class="border-amber-500/30 hover:bg-amber-500/10 text-amber-600 dark:text-amber-400 font-bold rounded-xl flex items-center gap-1.5 shrink-0"
      >
        <ArrowLeft class="w-4 h-4" />
        <span>Voltar ao Painel Master</span>
      </Button>
    </div>

    <!-- Header Admin -->
    <div class="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b pb-5"
      :class="themeMode === 'dark' ? 'border-slate-900' : 'border-slate-200'"
    >
      <div class="space-y-1">
        <div class="flex items-center gap-3">
          <h1 class="text-2xl md:text-3xl font-extrabold flex items-center gap-2.5"
            :class="themeMode === 'dark' ? 'text-slate-100' : 'text-slate-900'"
          >
            <Boxes class="w-7 h-7 text-primary" />
            <span>{{ currentCompany ? currentCompany.name : 'Painel de Controle' }}</span>
          </h1>
          <a 
            v-if="currentCompany" 
            :href="`/${currentCompany.slug}`" 
            target="_blank" 
            class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-primary/30 bg-primary/5 hover:bg-primary/10 text-xs font-bold text-primary transition-all shadow-sm"
            title="Abrir Catálogo da Loja"
          >
            <Globe class="w-3.5 h-3.5" />
            <span class="font-mono text-[11px]">{{ currentCompany.slug }}.{{ storeUrls.rootDomain }}</span>
            <ExternalLink class="w-3 h-3 opacity-70" />
          </a>
        </div>
        <p class="text-xs md:text-sm"
          :class="themeMode === 'dark' ? 'text-slate-400' : 'text-slate-600'"
        >
          Acompanhe o faturamento, controle seu estoque e processe pedidos da sua loja.
        </p>
      </div>

      <!-- Conectividade Tag -->
      <div class="flex items-center gap-2 border px-4 py-2 rounded-2xl self-start text-xs font-semibold"
        :class="themeMode === 'dark' ? 'bg-slate-900/60 border-slate-800' : 'bg-white border-slate-200 shadow-sm'"
      >
        <Database class="w-4 h-4" :class="isDbConnected ? 'text-emerald-500' : 'text-amber-500'" />
        <span class="text-slate-400" :class="themeMode === 'dark' ? 'text-slate-400' : 'text-slate-500'">Banco de Dados:</span>
        <span class="font-bold" :class="isDbConnected ? 'text-emerald-500' : 'text-amber-500'">
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
        
        <!-- 0. IDENTIDADE DA LOJA -->
        <Card class="rounded-2xl shadow-xl transition-colors duration-300 relative overflow-hidden"
          :class="themeMode === 'dark' ? 'bg-slate-900/30 border-slate-900' : 'bg-white border-slate-200'"
        >
          <CardHeader class="border-b pb-4" :class="themeMode === 'dark' ? 'border-slate-800/80' : 'border-slate-100'">
            <CardTitle class="text-xl font-extrabold flex items-center gap-2"
              :class="themeMode === 'dark' ? 'text-slate-100' : 'text-slate-900'"
            >
              <Sparkles class="w-5 h-5 text-primary" />
              Identidade da Loja
            </CardTitle>
            <p class="text-slate-400 text-xs mt-1">
              Configure o nome e a descrição pública da sua empresa. Estes dados serão exibidos no cabeçalho e no banner principal do seu catálogo de produtos.
            </p>
          </CardHeader>
          
          <CardContent class="p-6 space-y-5">
            <!-- Logotipo / Foto da Loja -->
            <div class="space-y-2">
              <label class="text-xs font-bold uppercase tracking-wider text-slate-400">Logotipo / Foto da Loja</label>
              
              <div class="flex flex-col sm:flex-row items-start sm:items-center gap-5 p-4 rounded-2xl border"
                :class="themeMode === 'dark' ? 'bg-slate-950/50 border-slate-800' : 'bg-slate-50 border-slate-200'"
              >
                <!-- Preview Visual da Logo -->
                <div class="relative group shrink-0">
                  <div class="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl border-2 border-primary/40 flex items-center justify-center text-white text-2xl font-black bg-gradient-to-tr from-brand-start to-brand-end shadow-md overflow-hidden transition-transform duration-300 group-hover:scale-105">
                    <img 
                      v-if="companyLogoEdit" 
                      :src="companyLogoEdit" 
                      alt="Logo da Loja" 
                      class="w-full h-full object-cover"
                    />
                    <span v-else>{{ companyNameEdit ? companyNameEdit.charAt(0) : 'L' }}</span>
                  </div>
                </div>

                <!-- Ações e Orientações de Upload -->
                <div class="space-y-2 flex-1">
                  <div class="flex flex-wrap items-center gap-2.5">
                    <label class="cursor-pointer inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm transition-all">
                      <Loader2 v-if="isCompressingLogo" class="w-4 h-4 animate-spin" />
                      <UploadCloud v-else class="w-4 h-4" />
                      <span>{{ isCompressingLogo ? 'Otimizando Imagem...' : (companyLogoEdit ? 'Alterar Foto' : 'Enviar Foto da Loja') }}</span>
                      <input 
                        type="file" 
                        accept="image/png, image/jpeg, image/webp, image/svg+xml" 
                        class="hidden" 
                        :disabled="isCompressingLogo"
                        @change="handleLogoChange" 
                      />
                    </label>

                    <Button 
                      v-if="companyLogoEdit"
                      type="button"
                      variant="outline"
                      size="sm"
                      class="rounded-xl border-red-500/30 text-red-500 hover:bg-red-500/10 text-xs font-bold flex items-center gap-1.5"
                      @click="companyLogoEdit = ''"
                    >
                      <Trash2 class="w-3.5 h-3.5" />
                      <span>Remover Foto</span>
                    </Button>
                  </div>
                  <p class="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                    Selecione a logo ou foto representativa do seu estabelecimento. O arquivo é automaticamente redimensionado e comprimido para carregamento instantâneo no catálogo e cabeçalho.
                  </p>
                </div>
              </div>
            </div>

            <div class="space-y-1.5">
              <label class="text-xs font-bold uppercase tracking-wider text-slate-400">Nome da Empresa</label>
              <Input 
                v-model="companyNameEdit" 
                placeholder="Ex: Minha Loja" 
                class="rounded-xl w-full"
                :class="themeMode === 'dark' ? 'bg-slate-950 border-slate-800 text-white' : 'bg-slate-100 border-slate-300 text-slate-900'"
              />
            </div>

            <!-- ROTA DA LOJA (SUBDOMÍNIO / SLUG PERSONALIZADO) -->
            <div class="space-y-3 pt-1">
              <div class="space-y-1">
                <div class="flex items-center justify-between">
                  <label class="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                    <Globe class="w-3.5 h-3.5 text-primary" />
                    <span>Rota &amp; Subdomínio da Loja</span>
                  </label>
                  <span class="text-[10px] font-mono text-primary font-bold">
                    {{ companySlugEdit }}.{{ storeUrls.rootDomain }}
                  </span>
                </div>
                <div class="relative">
                  <span class="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 font-mono font-bold">
                    subdomain /
                  </span>
                  <Input 
                    :value="companySlugEdit"
                    @input="handleSlugInput"
                    placeholder="Ex: pizzahot, jotaburger, tabacariadrake, etc..." 
                    class="rounded-xl pl-24 font-mono text-xs w-full"
                    :class="themeMode === 'dark' ? 'bg-slate-950 border-slate-800 text-white' : 'bg-slate-100 border-slate-300 text-slate-900'"
                  />
                </div>
                <p class="text-[11px] text-slate-500 dark:text-slate-400">
                  Identificador exclusivo da sua loja na web. Digite apenas letras minúsculas, números e hífens. Ex: <strong class="text-primary font-mono">smoketabacaria</strong>, <strong class="text-primary font-mono">pizzahot</strong>, <strong class="text-primary font-mono">jotaburguer</strong>, <strong class="text-primary font-mono">lojadonamaria</strong>.
                </p>
              </div>

              <!-- Visual Preview dos Links Gerados -->
              <div class="p-4 rounded-2xl border space-y-3"
                :class="themeMode === 'dark' ? 'bg-slate-950/60 border-slate-800/80' : 'bg-slate-50/80 border-slate-200'"
              >
                <div class="flex items-center justify-between">
                  <span class="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                    Links de Acesso dos seus Clientes
                  </span>
                  <span class="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-500">
                    Dual-Route Ativo
                  </span>
                </div>

                <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <!-- 1. Subdomínio Principal -->
                  <div class="p-3.5 rounded-xl border flex flex-col justify-between gap-2.5 transition-all"
                    :class="themeMode === 'dark' ? 'bg-slate-900/70 border-primary/30 shadow-sm' : 'bg-white border-primary/30 shadow-sm'"
                  >
                    <div>
                      <div class="flex items-center justify-between gap-1 mb-1">
                        <span class="text-[11px] font-extrabold text-primary flex items-center gap-1">
                          <Globe class="w-3 h-3" />
                          <span>Subdomínio Oficial</span>
                        </span>
                        <span class="text-[9px] font-bold px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-500">
                          Recomendado
                        </span>
                      </div>
                      <div class="font-mono text-xs font-bold break-all text-slate-800 dark:text-slate-200">
                        https://{{ storeUrls.subdomainUrl }}
                      </div>
                      <p class="text-[10px] text-slate-400 mt-1">
                        Formato ideal para divulgação no Instagram, bio e anúncios.
                      </p>
                    </div>

                    <div class="flex items-center gap-2 pt-1">
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        class="h-7 text-[11px] rounded-lg font-semibold flex items-center gap-1 flex-1"
                        @click="copyToClipboard(storeUrls.fullSubdomainUrl, 'subdomain')"
                      >
                        <CheckCheck v-if="copiedUrlType === 'subdomain'" class="w-3 h-3 text-emerald-500" />
                        <Copy v-else class="w-3 h-3" />
                        <span>{{ copiedUrlType === 'subdomain' ? 'Copiado!' : 'Copiar Link' }}</span>
                      </Button>

                      <a
                        :href="storeUrls.fullSubdomainUrl"
                        target="_blank"
                        class="inline-flex items-center justify-center h-7 px-2.5 rounded-lg border border-border text-[11px] font-semibold hover:text-primary transition-colors shrink-0"
                        title="Testar Subdomínio"
                      >
                        <ExternalLink class="w-3 h-3" />
                      </a>
                    </div>
                  </div>

                  <!-- 2. Caminho Direto -->
                  <div class="p-3.5 rounded-xl border flex flex-col justify-between gap-2.5 transition-all"
                    :class="themeMode === 'dark' ? 'bg-slate-900/40 border-slate-800' : 'bg-white border-slate-200'"
                  >
                    <div>
                      <div class="flex items-center justify-between gap-1 mb-1">
                        <span class="text-[11px] font-bold text-slate-400">
                          Link Direto (Caminho)
                        </span>
                        <span class="text-[9px] font-mono text-slate-400">
                          Universal
                        </span>
                      </div>
                      <div class="font-mono text-xs font-bold break-all text-slate-700 dark:text-slate-300">
                        {{ storeUrls.pathUrl }}
                      </div>
                      <p class="text-[10px] text-slate-400 mt-1">
                        Funciona em qualquer rede ou conexão sem configuração extra.
                      </p>
                    </div>

                    <div class="flex items-center gap-2 pt-1">
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        class="h-7 text-[11px] rounded-lg font-semibold flex items-center gap-1 flex-1"
                        @click="copyToClipboard(storeUrls.fullPathUrl, 'path')"
                      >
                        <CheckCheck v-if="copiedUrlType === 'path'" class="w-3 h-3 text-emerald-500" />
                        <Copy v-else class="w-3 h-3" />
                        <span>{{ copiedUrlType === 'path' ? 'Copiado!' : 'Copiar Link' }}</span>
                      </Button>

                      <a
                        :href="storeUrls.pathUrl"
                        target="_blank"
                        class="inline-flex items-center justify-center h-7 px-2.5 rounded-lg border border-border text-[11px] font-semibold hover:text-primary transition-colors shrink-0"
                        title="Testar Link Direto"
                      >
                        <ExternalLink class="w-3 h-3" />
                      </a>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            
            <div class="space-y-1.5">
              <label class="text-xs font-bold uppercase tracking-wider text-slate-405">Descrição / Slogan</label>
              <Textarea 
                v-model="companyDescEdit" 
                placeholder="Ex: O melhor lugar para comprar X." 
                rows="3"
                class="rounded-xl w-full"
                :class="themeMode === 'dark' ? 'bg-slate-950 border-slate-800 text-white' : 'bg-slate-100 border-slate-300 text-slate-900'"
              />
            </div>

            <!-- Alertas de Feedback da Identidade -->
            <div v-if="saveCompanyError" class="p-3 rounded-xl bg-red-950/30 border border-red-500/30 text-red-400 text-xs flex items-center gap-2 animate-shake">
              <AlertCircle class="w-4 h-4 shrink-0" />
              <span>{{ saveCompanyError }}</span>
            </div>

            <div v-if="saveCompanySuccess" class="p-3 rounded-xl bg-emerald-955/30 border border-emerald-500/30 text-emerald-400 text-xs flex items-center gap-2">
              <Check class="w-4 h-4 shrink-0" />
              <span>Identidade e foto da loja atualizadas com sucesso!</span>
            </div>

            <!-- Botão Salvar Identidade -->
            <div class="flex justify-end pt-2">
              <Button 
                class="rounded-xl bg-primary text-primary-foreground font-bold"
                :disabled="isSavingCompany || isCompressingLogo"
                @click="handleSaveCompanyDetails"
              >
                <Loader2 v-if="isSavingCompany" class="w-4 h-4 animate-spin mr-1.5" />
                <span>Salvar Identidade</span>
              </Button>
            </div>
          </CardContent>
        </Card>

        <!-- 0.5 EQUIPE & ACESSOS DA LOJA -->
        <Card class="rounded-2xl shadow-xl transition-colors duration-300 relative overflow-hidden"
          :class="themeMode === 'dark' ? 'bg-slate-900/30 border-slate-900' : 'bg-white border-slate-200'"
        >
          <CardHeader class="border-b pb-4 flex flex-row items-center justify-between" :class="themeMode === 'dark' ? 'border-slate-800/80' : 'border-slate-100'">
            <div>
              <CardTitle class="text-xl font-extrabold flex items-center gap-2"
                :class="themeMode === 'dark' ? 'text-slate-100' : 'text-slate-900'"
              >
                <Users class="w-5 h-5 text-primary" />
                Equipe & Acessos da Loja
              </CardTitle>
              <p class="text-slate-400 text-xs mt-1">
                Gerencie quem pode acessar o painel desta loja (gerentes, atendentes e lojistas).
              </p>
            </div>

            <Button 
              size="sm"
              class="rounded-xl font-bold text-xs bg-primary text-primary-foreground flex items-center gap-1.5"
              @click="showAddStoreUserModal = true"
            >
              <UserPlus class="w-4 h-4" />
              <span>Novo Usuário</span>
            </Button>
          </CardHeader>

          <CardContent class="p-6 space-y-4">
            <div v-if="isLoadingStoreUsers" class="py-6 text-center text-xs text-slate-400">
              <Loader2 class="w-5 h-5 animate-spin mx-auto text-primary" />
              <p class="mt-1">Carregando usuários da loja...</p>
            </div>

            <div v-else-if="storeUsersList.length === 0" class="py-6 text-center text-xs text-slate-400">
              Nenhum usuário cadastrado para esta loja ainda.
            </div>

            <div v-else class="divide-y divide-border/40">
              <div 
                v-for="u in storeUsersList" 
                :key="u.id" 
                class="py-3 flex items-center justify-between gap-3 text-xs"
              >
                <div class="flex items-center gap-2.5">
                  <div class="w-8 h-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-bold">
                    {{ u.name.charAt(0) }}
                  </div>
                  <div>
                    <div class="font-bold text-sm">{{ u.name }}</div>
                    <div class="text-slate-400 font-mono text-[11px]">@{{ u.username }}</div>
                  </div>
                </div>

                <div class="flex items-center gap-3">
                  <span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-primary/10 text-primary">
                    {{ u.role === 'superadmin' ? 'Super Admin' : 'Lojista' }}
                  </span>

                  <Button 
                    variant="ghost" 
                    size="icon" 
                    class="h-7 w-7 text-red-500 hover:bg-red-500/10 rounded-lg"
                    @click="handleDeleteStoreUser(u)"
                    title="Remover Acesso"
                  >
                    <Trash2 class="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>
            </div>

            <!-- Modal de Cadastro de Usuário para a Loja -->
            <Dialog :open="showAddStoreUserModal" @update:open="showAddStoreUserModal = $event">
              <DialogContent class="max-w-md rounded-3xl">
                <DialogHeader>
                  <DialogTitle class="text-lg font-black flex items-center gap-2">
                    <UserPlus class="w-5 h-5 text-primary" />
                    <span>Adicionar Usuário para {{ currentCompany?.name }}</span>
                  </DialogTitle>
                  <DialogDescription class="text-xs text-slate-400">
                    Crie um login de acesso exclusivo para esta loja.
                  </DialogDescription>
                </DialogHeader>

                <form @submit.prevent="handleAddStoreUser" class="space-y-4 pt-2">
                  <div class="space-y-1">
                    <label class="text-xs font-semibold">Nome Completo *</label>
                    <Input 
                      v-model="newStoreUserName" 
                      placeholder="Ex: Carlos Oliveira" 
                      required 
                      class="rounded-xl"
                    />
                  </div>

                  <div class="space-y-1">
                    <label class="text-xs font-semibold">Nome de Usuário (Login) *</label>
                    <div class="relative">
                      <span class="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 font-mono">@</span>
                      <Input 
                        v-model="newStoreUserUsername" 
                        placeholder="carlos" 
                        required 
                        class="rounded-xl pl-7 font-mono text-xs"
                      />
                    </div>
                    <p class="text-[10px] text-slate-400">Identificador único sem espaços para login.</p>
                  </div>

                  <div class="space-y-1">
                    <label class="text-xs font-semibold">Senha de Acesso *</label>
                    <Input 
                      v-model="newStoreUserPass" 
                      type="password"
                      placeholder="••••••••" 
                      required 
                      class="rounded-xl"
                    />
                  </div>

                  <div v-if="storeUserError" class="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-500 text-xs flex items-center gap-2">
                    <AlertTriangle class="w-4 h-4 shrink-0" />
                    <span>{{ storeUserError }}</span>
                  </div>

                  <div v-if="storeUserSuccess" class="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 text-xs">
                    {{ storeUserSuccess }}
                  </div>

                  <DialogFooter class="pt-2">
                    <Button 
                      type="button" 
                      variant="outline" 
                      @click="showAddStoreUserModal = false"
                      class="rounded-xl"
                    >
                      Cancelar
                    </Button>
                    <Button 
                      type="submit" 
                      :disabled="isAddingStoreUser"
                      class="rounded-xl bg-primary text-primary-foreground font-bold"
                    >
                      <Loader2 v-if="isAddingStoreUser" class="w-4 h-4 animate-spin mr-1.5" />
                      <span>Cadastrar Usuário</span>
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          </CardContent>
        </Card>

        <!-- 1. PERSONALIZAÇÃO VISUAL, CORES & ACESSIBILIDADE -->
        <Card class="rounded-2xl shadow-xl transition-colors duration-300 relative overflow-hidden"
          :class="themeMode === 'dark' ? 'bg-slate-900/30 border-slate-900' : 'bg-white border-slate-200'"
        >
          <CardHeader class="border-b pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3" 
            :class="themeMode === 'dark' ? 'border-slate-800/80' : 'border-slate-100'"
          >
            <div>
              <CardTitle class="text-xl font-extrabold flex items-center gap-2"
                :class="themeMode === 'dark' ? 'text-slate-100' : 'text-slate-900'"
              >
                <Palette class="w-5 h-5 text-primary" />
                <span>Identidade Visual &amp; Cores da Loja</span>
              </CardTitle>
              <p class="text-slate-400 text-xs mt-1">
                Escolha uma das paletas de tendência curadas para o seu nicho ou use o seletor livre para escolher qualquer tom. As cores de texto dos botões se adaptam automaticamente para contraste e acessibilidade.
              </p>
            </div>

            <!-- Badge da Cor Atual Ativa -->
            <div class="flex items-center gap-2.5 px-3.5 py-1.5 rounded-xl border self-start sm:self-auto shrink-0 shadow-sm"
              :class="themeMode === 'dark' ? 'bg-slate-950/70 border-slate-800' : 'bg-slate-50 border-slate-200'"
            >
              <div 
                class="w-5 h-5 rounded-full border border-black/10 shadow-sm shrink-0"
                :style="{ backgroundColor: activeThemeHex }"
              />
              <div class="text-left font-mono">
                <div class="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Cor Ativa</div>
                <div class="text-xs font-black">{{ activeThemeHex }}</div>
              </div>
            </div>
          </CardHeader>
          
          <CardContent class="p-6 space-y-7">
            <!-- SELETOR LIVRE DE COR (COLOR PICKER & HEX) -->
            <div class="p-5 rounded-2xl border space-y-3.5 transition-all"
              :class="themeMode === 'dark' ? 'bg-slate-950/60 border-slate-800' : 'bg-slate-50/70 border-slate-200'"
            >
              <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div class="space-y-0.5">
                  <div class="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                    <Pipette class="w-3.5 h-3.5 text-primary" />
                    <span>Seletor de Cor Livre (Qualquer Tom)</span>
                  </div>
                  <p class="text-[11px] text-slate-500 dark:text-slate-400">
                    Clique no círculo para abrir a paleta de cores ou digite diretamente o código hexadecimal desejado.
                  </p>
                </div>

                <span class="text-[10px] font-bold px-2 py-0.5 rounded-full bg-primary/10 text-primary self-start sm:self-auto font-mono">
                  Personalização Total
                </span>
              </div>

              <div class="flex flex-wrap items-center gap-3 pt-1">
                <!-- Seletor Visual Nativo Disfarçado -->
                <div class="relative flex items-center">
                  <input 
                    type="color" 
                    :value="activeThemeHex"
                    @input="handleNativeColorInput"
                    id="nativeColorPicker"
                    class="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                    title="Clique para abrir o Color Picker"
                  />
                  <button 
                    type="button" 
                    class="w-11 h-11 rounded-2xl border-2 border-white shadow-md flex items-center justify-center transition-transform hover:scale-105 active:scale-95 relative overflow-hidden"
                    :style="{ backgroundColor: activeThemeHex }"
                  >
                    <Pipette class="w-4 h-4 drop-shadow" :style="{ color: activeThemeTextColor }" />
                  </button>
                </div>

                <!-- Input de Código HEX -->
                <div class="relative flex-1 min-w-[170px] max-w-xs">
                  <span class="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 font-mono font-bold">#</span>
                  <Input 
                    v-model="customHexInput"
                    placeholder="Ex: 10B981 ou #10B981"
                    maxlength="7"
                    class="pl-7 font-mono text-xs uppercase font-bold rounded-xl h-11"
                    :class="themeMode === 'dark' ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-300 text-slate-900'"
                    @keyup.enter="handleApplyCustomColor()"
                  />
                </div>

                <Button 
                  type="button"
                  class="rounded-xl font-bold text-xs h-11 px-5 bg-primary text-primary-foreground shadow-sm"
                  @click="handleApplyCustomColor()"
                >
                  <Check class="w-4 h-4 mr-1.5" />
                  <span>Aplicar Tom</span>
                </Button>
              </div>

              <div v-if="hexInputError" class="p-2.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-500 text-xs flex items-center gap-2">
                <AlertCircle class="w-4 h-4 shrink-0" />
                <span>{{ hexInputError }}</span>
              </div>
            </div>

            <!-- FILTRO DE PALETAS POR NICHO / SEGMENTO -->
            <div class="space-y-3">
              <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div class="space-y-0.5">
                  <span class="text-xs font-bold uppercase tracking-wider text-slate-400">Paletas de Tendência Curadas</span>
                  <p class="text-[10px] text-slate-500">Cores modernas, harmoniosas e elegantes desenhadas para diferentes nichos comerciais.</p>
                </div>

                <!-- Chips de Categoria -->
                <div class="flex items-center gap-1.5 overflow-x-auto pb-1 max-w-full">
                  <button 
                    v-for="cat in colorCategories" 
                    :key="cat.id"
                    type="button"
                    class="px-2.5 py-1 rounded-lg text-[11px] font-semibold whitespace-nowrap transition-all border"
                    :class="selectedColorCategory === cat.id 
                      ? 'bg-primary text-primary-foreground border-primary shadow-sm' 
                      : (themeMode === 'dark' ? 'bg-slate-950/60 border-slate-800 text-slate-400 hover:text-white' : 'bg-slate-100 border-slate-200 text-slate-600 hover:text-slate-900')"
                    @click="selectedColorCategory = cat.id"
                  >
                    {{ cat.label }}
                  </button>
                </div>
              </div>

              <!-- Grid de Presets -->
              <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 pt-1">
                <button 
                  v-for="preset in filteredPresets" 
                  :key="preset.id"
                  type="button"
                  class="p-3.5 rounded-2xl border text-left flex items-center gap-3 transition-all relative overflow-hidden group hover:scale-[1.02]"
                  :class="[
                    (themeColor === preset.id || activeThemeHex === preset.hex)
                      ? 'border-primary shadow-md ring-2 ring-primary/20 ' + (themeMode === 'dark' ? 'bg-slate-900' : 'bg-white')
                      : (themeMode === 'dark' ? 'bg-slate-950/40 border-slate-800/80 hover:bg-slate-900/60' : 'bg-slate-50/70 border-slate-200 hover:bg-white')
                  ]"
                  @click="handleSelectPreset(preset)"
                >
                  <!-- Círculo da Cor -->
                  <div 
                    class="w-10 h-10 rounded-xl border flex items-center justify-center shrink-0 shadow-sm transition-transform group-hover:scale-110"
                    :style="{ backgroundColor: preset.hex, borderColor: 'rgba(0,0,0,0.1)' }"
                  >
                    <Check 
                      v-if="themeColor === preset.id || activeThemeHex === preset.hex" 
                      class="w-5 h-5 stroke-[2.5]" 
                      :style="{ color: getContrastTextColor(preset.hex) }"
                    />
                  </div>

                  <!-- Título & Subtítulo -->
                  <div class="min-w-0 flex-1">
                    <div class="font-bold text-xs truncate flex items-center justify-between gap-1">
                      <span>{{ preset.name }}</span>
                      <span class="font-mono text-[9px] text-slate-400">{{ preset.hex }}</span>
                    </div>
                    <p class="text-[10px] text-slate-400 truncate mt-0.5">
                      {{ preset.subtitle }}
                    </p>
                  </div>
                </button>
              </div>
            </div>

            <!-- DEMONSTRAÇÃO EM TEMPO REAL & ACESSIBILIDADE WCAG -->
            <div class="p-5 rounded-2xl border space-y-3.5"
              :class="themeMode === 'dark' ? 'bg-slate-950/80 border-slate-800' : 'bg-gradient-to-br from-slate-50 to-white border-slate-200'"
            >
              <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b pb-3"
                :class="themeMode === 'dark' ? 'border-slate-800/80' : 'border-slate-100'"
              >
                <div class="space-y-0.5">
                  <div class="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                    <Contrast class="w-3.5 h-3.5 text-primary" />
                    <span>Demonstração ao Vivo &amp; Acessibilidade (WCAG 2.1)</span>
                  </div>
                  <p class="text-[11px] text-slate-500 dark:text-slate-400">
                    Veja exatamente como os elementos aparecerão para os clientes na loja virtual.
                  </p>
                </div>

                <div class="flex items-center gap-2">
                  <!-- Tag de Contraste Automático -->
                  <div class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold"
                    :class="activeThemeTextColor === '#ffffff' ? 'bg-slate-800 text-white' : 'bg-slate-200 text-slate-900'"
                  >
                    <div class="w-2 h-2 rounded-full" :class="activeThemeTextColor === '#ffffff' ? 'bg-white' : 'bg-slate-950'" />
                    <span>Texto {{ activeThemeTextColor === '#ffffff' ? 'Branco' : 'Preto' }} Automático</span>
                  </div>
                </div>
              </div>

              <!-- Exemplos de Componentes com a Cor Escolhida -->
              <div class="flex flex-wrap items-center gap-3 pt-1">
                <!-- Amostra de Botão de Ação -->
                <button 
                  type="button"
                  class="px-5 py-2.5 rounded-xl font-bold text-xs shadow-md transition-transform hover:scale-105 active:scale-95 flex items-center gap-2"
                  :style="{ backgroundColor: activeThemeHex, color: activeThemeTextColor }"
                >
                  <ShoppingBag class="w-4 h-4" />
                  <span>Adicionar ao Carrinho</span>
                </button>

                <!-- Amostra de Badge de Destaque -->
                <span 
                  class="px-3 py-1 rounded-full text-xs font-bold shadow-sm"
                  :style="{ backgroundColor: activeThemeHex, color: activeThemeTextColor }"
                >
                  20% OFF
                </span>

                <!-- Amostra de Categoria Ativa -->
                <span 
                  class="px-3.5 py-1.5 rounded-xl text-xs font-semibold"
                  :style="{ 
                    backgroundColor: activeThemeHex + '18', 
                    color: activeThemeHex,
                    border: '1px solid ' + activeThemeHex + '40'
                  }"
                >
                  Categoria Ativa
                </span>

                <!-- Link / Tag de Apoio -->
                <div class="text-[11px] text-slate-400 font-medium ml-auto flex items-center gap-1.5">
                  <Check class="w-3.5 h-3.5 text-emerald-500" />
                  <span>Aprovado para Leitura em Qualquer Tela</span>
                </div>
              </div>

              <div v-if="colorSaveSuccess" class="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 text-xs flex items-center gap-2 animate-in fade-in">
                <Check class="w-4 h-4 shrink-0" />
                <span>Identidade visual e cor da loja atualizadas com sucesso!</span>
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

        <!-- 3. SINCRONIZAÇÃO DE BANCO DE DADOS (APENAS SUPER ADMIN) -->
        <Card v-if="currentUser?.role === 'superadmin'" class="rounded-2xl shadow-xl transition-colors duration-300 relative overflow-hidden"
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
  </div>
</template>
