<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { 
  Plus, 
  Edit2, 
  Trash2, 
  Image as ImageIcon,
  Loader2,
  CheckCircle,
  AlertTriangle,
  UploadCloud,
  FileText
} from 'lucide-vue-next'
import { 
  fetchProducts, 
  createProduct, 
  updateProduct, 
  deleteProduct, 
  themeMode,
  themeColor,
  type Product 
} from '@/services/store'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
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

const products = ref<Product[]>([])
const isLoading = ref(true)

// Formulário de Produto
const showFormDialog = ref(false)
const isEditing = ref(false)
const formProductId = ref<number | undefined>(undefined)

const formName = ref('')
const formDescription = ref('')
const formPrice = ref<number>(0)
const formCategory = ref('')
const formStock = ref<number>(0)
const formImageData = ref('') // Armazena a imagem base64

const isSaving = ref(false)
const formError = ref('')
const previewImage = ref('')

onMounted(async () => {
  await loadProducts()
})

const loadProducts = async () => {
  isLoading.value = true
  try {
    products.value = await fetchProducts()
  } catch (err) {
    console.error('Falha ao carregar produtos:', err)
  } finally {
    isLoading.value = false
  }
}

// Formatação do Preço
const formatPrice = (val: number) => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(val)
}

// Captura de Arquivo e Conversão para Base64
const handleFileChange = (event: Event) => {
  const target = event.target as HTMLInputElement
  const file = target.files?.[0]
  
  if (!file) return
  
  // Limita o tamanho do arquivo a 1.5MB para evitar peso excessivo na string base64 no SQLite
  if (file.size > 1.5 * 1024 * 1024) {
    alert('A imagem é muito grande! Escolha um arquivo de no máximo 1.5MB.')
    target.value = ''
    return
  }

  const reader = new FileReader()
  reader.onload = (e) => {
    const result = e.target?.result as string
    formImageData.value = result
    previewImage.value = result
  }
  reader.readAsDataURL(file)
}

// Reset do Formulário
const resetForm = () => {
  formProductId.value = undefined
  formName.value = ''
  formDescription.value = ''
  formPrice.value = 0
  formCategory.value = ''
  formStock.value = 0
  formImageData.value = ''
  previewImage.value = ''
  formError.value = ''
  isEditing.value = false
}

// Abrir para Cadastro
const openCreateDialog = () => {
  resetForm()
  showFormDialog.value = true
}

// Abrir para Edição
const openEditDialog = (product: Product) => {
  resetForm()
  isEditing.value = true
  formProductId.value = product.id
  formName.value = product.name
  formDescription.value = product.description
  formPrice.value = product.price
  formCategory.value = product.category
  formStock.value = product.stock
  formImageData.value = product.image_data
  previewImage.value = product.image_data
  
  showFormDialog.value = true
}

// Salvar Produto
const handleSaveProduct = async () => {
  if (!formName.value || !formDescription.value || formPrice.value <= 0 || !formCategory.value || formStock.value < 0) {
    formError.value = 'Por favor, preencha todos os campos do formulário corretamente.'
    return
  }

  if (!formImageData.value) {
    formError.value = 'Por favor, faça o upload de uma imagem para o produto.'
    return
  }

  isSaving.value = true
  formError.value = ''

  try {
    const productPayload = {
      name: formName.value.trim(),
      description: formDescription.value.trim(),
      price: Number(formPrice.value),
      category: formCategory.value.trim(),
      stock: Math.floor(Number(formStock.value)),
      image_data: formImageData.value
    }

    if (isEditing.value && formProductId.value !== undefined) {
      await updateProduct({
        ...productPayload,
        id: formProductId.value
      })
    } else {
      await createProduct(productPayload)
    }

    showFormDialog.value = false
    await loadProducts()
  } catch (err: any) {
    formError.value = err.message || 'Falha ao salvar produto no Turso DB.'
  } finally {
    isSaving.value = false
  }
}

// Excluir Produto
const handleDeleteProduct = async (productId: number) => {
  if (!confirm('Deseja realmente deletar este produto? Essa ação removerá o produto e suas fotos do banco do Turso.')) {
    return
  }
  
  try {
    await deleteProduct(productId)
    await loadProducts()
  } catch (err) {
    alert('Erro ao excluir produto.')
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
        >Gerenciar Produtos</h2>
        <p class="text-xs text-slate-400">Cadastre novos itens, gerencie estoques e controle fotos Base64 persistidas online.</p>
      </div>
      <Button 
        class="rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground font-bold gap-1.5 shrink-0 shadow-lg shadow-primary/20"
        @click="openCreateDialog"
      >
        <Plus class="w-4 h-4" />
        Novo Produto
      </Button>
    </div>

    <!-- Tabela Loader -->
    <div v-if="isLoading" class="flex flex-col items-center justify-center py-20 gap-3">
      <Loader2 class="w-8 h-8 text-primary animate-spin" />
      <p class="text-slate-400 text-xs font-medium">Lendo produtos do Turso DB...</p>
    </div>

    <!-- Tabela Vazia -->
    <div v-else-if="products.length === 0" class="text-center py-16 bg-slate-900/10 border border-dashed border-slate-800 rounded-2xl space-y-3">
      <ImageIcon class="w-10 h-10 text-slate-700 mx-auto" />
      <h4 class="font-bold text-slate-350">Sem produtos no banco de dados</h4>
      <p class="text-xs text-slate-500 max-w-xs mx-auto leading-relaxed">
        Clique em "Novo Produto" para criar seu primeiro item e enviar as imagens diretamente para a nuvem.
      </p>
    </div>

    <!-- Tabela CRUD de Produtos -->
    <div class="border rounded-2xl overflow-hidden shadow-xl transition-colors duration-300"
      v-else
      :class="themeMode === 'dark' ? 'bg-slate-900/30 border-slate-900' : 'bg-white border-slate-200'"
    >
      <div class="overflow-x-auto">
        <Table>
          <TableHeader class="border-b transition-colors"
            :class="themeMode === 'dark' ? 'bg-slate-950/60 border-slate-900' : 'bg-slate-50 border-slate-200'"
          >
            <TableRow>
              <TableHead class="w-16 text-slate-500 font-bold uppercase text-[10px] tracking-wider">Foto</TableHead>
              <TableHead class="text-slate-500 font-bold uppercase text-[10px] tracking-wider">Nome</TableHead>
              <TableHead class="text-slate-500 font-bold uppercase text-[10px] tracking-wider">Categoria</TableHead>
              <TableHead class="text-center text-slate-500 font-bold uppercase text-[10px] tracking-wider">Preço</TableHead>
              <TableHead class="text-center text-slate-500 font-bold uppercase text-[10px] tracking-wider">Estoque</TableHead>
              <TableHead class="text-right text-slate-500 font-bold uppercase text-[10px] tracking-wider w-24">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow 
              v-for="prod in products" 
              :key="prod.id"
              class="border-b transition-colors"
              :class="themeMode === 'dark' ? 'border-slate-900/50 hover:bg-slate-900/10' : 'border-slate-100 hover:bg-slate-50'"
            >
              <!-- Thumbnail da Foto -->
              <TableCell>
                <div class="w-10 h-10 rounded-lg bg-slate-950 border border-slate-800 overflow-hidden shrink-0">
                  <img :src="prod.image_data" :alt="prod.name" class="w-full h-full object-cover" />
                </div>
              </TableCell>

              <!-- Nome -->
              <TableCell class="font-bold max-w-xs truncate"
                :class="themeMode === 'dark' ? 'text-slate-200' : 'text-slate-800'"
              >
                {{ prod.name }}
              </TableCell>

              <!-- Categoria -->
              <TableCell>
                <span class="px-2 py-0.5 rounded bg-slate-950 text-[10px] text-primary font-bold border border-slate-850 uppercase">
                  {{ prod.category }}
                </span>
              </TableCell>

              <!-- Preço -->
              <TableCell class="text-center font-bold text-xs md:text-sm"
                :class="themeMode === 'dark' ? 'text-slate-300' : 'text-slate-700'"
              >
                {{ formatPrice(prod.price) }}
              </TableCell>

              <!-- Estoque -->
              <TableCell class="text-center">
                <span 
                  class="inline-block px-2 py-0.5 rounded-full text-[10px] font-bold"
                  :class="prod.stock > 5 
                    ? 'bg-emerald-950/30 text-emerald-400 border border-emerald-900/30' 
                    : prod.stock > 0 
                    ? 'bg-amber-950/30 text-amber-500 border border-amber-900/30' 
                    : 'bg-red-950/30 text-red-450 border border-red-900/30'"
                >
                  {{ prod.stock }} un
                </span>
              </TableCell>

              <!-- Ações CRUD -->
              <TableCell class="text-right">
                <div class="flex items-center justify-end gap-1.5">
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    class="h-8 w-8 text-slate-450 hover:text-slate-900 hover:bg-slate-800 rounded-lg"
                    :class="themeMode === 'dark' ? 'hover:text-white hover:bg-slate-800' : 'hover:text-slate-900 hover:bg-slate-100'"
                    @click="openEditDialog(prod)"
                  >
                    <Edit2 class="w-3.5 h-3.5" />
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    class="h-8 w-8 rounded-lg"
                    :class="themeMode === 'dark' ? 'text-slate-500 hover:text-red-400 hover:bg-red-950/20' : 'text-slate-450 hover:text-red-500 hover:bg-red-50'"
                    @click="handleDeleteProduct(prod.id!)"
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

    <!-- Modal Form de Produto (Inserir/Editar) -->
    <Dialog v-model:open="showFormDialog">
      <DialogContent class="sm:max-w-[540px] rounded-2xl shadow-2xl overflow-y-auto max-h-[90vh] transition-colors duration-300"
        :class="themeMode === 'dark' ? 'bg-slate-900 border-slate-800 text-slate-100' : 'bg-white border-slate-200 text-slate-900'"
      >
        <DialogHeader>
          <DialogTitle class="text-lg font-bold flex items-center gap-2">
            <ImageIcon class="w-5 h-5 text-primary" />
            {{ isEditing ? 'Editar Produto no Turso' : 'Novo Produto para Catálogo' }}
          </DialogTitle>
        </DialogHeader>

        <div class="space-y-4 my-3 text-xs md:text-sm">
          <!-- Nome e Categoria -->
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div class="space-y-1.5">
              <label class="text-xs font-semibold text-slate-400">Nome do Produto</label>
              <Input 
                v-model="formName" 
                placeholder="Ex: Teclado Mecânico" 
                class="rounded-xl placeholder:text-slate-600 focus-visible:ring-primary"
                :class="themeMode === 'dark' ? 'bg-slate-950 border-slate-800 text-white' : 'bg-slate-100 border-slate-200 text-slate-900'"
              />
            </div>
            <div class="space-y-1.5">
              <label class="text-xs font-semibold text-slate-400">Categoria</label>
              <Input 
                v-model="formCategory" 
                placeholder="Ex: Periféricos" 
                class="rounded-xl placeholder:text-slate-600 focus-visible:ring-primary"
                :class="themeMode === 'dark' ? 'bg-slate-950 border-slate-800 text-white' : 'bg-slate-100 border-slate-200 text-slate-900'"
              />
            </div>
          </div>

          <!-- Preço e Estoque -->
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div class="space-y-1.5">
              <label class="text-xs font-semibold text-slate-400">Preço à Vista (R$)</label>
              <Input 
                v-model="formPrice" 
                type="number"
                step="0.01"
                placeholder="Ex: 250.00" 
                class="rounded-xl placeholder:text-slate-600 focus-visible:ring-primary"
                :class="themeMode === 'dark' ? 'bg-slate-950 border-slate-800 text-white' : 'bg-slate-100 border-slate-200 text-slate-900'"
              />
            </div>
            <div class="space-y-1.5">
              <label class="text-xs font-semibold text-slate-400">Estoque Inicial (Un.)</label>
              <Input 
                v-model="formStock" 
                type="number"
                placeholder="Ex: 10" 
                class="rounded-xl placeholder:text-slate-600 focus-visible:ring-primary"
                :class="themeMode === 'dark' ? 'bg-slate-950 border-slate-800 text-white' : 'bg-slate-100 border-slate-200 text-slate-900'"
              />
            </div>
          </div>

          <!-- Descrição -->
          <div class="space-y-1.5">
            <label class="text-xs font-semibold text-slate-400">Descrição Detalhada</label>
            <Textarea 
              v-model="formDescription" 
              placeholder="Digite todos os diferenciais, especificações e cores do produto..."
              class="rounded-xl placeholder:text-slate-600 focus-visible:ring-primary min-h-20"
              :class="themeMode === 'dark' ? 'bg-slate-950 border-slate-800 text-white' : 'bg-slate-100 border-slate-200 text-slate-900'"
            />
          </div>

          <!-- Upload de Imagem e Conversão Base64 -->
          <div class="space-y-2 border-t pt-3"
            :class="themeMode === 'dark' ? 'border-slate-800' : 'border-slate-150'"
          >
            <label class="text-xs font-bold uppercase tracking-wider text-slate-500">Foto do Produto (Base64)</label>
            
            <div class="grid grid-cols-1 md:grid-cols-3 gap-4 items-center p-4 rounded-xl border transition-colors"
              :class="themeMode === 'dark' ? 'bg-slate-950/40 border-slate-800' : 'bg-slate-50 border-slate-200'"
            >
              <!-- Preview -->
              <div class="md:col-span-1 aspect-square rounded-lg border overflow-hidden flex items-center justify-center relative group"
                :class="themeMode === 'dark' ? 'bg-slate-950 border-slate-800' : 'bg-white border-slate-250'"
              >
                <img v-if="previewImage" :src="previewImage" class="w-full h-full object-cover" />
                <div v-else class="text-slate-700 flex flex-col items-center gap-1"
                  :class="themeMode === 'dark' ? 'text-slate-700' : 'text-slate-400'"
                >
                  <ImageIcon class="w-6 h-6" />
                  <span class="text-[9px] font-bold">Sem Foto</span>
                </div>
              </div>

              <!-- Input Drop -->
              <div class="md:col-span-2 space-y-2">
                <div class="flex items-center justify-center w-full">
                  <label class="flex flex-col items-center justify-center w-full h-24 border border-dashed rounded-lg cursor-pointer transition-all duration-300"
                    :class="themeMode === 'dark' 
                      ? 'border-slate-850 bg-slate-950 hover:bg-slate-900/60 hover:border-slate-700 text-slate-400' 
                      : 'border-slate-300 bg-white hover:bg-slate-50 hover:border-slate-400 text-slate-650'"
                  >
                    <div class="flex flex-col items-center justify-center pt-2 pb-2">
                      <UploadCloud class="w-6 h-6 text-slate-500 mb-1" />
                      <p class="text-[10px] font-bold"><span class="text-primary">Clique para enviar</span> ou solte</p>
                      <p class="text-[8px] text-slate-500 mt-0.5">PNG, JPG ou SVG (Máx. 1.5MB)</p>
                    </div>
                    <input type="file" class="hidden" accept="image/*" @change="handleFileChange" />
                  </label>
                </div>
              </div>
            </div>
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
            class="rounded-xl font-bold transition-all duration-250 border shadow-sm"
            :class="themeMode === 'dark' 
              ? 'bg-slate-950 border-slate-800 hover:bg-slate-800 text-slate-300' 
              : 'bg-white border-slate-205 hover:bg-slate-100 text-slate-750'"
            :disabled="isSaving"
            @click="showFormDialog = false"
          >
            Cancelar
          </Button>
          <Button 
            class="rounded-xl bg-primary hover:bg-primary/95 text-primary-foreground font-bold shadow-md shadow-primary/20"
            :disabled="isSaving"
            @click="handleSaveProduct"
          >
            <Loader2 v-if="isSaving" class="w-4 h-4 animate-spin mr-1.5" />
            {{ isSaving ? 'Salvando no Turso...' : 'Salvar Produto' }}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  </div>
</template>
