<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { 
  Store, 
  Plus, 
  ArrowRight, 
  Sparkles, 
  Loader2, 
  AlertCircle,
  Check,
  Building,
  Lock,
  ExternalLink,
  ShieldCheck,
  User,
  Pipette
} from 'lucide-vue-next'
import { 
  fetchCompanies, 
  registerStoreAndAdmin, 
  themeMode,
  THEME_PRESETS,
  resolveThemeHex,
  getContrastTextColor,
  type Company 
} from '@/services/store'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card'
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription,
  DialogTrigger,
  DialogFooter 
} from '@/components/ui/dialog'

const router = useRouter()

const companiesList = ref<Company[]>([])
const isLoading = ref(true)

// Cadastro de Nova Empresa + Lojista
const showAddDialog = ref(false)
const newName = ref('')
const newSlug = ref('')
const newDescription = ref('')
const newColor = ref('gold')
const ownerName = ref('')
const ownerUsername = ref('')
const ownerEmail = ref('')
const ownerPassword = ref('')
const isCreating = ref(false)
const errorMsg = ref('')
const successMsg = ref('')

const colors = [
  { value: 'gold', label: 'Champagne', class: 'bg-[#C5A880]' },
  { value: 'purple', label: 'Roxo Violeta', class: 'bg-violet-500' },
  { value: 'emerald', label: 'Esmeralda', class: 'bg-emerald-500' },
  { value: 'blue', label: 'Azul Real', class: 'bg-blue-500' },
  { value: 'orange', label: 'Laranja Cítrico', class: 'bg-orange-500' },
  { value: 'red', label: 'Vermelho Ruby', class: 'bg-red-500' }
]

// Carrega as empresas ao montar
const loadCompanies = async () => {
  try {
    companiesList.value = await fetchCompanies()
  } catch (err) {
    console.error('Erro ao buscar empresas:', err)
  } finally {
    isLoading.value = false
  }
}

onMounted(() => {
  loadCompanies()
})

// Auto-gera slug baseado no nome digitado
const generateSlug = () => {
  const slug = newName.value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // remove acentos
    .replace(/[^a-z0-9\s-]/g, '') // remove caracteres especiais
    .replace(/\s+/g, '-') // substitui espaços por hífen
    .replace(/-+/g, '-') // remove hífens duplicados
  newSlug.value = slug
  if (!ownerUsername.value) {
    ownerUsername.value = slug
  }
}

const handleCreateCompany = async () => {
  if (!newName.value.trim() || !newSlug.value.trim() || !ownerPassword.value.trim()) {
    errorMsg.value = 'Por favor, preencha todos os campos obrigatórios (*).'
    return
  }

  isCreating.value = true
  errorMsg.value = ''
  successMsg.value = ''

  try {
    // Valida se o slug já existe localmente
    const exists = companiesList.value.some(c => c.slug === newSlug.value)
    if (exists) {
      throw new Error('Já existe uma empresa cadastrada com este subdomínio/link.')
    }

    const { company } = await registerStoreAndAdmin({
      companyName: newName.value.trim(),
      companySlug: newSlug.value.trim(),
      description: newDescription.value.trim() || 'Catálogo de Produtos',
      themeColor: newColor.value,
      ownerName: ownerName.value.trim() || 'Lojista',
      username: ownerUsername.value.trim() || newSlug.value.trim(),
      email: ownerEmail.value.trim() || undefined,
      password: ownerPassword.value
    })

    companiesList.value.push(company)
    successMsg.value = 'Loja e conta criadas com sucesso! Redirecionando para o painel...'
    
    setTimeout(() => {
      showAddDialog.value = false
      router.push('/admin')
    }, 1200)
  } catch (e: any) {
    errorMsg.value = e.message || 'Falha ao criar a empresa.'
  } finally {
    isCreating.value = false
  }
}

// Navega para o catálogo da loja pelo caminho dinâmico
const navigateToCompany = (slug: string) => {
  router.push(`/${slug}`)
}

// Retorna cores em formato CSS baseado no tema
const getGradientBorder = (color: string) => {
  switch (color) {
    case 'gold': return 'group-hover:border-[#C5A880]/50'
    case 'purple': return 'group-hover:border-purple-500/50'
    case 'emerald': return 'group-hover:border-emerald-500/50'
    case 'blue': return 'group-hover:border-blue-500/50'
    case 'orange': return 'group-hover:border-orange-500/50'
    case 'red': return 'group-hover:border-red-500/50'
    default: return 'group-hover:border-primary/50'
  }
}

const getGradientBackground = (color: string) => {
  switch (color) {
    case 'gold': return 'from-[#C5A880]/10 to-[#1A1A1A]/10 text-[#C5A880]'
    case 'purple': return 'from-purple-500/10 to-violet-500/10 text-purple-400'
    case 'emerald': return 'from-emerald-500/10 to-teal-500/10 text-emerald-400'
    case 'blue': return 'from-blue-500/10 to-indigo-500/10 text-blue-400'
    case 'orange': return 'from-orange-500/10 to-yellow-500/10 text-orange-400'
    case 'red': return 'from-red-500/10 to-rose-500/10 text-red-400'
    default: return 'from-primary/10 to-primary/5 text-primary'
  }
}

const getTextColor = (color: string) => {
  switch (color) {
    case 'gold': return 'text-[#C5A880]'
    case 'purple': return 'text-purple-500'
    case 'emerald': return 'text-emerald-500'
    case 'blue': return 'text-blue-500'
    case 'orange': return 'text-orange-500'
    case 'red': return 'text-red-500'
    default: return 'text-primary'
  }
}
</script>

<template>
  <div class="max-w-6xl mx-auto py-8 md:py-16 space-y-12 animate-in fade-in slide-in-from-bottom-6 duration-700">
    <!-- Hero Header -->
    <div class="text-center space-y-5 max-w-3xl mx-auto">
      <div class="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full border border-purple-500/30 bg-purple-500/10 text-purple-400 text-xs font-bold uppercase tracking-wider">
        <Sparkles class="w-3.5 h-3.5" />
        <span>Ecossistema Multi-Lojas</span>
      </div>
      <h1 class="text-4xl md:text-6xl font-black tracking-tight"
        :class="themeMode === 'dark' ? 'text-slate-50' : 'text-slate-900'"
      >
        Thorder <span class="bg-gradient-to-r from-purple-500 to-indigo-500 bg-clip-text text-transparent">Multi-Empresas</span>
      </h1>
      <p class="text-sm md:text-base text-slate-400 leading-relaxed">
        Plataforma completa para múltiplos negócios venderem seus produtos com catálogos independentes, checkout integrado via WhatsApp e Pix, e gestão simplificada de pedidos.
      </p>

      <!-- Botões de Ação Principais -->
      <div class="flex flex-wrap items-center justify-center gap-3 pt-2">
        <Button 
          @click="showAddDialog = true"
          size="lg"
          class="rounded-2xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-black shadow-lg shadow-purple-500/20 px-6 py-6 text-sm"
        >
          <Plus class="w-4 h-4 mr-2" />
          <span>Criar Minha Loja Grátis</span>
        </Button>

        <router-link to="/admin/login">
          <Button 
            variant="outline"
            size="lg"
            class="rounded-2xl font-bold px-6 py-6 text-sm border-border/80 hover:bg-muted/50"
          >
            <Lock class="w-4 h-4 mr-2 text-primary" />
            <span>Acessar Painel do Lojista</span>
          </Button>
        </router-link>
      </div>
    </div>

    <!-- Barra de Lojas e Listagem -->
    <div class="space-y-6">
      <div class="flex items-center justify-between border-b border-border/60 pb-4">
        <h2 class="text-lg font-bold flex items-center gap-2"
          :class="themeMode === 'dark' ? 'text-slate-100' : 'text-slate-800'"
        >
          <Building class="w-5 h-5 text-purple-400" />
          Lojas em Destaque ({{ companiesList.length }})
        </h2>

        <!-- Dialog de Criar Empresa -->
        <Dialog v-model:open="showAddDialog">
          <DialogContent class="rounded-3xl border-border bg-card text-foreground max-w-md max-h-[90vh] overflow-y-auto">
            <DialogHeader class="space-y-2">
              <DialogTitle class="text-xl font-black flex items-center gap-2">
                <Store class="w-5 h-5 text-purple-400" />
                <span>Cadastrar Nova Loja & Acesso</span>
              </DialogTitle>
              <DialogDescription class="text-muted-foreground text-xs">
                Crie sua loja e seu login de administrador para começar a cadastrar seus produtos.
              </DialogDescription>
            </DialogHeader>

            <div class="space-y-4 pt-2">
              <!-- Dados da Loja -->
              <div class="space-y-3 p-3.5 rounded-2xl bg-muted/40 border border-border/40">
                <div class="text-[11px] font-black uppercase text-purple-500 tracking-wider">Dados da Loja</div>

                <!-- Nome -->
                <div class="space-y-1">
                  <label class="text-xs font-semibold">Nome da Loja *</label>
                  <Input 
                    v-model="newName"
                    placeholder="Ex: Doceria Gourmet"
                    class="rounded-xl"
                    @input="generateSlug"
                  />
                </div>

                <!-- Slug/Subdomínio -->
                <div class="space-y-1">
                  <label class="text-xs font-semibold">Link / Subdomínio *</label>
                  <div class="relative">
                    <span class="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground font-mono">/</span>
                    <Input 
                      v-model="newSlug"
                      placeholder="doceria-gourmet"
                      class="rounded-xl pl-6 font-mono text-xs"
                    />
                  </div>
                  <p class="text-[10px] text-muted-foreground">Seu catálogo ficará disponível em <code>/{{ newSlug || 'sua-loja' }}</code></p>
                </div>

                <!-- Descrição -->
                <div class="space-y-1">
                  <label class="text-xs font-semibold">Descrição Rápida</label>
                  <Textarea 
                    v-model="newDescription"
                    placeholder="Ex: Bolos artesanais, brigadeiros e doces finos"
                    class="rounded-xl text-xs resize-none h-16"
                  />
                </div>

                <!-- Cores -->
                <div class="space-y-2">
                  <div class="flex items-center justify-between">
                    <label class="text-xs font-semibold">Cor de Destaque da Loja</label>
                    <span class="font-mono text-[10px] font-bold px-2 py-0.5 rounded-full"
                      :style="{ backgroundColor: resolveThemeHex(newColor), color: getContrastTextColor(resolveThemeHex(newColor)) }"
                    >
                      {{ resolveThemeHex(newColor) }}
                    </span>
                  </div>
                  <div class="flex flex-wrap items-center gap-2 pt-1">
                    <button
                      type="button"
                      v-for="color in THEME_PRESETS"
                      :key="color.id"
                      @click="newColor = color.id"
                      class="w-7 h-7 rounded-full transition-all border border-black/10 flex items-center justify-center relative shadow-sm"
                      :style="{ backgroundColor: color.hex }"
                      :class="[
                        (newColor === color.id || resolveThemeHex(newColor) === color.hex)
                          ? 'scale-125 ring-2 ring-offset-2 ring-primary' 
                          : 'opacity-80 hover:opacity-100 hover:scale-110'
                      ]"
                      :title="`${color.name} - ${color.subtitle}`"
                    >
                      <Check 
                        v-if="newColor === color.id || resolveThemeHex(newColor) === color.hex" 
                        class="w-3.5 h-3.5 stroke-[3]" 
                        :style="{ color: getContrastTextColor(color.hex) }"
                      />
                    </button>

                    <!-- Seletor Livre HEX -->
                    <div class="relative flex items-center ml-1">
                      <input 
                        type="color" 
                        :value="resolveThemeHex(newColor)"
                        @input="(e) => newColor = (e.target as HTMLInputElement).value.toUpperCase()"
                        class="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                        title="Escolher Cor Livre Personalizada"
                      />
                      <div 
                        class="w-7 h-7 rounded-full border-2 border-dashed border-purple-500/50 flex items-center justify-center hover:scale-110 transition-transform cursor-pointer"
                        title="Color Picker Livre"
                      >
                        <Pipette class="w-3.5 h-3.5 text-purple-500" />
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <!-- Dados de Acesso do Lojista -->
              <div class="space-y-3 p-3.5 rounded-2xl bg-muted/40 border border-border/40">
                <div class="text-[11px] font-black uppercase text-purple-500 tracking-wider">Acesso Administrativo</div>

                <div class="space-y-1">
                  <label class="text-xs font-semibold">Nome do Responsável</label>
                  <Input 
                    v-model="ownerName"
                    placeholder="Ex: Maria Santos"
                    class="rounded-xl text-xs"
                  />
                </div>

                <div class="space-y-1">
                  <label class="text-xs font-semibold">Usuário de Acesso (Login) *</label>
                  <div class="relative">
                    <span class="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground font-mono">@</span>
                    <Input 
                      v-model="ownerUsername"
                      placeholder="maria"
                      class="rounded-xl pl-6 text-xs font-mono"
                    />
                  </div>
                </div>

                <div class="space-y-1">
                  <label class="text-xs font-semibold">E-mail de Contato (Opcional)</label>
                  <Input 
                    v-model="ownerEmail"
                    type="email"
                    placeholder="maria@exemplo.com"
                    class="rounded-xl text-xs"
                  />
                </div>

                <div class="space-y-1">
                  <label class="text-xs font-semibold">Senha de Acesso *</label>
                  <Input 
                    v-model="ownerPassword"
                    type="password"
                    placeholder="••••••••"
                    class="rounded-xl text-xs"
                  />
                </div>
              </div>

              <!-- Alertas de Erro e Sucesso -->
              <div v-if="errorMsg" class="p-3 rounded-2xl bg-red-950/30 border border-red-500/30 text-red-400 text-xs flex items-center gap-2">
                <AlertCircle class="w-4 h-4 shrink-0" />
                <span>{{ errorMsg }}</span>
              </div>

              <div v-if="successMsg" class="p-3 rounded-2xl bg-emerald-950/30 border border-emerald-500/30 text-emerald-400 text-xs flex items-center gap-2">
                <Check class="w-4 h-4 shrink-0" />
                <span>{{ successMsg }}</span>
              </div>

              <!-- Botão Salvar -->
              <Button 
                class="w-full rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold py-5"
                :disabled="isCreating"
                @click="handleCreateCompany"
              >
                <Loader2 v-if="isCreating" class="w-4 h-4 animate-spin mr-1.5" />
                <span>{{ isCreating ? 'Criando Loja...' : 'Concluir Cadastro & Entrar' }}</span>
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <!-- Loading State -->
      <div v-if="isLoading" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div v-for="i in 3" :key="i" class="h-56 rounded-3xl border border-border/40 bg-muted/20 animate-pulse"></div>
      </div>

      <!-- Grid de Lojas -->
      <div v-else class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <Card 
          v-for="comp in companiesList" 
          :key="comp.slug"
          class="rounded-3xl border border-border/60 bg-card/60 backdrop-blur-md hover:shadow-2xl transition-all duration-300 group overflow-hidden flex flex-col justify-between"
          :class="getGradientBorder(comp.theme_color)"
        >
          <CardHeader class="p-6 pb-4">
            <div class="flex items-start justify-between gap-4">
              <!-- Avatar / Ícone Temático -->
              <div 
                class="w-14 h-14 rounded-2xl flex items-center justify-center font-black text-xl shadow-inner shrink-0 group-hover:scale-105 transition-transform overflow-hidden"
                :style="{ backgroundColor: resolveThemeHex(comp.theme_color) + '22', color: resolveThemeHex(comp.theme_color) }"
              >
                <img 
                  v-if="comp.image_data" 
                  :src="comp.image_data" 
                  :alt="comp.name" 
                  class="w-full h-full object-cover" 
                />
                <span v-else>{{ comp.name.charAt(0) }}</span>
              </div>

              <!-- Tag com Slug -->
              <span class="px-2.5 py-1 rounded-full text-[10px] font-mono font-bold bg-muted text-muted-foreground border border-border/40">
                /{{ comp.slug }}
              </span>
            </div>

            <div class="pt-4 space-y-1.5">
              <CardTitle class="text-xl font-black tracking-tight group-hover:opacity-90 transition-opacity">
                {{ comp.name }}
              </CardTitle>
              <CardDescription class="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                {{ comp.description }}
              </CardDescription>
            </div>
          </CardHeader>

          <CardContent class="p-6 pt-0">
            <div class="pt-4 border-t border-border/40 flex items-center gap-2">
              <Button 
                @click="navigateToCompany(comp.slug)"
                class="w-full rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-xs flex items-center justify-center gap-1.5 py-4 shadow-sm"
              >
                <span>Acessar Catálogo</span>
                <ArrowRight class="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  </div>
</template>
