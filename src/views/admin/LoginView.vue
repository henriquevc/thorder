<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { 
  Lock, 
  User as UserIcon,
  Eye, 
  EyeOff, 
  Loader2, 
  AlertTriangle
} from 'lucide-vue-next'
import { themeMode, loginUser } from '@/services/store'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'

const router = useRouter()

const username = ref('')
const password = ref('')
const showPassword = ref(false)
const isLoading = ref(false)
const errorMsg = ref('')

const handleLogin = async () => {
  if (!username.value.trim() || !password.value) {
    errorMsg.value = 'Por favor, digite seu usuário e sua senha de acesso.'
    return
  }

  isLoading.value = true
  errorMsg.value = ''

  try {
    const user = await loginUser(username.value, password.value)
    if (user) {
      router.push('/admin')
    }
  } catch (err: any) {
    errorMsg.value = err.message || 'Usuário ou senha incorretos. Tente novamente.'
  } finally {
    isLoading.value = false
  }
}
</script>

<template>
  <div class="max-w-md mx-auto py-12 md:py-20 animate-in fade-in slide-in-from-bottom-4 duration-500">
    <Card class="rounded-3xl shadow-2xl relative overflow-hidden backdrop-blur-md transition-colors"
      :class="themeMode === 'dark' ? 'bg-slate-900/30 border-slate-900' : 'bg-white border-slate-200'"
    >
      <!-- Glow Decorativo (Apenas no Modo Escuro) -->
      <div v-if="themeMode === 'dark'" class="absolute top-0 right-0 w-28 h-28 rounded-full bg-primary/10 blur-2xl"></div>
      
      <CardHeader class="text-center pt-8 pb-4 space-y-3">
        <div class="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-gradient-to-tr from-brand-start to-brand-end text-white shadow-lg shadow-primary/20 mx-auto">
          <Lock class="w-5 h-5" />
        </div>
        <div class="space-y-1">
          <CardTitle class="text-2xl font-extrabold tracking-tight"
            :class="themeMode === 'dark' ? 'text-slate-100' : 'text-slate-900'"
          >Painel Administrativo</CardTitle>
          <p class="text-xs text-slate-400">Entre com seu usuário para gerenciar sua loja ou plataforma.</p>
        </div>
      </CardHeader>
      
      <CardContent class="p-6 pt-2 space-y-6">
        <form @submit.prevent="handleLogin" class="space-y-4">
          <!-- Campo de Usuário -->
          <div class="space-y-1.5">
            <label class="text-xs font-semibold"
              :class="themeMode === 'dark' ? 'text-slate-300' : 'text-slate-600'"
            >Usuário de Acesso</label>
            <div class="relative">
              <Input 
                v-model="username"
                type="text"
                autocomplete="username"
                autocapitalize="none"
                placeholder="Ex: admin ou doceria"
                class="rounded-xl pl-10 focus-visible:ring-primary font-mono text-xs sm:text-sm"
                :class="themeMode === 'dark' ? 'bg-slate-950 border-slate-800 text-white placeholder:text-slate-700' : 'bg-slate-50 border-slate-200 text-slate-900 placeholder:text-slate-400'"
              />
              <UserIcon class="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
            </div>
          </div>

          <!-- Campo de Senha -->
          <div class="space-y-1.5">
            <label class="text-xs font-semibold"
              :class="themeMode === 'dark' ? 'text-slate-300' : 'text-slate-600'"
            >Senha</label>
            <div class="relative">
              <Input 
                v-model="password"
                :type="showPassword ? 'text' : 'password'"
                autocomplete="current-password"
                placeholder="••••••••••••"
                class="rounded-xl pl-10 pr-10 focus-visible:ring-primary"
                :class="themeMode === 'dark' ? 'bg-slate-950 border-slate-800 text-white placeholder:text-slate-700' : 'bg-slate-50 border-slate-200 text-slate-900 placeholder:text-slate-400'"
              />
              <Lock class="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
              <Button 
                type="button" 
                variant="ghost" 
                size="icon" 
                class="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8 text-slate-400 hover:text-slate-900 rounded-lg"
                :class="themeMode === 'dark' ? 'text-slate-500 hover:text-white' : 'text-slate-400 hover:text-slate-900'"
                @click="showPassword = !showPassword"
              >
                <EyeOff v-if="showPassword" class="w-4 h-4" />
                <Eye v-else class="w-4 h-4" />
              </Button>
            </div>
          </div>

          <!-- Mensagem de Erro -->
          <div v-if="errorMsg" class="p-3.5 rounded-2xl bg-red-950/30 border border-red-500/30 text-red-400 text-xs flex items-center gap-2 animate-shake">
            <AlertTriangle class="w-4 h-4 shrink-0" />
            <span>{{ errorMsg }}</span>
          </div>

          <!-- Botão Ação -->
          <Button 
            type="submit"
            class="w-full rounded-xl bg-primary hover:bg-primary/95 text-primary-foreground font-extrabold py-5 shadow-lg shadow-primary/20 flex items-center justify-center gap-1.5"
            :disabled="isLoading"
          >
            <Loader2 v-if="isLoading" class="w-4 h-4 animate-spin" />
            <span>{{ isLoading ? 'Autenticando...' : 'Acessar Painel' }}</span>
          </Button>
        </form>
      </CardContent>
    </Card>
  </div>
</template>
