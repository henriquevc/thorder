<script setup lang="ts">
import { ref, watch, nextTick, onBeforeUnmount } from 'vue'
import Cropper from 'cropperjs'
import 'cropperjs/dist/cropper.css'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import {
  Crop,
  Square,
  RectangleHorizontal,
  Maximize2,
  ZoomIn,
  ZoomOut,
  RotateCw,
  RotateCcw,
  RefreshCw,
  Check,
  Sparkles,
  Loader2
} from 'lucide-vue-next'
import { themeMode } from '@/services/store'

interface Props {
  open: boolean
  imageSrc: string
  title?: string
  initialAspectRatio?: '1:1' | '4:3' | 'free'
  maxWidth?: number
  maxHeight?: number
  quality?: number
}

const props = withDefaults(defineProps<Props>(), {
  title: 'Ajustar e Recortar Foto',
  initialAspectRatio: '1:1',
  maxWidth: 1200,
  maxHeight: 1200,
  quality: 0.88
})

const emit = defineEmits<{
  (e: 'update:open', value: boolean): void
  (e: 'crop', croppedBase64: string): void
  (e: 'cancel'): void
}>()

const imageEl = ref<HTMLImageElement | null>(null)
let cropperInstance: Cropper | null = null

const selectedRatio = ref<'1:1' | '4:3' | 'free'>(props.initialAspectRatio)
const isProcessing = ref(false)

const getNumericRatio = (ratio: '1:1' | '4:3' | 'free'): number => {
  if (ratio === '1:1') return 1
  if (ratio === '4:3') return 4 / 3
  return NaN
}

const destroyCropper = () => {
  if (cropperInstance) {
    cropperInstance.destroy()
    cropperInstance = null
  }
}

const initCropper = async () => {
  await nextTick()
  if (!imageEl.value || !props.imageSrc) return

  destroyCropper()

  // Aguarda imagem carregar completamente no elemento antes de inicializar
  const img = imageEl.value

  const setupInstance = () => {
    if (!imageEl.value) return
    cropperInstance = new Cropper(imageEl.value, {
      aspectRatio: getNumericRatio(selectedRatio.value),
      viewMode: 1, // Não permite arrastar área fora dos limites da foto
      dragMode: 'move',
      autoCropArea: 0.95,
      restore: false,
      guides: true,
      center: true,
      highlight: true,
      cropBoxMovable: true,
      cropBoxResizable: true,
      toggleDragModeOnDblclick: false,
      responsive: true,
      checkOrientation: true
    })
  }

  if (img.complete && img.naturalWidth > 0) {
    setupInstance()
  } else {
    img.onload = () => {
      setupInstance()
    }
  }
}

// Watchers
watch(
  () => props.open,
  (isOpen) => {
    if (isOpen) {
      selectedRatio.value = props.initialAspectRatio
      // Dá tempo do modal Dialog abrir e calcular dimensões
      setTimeout(() => {
        initCropper()
      }, 120)
    } else {
      destroyCropper()
    }
  }
)

watch(
  () => props.imageSrc,
  () => {
    if (props.open) {
      setTimeout(() => {
        initCropper()
      }, 120)
    }
  }
)

const setAspectRatio = (ratio: '1:1' | '4:3' | 'free') => {
  selectedRatio.value = ratio
  if (cropperInstance) {
    cropperInstance.setAspectRatio(getNumericRatio(ratio))
  }
}

const handleZoom = (ratio: number) => {
  if (cropperInstance) {
    cropperInstance.zoom(ratio)
  }
}

const handleRotate = (degree: number) => {
  if (cropperInstance) {
    cropperInstance.rotate(degree)
  }
}

const handleReset = () => {
  if (cropperInstance) {
    cropperInstance.reset()
    cropperInstance.setAspectRatio(getNumericRatio(selectedRatio.value))
  }
}

const handleConfirmCrop = async () => {
  if (!cropperInstance) return

  isProcessing.value = true

  try {
    const canvas = cropperInstance.getCroppedCanvas({
      maxWidth: props.maxWidth,
      maxHeight: props.maxHeight,
      fillColor: '#ffffff',
      imageSmoothingEnabled: true,
      imageSmoothingQuality: 'high'
    })

    if (!canvas) {
      throw new Error('Falha ao renderizar a imagem recortada.')
    }

    // Exporta em WebP de alta fidelidade
    let finalDataUrl = canvas.toDataURL('image/webp', props.quality)

    // Fallback para JPEG caso navegador muito antigo não suporte WebP
    if (!finalDataUrl.startsWith('data:image/webp')) {
      finalDataUrl = canvas.toDataURL('image/jpeg', props.quality)
    }

    emit('crop', finalDataUrl)
    emit('update:open', false)
  } catch (err) {
    console.error('Erro ao recortar imagem:', err)
  } finally {
    isProcessing.value = false
  }
}

const handleClose = () => {
  emit('cancel')
  emit('update:open', false)
}

onBeforeUnmount(() => {
  destroyCropper()
})
</script>

<template>
  <Dialog :open="open" @update:open="(val: boolean) => !val && handleClose()">
    <DialogContent
      class="sm:max-w-[620px] p-4 sm:p-6 rounded-3xl shadow-2xl border transition-colors duration-300 overflow-hidden"
      :class="themeMode === 'dark' ? 'bg-slate-900 border-slate-800 text-slate-100' : 'bg-white border-slate-200 text-slate-900'"
    >
      <!-- Cabeçalho -->
      <DialogHeader class="space-y-1">
        <DialogTitle class="text-base sm:text-lg font-bold flex items-center gap-2">
          <div class="w-8 h-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
            <Crop class="w-4 h-4" />
          </div>
          <span>{{ title }}</span>
        </DialogTitle>
        <DialogDescription class="text-xs text-slate-400">
          Enquadre o produto, escolha a proporção desejada e confirme para salvar em alta definição.
        </DialogDescription>
      </DialogHeader>

      <!-- Seletor de Aspect Ratio -->
      <div class="flex items-center justify-between gap-2 pt-2">
        <span class="text-[11px] font-bold uppercase tracking-wider text-slate-400">Proporção:</span>
        <div class="flex items-center gap-1.5 p-1 rounded-xl border bg-slate-950/20"
          :class="themeMode === 'dark' ? 'border-slate-800' : 'border-slate-200'"
        >
          <Button
            type="button"
            variant="ghost"
            size="sm"
            class="h-7 px-2.5 rounded-lg text-xs font-semibold gap-1.5 transition-all"
            :class="selectedRatio === '1:1' 
              ? 'bg-primary text-primary-foreground shadow-sm' 
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'"
            @click="setAspectRatio('1:1')"
          >
            <Square class="w-3.5 h-3.5" />
            <span>1:1 Quadrado</span>
          </Button>

          <Button
            type="button"
            variant="ghost"
            size="sm"
            class="h-7 px-2.5 rounded-lg text-xs font-semibold gap-1.5 transition-all"
            :class="selectedRatio === '4:3' 
              ? 'bg-primary text-primary-foreground shadow-sm' 
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'"
            @click="setAspectRatio('4:3')"
          >
            <RectangleHorizontal class="w-3.5 h-3.5" />
            <span>4:3 Catálogo</span>
          </Button>

          <Button
            type="button"
            variant="ghost"
            size="sm"
            class="h-7 px-2.5 rounded-lg text-xs font-semibold gap-1.5 transition-all"
            :class="selectedRatio === 'free' 
              ? 'bg-primary text-primary-foreground shadow-sm' 
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'"
            @click="setAspectRatio('free')"
          >
            <Maximize2 class="w-3.5 h-3.5" />
            <span>Livre</span>
          </Button>
        </div>
      </div>

      <!-- Área de Visualização e Recorte do Cropper -->
      <div 
        class="relative w-full h-[320px] sm:h-[380px] rounded-2xl overflow-hidden border bg-slate-950 flex items-center justify-center cropper-wrapper"
        :class="themeMode === 'dark' ? 'border-slate-800' : 'border-slate-300'"
      >
        <img
          ref="imageEl"
          :src="imageSrc"
          alt="Imagem para recorte"
          class="max-w-full max-h-full block opacity-0 select-none"
        />
      </div>

      <!-- Barra de Ferramentas de Edição -->
      <div class="flex flex-wrap items-center justify-between gap-2 p-2 rounded-2xl border"
        :class="themeMode === 'dark' ? 'bg-slate-950/40 border-slate-800/80' : 'bg-slate-50 border-slate-200'"
      >
        <div class="flex items-center gap-1">
          <!-- Zoom Out -->
          <Button
            type="button"
            variant="ghost"
            size="icon"
            class="h-8 w-8 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800/60"
            title="Diminuir Zoom (-)"
            @click="handleZoom(-0.1)"
          >
            <ZoomOut class="w-4 h-4" />
          </Button>

          <!-- Zoom In -->
          <Button
            type="button"
            variant="ghost"
            size="icon"
            class="h-8 w-8 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800/60"
            title="Aumentar Zoom (+)"
            @click="handleZoom(0.1)"
          >
            <ZoomIn class="w-4 h-4" />
          </Button>

          <div class="w-px h-4 bg-slate-700/50 mx-1"></div>

          <!-- Rotação Anti-horária -->
          <Button
            type="button"
            variant="ghost"
            size="icon"
            class="h-8 w-8 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800/60"
            title="Girar 90° para esquerda"
            @click="handleRotate(-90)"
          >
            <RotateCcw class="w-4 h-4" />
          </Button>

          <!-- Rotação Horária -->
          <Button
            type="button"
            variant="ghost"
            size="icon"
            class="h-8 w-8 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800/60"
            title="Girar 90° para direita"
            @click="handleRotate(90)"
          >
            <RotateCw class="w-4 h-4" />
          </Button>

          <div class="w-px h-4 bg-slate-700/50 mx-1"></div>

          <!-- Resetar -->
          <Button
            type="button"
            variant="ghost"
            size="icon"
            class="h-8 w-8 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800/60"
            title="Restaurar enquadramento original"
            @click="handleReset"
          >
            <RefreshCw class="w-3.5 h-3.5" />
          </Button>
        </div>

        <!-- Tag de Otimização -->
        <div class="flex items-center gap-1.5 text-[11px] text-primary font-medium px-2 py-1 rounded-lg bg-primary/10 border border-primary/20">
          <Sparkles class="w-3 h-3" />
          <span>WebP HD Otimizado</span>
        </div>
      </div>

      <!-- Rodapé com Ações -->
      <DialogFooter class="flex sm:justify-end gap-2 pt-2 border-t"
        :class="themeMode === 'dark' ? 'border-slate-800/60' : 'border-slate-200'"
      >
        <Button
          type="button"
          variant="outline"
          class="rounded-xl text-xs font-semibold px-4"
          :disabled="isProcessing"
          @click="handleClose"
        >
          Cancelar
        </Button>

        <Button
          type="button"
          class="rounded-xl text-xs font-bold px-5 bg-primary hover:bg-primary/90 text-primary-foreground gap-1.5 shadow-lg shadow-primary/20"
          :disabled="isProcessing"
          @click="handleConfirmCrop"
        >
          <Loader2 v-if="isProcessing" class="w-3.5 h-3.5 animate-spin" />
          <Check v-else class="w-3.5 h-3.5" />
          <span>{{ isProcessing ? 'Otimizando Imagem...' : 'Confirmar Recorte' }}</span>
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>

<style>
/* Customização do CropperJS para visual moderno e integrado */
.cropper-wrapper .cropper-view-box {
  outline: 2px solid #863bff;
  outline-color: var(--primary, #863bff);
  border-radius: 4px;
}

.cropper-wrapper .cropper-line {
  background-color: #863bff;
  opacity: 0.3;
}

.cropper-wrapper .cropper-point {
  background-color: #863bff;
  width: 8px;
  height: 8px;
  border-radius: 2px;
}

.cropper-wrapper .cropper-modal {
  background-color: rgba(0, 0, 0, 0.75);
}

.cropper-wrapper .cropper-dashed {
  border-color: rgba(255, 255, 255, 0.4);
}
</style>
