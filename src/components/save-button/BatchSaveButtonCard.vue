<template>
  <n-card>
    <n-space vertical>
      <div v-if="!isBatch">
        <n-button
          type="primary"
          @click="$emit('generate')"
          :loading="saving"
          :disabled="!files || files.length === 0"
        >
          {{ t('actions.generatePDF') }}
        </n-button>
      </div>

      <div v-else>
        <n-space vertical>
          <n-button
            type="primary"
            @click="$emit('generate')"
            :loading="saving"
            :disabled="files.length === 0"
          >
            {{ t('actions.generateBatch', { count: files.length }) }}
          </n-button>

          <div v-if="saving || processedFiles.length > 0">
            <n-progress
              type="line"
              :percentage="progressPercentage"
              :status="saving ? 'info' : 'success'"
            />
            <n-text depth="3" v-if="currentFile">
              {{ t('actions.processing') }}: {{ currentFile }}
            </n-text>
            <n-text depth="3" v-else-if="processedFiles.length > 0">
              {{
                t('actions.completed', {
                  processed: processedFiles.length,
                  total: files.length
                })
              }}
            </n-text>
          </div>

          <div v-if="processedFiles.length > 0 && !saving">
            <n-space>
              <n-button type="success" @click="$emit('download')" :loading="downloading">
                <template #icon>
                  <n-icon>
                    <ArrowDownload24Regular />
                  </n-icon>
                </template>
                {{ t('actions.downloadAll') }}
              </n-button>

              <n-dropdown :options="downloadOptions" @select="downloadSingle" trigger="click">
                <n-button quaternary>
                  <template #icon>
                    <n-icon>
                      <ChevronDown12Regular />
                    </n-icon>
                  </template>
                  {{ t('actions.downloadIndividual') }}
                </n-button>
              </n-dropdown>
            </n-space>
          </div>
        </n-space>
      </div>
    </n-space>
  </n-card>
</template>

<script lang="ts" setup>
import { NCard, NSpace, NButton, NProgress, NText, NIcon, NDropdown } from 'naive-ui'
import { ArrowDownload24Regular, ChevronDown12Regular } from '@vicons/fluent'
import { useI18n } from 'vue-i18n'
import { computed, ref } from 'vue'

const { t } = useI18n()

interface ProcessedFile {
  name: string
  blob: Blob
  originalFile: File
}

const props = defineProps<{
  files: File[]
  processedFiles: ProcessedFile[]
  progress: number
  saving: boolean
  currentFile?: string
  isBatch: boolean
}>()

const emit = defineEmits<{
  (e: 'generate'): void
  (e: 'download'): void
  (e: 'downloadSingle', file: ProcessedFile): void
}>()

const downloading = ref(false)

const progressPercentage = computed(() => {
  if (!props.isBatch || props.files.length === 0) return 0
  return Math.round(props.progress * 100)
})

const downloadOptions = computed(() => {
  return props.processedFiles.map((file, index) => ({
    label: file.name,
    key: index,
    props: {
      onClick: () => downloadSingle(index)
    }
  }))
})

const downloadSingle = (index: number | string) => {
  const fileIndex = typeof index === 'string' ? parseInt(index) : index
  const file = props.processedFiles[fileIndex]
  if (file) {
    emit('downloadSingle', file)
  }
}
</script>
