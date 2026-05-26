<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { 
  Search, 
  ShoppingBag, 
  Eye, 
  Check, 
  AlertTriangle,
  Tag,
  Loader2,
  Sparkles
} from 'lucide-vue-next'
import { 
  fetchProducts, 
  saveCart, 
  getCart, 
  themeMode,
  themeColor,
  type Product 
} from '@/services/store'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription 
} from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'

const products = ref<Product[]>([])
const isLoading = ref(true)
const searchQuery = ref('')
const selectedCategory = ref('Todos')

// Detalhes do Produto / Quick View
const selectedProduct = ref<Product | null>(null)
const showQuickView = ref(false)

// Feedbacks de adicionar ao carrinho
const addedProductId = ref<number | null>(null)

// Carrega produtos ao montar a tela
onMounted(async () => {
  try {
    products.value = await fetchProducts()
  } catch (err) {
    console.error('Erro ao buscar produtos:', err)
  } finally {
    isLoading.value = false
  }
})

// Lista de Categorias únicas
const categories = computed(() => {
  const allCats = products.value.map(p => p.category)
  return ['Todos', ...new Set(allCats)]
})

// Filtragem de Produtos
const filteredProducts = computed(() => {
  return products.value.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(searchQuery.value.toLowerCase()) || 
                          p.description.toLowerCase().includes(searchQuery.value.toLowerCase())
    const matchesCategory = selectedCategory.value === 'Todos' || p.category === selectedCategory.value
    return matchesSearch && matchesCategory
  })
})

// Função para formatar preço em BRL
const formatPrice = (value: number) => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(value)
}

// Lógica de Adicionar ao Carrinho
const handleAddToCart = (product: Product, event?: Event) => {
  if (event) event.stopPropagation()
  
  if (product.stock <= 0) return
  
  const cart = getCart()
  const existingItem = cart.find(item => item.product.id === product.id)
  
  if (existingItem) {
    // Verifica se não ultrapassa o estoque
    if (existingItem.quantity >= product.stock) {
      alert(`Desculpe, o estoque máximo deste produto é de ${product.stock} unidades.`)
      return
    }
    existingItem.quantity += 1
  } else {
    cart.push({ product, quantity: 1 })
  }
  
  saveCart(cart)
  
  // Feedback visual de sucesso
  addedProductId.value = product.id || null
  setTimeout(() => {
    addedProductId.value = null
  }, 1500)
}

// Abrir detalhes do produto
const openQuickView = (product: Product) => {
  selectedProduct.value = product
  showQuickView.value = true
}

const addAndCloseQuickView = (product: Product) => {
  handleAddToCart(product)
  showQuickView.value = false
}
</script>

<template>
  <div class="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
    <!-- Hero Banner Premium Tabacaria -->
    <section class="relative overflow-hidden rounded-3xl border transition-colors duration-300 p-8 md:p-12 shadow-2xl"
      :class="themeMode === 'dark' 
        ? 'border-slate-850 bg-gradient-to-br from-slate-900 via-slate-900 to-primary/15' 
        : 'border-slate-200 bg-gradient-to-br from-white via-white to-primary/5'"
    >
      <!-- Glow Decorativo no banner -->
      <div v-if="themeMode === 'dark'" class="absolute inset-0 pointer-events-none opacity-40">
        <div class="absolute -top-1/2 -right-1/4 w-96 h-96 rounded-full bg-primary/10 blur-[80px]"></div>
      </div>
      
      <div class="grid grid-cols-1 md:grid-cols-12 gap-8 items-center relative z-10">
        <!-- Coluna Texto -->
        <div class="md:col-span-8 space-y-4 text-left">
          <div class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border"
            :class="themeMode === 'dark' ? 'bg-primary/15 border-primary/30 text-primary' : 'bg-primary/5 border-primary/20 text-primary'"
          >
            <Sparkles class="w-3.5 h-3.5" />
            Hookah Shop &amp; Tabacaria Premium
          </div>
          
          <h1 class="text-3xl md:text-5xl font-black tracking-tight leading-tight transition-colors"
            :class="themeMode === 'dark' ? 'bg-gradient-to-r from-white via-slate-100 to-primary bg-clip-text text-transparent' : 'text-slate-900'"
          >
            <span class="text-primary">X-Smoke</span> Tabacaria 
          </h1>
          
          <p class="text-sm md:text-base leading-relaxed"
            :class="themeMode === 'dark' ? 'text-slate-400' : 'text-slate-650'"
          >
            A arte da fumaça em alta performance. Explore nossa seleção exclusiva de narguilés de luxo, roshs esmaltados, essências selecionadas das melhores marcas e acessórios de alto rendimento
          </p>
        </div>

        <!-- Coluna Logo Integrado -->
        <div class="md:col-span-4 flex items-center justify-center">
          <div class="relative group">
            <!-- Glow externo dourado no dark mode -->
            <div v-if="themeMode === 'dark'" class="absolute inset-0 rounded-full bg-primary/25 blur-xl opacity-75 group-hover:opacity-100 transition-opacity duration-500"></div>
            
            <img 
              src="/logo.jpg" 
              alt="Logo Tabacaria X-Smoke" 
              class="relative w-40 h-40 md:w-48 md:h-48 rounded-full border-4 border-primary shadow-2xl object-cover transition-all duration-500 group-hover:scale-105"
              :class="themeMode === 'dark' ? 'border-primary shadow-primary/10' : 'border-primary/60 shadow-slate-400/20'"
            />
          </div>
        </div>
      </div>
    </section>

    <!-- Controles de Filtros e Busca -->
    <div class="flex flex-col md:flex-row md:items-center justify-between gap-4 border p-4 rounded-2xl transition-colors duration-300"
      :class="themeMode === 'dark' ? 'bg-slate-900/40 border-slate-900' : 'bg-white border-slate-200 shadow-sm'"
    >
      <!-- Filtros por Categoria -->
      <div class="flex items-center gap-2 overflow-x-auto pb-1 md:pb-0 scrollbar-thin scrollbar-thumb-slate-800">
        <Tag class="w-4 h-4 text-slate-500 shrink-0 hidden sm:inline" />
        <Button 
          v-for="cat in categories" 
          :key="cat"
          size="sm"
          class="rounded-xl font-bold text-xs transition-all duration-300"
          :class="[
            selectedCategory === cat 
              ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/20 hover:bg-primary/95' 
              : (themeMode === 'dark' 
                ? 'bg-slate-900/60 hover:bg-slate-800 text-slate-400 hover:text-white border-slate-800' 
                : 'bg-slate-100 hover:bg-slate-200 text-slate-650 hover:text-slate-900 border-slate-200')
          ]"
          @click="selectedCategory = cat"
        >
          {{ cat }}
        </Button>
      </div>

      <!-- Barra de Busca -->
      <div class="relative max-w-sm w-full">
        <Search class="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
        <Input 
          v-model="searchQuery"
          placeholder="Buscar produto..."
          class="pl-10 rounded-xl"
          :class="themeMode === 'dark' ? 'bg-slate-950 border-slate-800 text-slate-100 placeholder:text-slate-500 focus-visible:ring-primary' : 'bg-slate-50 border-slate-200 text-slate-900 placeholder:text-slate-400 focus-visible:ring-primary'"
        />
      </div>
    </div>

    <!-- Feedback de Carregamento -->
    <div v-if="isLoading" class="flex flex-col items-center justify-center py-20 gap-3">
      <Loader2 class="w-10 h-10 text-primary animate-spin" />
      <p class="text-slate-450 text-sm font-medium">Carregando catálogo premium...</p>
    </div>

    <!-- Catálogo de Produtos Vazio -->
    <div v-else-if="filteredProducts.length === 0" class="text-center py-16 bg-slate-900/10 border border-dashed border-slate-800 rounded-3xl space-y-3">
      <AlertTriangle class="w-12 h-12 text-amber-500 mx-auto" />
      <h3 class="text-lg font-bold text-slate-200">Nenhum produto encontrado</h3>
      <p class="text-slate-500 text-sm max-w-xs mx-auto">
        Tente ajustar sua busca ou filtro para encontrar o que procura.
      </p>
    </div>

    <!-- Grid de Produtos Premium -->
    <div v-else class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
      <div 
        v-for="product in filteredProducts" 
        :key="product.id"
        class="group relative flex flex-col border rounded-2xl overflow-hidden hover:shadow-2xl hover:shadow-primary/5 transition-all duration-300 cursor-pointer"
        :class="themeMode === 'dark' ? 'bg-slate-900/30 border-slate-900 hover:border-slate-800/80' : 'bg-white border-slate-200 hover:border-slate-300'"
        @click="openQuickView(product)"
      >
        <!-- Container da Foto do Produto -->
        <div class="aspect-[4/3] w-full bg-slate-950 overflow-hidden relative border-b"
          :class="themeMode === 'dark' ? 'border-slate-900' : 'border-slate-100'"
        >
          <img 
            :src="product.image_data" 
            :alt="product.name"
            class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          />
          
          <!-- Badges sobrepostos à imagem -->
          <div class="absolute top-3 left-3 flex flex-col gap-1.5">
            <!-- Badge de Categoria -->
            <span class="px-2 py-0.5 rounded-md bg-slate-950/80 backdrop-blur-sm border border-slate-800 text-[10px] font-bold text-primary tracking-wider uppercase">
              {{ product.category }}
            </span>
            <!-- Badge de Esgotado / Últimas unidades -->
            <span 
              v-if="product.stock === 0" 
              class="px-2 py-0.5 rounded-md bg-red-950/80 backdrop-blur-sm border border-red-500/20 text-[10px] font-bold text-red-400"
            >
              Sem Estoque
            </span>
            <span 
              v-else-if="product.stock <= 5" 
              class="px-2 py-0.5 rounded-md bg-amber-950/80 backdrop-blur-sm border border-amber-500/20 text-[10px] font-bold text-amber-400"
            >
              Últimas {{ product.stock }} un.
            </span>
          </div>
        </div>

        <!-- Conteúdo do Produto -->
        <div class="p-5 flex-1 flex flex-col justify-between space-y-4">
          <div class="space-y-2">
            <h3 class="font-bold transition-colors duration-200 line-clamp-1 text-sm md:text-base"
              :class="themeMode === 'dark' ? 'text-slate-200 group-hover:text-white' : 'text-slate-800 group-hover:text-slate-900'"
            >
              {{ product.name }}
            </h3>
            <p class="text-xs line-clamp-2 leading-relaxed"
              :class="themeMode === 'dark' ? 'text-slate-400' : 'text-slate-500'"
            >
              {{ product.description }}
            </p>
          </div>

          <!-- Rodapé do Card com Preço e Botão Compra -->
          <div class="flex items-center justify-between pt-2 border-t"
            :class="themeMode === 'dark' ? 'border-slate-900' : 'border-slate-100'"
          >
            <div class="flex flex-col">
              <span class="text-[10px] text-slate-500 font-bold uppercase">Preço à vista</span>
              <span class="font-extrabold text-base"
                :class="themeMode === 'dark' ? 'text-slate-200' : 'text-slate-900'"
              >
                {{ formatPrice(product.price) }}
              </span>
            </div>
            
            <Button 
              size="sm"
              class="rounded-xl font-bold transition-all duration-300 gap-1.5 border"
              :class="[
                addedProductId === product.id 
                  ? 'bg-emerald-650 hover:bg-emerald-650 border-emerald-500 text-white' 
                  : (themeMode === 'dark' 
                    ? 'bg-slate-950 hover:bg-primary hover:text-primary-foreground border-slate-800 hover:border-primary text-slate-300' 
                    : 'bg-white hover:bg-primary hover:text-primary-foreground border-slate-205 hover:border-primary text-slate-700')
              ]"
              :disabled="product.stock === 0"
              @click="handleAddToCart(product, $event)"
            >
              <template v-if="addedProductId === product.id">
                <Check class="w-3.5 h-3.5" />
                <span>Salvo!</span>
              </template>
              <template v-else>
                <ShoppingBag class="w-3.5 h-3.5" />
                <span>Comprar</span>
              </template>
            </Button>
          </div>
        </div>
      </div>
    </div>

    <!-- Modal Detalhes do Produto (Quick View) -->
    <Dialog v-model:open="showQuickView">
      <DialogContent v-if="selectedProduct" class="sm:max-w-[640px] rounded-3xl p-0 overflow-hidden shadow-2xl transition-colors duration-300"
        :class="themeMode === 'dark' ? 'bg-slate-900 border-slate-800 text-slate-100' : 'bg-white border-slate-200 text-slate-900'"
      >
        <div class="grid grid-cols-1 md:grid-cols-2">
          <!-- Lado da Imagem -->
          <div class="bg-slate-950 aspect-square md:aspect-auto md:h-full flex items-center justify-center relative border-b md:border-b-0 md:border-r"
            :class="themeMode === 'dark' ? 'border-slate-800' : 'border-slate-150'"
          >
            <img 
              :src="selectedProduct.image_data" 
              :alt="selectedProduct.name"
              class="w-full h-full object-cover"
            />
            <div class="absolute top-4 left-4">
              <Badge class="bg-primary/10 border-primary/20 text-primary font-bold">
                {{ selectedProduct.category }}
              </Badge>
            </div>
          </div>

          <!-- Lado dos Detalhes -->
          <div class="p-6 flex flex-col justify-between space-y-6">
            <div class="space-y-4">
              <div class="space-y-1">
                <h2 class="text-xl font-extrabold leading-tight"
                  :class="themeMode === 'dark' ? 'text-slate-100' : 'text-slate-900'"
                >
                  {{ selectedProduct.name }}
                </h2>
                <!-- Preço Grande -->
                <div class="text-2xl font-black text-primary mt-2">
                  {{ formatPrice(selectedProduct.price) }}
                </div>
              </div>

              <!-- Estoque Status -->
              <div class="flex items-center gap-2">
                <span class="w-2 h-2 rounded-full" 
                  :class="selectedProduct.stock > 5 ? 'bg-emerald-500' : selectedProduct.stock > 0 ? 'bg-amber-500' : 'bg-red-500'"
                ></span>
                <span class="text-xs font-medium"
                  :class="themeMode === 'dark' ? 'text-slate-400' : 'text-slate-500'"
                >
                  {{ selectedProduct.stock > 0 
                    ? `Estoque disponível: ${selectedProduct.stock} unidades` 
                    : 'Produto Indisponível (Sem Estoque)' 
                  }}
                </span>
              </div>

              <div class="space-y-1.5 border-t pt-3"
                :class="themeMode === 'dark' ? 'border-slate-800' : 'border-slate-150'"
              >
                <h4 class="text-xs font-bold uppercase tracking-wider text-slate-500">Descrição do Produto</h4>
                <p class="text-xs leading-relaxed"
                  :class="themeMode === 'dark' ? 'text-slate-400' : 'text-slate-600'"
                >
                  {{ selectedProduct.description }}
                </p>
              </div>
            </div>

            <!-- Botão de Ação -->
            <div class="flex items-center gap-3 border-t pt-4"
              :class="themeMode === 'dark' ? 'border-slate-800' : 'border-slate-150'"
            >
              <!-- Correção do botão Voltar para ter contraste premium em qualquer tema -->
              <Button 
                variant="outline" 
                class="rounded-xl font-bold flex-1 border shadow-sm transition-all duration-200"
                :class="themeMode === 'dark' 
                  ? 'bg-slate-950 border-slate-800 hover:bg-slate-800 text-slate-300' 
                  : 'bg-white border-slate-205 hover:bg-slate-100 text-slate-700'"
                @click="showQuickView = false"
              >
                Voltar
              </Button>
              <Button 
                class="rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground font-bold flex-1 shadow-lg shadow-primary/20"
                :disabled="selectedProduct.stock === 0"
                @click="addAndCloseQuickView(selectedProduct)"
              >
                <ShoppingBag class="w-4 h-4 mr-2" />
                Adicionar
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  </div>
</template>
