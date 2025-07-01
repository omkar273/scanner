<template>
  <router-link
    :to="{
      name: 'batch-scan'
    }"
    #="{ navigate, href }"
    custom
  >
    <n-button round tag="a" :href="href" @click="navigate">
      <template #icon>
        <n-icon>
          <FolderZip20Regular />
        </n-icon>
      </template>
      {{ t('actions.navigateToBatchScan') }}
    </n-button>
  </router-link>
</template>

<script setup lang="ts">
import { NButton, NIcon } from 'naive-ui'
import { FolderZip20Regular } from '@vicons/fluent'

import { RouterLink } from 'vue-router'

import { useI18n } from 'vue-i18n'

const { t } = useI18n()
</script>
