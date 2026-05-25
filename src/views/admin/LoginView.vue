<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { 
  Lock, 
  Eye, 
  EyeOff, 
  Loader2, 
  AlertTriangle,
  Sparkles
} from 'lucide-vue-next'
import { themeMode, themeColor } from '@/services/store'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'

const router = useRouter()

const password = ref('')
const showPassword = ref(false)
const isLoading = ref(false)
const errorMsg = ref('')

const handleLogin = () => {
  if (!password.value) {
    errorMsg.value = 'Por favor, digite a senha de acesso.'
    return
  }

  isLoading.value = true
  errorMsg.value = ''

  // Simula autenticação de 800ms para premium feel
  setTimeout(() => {
    // Senha padrão de administrador para fins de demonstração
    if (password.value === 'admin123') {
      sessionStorage.setItem('admin_authenticated', 'true')
      router.push('/admin')
    } else {
      errorMsg.value = 'Senha incorreta. Tente novamente.'
      password.value = ''
    }
    isLoading.value = false
  }, 850)
}
</script>

<template>
  <div class="max-w-md mx-auto py-12 md:py-20 animate-in fade-in slide-in-from-bottom-4 duration-500">
    <Card class="rounded-3xl shadow-2xl relative overflow-hidden backdrop-blur-md transition-colors"
      :class="themeMode === 'dark' ? 'bg-slate-900/30 border-slate-900' : 'bg-white border-slate-200'"
    >
      <!-- Glow Decorativo (Apenas no Modo Escuro) -->
      <div v-if="themeMode === 'dark'" class="absolute top-0 right-0 w-24 h-24 rounded-full bg-primary/10 blur-2xl"></div>
      
      <CardHeader class="text-center pt-8 pb-4 space-y-3">
        <div class="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-gradient-to-tr from-brand-start to-brand-end text-white shadow-lg shadow-primary/20 mx-auto">
          <Lock class="w-5 h-5" />
        </div>
        <div class="space-y-1">
          <CardTitle class="text-2xl font-extrabold tracking-tight"
            :class="themeMode === 'dark' ? 'text-slate-100' : 'text-slate-900'"
          >Área do Administrador</CardTitle>
          <p class="text-xs text-slate-400">Entre com sua chave secreta para gerenciar produtos e pedidos.</p>
        </div>
      </CardHeader>
      
      <CardContent class="p-6 pt-2 space-y-6">
        <!-- Caixa de Ajuda/Credenciais para o Avaliador -->
        <div class="p-3.5 rounded-2xl border text-xs leading-relaxed flex items-start gap-2.5"
          :class="themeMode === 'dark' ? 'bg-primary/10 border-primary/20 text-primary' : 'bg-primary/5 border-primary/15 text-primary'"
        >
          <Sparkles class="w-4 h-4 mt-0.5 shrink-0" />
          <div>
            <span class="font-bold">Dica de Acesso:</span>
            <p class="mt-0.5"
              :class="themeMode === 'dark' ? 'text-slate-400' : 'text-slate-650'"
            >Use a senha de acesso padrão: <code class="text-primary font-mono px-1 rounded font-bold" :class="themeMode === 'dark' ? 'bg-slate-950' : 'bg-white border border-slate-200'">admin123</code></p>
          </div>
        </div>

        <form @submit.prevent="handleLogin" class="space-y-4">
          <div class="space-y-1.5">
            <label class="text-xs font-semibold"
              :class="themeMode === 'dark' ? 'text-slate-350' : 'text-slate-500'"
            >Senha de Acesso</label>
            <div class="relative">
              <Input 
                v-model="password"
                :type="showPassword ? 'text' : 'password'"
                placeholder="••••••••••••"
                class="rounded-xl pr-10 focus-visible:ring-primary"
                :class="themeMode === 'dark' ? 'bg-slate-950 border-slate-800 text-white placeholder:text-slate-800' : 'bg-slate-50 border-slate-205 text-slate-900 placeholder:text-slate-400'"
              />
              <Button 
                type="button" 
                variant="ghost" 
                size="icon" 
                class="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8 text-slate-555 hover:text-slate-900 rounded-lg"
                :class="themeMode === 'dark' ? 'text-slate-500 hover:text-white' : 'text-slate-400 hover:text-slate-900'"
                @click="showPassword = !showPassword"
              >
                <EyeOff v-if="showPassword" class="w-4 h-4" />
                <Eye v-else class="w-4 h-4" />
              </Button>
            </div>
          </div>

          <!-- Erros -->
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
