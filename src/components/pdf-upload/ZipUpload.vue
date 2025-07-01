<template>
  <n-card>
    <n-space vertical>
      <n-button-group>
        <n-button text @click="onSelectSingle">
          <template #icon>
            <n-icon>
              <DocumentPdf20Regular />
            </n-icon>
          </template>
          <n-text>
            {{ t('settings.pdfSelectLabel') }}
          </n-text>
        </n-button>
        <n-button text @click="onSelectZip">
          <template #icon>
            <n-icon>
              <FolderZip20Regular />
            </n-icon>
          </template>
          <n-text>
            {{ t('settings.zipSelectLabel') }}
          </n-text>
        </n-button>
      </n-button-group>

      <div v-if="processing">
        <n-progress type="line" :percentage="progressPercentage" />
        <n-text depth="3">{{ t('settings.processingZip') }}</n-text>
      </div>
    </n-space>
  </n-card>
</template>

<script lang="ts" setup>
import { NButton, NButtonGroup, NIcon, NText, NCard, NSpace, NProgress } from 'naive-ui'
import { DocumentPdf20Regular, FolderZip20Regular } from '@vicons/fluent'
import { fileOpen } from 'browser-fs-access'
import { useI18n } from 'vue-i18n'
import { ref } from 'vue'
import JSZip from 'jszip'
import { convertDocxToPdf } from '@/utils/docx-converter'

const { t } = useI18n()

const processing = ref(false)
const progressPercentage = ref(0)

const emit = defineEmits<{
  (e: 'update:pdf', file: File | undefined): void
  (e: 'update:files', files: File[]): void
}>()

async function onSelectSingle() {
  const file = await fileOpen({
    description: 'PDF Files',
    mimeTypes: ['application/pdf'],
    extensions: ['.pdf']
  })
  emit('update:pdf', file)
  emit('update:files', [])
}

async function onSelectZip() {
  const zipFile = await fileOpen({
    description: 'ZIP Files',
    mimeTypes: ['application/zip'],
    extensions: ['.zip']
  })

  processing.value = true
  progressPercentage.value = 0

  try {
    const files = await processZipFile(zipFile)
    emit('update:files', files)
    emit('update:pdf', undefined)
  } catch (error) {
    console.error('Error processing ZIP file:', error)
  } finally {
    processing.value = false
    progressPercentage.value = 0
  }
}

async function processZipFile(zipFile: File): Promise<File[]> {
  const zip = new JSZip()
  const zipContent = await zip.loadAsync(zipFile)

  const processedFiles: File[] = []
  const entries = Object.entries(zipContent.files)

  for (let i = 0; i < entries.length; i++) {
    const [path, file] = entries[i]
    progressPercentage.value = (i / entries.length) * 100

    if (file.dir) continue

    const fileName = path.split('/').pop() || path
    const fileExtension = fileName.toLowerCase().split('.').pop()

    if (!fileExtension || !['pdf', 'docx', 'doc'].includes(fileExtension)) {
      continue
    }

    try {
      const blob = await file.async('blob')

      if (fileExtension === 'pdf') {
        const pdfFile = new File([blob], fileName, { type: 'application/pdf' })
        processedFiles.push(pdfFile)
      } else if (fileExtension === 'docx' || fileExtension === 'doc') {
        const pdfBlob = await convertDocxToPdf(blob, fileName)
        const pdfFileName = fileName.replace(/\.(docx|doc)$/i, '.pdf')
        const pdfFile = new File([pdfBlob], pdfFileName, { type: 'application/pdf' })
        processedFiles.push(pdfFile)
      }
    } catch (error) {
      console.error(`Error processing file ${fileName}:`, error)
    }
  }

  return processedFiles
}
</script>
