<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { 
  KeyRound, 
  Lock, 
  Eye, 
  EyeOff, 
  Loader2, 
  AlertTriangle, 
  CheckCircle2, 
  ShieldCheck,
  User as UserIcon
} from 'lucide-vue-next'
import { 
  themeMode, 
  currentUser, 
  changeUserPassword, 
  resetUserPassword,
  type User 
} from '@/services/store'
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription, 
  DialogFooter 
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

const props = defineProps<{
  open: boolean
  targetUser?: User | null
}>()

const emit = defineEmits<{
  (e: 'update:open', value: boolean): void
  (e: 'success'): void
}>()

const currentPassword = ref('')
const newPassword = ref('')
const confirmPassword = ref('')

const showCurrentPassword = ref(false)
const showNewPassword = ref(false)
const showConfirmPassword = ref(false)

const isSubmitting = ref(false)
const errorMessage = ref('')
const successMessage = ref('')

const isResetMode = computed(() => !!props.targetUser)

const isLengthValid = computed(() => newPassword.value.length >= 4)
const doPasswordsMatch = computed(() => 
  newPassword.value.length > 0 && 
  confirmPassword.value.length > 0 && 
  newPassword.value === confirmPassword.value
)

const resetForm = () => {
  currentPassword.value = ''
  newPassword.value = ''
  confirmPassword.value = ''
  showCurrentPassword.value = false
  showNewPassword.value = false
  showConfirmPassword.value = false
  errorMessage.value = ''
  successMessage.value = ''
  isSubmitting.value = false
}

// Limpa estado quando o modal abre ou fecha
watch(() => props.open, (isOpen) => {
  if (isOpen) {
    resetForm()
  }
})

const handleClose = () => {
  if (!isSubmitting.value) {
    emit('update:open', false)
  }
}

const handleSubmit = async () => {
  errorMessage.value = ''
  successMessage.value = ''

  if (!isResetMode.value && !currentPassword.value) {
    errorMessage.value = 'Por favor, digite sua senha atual.'
    return
  }

  if (!newPassword.value) {
    errorMessage.value = 'Por favor, digite a nova senha.'
    return
  }

  if (newPassword.value.length < 4) {
    errorMessage.value = 'A nova senha deve ter no mínimo 4 caracteres.'
    return
  }

  if (newPassword.value !== confirmPassword.value) {
    errorMessage.value = 'A confirmação de senha não confere com a nova senha.'
    return
  }

  if (!isResetMode.value && currentPassword.value === newPassword.value) {
    errorMessage.value = 'A nova senha deve ser diferente da senha atual.'
    return
  }

  isSubmitting.value = true

  try {
    if (isResetMode.value && props.targetUser) {
      if (!props.targetUser.id) {
        throw new Error('Identificador do usuário inválido.')
      }
      await resetUserPassword(props.targetUser.id, newPassword.value)
      successMessage.value = `Senha do usuário @${props.targetUser.username} redefinida com sucesso!`
    } else {
      await changeUserPassword(currentPassword.value, newPassword.value)
      successMessage.value = 'Sua senha foi alterada com sucesso!'
    }

    emit('success')

    setTimeout(() => {
      emit('update:open', false)
      resetForm()
    }, 1400)
  } catch (err: any) {
    errorMessage.value = err.message || 'Ocorreu um erro ao atualizar a senha. Tente novamente.'
  } finally {
    isSubmitting.value = false
  }
}
</script>

<template>
  <Dialog :open="open" @update:open="emit('update:open', $event)">
    <DialogContent 
      class="max-w-md rounded-3xl p-6 shadow-2xl border transition-colors duration-300 backdrop-blur-xl"
      :class="themeMode === 'dark' ? 'bg-slate-900/95 border-slate-800 text-slate-100' : 'bg-white/95 border-slate-200 text-slate-900'"
    >
      <DialogHeader class="space-y-2 pb-2">
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 rounded-2xl bg-gradient-to-tr from-brand-start to-brand-end flex items-center justify-center text-white shadow-md shadow-primary/20 shrink-0">
            <KeyRound class="w-5 h-5" />
          </div>
          <div>
            <DialogTitle class="text-lg font-black tracking-tight flex items-center gap-2">
              <span v-if="isResetMode">Redefinir Senha de Usuário</span>
              <span v-else>Alterar Minha Senha</span>
            </DialogTitle>
            <DialogDescription class="text-xs text-slate-400">
              <span v-if="isResetMode && targetUser">
                Defina uma nova senha de acesso para o colaborador 
                <strong class="font-bold text-foreground">@{{ targetUser.username }}</strong>.
              </span>
              <span v-else>
                Atualize sua credencial de acesso ao painel com segurança.
              </span>
            </DialogDescription>
          </div>
        </div>

        <!-- Tag do Usuário Alvo -->
        <div v-if="isResetMode && targetUser" class="pt-2">
          <div class="flex items-center gap-2.5 p-3 rounded-2xl border"
            :class="themeMode === 'dark' ? 'bg-slate-950/60 border-slate-800' : 'bg-slate-50 border-slate-200'"
          >
            <div class="w-8 h-8 rounded-xl bg-primary/15 text-primary flex items-center justify-center font-bold text-xs">
              {{ targetUser.name.charAt(0) }}
            </div>
            <div class="flex-1 min-w-0">
              <div class="text-xs font-bold truncate">{{ targetUser.name }}</div>
              <div class="text-[11px] font-mono text-slate-400">@{{ targetUser.username }}</div>
            </div>
            <span class="text-[10px] font-bold px-2 py-0.5 rounded-full bg-primary/10 text-primary uppercase">
              {{ targetUser.role === 'superadmin' ? 'Super Admin' : 'Lojista' }}
            </span>
          </div>
        </div>
      </DialogHeader>

      <form @submit.prevent="handleSubmit" class="space-y-4 pt-1">
        <!-- Campo: Senha Atual (apenas para alteração própria) -->
        <div v-if="!isResetMode" class="space-y-1.5">
          <label class="text-xs font-semibold"
            :class="themeMode === 'dark' ? 'text-slate-300' : 'text-slate-700'"
          >
            Senha Atual *
          </label>
          <div class="relative">
            <Input 
              v-model="currentPassword"
              :type="showCurrentPassword ? 'text' : 'password'"
              autocomplete="current-password"
              placeholder="Digite sua senha atual"
              required
              class="rounded-xl pl-9 pr-10 text-xs sm:text-sm focus-visible:ring-primary"
              :class="themeMode === 'dark' ? 'bg-slate-950 border-slate-800 text-white placeholder:text-slate-700' : 'bg-slate-50 border-slate-200 text-slate-900 placeholder:text-slate-400'"
            />
            <Lock class="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
            <Button 
              type="button" 
              variant="ghost" 
              size="icon" 
              class="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 text-slate-400 hover:text-foreground rounded-lg"
              @click="showCurrentPassword = !showCurrentPassword"
            >
              <EyeOff v-if="showCurrentPassword" class="w-3.5 h-3.5" />
              <Eye v-else class="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>

        <!-- Campo: Nova Senha -->
        <div class="space-y-1.5">
          <label class="text-xs font-semibold"
            :class="themeMode === 'dark' ? 'text-slate-300' : 'text-slate-700'"
          >
            Nova Senha *
          </label>
          <div class="relative">
            <Input 
              v-model="newPassword"
              :type="showNewPassword ? 'text' : 'password'"
              autocomplete="new-password"
              placeholder="Mínimo de 4 caracteres"
              required
              class="rounded-xl pl-9 pr-10 text-xs sm:text-sm focus-visible:ring-primary"
              :class="themeMode === 'dark' ? 'bg-slate-950 border-slate-800 text-white placeholder:text-slate-700' : 'bg-slate-50 border-slate-200 text-slate-900 placeholder:text-slate-400'"
            />
            <KeyRound class="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
            <Button 
              type="button" 
              variant="ghost" 
              size="icon" 
              class="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 text-slate-400 hover:text-foreground rounded-lg"
              @click="showNewPassword = !showNewPassword"
            >
              <EyeOff v-if="showNewPassword" class="w-3.5 h-3.5" />
              <Eye v-else class="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>

        <!-- Campo: Confirmar Nova Senha -->
        <div class="space-y-1.5">
          <label class="text-xs font-semibold"
            :class="themeMode === 'dark' ? 'text-slate-300' : 'text-slate-700'"
          >
            Confirmar Nova Senha *
          </label>
          <div class="relative">
            <Input 
              v-model="confirmPassword"
              :type="showConfirmPassword ? 'text' : 'password'"
              autocomplete="new-password"
              placeholder="Digite novamente a nova senha"
              required
              class="rounded-xl pl-9 pr-10 text-xs sm:text-sm focus-visible:ring-primary"
              :class="themeMode === 'dark' ? 'bg-slate-950 border-slate-800 text-white placeholder:text-slate-700' : 'bg-slate-50 border-slate-200 text-slate-900 placeholder:text-slate-400'"
            />
            <ShieldCheck class="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
            <Button 
              type="button" 
              variant="ghost" 
              size="icon" 
              class="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 text-slate-400 hover:text-foreground rounded-lg"
              @click="showConfirmPassword = !showConfirmPassword"
            >
              <EyeOff v-if="showConfirmPassword" class="w-3.5 h-3.5" />
              <Eye v-else class="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>

        <!-- Dicas / Requisitos visuais sutis -->
        <div class="p-3 rounded-xl border text-[11px] space-y-1"
          :class="themeMode === 'dark' ? 'bg-slate-950/40 border-slate-800 text-slate-400' : 'bg-slate-50 border-slate-200 text-slate-600'"
        >
          <div class="flex items-center gap-1.5" :class="isLengthValid ? 'text-emerald-500 font-semibold' : ''">
            <span class="w-1.5 h-1.5 rounded-full" :class="isLengthValid ? 'bg-emerald-500' : 'bg-slate-400'"></span>
            <span>Mínimo de 4 caracteres</span>
          </div>
          <div v-if="confirmPassword" class="flex items-center gap-1.5" :class="doPasswordsMatch ? 'text-emerald-500 font-semibold' : 'text-amber-500'">
            <span class="w-1.5 h-1.5 rounded-full" :class="doPasswordsMatch ? 'bg-emerald-500' : 'bg-amber-500'"></span>
            <span>{{ doPasswordsMatch ? 'As senhas coincidem' : 'As senhas não coincidem' }}</span>
          </div>
        </div>

        <!-- Mensagens de Erro e Sucesso -->
        <div v-if="errorMessage" class="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs flex items-center gap-2 animate-in fade-in duration-200">
          <AlertTriangle class="w-4 h-4 shrink-0 text-red-500" />
          <span>{{ errorMessage }}</span>
        </div>

        <div v-if="successMessage" class="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs flex items-center gap-2 animate-in fade-in duration-200">
          <CheckCircle2 class="w-4 h-4 shrink-0 text-emerald-500" />
          <span>{{ successMessage }}</span>
        </div>

        <DialogFooter class="pt-3 gap-2 sm:gap-0">
          <Button 
            type="button" 
            variant="outline" 
            @click="handleClose"
            :disabled="isSubmitting"
            class="rounded-xl text-xs font-semibold"
          >
            Cancelar
          </Button>
          <Button 
            type="submit" 
            :disabled="isSubmitting || !isLengthValid || !doPasswordsMatch"
            class="rounded-xl bg-primary text-primary-foreground font-bold text-xs shadow-md shadow-primary/20 flex items-center gap-1.5"
          >
            <Loader2 v-if="isSubmitting" class="w-4 h-4 animate-spin" />
            <KeyRound v-else class="w-4 h-4" />
            <span>{{ isSubmitting ? 'Salvando...' : (isResetMode ? 'Salvar Nova Senha' : 'Atualizar Senha') }}</span>
          </Button>
        </DialogFooter>
      </form>
    </DialogContent>
  </Dialog>
</template>
