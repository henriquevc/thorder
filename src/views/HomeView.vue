<script setup lang="ts">
import { computed } from 'vue'
import { currentCompanySlug, currentUser } from '@/services/store'
import CatalogView from './client/CatalogView.vue'
import LandingView from './LandingView.vue'

const hasCompany = computed(() => !!currentCompanySlug.value)
const isSuperAdmin = computed(() => currentUser.value?.role === 'superadmin')
</script>

<template>
  <div class="w-full">
    <CatalogView v-if="hasCompany" />
    <LandingView v-else-if="isSuperAdmin" />
  </div>
</template>
