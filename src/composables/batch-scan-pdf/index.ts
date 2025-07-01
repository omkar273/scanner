import { PDF } from '@/utils/pdf-renderer/pdfjs'
import { MagicaScanner } from '@/utils/scan-renderer/magica-scan'
import { ScanCacher } from '@/utils/scan-renderer/scan-cacher'
import { imagesToPDF, type ImageInfo } from '@/utils/pdf-builder/jsPDF/images-to-pdf'
import type { ScanConfig } from '@/utils/scan-renderer'
import { generateRandomConfig, type RandomConfigRanges } from '@/utils/random-config'

interface BatchProcessResult {
    fileName: string
    blob: Blob
    originalFile: File
}

interface RandomSettings {
    enabled: boolean
    ranges: RandomConfigRanges
}

export function useBatchScanPDF() {
    const processBatch = async (
        files: File[],
        baseConfig: ScanConfig,
        randomSettings: RandomSettings,
        onProgress?: (progress: number, fileName: string) => void
    ): Promise<BatchProcessResult[]> => {
        const results: BatchProcessResult[] = []

        for (let i = 0; i < files.length; i++) {
            const file = files[i]
            const fileName = file.name

            onProgress?.(i / files.length, fileName)

            try {
                // Generate config for this file
                const fileConfig = randomSettings.enabled
                    ? generateRandomConfig(baseConfig, randomSettings.ranges)
                    : baseConfig

                // Process the PDF
                const processedBlob = await processSinglePDF(file, fileConfig)

                results.push({
                    fileName: fileName.replace(/\.(pdf|docx|doc)$/i, '_scanned.pdf'),
                    blob: processedBlob,
                    originalFile: file
                })
            } catch (error) {
                console.error(`Error processing ${fileName}:`, error)
                // Continue with other files even if one fails
            }
        }

        onProgress?.(1, '')
        return results
    }

    const processSinglePDF = async (file: File, config: ScanConfig): Promise<Blob> => {
        const pdfRenderer = new PDF(file)
        const scanRenderer = new ScanCacher(new MagicaScanner(config))

        // Get total pages
        const totalPages = await pdfRenderer.getNumPages()
        const scannedPages: Blob[] = []

        // Process each page
        for (let pageNum = 1; pageNum <= totalPages; pageNum++) {
            const pageInfo = await pdfRenderer.renderPage(pageNum, config.scale)
            const scannedPageResult = await scanRenderer.renderPage(pageInfo.blob)
            scannedPages.push(scannedPageResult.blob)
        }

        // Convert scanned pages back to PDF
        const scannedPDF = await renderPagesToPDF(scannedPages, config)
        return scannedPDF
    }

    const renderPagesToPDF = async (pages: Blob[], config: ScanConfig): Promise<Blob> => {
        // Convert blobs to ImageInfo format
        const imageInfos: ImageInfo[] = await Promise.all(
            pages.map(async (blob): Promise<ImageInfo> => {
                const img = new Image()
                const url = URL.createObjectURL(blob)

                return new Promise<ImageInfo>((resolve, reject) => {
                    img.onload = () => {
                        URL.revokeObjectURL(url)
                        resolve({
                            blob,
                            width: img.naturalWidth,
                            height: img.naturalHeight,
                            ppi: 96 // Default DPI
                        })
                    }
                    img.onerror = reject
                    img.src = url
                })
            })
        )

        // Create PDF from image infos
        const pdfBlob = await imagesToPDF(imageInfos)
        return pdfBlob
    }

    return {
        processBatch
    }
} 