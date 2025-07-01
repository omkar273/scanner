<template>
  <MainContainer>
    <div style="margin-bottom: 25px">
      <BackToIndex />
    </div>
    <n-grid x-gap="25" y-gap="25" :cols="12" item-responsive responsive="screen">
      <n-grid-item span="12 s:5 m:4 l:3">
        <n-space vertical>
          <ZipUpload @update:files="batchFiles = $event" @update:pdf="singleFile = $event" />

          <div v-if="batchFiles.length > 0">
            <n-card>
              <n-space vertical>
                <n-text strong>{{ t('actions.filesFound', { count: batchFiles.length }) }}</n-text>
                <n-list size="small">
                  <n-list-item v-for="file in batchFiles.slice(0, 5)" :key="file.name">
                    <n-ellipsis style="max-width: 200px">{{ file.name }}</n-ellipsis>
                  </n-list-item>
                  <n-list-item v-if="batchFiles.length > 5">
                    <n-text depth="3">{{
                      t('actions.andMore', { count: batchFiles.length - 5 })
                    }}</n-text>
                  </n-list-item>
                </n-list>
              </n-space>
            </n-card>
          </div>

          <ScanSettingsCard v-model:config="config" />
          <RandomSettingsCard v-model:randomSettings="randomSettings" />

          <BatchSaveButtonCard
            @generate="generateBatch"
            @download="downloadAll"
            @downloadSingle="downloadSingle"
            :progress="progress"
            :saving="saving"
            :files="batchFiles.length > 0 ? batchFiles : singleFile ? [singleFile] : []"
            :processedFiles="processedFiles"
            :currentFile="currentFileName"
            :isBatch="batchFiles.length > 0"
          />
        </n-space>
      </n-grid-item>
      <n-grid-item span="12 s:7 m:8 l:9">
        <div v-if="singleFile">
          <PreviewCompare
            :pdfRenderer="pdfRenderer"
            :scanRenderer="scanRenderer"
            :scale="config.scale"
          />
        </div>
        <div v-else-if="batchFiles.length > 0">
          <n-card>
            <n-space vertical>
              <n-text strong>{{ t('actions.batchPreview') }}</n-text>
              <n-text depth="3">{{ t('actions.batchPreviewDesc') }}</n-text>
              <div v-if="previewFile">
                <n-text>{{ t('actions.previewFile') }}: {{ previewFile.name }}</n-text>
                <PreviewCompare
                  :pdfRenderer="previewPdfRenderer"
                  :scanRenderer="previewScanRenderer"
                  :scale="config.scale"
                />
              </div>
            </n-space>
          </n-card>
        </div>
        <div v-else>
          <n-empty :description="t('actions.selectFiles')" />
        </div>
      </n-grid-item>
    </n-grid>
  </MainContainer>
</template>

<script lang="ts" setup>
import {
  NGrid,
  NGridItem,
  NSpace,
  NCard,
  NText,
  NList,
  NListItem,
  NEllipsis,
  NEmpty
} from 'naive-ui'
import MainContainer from '@/components/MainContainer.vue'
import { type ScanConfig, defaultConfig, MagicaScanner } from '@/utils/scan-renderer/magica-scan'
import ScanSettingsCard from '@/components/scan-settings/ScanSettingsCard.vue'
import RandomSettingsCard from '@/components/scan-settings/RandomSettingsCard.vue'
import ZipUpload from '@/components/pdf-upload/ZipUpload.vue'
import { ref, computed, watch } from 'vue'
import BackToIndex from '@/components/buttons/BackToIndex.vue'
import { useHead } from '@unhead/vue'
import { useI18n } from 'vue-i18n'
import { PDF } from '@/utils/pdf-renderer/pdfjs'
import PreviewCompare from '@/components/page-preview/PreviewCompare.vue'
import BatchSaveButtonCard from '@/components/save-button/BatchSaveButtonCard.vue'
import { ScanCacher } from '@/utils/scan-renderer/scan-cacher'
import { useMessage } from 'naive-ui'
import {
  generateRandomConfig,
  defaultRandomRanges,
  type RandomConfigRanges
} from '@/utils/random-config'
import { useBatchScanPDF } from '@/composables/batch-scan-pdf'
import { fileSave } from 'browser-fs-access'
import JSZip from 'jszip'

const { t } = useI18n()
const message = useMessage()

useHead({
  title: t('base.batchScanTitle') + ' - ' + t('base.title'),
  meta: [{ name: 'description', content: t('base.description') }]
})

interface ProcessedFile {
  name: string
  blob: Blob
  originalFile: File
}

interface RandomSettings {
  enabled: boolean
  ranges: RandomConfigRanges
}

const singleFile = ref<File | undefined>(undefined)
const batchFiles = ref<File[]>([])
const config = ref<ScanConfig>(defaultConfig)
const randomSettings = ref<RandomSettings>({
  enabled: false,
  ranges: defaultRandomRanges
})

const processedFiles = ref<ProcessedFile[]>([])
const progress = ref(0)
const saving = ref(false)
const currentFileName = ref<string>('')

// Preview functionality
const previewFile = computed(() => batchFiles.value[0] || singleFile.value)

const pdfRenderer = computed(() => {
  if (!singleFile.value) return
  return new PDF(singleFile.value)
})

const previewPdfRenderer = computed(() => {
  if (!previewFile.value) return
  return new PDF(previewFile.value)
})

const scanRenderer = ref(new ScanCacher(new MagicaScanner(config.value)))
const previewScanRenderer = ref(new ScanCacher(new MagicaScanner(config.value)))

watch(
  config,
  (newConfig) => {
    scanRenderer.value = new ScanCacher(new MagicaScanner(newConfig))
    previewScanRenderer.value = new ScanCacher(new MagicaScanner(newConfig))
  },
  { deep: true }
)

const { processBatch } = useBatchScanPDF()

const generateBatch = async () => {
  const filesToProcess =
    batchFiles.value.length > 0 ? batchFiles.value : singleFile.value ? [singleFile.value] : []

  if (filesToProcess.length === 0) {
    message.error(t('actions.noFilesSelected'))
    return
  }

  saving.value = true
  processedFiles.value = []
  progress.value = 0

  try {
    const results = await processBatch(
      filesToProcess,
      config.value,
      randomSettings.value,
      (fileProgress, fileName) => {
        progress.value = fileProgress
        currentFileName.value = fileName
      }
    )

    processedFiles.value = results.map((result) => ({
      name: result.fileName,
      blob: result.blob,
      originalFile: result.originalFile
    }))

    message.success(t('actions.batchProcessComplete', { count: results.length }))
  } catch (error) {
    message.error(t('actions.batchProcessError') + (error as Error).message)
  } finally {
    saving.value = false
    currentFileName.value = ''
  }
}

const downloadAll = async () => {
  if (processedFiles.value.length === 0) return

  if (processedFiles.value.length === 1) {
    // Single file download
    const file = processedFiles.value[0]
    await fileSave(file.blob, {
      fileName: file.name,
      extensions: ['.pdf']
    })
  } else {
    // Multiple files - create ZIP
    const zip = new JSZip()

    processedFiles.value.forEach((file) => {
      zip.file(file.name, file.blob)
    })

    const zipBlob = await zip.generateAsync({ type: 'blob' })
    await fileSave(zipBlob, {
      fileName: 'scanned-documents.zip',
      extensions: ['.zip']
    })
  }

  message.success(t('actions.downloadComplete'))
}

const downloadSingle = async (file: ProcessedFile) => {
  await fileSave(file.blob, {
    fileName: file.name,
    extensions: ['.pdf']
  })
  message.success(t('actions.downloadComplete'))
}
</script>
