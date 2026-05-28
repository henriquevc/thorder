<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { 
  Plus, 
  Edit2, 
  Trash2, 
  Tag,
  Loader2,
  CheckCircle,
  AlertTriangle,
  Calendar,
  DollarSign,
  Percent,
  Layers,
  Sparkles
} from 'lucide-vue-next'
import { 
  fetchCoupons, 
  createCoupon, 
  updateCoupon, 
  deleteCoupon, 
  themeMode,
  themeColor,
  type Coupon 
} from '@/services/store'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
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

const couponsList = ref<Coupon[]>([])
const isLoading = ref(true)

// Formulário de Cupom
const showFormDialog = ref(false)
const isEditing = ref(false)
const formCouponId = ref<number | undefined>(undefined)

const formCode = ref('')
const formDiscountType = ref<'fixed' | 'percentage'>('percentage')
const formDiscountValue = ref<number>(0)
const formMinPurchaseCost = ref<number>(0)
const formExpirationDate = ref('')
const formLimitUses = ref<number | undefined>(undefined)
const formUsedCount = ref<number>(0)
const formIsActive = ref(true)

const isSaving = ref(false)
const formError = ref('')

onMounted(async () => {
  await loadCoupons()
})

const loadCoupons = async () => {
  isLoading.value = true
  try {
    couponsList.value = await fetchCoupons()
  } catch (err) {
    console.error('Falha ao carregar cupons:', err)
  } finally {
    isLoading.value = false
  }
}

// Formatações
const formatPrice = (val: number) => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(val)
}

const formatDate = (dateStr?: string) => {
  if (!dateStr) return 'Sem expiração'
  try {
    const [year, month, day] = dateStr.split('-')
    return `${day}/${month}/${year}`
  } catch(e) {
    return dateStr
  }
}

const getCouponStatus = (coupon: Coupon) => {
  if (!coupon.is_active) {
    return { text: 'Inativo', class: 'bg-red-500/10 text-red-500 border border-red-500/20' }
  }
  
  if (coupon.limit_uses && coupon.used_count >= coupon.limit_uses) {
    return { text: 'Esgotado', class: 'bg-slate-500/10 text-slate-400 border border-slate-500/20' }
  }
  
  if (coupon.expiration_date) {
    const todayStr = new Date().toISOString().split('T')[0]
    if (todayStr > coupon.expiration_date) {
      return { text: 'Expirado', class: 'bg-amber-500/10 text-amber-500 border border-amber-500/20' }
    }
  }
  
  return { text: 'Ativo', class: 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20' }
}

// Reset do Formulário
const resetForm = () => {
  formCouponId.value = undefined
  formCode.value = ''
  formDiscountType.value = 'percentage'
  formDiscountValue.value = 0
  formMinPurchaseCost.value = 0
  formExpirationDate.value = ''
  formLimitUses.value = undefined
  formUsedCount.value = 0
  formIsActive.value = true
  formError.value = ''
  isEditing.value = false
}

// Abrir Criar
const openCreateDialog = () => {
  resetForm()
  showFormDialog.value = true
}

// Abrir Editar
const openEditDialog = (coupon: Coupon) => {
  resetForm()
  isEditing.value = true
  formCouponId.value = coupon.id
  formCode.value = coupon.code
  formDiscountType.value = coupon.discount_type
  formDiscountValue.value = coupon.discount_value
  formMinPurchaseCost.value = coupon.min_purchase_cost || 0
  formExpirationDate.value = coupon.expiration_date || ''
  formLimitUses.value = coupon.limit_uses
  formUsedCount.value = coupon.used_count
  formIsActive.value = coupon.is_active
  
  showFormDialog.value = true
}

// Salvar Cupom
const handleSaveCoupon = async () => {
  if (!formCode.value.trim() || formDiscountValue.value <= 0) {
    formError.value = 'Por favor, preencha o código e um valor de desconto válido superior a zero.'
    return
  }

  if (formDiscountType.value === 'percentage' && formDiscountValue.value > 100) {
    formError.value = 'Desconto percentual não pode ser maior que 100%.'
    return
  }

  isSaving.value = true
  formError.value = ''

  try {
    const couponPayload = {
      code: formCode.value.trim().toUpperCase(),
      discount_type: formDiscountType.value,
      discount_value: Number(formDiscountValue.value),
      min_purchase_cost: Number(formMinPurchaseCost.value) || 0,
      expiration_date: formExpirationDate.value || undefined,
      limit_uses: formLimitUses.value ? Number(formLimitUses.value) : undefined,
      used_count: formUsedCount.value,
      is_active: formIsActive.value
    }

    if (isEditing.value && formCouponId.value !== undefined) {
      await updateCoupon({
        ...couponPayload,
        id: formCouponId.value
      })
    } else {
      await createCoupon(couponPayload)
    }

    showFormDialog.value = false
    await loadCoupons()
  } catch (err: any) {
    formError.value = err.message || 'Falha ao salvar cupom no banco de dados.'
  } finally {
    isSaving.value = false
  }
}

// Excluir Cupom
const handleDeleteCoupon = async (couponId: number) => {
  if (!confirm('Deseja realmente deletar este cupom de desconto? Essa ação removerá o cupom permanentemente.')) {
    return
  }
  
  try {
    await deleteCoupon(couponId)
    await loadCoupons()
  } catch (err) {
    alert('Erro ao excluir cupom.')
  }
}
</script>

<template>
  <div class="space-y-6">
    <!-- Cabeçalho de Ações -->
    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
      <div>
        <h2 class="text-lg md:text-xl font-bold"
          :class="themeMode === 'dark' ? 'text-slate-200' : 'text-slate-800'"
        >Gerenciar Cupons</h2>
        <p class="text-xs text-slate-400">Cadastre cupons promocionais, defina valores mínimos de compra e data de expiração.</p>
      </div>
      <Button 
        class="rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground font-bold gap-1.5 shrink-0 shadow-lg shadow-primary/20"
        @click="openCreateDialog"
      >
        <Plus class="w-4 h-4" />
        Novo Cupom
      </Button>
    </div>

    <!-- Loader -->
    <div v-if="isLoading" class="flex flex-col items-center justify-center py-20 gap-3">
      <Loader2 class="w-8 h-8 text-primary animate-spin" />
      <p class="text-slate-400 text-xs font-medium">Lendo cupons do banco de dados...</p>
    </div>

    <!-- Tabela Vazia -->
    <div v-else-if="couponsList.length === 0" class="text-center py-16 bg-slate-900/10 border border-dashed border-slate-800 rounded-2xl space-y-3">
      <Tag class="w-10 h-10 text-slate-700 mx-auto animate-pulse" />
      <h4 class="font-bold text-slate-350">Nenhum cupom de desconto criado</h4>
      <p class="text-xs text-slate-500 max-w-xs mx-auto leading-relaxed">
        Crie cupons promocionais para engajar seus clientes com descontos fixos ou percentuais.
      </p>
    </div>

    <!-- Tabela CRUD de Cupons -->
    <div class="border rounded-2xl overflow-hidden shadow-xl transition-colors duration-300 animate-in fade-in"
      v-else
      :class="themeMode === 'dark' ? 'bg-slate-900/30 border-slate-900' : 'bg-white border-slate-200'"
    >
      <div class="overflow-x-auto">
        <Table>
          <TableHeader class="border-b transition-colors"
            :class="themeMode === 'dark' ? 'bg-slate-950/60 border-slate-900' : 'bg-slate-50 border-slate-200'"
          >
            <TableRow>
              <TableHead class="text-slate-500 font-bold uppercase text-[10px] tracking-wider w-36">Código</TableHead>
              <TableHead class="text-slate-500 font-bold uppercase text-[10px] tracking-wider">Tipo</TableHead>
              <TableHead class="text-center text-slate-500 font-bold uppercase text-[10px] tracking-wider">Valor do Desconto</TableHead>
              <TableHead class="text-center text-slate-500 font-bold uppercase text-[10px] tracking-wider">Compra Mínima</TableHead>
              <TableHead class="text-center text-slate-500 font-bold uppercase text-[10px] tracking-wider">Expiração</TableHead>
              <TableHead class="text-center text-slate-500 font-bold uppercase text-[10px] tracking-wider">Usos / Limite</TableHead>
              <TableHead class="text-center text-slate-500 font-bold uppercase text-[10px] tracking-wider">Status</TableHead>
              <TableHead class="text-right text-slate-500 font-bold uppercase text-[10px] tracking-wider w-24">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow 
              v-for="coupon in couponsList" 
              :key="coupon.id"
              class="border-b transition-colors"
              :class="themeMode === 'dark' ? 'border-slate-900/50 hover:bg-slate-900/10' : 'border-slate-100 hover:bg-slate-50'"
            >
              <!-- Código -->
              <TableCell class="font-mono font-black text-slate-800 text-sm">
                <span class="inline-flex items-center gap-1 bg-primary/5 px-2 py-0.5 rounded-lg text-primary border border-primary/20">
                  <Tag class="w-3.5 h-3.5 shrink-0" />
                  {{ coupon.code }}
                </span>
              </TableCell>

              <!-- Tipo -->
              <TableCell class="text-xs font-semibold"
                :class="themeMode === 'dark' ? 'text-slate-300' : 'text-slate-600'"
              >
                {{ coupon.discount_type === 'percentage' ? 'Percentual (%)' : 'Fixo (R$)' }}
              </TableCell>

              <!-- Valor do Desconto -->
              <TableCell class="text-center font-extrabold text-xs md:text-sm"
                :class="themeMode === 'dark' ? 'text-slate-200' : 'text-slate-800'"
              >
                <span v-if="coupon.discount_type === 'percentage'" class="text-slate-850">
                  {{ coupon.discount_value }}%
                </span>
                <span v-else class="text-slate-850">
                  {{ formatPrice(coupon.discount_value) }}
                </span>
              </TableCell>

              <!-- Compra Mínima -->
              <TableCell class="text-center text-slate-500 font-medium text-xs">
                {{ coupon.min_purchase_cost ? formatPrice(coupon.min_purchase_cost) : 'Nenhuma' }}
              </TableCell>

              <!-- Expiração -->
              <TableCell class="text-center text-slate-500 text-xs">
                {{ formatDate(coupon.expiration_date) }}
              </TableCell>

              <!-- Usos / Limite -->
              <TableCell class="text-center text-xs font-semibold text-slate-600">
                <span class="font-bold text-slate-800">{{ coupon.used_count }}</span>
                <span class="text-slate-400"> / </span>
                <span class="text-slate-500">{{ coupon.limit_uses || '∞' }}</span>
              </TableCell>

              <!-- Status Badge -->
              <TableCell class="text-center">
                <span 
                  class="inline-block px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider"
                  :class="getCouponStatus(coupon).class"
                >
                  {{ getCouponStatus(coupon).text }}
                </span>
              </TableCell>

              <!-- Ações -->
              <TableCell class="text-right">
                <div class="flex items-center justify-end gap-1.5">
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    class="h-8 w-8 text-slate-450 hover:text-slate-900 hover:bg-slate-800 rounded-lg"
                    :class="themeMode === 'dark' ? 'hover:text-white hover:bg-slate-800' : 'hover:text-slate-900 hover:bg-slate-100'"
                    @click="openEditDialog(coupon)"
                  >
                    <Edit2 class="w-3.5 h-3.5" />
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    class="h-8 w-8 rounded-lg"
                    :class="themeMode === 'dark' ? 'text-slate-500 hover:text-red-400 hover:bg-red-955/20' : 'text-slate-450 hover:text-red-500 hover:bg-red-50'"
                    @click="handleDeleteCoupon(coupon.id!)"
                  >
                    <Trash2 class="w-3.5 h-3.5" />
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </div>
    </div>

    <!-- Modal Form de Cupom (Novo / Editar) -->
    <Dialog v-model:open="showFormDialog">
      <DialogContent class="sm:max-w-[500px] rounded-2xl shadow-2xl overflow-y-auto max-h-[90vh] transition-colors duration-300"
        :class="themeMode === 'dark' ? 'bg-slate-900 border-slate-800 text-slate-100' : 'bg-white border-slate-200 text-slate-900'"
      >
        <DialogHeader>
          <DialogTitle class="text-lg font-bold flex items-center gap-2">
            <Tag class="w-5 h-5 text-primary" />
            {{ isEditing ? 'Editar Cupom Promocional' : 'Novo Cupom Promocional' }}
          </DialogTitle>
        </DialogHeader>

        <div class="space-y-4 my-3 text-xs md:text-sm">
          <!-- Código do Cupom -->
          <div class="space-y-1.5">
            <label class="text-xs font-semibold text-slate-500">Código do Cupom (Caixa Alta)</label>
            <Input 
              v-model="formCode" 
              placeholder="Ex: PROMO20" 
              class="rounded-xl placeholder:text-slate-400 font-mono font-bold uppercase focus-visible:ring-primary"
              :class="themeMode === 'dark' ? 'bg-slate-950 border-slate-800 text-white' : 'bg-slate-100 border-slate-200 text-slate-900'"
              :disabled="isEditing"
            />
            <p class="text-[9px] text-slate-500">O código será salvo em caixa alta e deve ser único (Ex: CUPOMGRATIS, VIP30).</p>
          </div>

          <!-- Tipo e Valor de Desconto -->
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div class="space-y-1.5">
              <label class="text-xs font-semibold text-slate-500">Tipo de Desconto</label>
              <select 
                v-model="formDiscountType"
                class="flex h-10 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-900 focus-visible:ring-primary focus:ring-1 focus:ring-primary outline-none transition-colors"
                :class="themeMode === 'dark' ? 'bg-slate-950 border-slate-800 text-white' : 'bg-slate-100 border-slate-205 text-slate-900'"
              >
                <option value="percentage">Percentual (%)</option>
                <option value="fixed">Fixo (R$)</option>
              </select>
            </div>
            <div class="space-y-1.5">
              <label class="text-xs font-semibold text-slate-500">
                {{ formDiscountType === 'percentage' ? 'Valor do Desconto (%)' : 'Valor do Desconto (R$)' }}
              </label>
              <Input 
                v-model="formDiscountValue" 
                type="number"
                step="0.01"
                placeholder="Ex: 10" 
                class="rounded-xl focus-visible:ring-primary"
                :class="themeMode === 'dark' ? 'bg-slate-950 border-slate-800 text-white' : 'bg-slate-100 border-slate-200 text-slate-900'"
              />
            </div>
          </div>

          <!-- Mínimo de Compra e Expiração -->
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div class="space-y-1.5">
              <label class="text-xs font-semibold text-slate-500">Compra Mínima (R$)</label>
              <Input 
                v-model="formMinPurchaseCost" 
                type="number"
                step="0.01"
                placeholder="Ex: 50.00" 
                class="rounded-xl focus-visible:ring-primary"
                :class="themeMode === 'dark' ? 'bg-slate-950 border-slate-800 text-white' : 'bg-slate-100 border-slate-200 text-slate-900'"
              />
            </div>
            <div class="space-y-1.5">
              <label class="text-xs font-semibold text-slate-500">Data de Expiração (Opcional)</label>
              <Input 
                v-model="formExpirationDate" 
                type="date"
                class="rounded-xl focus-visible:ring-primary"
                :class="themeMode === 'dark' ? 'bg-slate-950 border-slate-800 text-white' : 'bg-slate-100 border-slate-200 text-slate-900'"
              />
            </div>
          </div>

          <!-- Limite de Usos e Usos Atuais -->
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div class="space-y-1.5">
              <label class="text-xs font-semibold text-slate-500">Limite de Usos (Opcional)</label>
              <Input 
                v-model="formLimitUses" 
                type="number"
                placeholder="Sem limite (∞)" 
                class="rounded-xl focus-visible:ring-primary"
                :class="themeMode === 'dark' ? 'bg-slate-950 border-slate-800 text-white' : 'bg-slate-100 border-slate-200 text-slate-900'"
              />
            </div>
            <div class="space-y-1.5">
              <label class="text-xs font-semibold text-slate-500">Usos Atuais (Apenas Leitura)</label>
              <Input 
                v-model="formUsedCount" 
                type="number"
                disabled
                class="rounded-xl cursor-not-allowed bg-slate-50 text-slate-400"
              />
            </div>
          </div>

          <!-- Status Ativo/Inativo -->
          <div class="flex items-center gap-3 p-3.5 rounded-xl border"
            :class="themeMode === 'dark' ? 'bg-slate-950/40 border-slate-800' : 'bg-slate-50 border-slate-200'"
          >
            <input 
              id="coupon-active-checkbox"
              v-model="formIsActive" 
              type="checkbox"
              class="w-4.5 h-4.5 text-primary rounded border-slate-350 focus:ring-primary focus:ring-opacity-50 cursor-pointer"
            />
            <label for="coupon-active-checkbox" class="text-xs font-bold select-none cursor-pointer flex-1"
              :class="themeMode === 'dark' ? 'text-slate-400' : 'text-slate-650'"
            >
              Este cupom de desconto está ativo e disponível para uso
            </label>
          </div>

          <!-- Erros do Formulário -->
          <div v-if="formError" class="p-3 rounded-xl bg-red-950/30 border border-red-500/30 text-red-400 text-xs flex items-center gap-2 animate-shake">
            <AlertTriangle class="w-4 h-4 shrink-0" />
            <span>{{ formError }}</span>
          </div>
        </div>

        <DialogFooter class="border-t pt-4 mt-1"
          :class="themeMode === 'dark' ? 'border-slate-800/80' : 'border-slate-150'"
        >
          <Button 
            variant="outline" 
            class="rounded-xl font-bold border shadow-sm"
            :class="themeMode === 'dark' 
              ? 'bg-slate-950 border-slate-800 hover:bg-slate-800 text-slate-300' 
              : 'bg-white border-slate-205 hover:bg-slate-100 text-slate-755'"
            :disabled="isSaving"
            @click="showFormDialog = false"
          >
            Cancelar
          </Button>
          <Button 
            class="rounded-xl bg-primary hover:bg-primary/95 text-primary-foreground font-bold shadow-md shadow-primary/20"
            :disabled="isSaving"
            @click="handleSaveCoupon"
          >
            <Loader2 v-if="isSaving" class="w-4 h-4 animate-spin mr-1.5" />
            {{ isSaving ? 'Salvando...' : 'Salvar Cupom' }}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  </div>
</template>
