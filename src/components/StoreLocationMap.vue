<script setup lang="ts">
import { ref, watch, onMounted, onBeforeUnmount, nextTick } from 'vue'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import {
  Search,
  Navigation,
  Crosshair,
  MapPin,
  Loader2,
  CheckCircle2,
  Info,
  X
} from 'lucide-vue-next'
import {
  themeMode,
  searchAddressSuggestions,
  reverseGeocode,
  type AddressSuggestion
} from '@/services/store'

interface Props {
  lat: number | null
  lng: number | null
  radiusKm?: number
  storeName?: string
}

const props = withDefaults(defineProps<Props>(), {
  lat: -21.2755425,
  lng: -47.3013532,
  radiusKm: 15,
  storeName: 'Sua Loja'
})

const emit = defineEmits<{
  (e: 'update:location', data: { 
    lat: number
    lng: number
    street?: string
    number?: string
    neighborhood?: string
    city?: string
    state?: string
    cep?: string
    formattedAddress?: string
  }): void
}>()

const mapContainer = ref<HTMLDivElement | null>(null)
let map: L.Map | null = null
let marker: L.Marker | null = null
let radiusCircle: L.Circle | null = null
let tileLayer: L.TileLayer | null = null
let resizeObserver: ResizeObserver | null = null

// Autocomplete State
const searchQuery = ref('')
const searchResults = ref<AddressSuggestion[]>([])
const isSearching = ref(false)
const isReverseGeocoding = ref(false)
const showResultsDropdown = ref(false)
let searchDebounceTimer: any = null

// Local Coordinates
const currentLat = ref<number>(props.lat ?? -21.2755425)
const currentLng = ref<number>(props.lng ?? -47.3013532)

// Custom Pin Marker Icon
const createStoreIcon = () => {
  return L.divIcon({
    className: 'custom-store-pin-container',
    html: `
      <div class="store-pin-wrapper">
        <div class="store-pin-pulse"></div>
        <div class="store-pin-bubble">
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z"/><path d="M3 6h18"/><path d="M16 10a4 4 0 0 1-8 0"/>
          </svg>
        </div>
        <div class="store-pin-tip"></div>
      </div>
    `,
    iconSize: [40, 52],
    iconAnchor: [20, 50],
    popupAnchor: [0, -48]
  })
}

// Configura Tiles conforme o tema (Dark Matter vs Voyager) com API Key da CARTO
const setupTileLayer = () => {
  if (!map) return

  if (tileLayer) {
    map.removeLayer(tileLayer)
  }

  const cartoApiKey = (import.meta.env.VITE_CARTO_API_KEY || '').trim()
  const isDark = themeMode.value === 'dark'

  let tileUrl = ''
  if (cartoApiKey) {
    tileUrl = isDark
      ? `https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png?key=${encodeURIComponent(cartoApiKey)}`
      : `https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png?key=${encodeURIComponent(cartoApiKey)}`
  } else {
    // Fallback padrão para OpenStreetMap caso não haja chave da CARTO configurada no .env
    tileUrl = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png'
  }

  tileLayer = L.tileLayer(tileUrl, {
    subdomains: cartoApiKey ? 'abcd' : 'abc',
    maxZoom: 19,
    attribution: cartoApiKey
      ? '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/">CARTO</a>'
      : '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
  })

  // Fallback silencioso para OpenStreetMap caso o CARTO rejeite a requisição (ex: chave inválida ou cota excedida)
  let fallbackTriggered = false
  tileLayer.on('tileerror', () => {
    if (!fallbackTriggered && cartoApiKey && map) {
      fallbackTriggered = true
      map.removeLayer(tileLayer!)
      tileLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '&copy; OpenStreetMap contributors'
      }).addTo(map)
    }
  })

  tileLayer.addTo(map)
}

// Atualiza o círculo de raio de entrega
const updateRadiusCircle = (lat: number, lng: number, km: number) => {
  if (!map) return

  const radiusMeters = Math.max(100, km * 1000)

  if (!radiusCircle) {
    radiusCircle = L.circle([lat, lng], {
      radius: radiusMeters,
      color: '#863bff',
      fillColor: '#863bff',
      fillOpacity: 0.12,
      weight: 2,
      dashArray: '5, 8'
    }).addTo(map)
  } else {
    radiusCircle.setLatLng([lat, lng])
    radiusCircle.setRadius(radiusMeters)
  }
}

// Inicialização do Mapa Leaflet
const initMap = async () => {
  await nextTick()
  if (!mapContainer.value || map) return

  const initialLat = props.lat ?? -21.2755425
  const initialLng = props.lng ?? -47.3013532
  currentLat.value = initialLat
  currentLng.value = initialLng

  map = L.map(mapContainer.value, {
    center: [initialLat, initialLng],
    zoom: 16,
    zoomControl: false // Criamos controles customizados integrados
  })

  setupTileLayer()

  // Adiciona Marcador Arrastável
  marker = L.marker([initialLat, initialLng], {
    icon: createStoreIcon(),
    draggable: true
  }).addTo(map)

  marker.bindPopup(`
    <div style="font-family: sans-serif; padding: 2px;">
      <strong style="font-size: 13px; color: #863bff;">${props.storeName}</strong><br/>
      <span style="font-size: 11px; color: #64748b;">Ponto de saída dos entregadores</span><br/>
      <small style="font-size: 10px; color: #94a3b8;">Arraste para ajustar o local exato</small>
    </div>
  `)

  // Evento ao arrastar o pino
  marker.on('dragend', async () => {
    if (!marker) return
    const pos = marker.getLatLng()
    currentLat.value = pos.lat
    currentLng.value = pos.lng
    updateRadiusCircle(pos.lat, pos.lng, props.radiusKm)
    await handleLocationChange(pos.lat, pos.lng)
  })

  // Evento de clique no mapa
  map.on('click', async (e: L.LeafletMouseEvent) => {
    if (!marker) return
    const { lat, lng } = e.latlng
    marker.setLatLng([lat, lng])
    currentLat.value = lat
    currentLng.value = lng
    updateRadiusCircle(lat, lng, props.radiusKm)
    await handleLocationChange(lat, lng)
  })

  // Círculo de Raio
  updateRadiusCircle(initialLat, initialLng, props.radiusKm)

  // Observer para redimensionamento de tabs
  resizeObserver = new ResizeObserver(() => {
    if (map) {
      map.invalidateSize()
    }
  })
  resizeObserver.observe(mapContainer.value)
}

// Processa mudança de coordenadas (geocodificação reversa para endereço real)
const handleLocationChange = async (lat: number, lng: number) => {
  isReverseGeocoding.value = true
  try {
    const geo = await reverseGeocode(lat, lng)
    emit('update:location', {
      lat,
      lng,
      street: geo?.street,
      number: geo?.number,
      neighborhood: geo?.neighborhood,
      city: geo?.city,
      state: geo?.state,
      cep: geo?.cep,
      formattedAddress: geo?.formattedAddress
    })
  } catch (err) {
    emit('update:location', { lat, lng })
  } finally {
    isReverseGeocoding.value = false
  }
}

// Busca rápida estilo iFood / Uber
const handleSearchInput = () => {
  clearTimeout(searchDebounceTimer)
  if (!searchQuery.value.trim() || searchQuery.value.trim().length < 3) {
    searchResults.value = []
    showResultsDropdown.value = false
    return
  }

  searchDebounceTimer = setTimeout(async () => {
    isSearching.value = true
    try {
      const results = await searchAddressSuggestions(searchQuery.value)
      searchResults.value = results
      showResultsDropdown.value = results.length > 0
    } catch (e) {
      searchResults.value = []
    } finally {
      isSearching.value = false
    }
  }, 400)
}

// Ao selecionar uma sugestão de endereço
const handleSelectSuggestion = (item: AddressSuggestion) => {
  searchQuery.value = item.street 
    ? `${item.street}${item.number ? ', ' + item.number : ''} - ${item.city || ''}`
    : item.displayName
  showResultsDropdown.value = false

  currentLat.value = item.lat
  currentLng.value = item.lng

  if (map && marker) {
    map.flyTo([item.lat, item.lng], 17, { animate: true, duration: 1.2 })
    marker.setLatLng([item.lat, item.lng])
    updateRadiusCircle(item.lat, item.lng, props.radiusKm)
  }

  emit('update:location', {
    lat: item.lat,
    lng: item.lng,
    street: item.street,
    number: item.number,
    neighborhood: item.neighborhood,
    city: item.city,
    state: item.state,
    cep: item.cep,
    formattedAddress: item.displayName
  })
}

// Recentralizar na loja
const recenterMap = () => {
  if (map && currentLat.value && currentLng.value) {
    map.flyTo([currentLat.value, currentLng.value], 16, { animate: true, duration: 1 })
  }
}

// Usar GPS do dispositivo
const useCurrentLocation = () => {
  if (!navigator.geolocation) {
    alert('Geolocalização não é suportada por este navegador.')
    return
  }

  isSearching.value = true
  navigator.geolocation.getCurrentPosition(
    async (position) => {
      isSearching.value = false
      const lat = position.coords.latitude
      const lng = position.coords.longitude
      currentLat.value = lat
      currentLng.value = lng

      if (map && marker) {
        map.flyTo([lat, lng], 17, { animate: true, duration: 1.2 })
        marker.setLatLng([lat, lng])
        updateRadiusCircle(lat, lng, props.radiusKm)
      }

      await handleLocationChange(lat, lng)
    },
    (error) => {
      isSearching.value = false
      alert('Não foi possível obter a localização GPS atual.')
    },
    { enableHighAccuracy: true, timeout: 8000 }
  )
}

// Zoom Controls
const zoomIn = () => map?.zoomIn()
const zoomOut = () => map?.zoomOut()

// Watchers
watch(
  () => [props.lat, props.lng],
  ([newLat, newLng]) => {
    if (newLat !== null && newLng !== null && !isNaN(newLat) && !isNaN(newLng)) {
      currentLat.value = newLat
      currentLng.value = newLng
      if (marker && map) {
        marker.setLatLng([newLat, newLng])
        updateRadiusCircle(newLat, newLng, props.radiusKm)
      }
    }
  }
)

watch(
  () => props.radiusKm,
  (newRadius) => {
    if (currentLat.value && currentLng.value) {
      updateRadiusCircle(currentLat.value, currentLng.value, newRadius)
    }
  }
)

watch(themeMode, () => {
  setupTileLayer()
})

onMounted(() => {
  initMap()
})

onBeforeUnmount(() => {
  if (resizeObserver) {
    resizeObserver.disconnect()
  }
  if (map) {
    map.remove()
    map = null
  }
})
</script>

<template>
  <div class="space-y-2.5">
    <!-- Barra Superior: Busca de Endereço Real Estilo iFood & Uber -->
    <div class="relative z-20">
      <div class="relative">
        <Search class="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
        <input
          v-model="searchQuery"
          type="text"
          placeholder="Buscar rua, número, bairro ou nome do local (Ex: Av Paulista 1000)..."
          class="w-full pl-10 pr-10 py-2.5 rounded-2xl text-xs border shadow-sm transition-all focus:outline-none focus:ring-2 focus:ring-primary"
          :class="themeMode === 'dark' 
            ? 'bg-slate-900 border-slate-800 text-slate-100 placeholder:text-slate-500' 
            : 'bg-white border-slate-200 text-slate-900 placeholder:text-slate-400'"
          @input="handleSearchInput"
          @focus="searchResults.length > 0 && (showResultsDropdown = true)"
        />
        <div class="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1.5">
          <Loader2 v-if="isSearching" class="w-4 h-4 text-primary animate-spin" />
          <button 
            v-else-if="searchQuery" 
            type="button" 
            class="text-slate-400 hover:text-slate-200 p-0.5"
            @click="searchQuery = ''; showResultsDropdown = false"
          >
            <X class="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      <!-- Dropdown de Sugestões de Endereços Reais -->
      <div 
        v-if="showResultsDropdown && searchResults.length > 0" 
        class="absolute left-0 right-0 mt-1.5 py-1.5 rounded-2xl border shadow-2xl backdrop-blur-xl z-50 max-h-60 overflow-y-auto"
        :class="themeMode === 'dark' ? 'bg-slate-900/95 border-slate-800' : 'bg-white/95 border-slate-200'"
      >
        <button
          v-for="(item, idx) in searchResults"
          :key="idx"
          type="button"
          class="w-full text-left px-3.5 py-2 text-xs flex items-start gap-2.5 transition-colors"
          :class="themeMode === 'dark' ? 'hover:bg-slate-800/80 text-slate-200' : 'hover:bg-slate-100 text-slate-800'"
          @click="handleSelectSuggestion(item)"
        >
          <div class="w-6 h-6 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0 mt-0.5">
            <MapPin class="w-3.5 h-3.5" />
          </div>
          <div class="flex-1 truncate">
            <div class="font-bold truncate">
              {{ item.street ? `${item.street}${item.number ? ', ' + item.number : ''}` : item.displayName.split(',')[0] }}
            </div>
            <div class="text-[11px] text-slate-400 truncate">
              {{ item.neighborhood ? `${item.neighborhood}, ` : '' }}{{ item.city }} - {{ item.state }}
            </div>
          </div>
        </button>
      </div>
    </div>

    <!-- Container do Mapa -->
    <div 
      class="relative w-full h-[320px] sm:h-[400px] rounded-3xl overflow-hidden border shadow-inner transition-colors duration-300"
      :class="themeMode === 'dark' ? 'border-slate-800 bg-slate-950' : 'border-slate-200 bg-slate-100'"
    >
      <!-- Div do Mapa Leaflet -->
      <div ref="mapContainer" class="w-full h-full z-10"></div>

      <!-- Indicador de Carregamento de Geocodificação Reversa -->
      <div 
        v-if="isReverseGeocoding" 
        class="absolute top-3 left-1/2 -translate-x-1/2 z-20 px-3.5 py-1.5 rounded-full bg-slate-950/80 backdrop-blur-md border border-primary/40 text-primary text-[11px] font-bold flex items-center gap-2 shadow-lg"
      >
        <Loader2 class="w-3.5 h-3.5 animate-spin" />
        <span>Identificando rua e número do pino...</span>
      </div>

      <!-- Controles Flutuantes do Mapa -->
      <div class="absolute right-3 top-3 z-20 flex flex-col gap-1.5">
        <!-- Localização GPS -->
        <button
          type="button"
          class="w-8 h-8 rounded-xl flex items-center justify-center shadow-lg border transition-all cursor-pointer"
          :class="themeMode === 'dark' 
            ? 'bg-slate-900/90 border-slate-800 text-slate-200 hover:bg-slate-800' 
            : 'bg-white/90 border-slate-200 text-slate-800 hover:bg-slate-50'"
          title="Usar minha localização atual (GPS)"
          @click="useCurrentLocation"
        >
          <Navigation class="w-4 h-4 text-primary" />
        </button>

        <!-- Focar na Loja -->
        <button
          type="button"
          class="w-8 h-8 rounded-xl flex items-center justify-center shadow-lg border transition-all cursor-pointer"
          :class="themeMode === 'dark' 
            ? 'bg-slate-900/90 border-slate-800 text-slate-200 hover:bg-slate-800' 
            : 'bg-white/90 border-slate-200 text-slate-800 hover:bg-slate-50'"
          title="Recentralizar na Loja"
          @click="recenterMap"
        >
          <Crosshair class="w-4 h-4 text-primary" />
        </button>

        <div class="w-full h-px bg-slate-700/30 my-0.5"></div>

        <!-- Zoom In -->
        <button
          type="button"
          class="w-8 h-8 rounded-xl flex items-center justify-center shadow-lg border text-sm font-bold transition-all cursor-pointer"
          :class="themeMode === 'dark' 
            ? 'bg-slate-900/90 border-slate-800 text-slate-200 hover:bg-slate-800' 
            : 'bg-white/90 border-slate-200 text-slate-800 hover:bg-slate-50'"
          title="Aproximar (+)"
          @click="zoomIn"
        >
          +
        </button>

        <!-- Zoom Out -->
        <button
          type="button"
          class="w-8 h-8 rounded-xl flex items-center justify-center shadow-lg border text-sm font-bold transition-all cursor-pointer"
          :class="themeMode === 'dark' 
            ? 'bg-slate-900/90 border-slate-800 text-slate-200 hover:bg-slate-800' 
            : 'bg-white/90 border-slate-200 text-slate-800 hover:bg-slate-50'"
          title="Afastar (-)"
          @click="zoomOut"
        >
          -
        </button>
      </div>

      <!-- Badge de Orientação de Raio -->
      <div 
        class="absolute left-3 bottom-3 z-20 px-3 py-1.5 rounded-xl border backdrop-blur-md text-[11px] flex items-center gap-2 shadow-md max-w-[85%]"
        :class="themeMode === 'dark' 
          ? 'bg-slate-950/85 border-slate-800 text-slate-300' 
          : 'bg-white/85 border-slate-200 text-slate-700'"
      >
        <span class="w-2.5 h-2.5 rounded-full bg-primary animate-pulse shrink-0"></span>
        <span class="truncate">
          Raio de entrega ativo: <strong class="text-primary font-bold">{{ radiusKm }} km</strong>
        </span>
      </div>
    </div>

    <!-- Dica de Usabilidade -->
    <div class="flex items-center justify-between gap-2 px-1 text-[11px] text-slate-400">
      <div class="flex items-center gap-1.5">
        <Info class="w-3.5 h-3.5 text-primary shrink-0" />
        <span>Você pode <strong>arrastar o pino roxo</strong> ou <strong>clicar no mapa</strong> para ajustar a entrada exata da loja.</span>
      </div>
      <div class="hidden sm:block font-mono text-[10px] text-slate-500">
        Lat: {{ currentLat.toFixed(5) }}, Lng: {{ currentLng.toFixed(5) }}
      </div>
    </div>
  </div>
</template>

<style>
/* Estilos Customizados do Pino da Loja */
.custom-store-pin-container {
  background: transparent !important;
  border: none !important;
}

.store-pin-wrapper {
  position: relative;
  width: 40px;
  height: 50px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  cursor: grab;
  transition: transform 0.2s ease;
}

.store-pin-wrapper:active {
  cursor: grabbing;
  transform: scale(1.15) translateY(-5px);
}

.store-pin-bubble {
  width: 38px;
  height: 38px;
  background: linear-gradient(135deg, #863bff 0%, #aa3bff 100%);
  border-radius: 50% 50% 50% 0;
  transform: rotate(-45deg);
  display: flex;
  align-items: center;
  justify-content: center;
  color: #ffffff;
  box-shadow: 0 8px 16px rgba(134, 59, 255, 0.45);
  border: 2px solid #ffffff;
  position: relative;
  z-index: 2;
}

.store-pin-bubble svg {
  transform: rotate(45deg);
}

.store-pin-pulse {
  position: absolute;
  bottom: 0;
  width: 24px;
  height: 10px;
  background: rgba(134, 59, 255, 0.35);
  border-radius: 50%;
  animation: storePinPulseAnim 2s infinite;
  z-index: 1;
}

@keyframes storePinPulseAnim {
  0% {
    transform: scale(0.8);
    opacity: 0.8;
  }
  50% {
    transform: scale(1.6);
    opacity: 0.2;
  }
  100% {
    transform: scale(0.8);
    opacity: 0.8;
  }
}

/* Customização dos Popups do Leaflet */
.leaflet-popup-content-wrapper {
  border-radius: 16px !important;
  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.2) !important;
}
</style>
