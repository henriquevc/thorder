<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { 
  Building, 
  ShoppingBag, 
  DollarSign, 
  Package, 
  ExternalLink, 
  Settings, 
  Plus, 
  Loader2, 
  Trash2, 
  ShieldCheck, 
  Store, 
  AlertTriangle,
  Users,
  UserPlus,
  UserCheck,
  Check,
  Globe,
  Pipette,
  KeyRound
} from 'lucide-vue-next'
import { 
  fetchPlatformStats, 
  fetchAllCompaniesWithStats, 
  registerStoreAndAdmin, 
  deleteCompany, 
  impersonateCompany, 
  themeMode, 
  fetchUsers,
  createUser,
  deleteUser,
  getStoreUrls,
  resolveThemeHex,
  getContrastTextColor,
  THEME_PRESETS,
  type PlatformStats, 
  type CompanyWithStats,
  type User
} from '@/services/store'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription, 
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
import ChangePasswordModal from '@/components/ChangePasswordModal.vue'

const emit = defineEmits<{
  (e: 'impersonate', slug: string): void
}>()

const activeTab = ref<'stores' | 'users'>('stores')
const isLoading = ref(true)
const stats = ref<PlatformStats>({
  totalCompanies: 0,
  totalOrders: 0,
  totalRevenue: 0,
  totalProducts: 0
})
const companies = ref<CompanyWithStats[]>([])

// Usuários da Plataforma
const usersList = ref<User[]>([])
const isLoadingUsers = ref(false)
const showCreateUserModal = ref(false)
const isCreatingUser = ref(false)
const createUserError = ref('')
const createUserSuccess = ref('')

const formUserName = ref('')
const formUserUsername = ref('')
const formUserPass = ref('')
const formUserRole = ref<'store_admin' | 'superadmin'>('store_admin')
const formUserCompanySlug = ref('')

// Modal de Criação de Loja
const showCreateModal = ref(false)
const isCreating = ref(false)
const createError = ref('')
const createSuccess = ref('')

const formStoreName = ref('')
const formStoreSlug = ref('')
const formStoreDesc = ref('')
const formStoreTheme = ref('gold')
const formOwnerName = ref('')
const formOwnerUsername = ref('')
const formOwnerEmail = ref('')
const formOwnerPass = ref('')

// Modal de Exclusão
const showDeleteModal = ref(false)
const companyToDelete = ref<CompanyWithStats | null>(null)
const isDeleting = ref(false)

const themeOptions = [
  { value: 'gold', label: 'Champagne / Dourado', bg: 'bg-[#C5A880]' },
  { value: 'purple', label: 'Roxo Violeta', bg: 'bg-violet-500' },
  { value: 'emerald', label: 'Esmeralda', bg: 'bg-emerald-500' },
  { value: 'blue', label: 'Azul Real', bg: 'bg-blue-500' },
  { value: 'orange', label: 'Laranja Cítrico', bg: 'bg-orange-500' },
  { value: 'red', label: 'Vermelho Ruby', bg: 'bg-red-500' }
]

const loadUsers = async () => {
  isLoadingUsers.value = true
  try {
    usersList.value = await fetchUsers()
  } catch (err) {
    console.error('Erro ao carregar usuários:', err)
  } finally {
    isLoadingUsers.value = false
  }
}

const loadData = async () => {
  isLoading.value = true
  try {
    const [st, comps] = await Promise.all([
      fetchPlatformStats(),
      fetchAllCompaniesWithStats()
    ])
    stats.value = st
    companies.value = comps
    await loadUsers()
  } catch (err) {
    console.error('Erro ao carregar dados do Super Admin:', err)
  } finally {
    isLoading.value = false
  }
}

onMounted(() => {
  loadData()
})

const formatCurrency = (val: number) => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(val)
}

const formatDate = (iso?: string) => {
  if (!iso) return 'N/A'
  try {
    return new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short' }).format(new Date(iso))
  } catch {
    return iso
  }
}

const handleSlugAuto = () => {
  const slug = formStoreName.value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
  formStoreSlug.value = slug
  if (!formOwnerUsername.value) {
    formOwnerUsername.value = slug
  }
}

const handleCreateStore = async () => {
  if (!formStoreName.value || !formStoreSlug.value || !formOwnerPass.value) {
    createError.value = 'Por favor, preencha todos os campos obrigatórios.'
    return
  }

  isCreating.value = true
  createError.value = ''

  try {
    await registerStoreAndAdmin({
      companyName: formStoreName.value,
      companySlug: formStoreSlug.value,
      description: formStoreDesc.value || 'Catálogo de Produtos',
      themeColor: formStoreTheme.value,
      ownerName: formOwnerName.value || 'Lojista',
      username: formOwnerUsername.value.trim() || formStoreSlug.value,
      email: formOwnerEmail.value || undefined,
      password: formOwnerPass.value
    })

    createSuccess.value = 'Loja e usuário cadastrados com sucesso!'
    // Limpa form
    formStoreName.value = ''
    formStoreSlug.value = ''
    formStoreDesc.value = ''
    formOwnerName.value = ''
    formOwnerUsername.value = ''
    formOwnerEmail.value = ''
    formOwnerPass.value = ''
    
    await loadData()

    setTimeout(() => {
      showCreateModal.value = false
      createSuccess.value = ''
    }, 1200)
  } catch (err: any) {
    createError.value = err.message || 'Falha ao cadastrar a nova loja.'
  } finally {
    isCreating.value = false
  }
}

const handleCreateUser = async () => {
  if (!formUserName.value.trim() || !formUserUsername.value.trim() || !formUserPass.value) {
    createUserError.value = 'Por favor, preencha todos os campos obrigatórios.'
    return
  }

  if (formUserRole.value === 'store_admin' && !formUserCompanySlug.value) {
    createUserError.value = 'Selecione a loja à qual este usuário terá acesso.'
    return
  }

  isCreatingUser.value = true
  createUserError.value = ''

  try {
    await createUser({
      name: formUserName.value.trim(),
      username: formUserUsername.value.trim(),
      password: formUserPass.value,
      role: formUserRole.value,
      company_slug: formUserRole.value === 'superadmin' ? null : formUserCompanySlug.value
    })

    createUserSuccess.value = 'Usuário cadastrado com sucesso!'
    formUserName.value = ''
    formUserUsername.value = ''
    formUserPass.value = ''
    formUserCompanySlug.value = ''
    
    await loadUsers()

    setTimeout(() => {
      showCreateUserModal.value = false
      createUserSuccess.value = ''
    }, 1200)
  } catch (err: any) {
    createUserError.value = err.message || 'Falha ao cadastrar o usuário.'
  } finally {
    isCreatingUser.value = false
  }
}

const handleDeleteUser = async (user: User) => {
  if (!user.id) return
  if (!confirm(`Deseja realmente remover o usuário "${user.username}"?`)) return
  try {
    await deleteUser(user.id)
    await loadUsers()
  } catch (e: any) {
    alert(e.message || 'Falha ao excluir usuário.')
  }
}

// Estados e handlers para redefinição de senha de usuários
const selectedUserForPasswordReset = ref<User | null>(null)
const showResetUserPasswordModal = ref(false)

const handleOpenResetUserPassword = (user: User) => {
  selectedUserForPasswordReset.value = user
  showResetUserPasswordModal.value = true
}

const handleImpersonate = async (slug: string) => {
  await impersonateCompany(slug)
  emit('impersonate', slug)
}

const confirmDelete = (company: CompanyWithStats) => {
  companyToDelete.value = company
  showDeleteModal.value = true
}

const handleDelete = async () => {
  if (!companyToDelete.value) return
  isDeleting.value = true
  try {
    await deleteCompany(companyToDelete.value.slug)
    showDeleteModal.value = false
    companyToDelete.value = null
    await loadData()
  } catch (err) {
    console.error('Falha ao excluir loja:', err)
  } finally {
    isDeleting.value = false
  }
}

// Métricas de Usuários
const superAdminsCount = computed(() => usersList.value.filter(u => u.role === 'superadmin').length)
const storeAdminsCount = computed(() => usersList.value.filter(u => u.role === 'store_admin').length)
</script>

<template>
  <div class="space-y-8 animate-in fade-in duration-500">
    <!-- Cabeçalho Executivo do Super Admin -->
    <div class="flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 rounded-3xl border bg-card/60 backdrop-blur-md shadow-sm">
      <div class="space-y-1">
        <div class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/10 text-amber-500 text-xs font-black uppercase tracking-wider">
          <ShieldCheck class="w-3.5 h-3.5" />
          <span>Gestão Master Global</span>
        </div>
        <h1 class="text-2xl md:text-3xl font-black tracking-tight"
          :class="themeMode === 'dark' ? 'text-slate-100' : 'text-slate-900'"
        >
          Painel do Super Administrador
        </h1>
        <p class="text-xs md:text-sm text-slate-400">
          Supervisione todas as lojas, métricas de vendas e gerencie os usuários e acessos da plataforma.
        </p>
      </div>

      <div class="flex flex-wrap items-center gap-3">
        <Button 
          @click="showCreateUserModal = true"
          variant="outline"
          class="rounded-xl border-amber-500/30 hover:bg-amber-500/10 text-amber-600 dark:text-amber-400 font-bold flex items-center gap-2 px-4 py-5"
        >
          <UserPlus class="w-4 h-4" />
          <span>Novo Usuário</span>
        </Button>

        <Button 
          @click="showCreateModal = true"
          class="rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white font-bold shadow-lg shadow-amber-500/20 flex items-center gap-2 px-4 py-5"
        >
          <Plus class="w-4 h-4" />
          <span>Nova Loja</span>
        </Button>
      </div>
    </div>

    <!-- Navegação de Abas do Super Admin -->
    <Tabs v-model="activeTab" class="space-y-6">
      <div class="border-b border-border/60 pb-3">
        <TabsList class="rounded-xl p-1 bg-muted/50 border border-border/40">
          <TabsTrigger value="stores" class="rounded-lg text-xs md:text-sm font-bold px-5 py-2 flex items-center gap-2">
            <Store class="w-4 h-4" />
            <span>Lojas & Métricas ({{ companies.length }})</span>
          </TabsTrigger>
          <TabsTrigger value="users" class="rounded-lg text-xs md:text-sm font-bold px-5 py-2 flex items-center gap-2">
            <Users class="w-4 h-4" />
            <span>Usuários & Acessos ({{ usersList.length }})</span>
          </TabsTrigger>
        </TabsList>
      </div>

      <!-- ABA 1: LOJAS & MÉTRICAS -->
      <TabsContent value="stores" class="space-y-8 outline-none">
        <!-- Cards de Métricas Globais -->
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <!-- Total de Lojas -->
          <Card class="rounded-2xl border bg-card/50 backdrop-blur-sm shadow-sm hover:shadow-md transition-all">
            <CardContent class="p-5 flex items-center gap-4">
              <div class="w-12 h-12 rounded-2xl bg-purple-500/10 text-purple-500 flex items-center justify-center shrink-0">
                <Building class="w-6 h-6" />
              </div>
              <div>
                <p class="text-xs font-semibold text-slate-400 uppercase tracking-wider">Lojas Ativas</p>
                <h3 class="text-2xl font-black tracking-tight">{{ stats.totalCompanies }}</h3>
              </div>
            </CardContent>
          </Card>

          <!-- Faturamento Global (GMV) -->
          <Card class="rounded-2xl border bg-card/50 backdrop-blur-sm shadow-sm hover:shadow-md transition-all">
            <CardContent class="p-5 flex items-center gap-4">
              <div class="w-12 h-12 rounded-2xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center shrink-0">
                <DollarSign class="w-6 h-6" />
              </div>
              <div>
                <p class="text-xs font-semibold text-slate-400 uppercase tracking-wider">Volume Transacionado</p>
                <h3 class="text-2xl font-black tracking-tight">{{ formatCurrency(stats.totalRevenue) }}</h3>
              </div>
            </CardContent>
          </Card>

          <!-- Total de Pedidos -->
          <Card class="rounded-2xl border bg-card/50 backdrop-blur-sm shadow-sm hover:shadow-md transition-all">
            <CardContent class="p-5 flex items-center gap-4">
              <div class="w-12 h-12 rounded-2xl bg-blue-500/10 text-blue-500 flex items-center justify-center shrink-0">
                <ShoppingBag class="w-6 h-6" />
              </div>
              <div>
                <p class="text-xs font-semibold text-slate-400 uppercase tracking-wider">Pedidos Concluídos</p>
                <h3 class="text-2xl font-black tracking-tight">{{ stats.totalOrders }}</h3>
              </div>
            </CardContent>
          </Card>

          <!-- Total de Produtos no Ecossistema -->
          <Card class="rounded-2xl border bg-card/50 backdrop-blur-sm shadow-sm hover:shadow-md transition-all">
            <CardContent class="p-5 flex items-center gap-4">
              <div class="w-12 h-12 rounded-2xl bg-orange-500/10 text-orange-500 flex items-center justify-center shrink-0">
                <Package class="w-6 h-6" />
              </div>
              <div>
                <p class="text-xs font-semibold text-slate-400 uppercase tracking-wider">Produtos Cadastrados</p>
                <h3 class="text-2xl font-black tracking-tight">{{ stats.totalProducts }}</h3>
              </div>
            </CardContent>
          </Card>
        </div>

        <!-- Tabela de Lojas Cadastradas -->
        <Card class="rounded-3xl border shadow-sm overflow-hidden bg-card/50 backdrop-blur-sm">
          <CardHeader class="p-6 pb-4 border-b border-border/40 flex flex-row items-center justify-between">
            <div>
              <CardTitle class="text-lg font-black tracking-tight flex items-center gap-2">
                <Store class="w-5 h-5 text-primary" />
                <span>Lojas Conectadas à Plataforma</span>
              </CardTitle>
              <p class="text-xs text-slate-400 mt-0.5">Gerencie os acessos, acesse o painel ou abra o catálogo de qualquer empresa.</p>
            </div>
          </CardHeader>

          <CardContent class="p-0">
            <div v-if="isLoading" class="p-12 text-center">
              <Loader2 class="w-8 h-8 animate-spin mx-auto text-primary" />
              <p class="text-xs text-slate-400 mt-2">Carregando lojas da plataforma...</p>
            </div>

            <div v-else-if="companies.length === 0" class="p-12 text-center space-y-3">
              <Store class="w-12 h-12 text-slate-300 dark:text-slate-700 mx-auto" />
              <h4 class="font-bold text-sm">Nenhuma loja cadastrada</h4>
              <p class="text-xs text-slate-400 max-w-sm mx-auto">Cadastre a primeira empresa para iniciar as operações.</p>
              <Button @click="showCreateModal = true" class="rounded-xl">Cadastrar Loja</Button>
            </div>

            <div v-else class="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead class="font-bold">Loja / Subdomínio</TableHead>
                    <TableHead class="font-bold text-center">Produtos</TableHead>
                    <TableHead class="font-bold text-center">Pedidos</TableHead>
                    <TableHead class="font-bold text-right">Faturamento</TableHead>
                    <TableHead class="font-bold">Criação</TableHead>
                    <TableHead class="font-bold text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <TableRow v-for="comp in companies" :key="comp.slug" class="hover:bg-muted/40 transition-colors">
                    <!-- Nome e Slug -->
                    <TableCell>
                      <div class="flex items-center gap-3">
                        <div class="w-10 h-10 rounded-xl flex items-center justify-center font-bold shadow-sm shrink-0 overflow-hidden"
                          :style="{ backgroundColor: resolveThemeHex(comp.theme_color), color: getContrastTextColor(resolveThemeHex(comp.theme_color)) }"
                        >
                          <img 
                            v-if="comp.image_data" 
                            :src="comp.image_data" 
                            :alt="comp.name" 
                            class="w-full h-full object-cover" 
                          />
                          <span v-else>{{ comp.name.charAt(0) }}</span>
                        </div>
                        <div>
                          <div class="font-black text-sm flex items-center gap-1.5">
                            <span>{{ comp.name }}</span>
                            <a 
                              :href="`/${comp.slug}`" 
                              target="_blank" 
                              class="text-slate-400 hover:text-primary transition-colors"
                              title="Abrir Catálogo do Cliente"
                            >
                              <ExternalLink class="w-3.5 h-3.5" />
                            </a>
                          </div>
                          <div class="text-[11px] text-slate-400 font-mono flex items-center gap-1.5 flex-wrap">
                            <span class="text-primary font-semibold">{{ getStoreUrls(comp.slug).subdomainUrl }}</span>
                            <span class="text-slate-500">|</span>
                            <span>/{{ comp.slug }}</span>
                          </div>
                        </div>
                      </div>
                    </TableCell>

                    <!-- Total Produtos -->
                    <TableCell class="text-center font-semibold text-sm">
                      {{ comp.productsCount }}
                    </TableCell>

                    <!-- Total Pedidos -->
                    <TableCell class="text-center font-semibold text-sm">
                      {{ comp.ordersCount }}
                    </TableCell>

                    <!-- Faturamento -->
                    <TableCell class="text-right font-black text-sm text-emerald-500">
                      {{ formatCurrency(comp.totalRevenue) }}
                    </TableCell>

                    <!-- Data de Criação -->
                    <TableCell class="text-xs text-slate-400">
                      {{ formatDate(comp.created_at) }}
                    </TableCell>

                    <!-- Ações -->
                    <TableCell class="text-right">
                      <div class="inline-flex items-center gap-2">
                        <Button 
                          @click="handleImpersonate(comp.slug)"
                          size="sm"
                          class="rounded-xl font-bold text-xs bg-primary hover:bg-primary/90 text-primary-foreground shadow-sm flex items-center gap-1.5"
                        >
                          <Settings class="w-3.5 h-3.5" />
                          <span>Gerenciar Loja</span>
                        </Button>

                        <Button 
                          @click="confirmDelete(comp)"
                          variant="ghost" 
                          size="icon" 
                          class="h-8 w-8 text-red-500 hover:bg-red-500/10 rounded-xl"
                          title="Excluir Loja"
                        >
                          <Trash2 class="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </TabsContent>

      <!-- ABA 2: USUÁRIOS & ACESSOS -->
      <TabsContent value="users" class="space-y-6 outline-none">
        <!-- Métricas de Usuários -->
        <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card class="rounded-2xl border bg-card/50 backdrop-blur-sm shadow-sm">
            <CardContent class="p-5 flex items-center gap-4">
              <div class="w-12 h-12 rounded-2xl bg-amber-500/10 text-amber-500 flex items-center justify-center shrink-0">
                <Users class="w-6 h-6" />
              </div>
              <div>
                <p class="text-xs font-semibold text-slate-400 uppercase tracking-wider">Total de Usuários</p>
                <h3 class="text-2xl font-black tracking-tight">{{ usersList.length }}</h3>
              </div>
            </CardContent>
          </Card>

          <Card class="rounded-2xl border bg-card/50 backdrop-blur-sm shadow-sm">
            <CardContent class="p-5 flex items-center gap-4">
              <div class="w-12 h-12 rounded-2xl bg-purple-500/10 text-purple-500 flex items-center justify-center shrink-0">
                <ShieldCheck class="w-6 h-6" />
              </div>
              <div>
                <p class="text-xs font-semibold text-slate-400 uppercase tracking-wider">Super Administradores</p>
                <h3 class="text-2xl font-black tracking-tight">{{ superAdminsCount }}</h3>
              </div>
            </CardContent>
          </Card>

          <Card class="rounded-2xl border bg-card/50 backdrop-blur-sm shadow-sm">
            <CardContent class="p-5 flex items-center gap-4">
              <div class="w-12 h-12 rounded-2xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center shrink-0">
                <Store class="w-6 h-6" />
              </div>
              <div>
                <p class="text-xs font-semibold text-slate-400 uppercase tracking-wider">Lojistas Vinculados</p>
                <h3 class="text-2xl font-black tracking-tight">{{ storeAdminsCount }}</h3>
              </div>
            </CardContent>
          </Card>
        </div>

        <!-- Tabela de Usuários -->
        <Card class="rounded-3xl border shadow-sm overflow-hidden bg-card/50 backdrop-blur-sm">
          <CardHeader class="p-6 pb-4 border-b border-border/40 flex flex-row items-center justify-between">
            <div>
              <CardTitle class="text-lg font-black tracking-tight flex items-center gap-2">
                <Users class="w-5 h-5 text-primary" />
                <span>Usuários Cadastrados</span>
              </CardTitle>
              <p class="text-xs text-slate-400 mt-0.5">Gerencie os logins, perfis e lojas vinculadas de cada usuário.</p>
            </div>

            <Button 
              size="sm"
              class="rounded-xl font-bold text-xs bg-amber-500 hover:bg-amber-600 text-white flex items-center gap-1.5"
              @click="showCreateUserModal = true"
            >
              <UserPlus class="w-4 h-4" />
              <span>Novo Usuário</span>
            </Button>
          </CardHeader>

          <CardContent class="p-0">
            <div v-if="isLoadingUsers" class="p-12 text-center">
              <Loader2 class="w-8 h-8 animate-spin mx-auto text-primary" />
              <p class="text-xs text-slate-400 mt-2">Carregando usuários...</p>
            </div>

            <div v-else class="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead class="font-bold">Usuário / Nome</TableHead>
                    <TableHead class="font-bold">Login (@username)</TableHead>
                    <TableHead class="font-bold">Perfil</TableHead>
                    <TableHead class="font-bold">Loja Vinculada</TableHead>
                    <TableHead class="font-bold">Data de Cadastro</TableHead>
                    <TableHead class="font-bold text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <TableRow v-for="user in usersList" :key="user.id" class="hover:bg-muted/40 transition-colors">
                    <!-- Nome -->
                    <TableCell>
                      <div class="flex items-center gap-3">
                        <div class="w-9 h-9 rounded-xl flex items-center justify-center font-bold text-white text-xs shadow-sm shrink-0"
                          :class="user.role === 'superadmin' ? 'bg-amber-500' : 'bg-primary'"
                        >
                          {{ user.name.charAt(0) }}
                        </div>
                        <div>
                          <div class="font-bold text-sm">{{ user.name }}</div>
                          <div v-if="user.email" class="text-[11px] text-slate-400">{{ user.email }}</div>
                        </div>
                      </div>
                    </TableCell>

                    <!-- Username -->
                    <TableCell class="font-mono text-xs font-bold text-primary">
                      @{{ user.username }}
                    </TableCell>

                    <!-- Perfil -->
                    <TableCell>
                      <span 
                        class="px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider"
                        :class="user.role === 'superadmin' ? 'bg-amber-500/10 text-amber-500 border border-amber-500/20' : 'bg-primary/10 text-primary border border-primary/20'"
                      >
                        {{ user.role === 'superadmin' ? 'Super Admin' : 'Lojista' }}
                      </span>
                    </TableCell>

                    <!-- Loja Vinculada -->
                    <TableCell>
                      <span v-if="user.role === 'superadmin'" class="text-xs text-amber-500 font-semibold">
                        Acesso Global (Todas)
                      </span>
                      <span v-else-if="user.company_slug" class="px-2.5 py-1 rounded-full text-xs font-mono bg-muted border border-border/40 font-bold">
                        /{{ user.company_slug }}
                      </span>
                      <span v-else class="text-xs text-slate-400">
                        Nenhuma
                      </span>
                    </TableCell>

                    <!-- Data -->
                    <TableCell class="text-xs text-slate-400">
                      {{ formatDate(user.created_at) }}
                    </TableCell>

                    <!-- Ações -->
                    <TableCell class="text-right">
                      <div class="flex items-center justify-end gap-1">
                        <Button 
                          @click="handleOpenResetUserPassword(user)"
                          variant="ghost" 
                          size="icon" 
                          class="h-8 w-8 text-primary hover:bg-primary/10 rounded-xl"
                          title="Redefinir Senha do Usuário"
                        >
                          <KeyRound class="w-4 h-4" />
                        </Button>
                        <Button 
                          @click="handleDeleteUser(user)"
                          variant="ghost" 
                          size="icon" 
                          class="h-8 w-8 text-red-500 hover:bg-red-500/10 rounded-xl"
                          title="Excluir Usuário"
                        >
                          <Trash2 class="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>

    <!-- Dialog de Cadastro de Novo Usuário -->
    <Dialog :open="showCreateUserModal" @update:open="showCreateUserModal = $event">
      <DialogContent class="max-w-md rounded-3xl">
        <DialogHeader>
          <DialogTitle class="text-xl font-black flex items-center gap-2">
            <UserPlus class="w-5 h-5 text-amber-500" />
            <span>Cadastrar Novo Usuário</span>
          </DialogTitle>
          <DialogDescription class="text-xs text-slate-400">
            Crie um login para um lojista ou administrador do sistema.
          </DialogDescription>
        </DialogHeader>

        <form @submit.prevent="handleCreateUser" class="space-y-4 pt-2">
          <div class="space-y-1">
            <label class="text-xs font-semibold">Nome Completo *</label>
            <Input 
              v-model="formUserName" 
              placeholder="Ex: Carlos Silva" 
              required 
              class="rounded-xl"
            />
          </div>

          <div class="space-y-1">
            <label class="text-xs font-semibold">Nome de Usuário (Login) *</label>
            <div class="relative">
              <span class="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 font-mono">@</span>
              <Input 
                v-model="formUserUsername" 
                placeholder="carlos" 
                required 
                class="rounded-xl pl-7 font-mono text-xs"
              />
            </div>
            <p class="text-[10px] text-slate-400">Identificador único (letras, números, sem espaços).</p>
          </div>

          <div class="space-y-1">
            <label class="text-xs font-semibold">Senha de Acesso *</label>
            <Input 
              v-model="formUserPass" 
              type="password"
              placeholder="••••••••" 
              required 
              class="rounded-xl"
            />
          </div>

          <!-- Tipo de Perfil -->
          <div class="space-y-1.5">
            <label class="text-xs font-semibold">Tipo de Acesso *</label>
            <div class="grid grid-cols-2 gap-2">
              <button
                type="button"
                @click="formUserRole = 'store_admin'"
                class="p-2.5 rounded-xl border text-xs font-bold transition-all text-left"
                :class="formUserRole === 'store_admin' ? 'border-primary bg-primary/10 text-primary' : 'border-border/60 hover:bg-muted/40'"
              >
                <div>Lojista</div>
                <div class="text-[10px] font-normal text-muted-foreground">Acesso a 1 loja específica</div>
              </button>

              <button
                type="button"
                @click="formUserRole = 'superadmin'"
                class="p-2.5 rounded-xl border text-xs font-bold transition-all text-left"
                :class="formUserRole === 'superadmin' ? 'border-amber-500 bg-amber-500/10 text-amber-500' : 'border-border/60 hover:bg-muted/40'"
              >
                <div>Super Admin</div>
                <div class="text-[10px] font-normal text-muted-foreground">Acesso a todas as lojas</div>
              </button>
            </div>
          </div>

          <!-- Seleção de Loja (se Lojista) -->
          <div v-if="formUserRole === 'store_admin'" class="space-y-1">
            <label class="text-xs font-semibold">Loja Vinculada *</label>
            <select 
              v-model="formUserCompanySlug"
              required
              class="w-full h-10 px-3 rounded-xl border bg-card text-foreground text-xs focus:ring-2 focus:ring-primary outline-none"
            >
              <option value="" disabled selected>Selecione uma loja existente...</option>
              <option 
                v-for="c in companies" 
                :key="c.slug" 
                :value="c.slug"
              >
                {{ c.name }} (/{{ c.slug }})
              </option>
            </select>
          </div>

          <!-- Mensagens -->
          <div v-if="createUserError" class="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-500 text-xs flex items-center gap-2">
            <AlertTriangle class="w-4 h-4 shrink-0" />
            <span>{{ createUserError }}</span>
          </div>

          <div v-if="createUserSuccess" class="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 text-xs flex items-center gap-2">
            <Check class="w-4 h-4 shrink-0" />
            <span>{{ createUserSuccess }}</span>
          </div>

          <DialogFooter class="pt-2">
            <Button 
              type="button" 
              variant="outline" 
              @click="showCreateUserModal = false"
              class="rounded-xl"
            >
              Cancelar
            </Button>
            <Button 
              type="submit" 
              :disabled="isCreatingUser"
              class="rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold"
            >
              <Loader2 v-if="isCreatingUser" class="w-4 h-4 animate-spin mr-1.5" />
              <span>Criar Usuário</span>
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>

    <!-- Dialog de Cadastro de Nova Loja -->
    <Dialog :open="showCreateModal" @update:open="showCreateModal = $event">
      <DialogContent class="max-w-md rounded-3xl">
        <DialogHeader>
          <DialogTitle class="text-xl font-black flex items-center gap-2">
            <Plus class="w-5 h-5 text-amber-500" />
            <span>Cadastrar Nova Loja & Lojista</span>
          </DialogTitle>
          <DialogDescription class="text-xs text-slate-400">
            Crie uma nova empresa com usuário administrador para gerenciar o catálogo.
          </DialogDescription>
        </DialogHeader>

        <form @submit.prevent="handleCreateStore" class="space-y-4 pt-2">
          <!-- Dados da Loja -->
          <div class="space-y-3 p-4 rounded-2xl bg-muted/40 border border-border/40">
            <div class="text-[11px] font-black uppercase text-primary tracking-wider">Dados da Empresa</div>
            
            <div class="space-y-1">
              <label class="text-xs font-semibold">Nome da Loja *</label>
              <Input 
                v-model="formStoreName" 
                @input="handleSlugAuto"
                placeholder="Ex: Hamburgueria Gourmet" 
                required 
                class="rounded-xl"
              />
            </div>

            <div class="space-y-1">
              <div class="flex items-center justify-between">
                <label class="text-xs font-semibold">Rota / Subdomínio da Loja *</label>
                <span v-if="formStoreSlug" class="text-[10px] font-mono text-primary font-bold">
                  {{ formStoreSlug.toLowerCase().replace(/[^a-z0-9-]/g, '') }}.{{ getStoreUrls('').rootDomain }}
                </span>
              </div>
              <div class="relative">
                <span class="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 font-mono font-bold">subdomain /</span>
                <Input 
                  v-model="formStoreSlug" 
                  placeholder="ex: xsmoke, pizzahot, docesmylla" 
                  required 
                  class="rounded-xl pl-24 font-mono text-xs"
                />
              </div>
              <p class="text-[10px] text-slate-400">
                A loja responderá em <span class="font-mono text-primary font-bold">https://{{ formStoreSlug ? formStoreSlug.toLowerCase().replace(/[^a-z0-9-]/g, '') : 'rota' }}.{{ getStoreUrls('').rootDomain }}</span> e <span class="font-mono text-primary font-bold">/{{ formStoreSlug ? formStoreSlug.toLowerCase().replace(/[^a-z0-9-]/g, '') : 'rota' }}</span>
              </p>
            </div>

            <div class="space-y-1">
              <label class="text-xs font-semibold">Descrição / Ramo</label>
              <Input 
                v-model="formStoreDesc" 
                placeholder="Ex: Hambúrgueres artesanais e porções" 
                class="rounded-xl text-xs"
              />
            </div>

            <div class="space-y-2">
              <div class="flex items-center justify-between">
                <label class="text-xs font-semibold">Cor de Identidade Visual</label>
                <div class="flex items-center gap-1.5 font-mono text-[10px] font-bold px-2 py-0.5 rounded-full"
                  :style="{ backgroundColor: resolveThemeHex(formStoreTheme), color: getContrastTextColor(resolveThemeHex(formStoreTheme)) }"
                >
                  <span>{{ resolveThemeHex(formStoreTheme) }}</span>
                </div>
              </div>

              <!-- Paleta de Cores e Seletor Livre -->
              <div class="flex flex-wrap items-center gap-2 pt-1">
                <button
                  type="button"
                  v-for="color in THEME_PRESETS"
                  :key="color.id"
                  @click="formStoreTheme = color.id"
                  class="w-7 h-7 rounded-full transition-all border border-black/10 flex items-center justify-center relative shadow-sm"
                  :style="{ backgroundColor: color.hex }"
                  :class="[
                    (formStoreTheme === color.id || resolveThemeHex(formStoreTheme) === color.hex)
                      ? 'scale-125 ring-2 ring-offset-2 ring-primary' 
                      : 'opacity-80 hover:opacity-100 hover:scale-110'
                  ]"
                  :title="`${color.name} - ${color.subtitle}`"
                >
                  <Check 
                    v-if="formStoreTheme === color.id || resolveThemeHex(formStoreTheme) === color.hex" 
                    class="w-3.5 h-3.5 stroke-[3]" 
                    :style="{ color: getContrastTextColor(color.hex) }"
                  />
                </button>

                <!-- Seletor Livre HEX -->
                <div class="relative flex items-center ml-1">
                  <input 
                    type="color" 
                    :value="resolveThemeHex(formStoreTheme)"
                    @input="(e) => formStoreTheme = (e.target as HTMLInputElement).value.toUpperCase()"
                    class="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                    title="Escolher Cor Livre Personalizada"
                  />
                  <div 
                    class="w-7 h-7 rounded-full border-2 border-dashed border-primary/50 flex items-center justify-center hover:scale-110 transition-transform cursor-pointer"
                    title="Color Picker Livre"
                  >
                    <Pipette class="w-3.5 h-3.5 text-primary" />
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Dados de Acesso do Lojista -->
          <div class="space-y-3 p-4 rounded-2xl bg-muted/40 border border-border/40">
            <div class="text-[11px] font-black uppercase text-primary tracking-wider">Acesso do Lojista</div>
            
            <div class="space-y-1">
              <label class="text-xs font-semibold">Nome do Responsável</label>
              <Input 
                v-model="formOwnerName" 
                placeholder="Ex: Carlos Santos" 
                class="rounded-xl text-xs"
              />
            </div>

            <div class="space-y-1">
              <label class="text-xs font-semibold">Usuário de Login *</label>
              <div class="relative">
                <span class="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 font-mono">@</span>
                <Input 
                  v-model="formOwnerUsername" 
                  placeholder="carlos" 
                  required 
                  class="rounded-xl pl-7 font-mono text-xs"
                />
              </div>
            </div>

            <div class="space-y-1">
              <label class="text-xs font-semibold">Senha de Acesso *</label>
              <Input 
                v-model="formOwnerPass" 
                type="password"
                placeholder="••••••••" 
                required 
                class="rounded-xl text-xs"
              />
            </div>
          </div>

          <!-- Mensagens -->
          <div v-if="createError" class="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-500 text-xs flex items-center gap-2">
            <AlertTriangle class="w-4 h-4 shrink-0" />
            <span>{{ createError }}</span>
          </div>

          <div v-if="createSuccess" class="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 text-xs">
            {{ createSuccess }}
          </div>

          <DialogFooter class="pt-2">
            <Button 
              type="button" 
              variant="outline" 
              @click="showCreateModal = false"
              class="rounded-xl"
            >
              Cancelar
            </Button>
            <Button 
              type="submit" 
              :disabled="isCreating"
              class="rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold"
            >
              <Loader2 v-if="isCreating" class="w-4 h-4 animate-spin mr-1.5" />
              <span>Criar Loja</span>
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>

    <!-- Dialog de Confirmação de Exclusão -->
    <Dialog :open="showDeleteModal" @update:open="showDeleteModal = $event">
      <DialogContent class="max-w-sm rounded-3xl">
        <DialogHeader>
          <DialogTitle class="text-lg font-black text-red-500 flex items-center gap-2">
            <AlertTriangle class="w-5 h-5" />
            <span>Confirmar Exclusão</span>
          </DialogTitle>
          <DialogDescription class="text-xs text-slate-400">
            Tem certeza que deseja excluir a loja <strong>{{ companyToDelete?.name }}</strong>? Todos os produtos, pedidos e configurações serão removidos permanentemente.
          </DialogDescription>
        </DialogHeader>

        <DialogFooter class="pt-4 flex gap-2">
          <Button variant="outline" @click="showDeleteModal = false" class="rounded-xl">Cancelar</Button>
          <Button 
            variant="destructive" 
            :disabled="isDeleting"
            @click="handleDelete" 
            class="rounded-xl font-bold"
          >
            <Loader2 v-if="isDeleting" class="w-4 h-4 animate-spin mr-1.5" />
            <span>Excluir Permanentemente</span>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    <!-- Modal de Redefinição de Senha de Usuário -->
    <ChangePasswordModal 
      :open="showResetUserPasswordModal" 
      :target-user="selectedUserForPasswordReset"
      @update:open="showResetUserPasswordModal = $event" 
    />
  </div>
</template>
