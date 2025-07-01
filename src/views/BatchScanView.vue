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
                <n-space align="center">
                  <n-text strong>{{
                    t('actions.filesFound', { count: batchFiles.length })
                  }}</n-text>
                  <n-tooltip>
                    <template #trigger>
                      <n-icon size="16" style="cursor: help; color: var(--n-text-color-disabled)">
                        <svg viewBox="0 0 16 16" fill="currentColor">
                          <path
                            d="M8 16A8 8 0 1 1 8 0a8 8 0 0 1 0 16zM8 4a.905.905 0 0 0-.9.995l.35 3.507a.552.552 0 0 0 1.1 0l.35-3.507A.905.905 0 0 0 8 4zm.002 6a1 1 0 1 0 0 2 1 1 0 0 0 0-2z"
                          />
                        </svg>
                      </n-icon>
                    </template>
                    <div style="max-width: 300px">
                      {{ t('actions.zipStructureInfo') }}
                    </div>
                  </n-tooltip>
                </n-space>
                <n-list size="small">
                  <n-list-item v-for="file in batchFiles.slice(0, 5)" :key="file.file.name">
                    <n-space vertical size="small">
                      <n-ellipsis style="max-width: 200px">{{ file.file.name }}</n-ellipsis>
                      <n-text depth="3" style="font-size: 0.85em">
                        Path: {{ file.originalPath }}
                      </n-text>
                    </n-space>
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
            :files="
              batchFiles.length > 0 ? batchFiles.map((f) => f.file) : singleFile ? [singleFile] : []
            "
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

              <div v-if="batchFiles.length > 1">
                <n-text depth="2" style="margin-bottom: 8px; display: block"
                  >Select file to preview:</n-text
                >
                <n-select
                  v-model:value="selectedFileIndex"
                  :options="fileSelectOptions"
                  placeholder="Choose a file to preview"
                />
              </div>

              <div v-if="previewFile">
                <n-space align="center" style="margin: 16px 0 12px 0">
                  <n-text>{{ t('actions.previewFile') }}: {{ previewFile.name }}</n-text>
                  <n-text depth="3" v-if="selectedPreviewFile">
                    Path: {{ selectedPreviewFile.originalPath }}
                  </n-text>
                </n-space>
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
  NEmpty,
  NTooltip,
  NIcon,
  NSelect
} from 'naive-ui'
import MainContainer from '@/components/MainContainer.vue'
import { type ScanConfig, defaultConfig, MagicaScanner } from '@/utils/scan-renderer/magica-scan'
import {
  type ScanConfig as CanvasScanConfig,
  defaultConfig as canvasDefaultConfig,
  CanvasScanner
} from '@/utils/scan-renderer/canvas-scan'
import { featureDetect } from '@/utils/scan-renderer/canvas-scan'
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

// Feature detection to choose the appropriate scanner
const supportCanvasScan = featureDetect()
console.log('🔍 [BATCH-VIEW] Browser feature detection:', {
  supportsCanvas: supportCanvasScan,
  scannerType: supportCanvasScan ? 'CanvasScanner' : 'MagicaScanner'
})

interface ProcessedFile {
  name: string
  blob: Blob
  originalFile: File
  originalPath: string
}

interface FileWithPath {
  file: File
  originalPath: string
}

interface RandomSettings {
  enabled: boolean
  ranges: RandomConfigRanges
}

const singleFile = ref<File | undefined>(undefined)
const batchFiles = ref<FileWithPath[]>([])
const selectedFileIndex = ref(0)
const config = ref<ScanConfig>(supportCanvasScan ? canvasDefaultConfig : defaultConfig)
const randomSettings = ref<RandomSettings>({
  enabled: false,
  ranges: defaultRandomRanges
})

const processedFiles = ref<ProcessedFile[]>([])
const progress = ref(0)
const saving = ref(false)
const currentFileName = ref<string>('')

// Preview functionality
const previewFile = computed(() => {
  if (batchFiles.value.length > 0) {
    const selectedFile = batchFiles.value[selectedFileIndex.value]
    console.log('🔍 [BATCH-VIEW] Preview file computed:', {
      selectedIndex: selectedFileIndex.value,
      fileName: selectedFile?.file.name,
      fileSize: selectedFile?.file.size,
      totalFiles: batchFiles.value.length
    })
    return selectedFile?.file
  }
  return singleFile.value
})

const selectedPreviewFile = computed(() => {
  if (batchFiles.value.length > 0) {
    return batchFiles.value[selectedFileIndex.value]
  }
  return null
})

const pdfRenderer = computed(() => {
  if (!singleFile.value) return
  console.log('📄 [BATCH-VIEW] Creating PDF renderer for single file:', singleFile.value.name)
  return new PDF(singleFile.value)
})

const previewPdfRenderer = computed(() => {
  if (!previewFile.value) return
  console.log('📄 [BATCH-VIEW] Creating preview PDF renderer for:', previewFile.value.name)
  return new PDF(previewFile.value)
})

// Create scanners based on feature detection
const createScanner = (config: ScanConfig) => {
  if (supportCanvasScan) {
    console.log('🎨 [BATCH-VIEW] Creating CanvasScanner with config:', config)
    return new ScanCacher(new CanvasScanner(config))
  } else {
    console.log('🎨 [BATCH-VIEW] Creating MagicaScanner with config:', config)
    return new ScanCacher(new MagicaScanner(config))
  }
}

const scanRenderer = ref(createScanner(config.value))
const previewScanRenderer = ref(createScanner(config.value))

watch(
  config,
  (newConfig) => {
    console.log('⚙️ [BATCH-VIEW] Config changed, updating scanners:', newConfig)
    scanRenderer.value = createScanner(newConfig)
    previewScanRenderer.value = createScanner(newConfig)
  },
  { deep: true }
)

const { processBatch } = useBatchScanPDF()

const generateBatch = async () => {
  const filesToProcess =
    batchFiles.value.length > 0
      ? batchFiles.value
      : singleFile.value
        ? [{ file: singleFile.value, originalPath: singleFile.value.name }]
        : []

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
      originalFile: result.originalFile,
      originalPath: result.originalPath
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
    // Multiple files - create ZIP preserving original structure
    const zip = new JSZip()

    processedFiles.value.forEach((file) => {
      // Use original path structure but with scanned filename
      const pathParts = file.originalPath.split('/')
      const originalFileName = pathParts.pop() || file.name
      const directory = pathParts.join('/')

      // Create the scanned filename
      const scannedFileName = originalFileName.replace(/\.(pdf|docx|doc)$/i, '_scanned.pdf')
      const fullPath = directory ? `${directory}/${scannedFileName}` : scannedFileName

      zip.file(fullPath, file.blob)
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

// Watch for batch files changes and reset selection
watch(batchFiles, (newFiles) => {
  console.log('📥 [BATCH-VIEW] Batch files changed:', {
    newCount: newFiles.length,
    files: newFiles.map((f) => ({ name: f.file.name, path: f.originalPath }))
  })
  if (newFiles.length > 0) {
    selectedFileIndex.value = 0
    console.log('🎯 [BATCH-VIEW] Selected first file for preview:', {
      selectedIndex: 0,
      fileName: newFiles[0].file.name,
      path: newFiles[0].originalPath
    })
  }
})

const fileSelectOptions = computed(() => {
  return batchFiles.value.map((file, index) => ({
    label: `${file.file.name} (${file.originalPath})`,
    value: index
  }))
})
</script>
