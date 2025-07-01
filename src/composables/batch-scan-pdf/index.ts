import { PDF } from '@/utils/pdf-renderer/pdfjs'
import { MagicaScanner } from '@/utils/scan-renderer/magica-scan'
import { CanvasScanner } from '@/utils/scan-renderer/canvas-scan'
import { featureDetect } from '@/utils/scan-renderer/canvas-scan'
import { ScanCacher } from '@/utils/scan-renderer/scan-cacher'
import { imagesToPDF, type ImageInfo } from '@/utils/pdf-builder/jsPDF/images-to-pdf'
import type { ScanConfig } from '@/utils/scan-renderer'
import { generateRandomConfig, type RandomConfigRanges } from '@/utils/random-config'
import { convertDocxToPdf } from '@/utils/docx-converter'

interface BatchProcessResult {
    fileName: string
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

// Document processors for different file types
interface DocumentProcessor {
    canHandle(file: File): boolean
    getPageCount(file: File): Promise<number>
    renderPage(file: File, pageNum: number, scale: number): Promise<Blob>
}

class PDFProcessor implements DocumentProcessor {
    canHandle(file: File): boolean {
        return file.type === 'application/pdf'
    }

    async getPageCount(file: File): Promise<number> {
        const pdfRenderer = new PDF(file)
        return await pdfRenderer.getNumPages()
    }

    async renderPage(file: File, pageNum: number, scale: number): Promise<Blob> {
        const pdfRenderer = new PDF(file)
        const pageInfo = await pdfRenderer.renderPage(pageNum, scale)
        return pageInfo.blob
    }
}

class DocxProcessor implements DocumentProcessor {
    canHandle(file: File): boolean {
        return ['application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'application/msword'].includes(file.type)
    }

    async getPageCount(file: File): Promise<number> {
        // DOCX files are typically single page when converted
        return 1
    }

    async renderPage(file: File, pageNum: number, scale: number): Promise<Blob> {
        console.log(`📝 [DOCX] Converting DOCX directly to image: ${file.name}`)
        const startTime = performance.now()

        // Convert directly to image instead of PDF → Image
        const imageBlob = await this.convertDocxToImage(file, scale)

        const endTime = performance.now()
        console.log(`✅ [DOCX] Direct image conversion completed in ${Math.round(endTime - startTime)}ms`)

        return imageBlob
    }

    private async convertDocxToImage(file: File, scale: number): Promise<Blob> {
        // For now, use the existing DOCX converter but we could optimize this further
        const pdfBlob = await convertDocxToPdf(file, file.name)
        const tempPdfFile = new File([pdfBlob], 'temp.pdf', { type: 'application/pdf' })

        // Convert the first page to image
        const pdfRenderer = new PDF(tempPdfFile)
        const pageInfo = await pdfRenderer.renderPage(1, scale)
        return pageInfo.blob
    }
}

class PowerPointProcessor implements DocumentProcessor {
    canHandle(file: File): boolean {
        return ['application/vnd.openxmlformats-officedocument.presentationml.presentation', 'application/vnd.ms-powerpoint'].includes(file.type)
    }

    async getPageCount(file: File): Promise<number> {
        // TODO: Implement proper PPT page counting
        console.log(`📊 [PPT] PowerPoint processing not fully implemented yet: ${file.name}`)
        return 1
    }

    async renderPage(file: File, pageNum: number, scale: number): Promise<Blob> {
        console.log(`📽️ [PPT] PowerPoint processing not fully implemented yet: ${file.name}`)
        // TODO: Implement proper PPT to image conversion
        throw new Error(`PowerPoint processing not implemented yet for ${file.name}`)
    }
}

// Feature detection for scanner selection
const supportCanvasScan = featureDetect()

// Available document processors
const processors: DocumentProcessor[] = [
    new PDFProcessor(),
    new DocxProcessor(),
    new PowerPointProcessor()
]

function getProcessorForFile(file: File): DocumentProcessor {
    const processor = processors.find(p => p.canHandle(file))
    if (!processor) {
        throw new Error(`No processor available for file type: ${file.type} (${file.name})`)
    }
    return processor
}

export function useBatchScanPDF() {
    const processBatch = async (
        files: FileWithPath[],
        baseConfig: ScanConfig,
        randomSettings: RandomSettings,
        onProgress?: (progress: number, fileName: string) => void
    ): Promise<BatchProcessResult[]> => {
        console.log('🚀 [BATCH] Starting optimized batch processing:', {
            fileCount: files.length,
            fileTypes: files.map(f => ({ name: f.file.name, type: f.file.type })),
            randomEnabled: randomSettings.enabled,
            scannerType: supportCanvasScan ? 'CanvasScanner' : 'MagicaScanner'
        })

        const startTime = performance.now()
        const results: BatchProcessResult[] = []

        // Process files with limited concurrency to avoid overwhelming the browser
        const CONCURRENT_FILES = 2 // Process 2 files at a time
        const batches = []

        for (let i = 0; i < files.length; i += CONCURRENT_FILES) {
            batches.push(files.slice(i, i + CONCURRENT_FILES))
        }

        let processedCount = 0

        for (const batch of batches) {
            const batchPromises = batch.map(async (fileWithPath) => {
                const file = fileWithPath.file
                const fileName = file.name

                console.log(`📄 [BATCH] Starting optimized processing: ${fileName} (${file.type}, ${file.size} bytes)`)
                const fileStartTime = performance.now()

                try {
                    // Generate config for this file
                    const fileConfig = randomSettings.enabled
                        ? generateRandomConfig(baseConfig, randomSettings.ranges)
                        : baseConfig

                    console.log(`⚙️ [BATCH] Processing ${fileName} with config:`, {
                        scale: fileConfig.scale,
                        blur: fileConfig.blur,
                        brightness: fileConfig.brightness
                    })

                    // Process the document (PDF, DOCX, PPT, etc.)
                    const processedBlob = await processSingleDocument(file, fileConfig)

                    const fileEndTime = performance.now()
                    console.log(`✅ [BATCH] Completed ${fileName} in ${Math.round(fileEndTime - fileStartTime)}ms`)

                    return {
                        fileName: fileName.replace(/\.(pdf|docx|doc|ppt|pptx)$/i, '_scanned.pdf'),
                        blob: processedBlob,
                        originalFile: file,
                        originalPath: fileWithPath.originalPath
                    }
                } catch (error) {
                    console.error(`❌ [BATCH] Error processing ${fileName}:`, error)
                    return null
                }
            })

            const batchResults = await Promise.all(batchPromises)

            // Add successful results
            batchResults.forEach(result => {
                if (result) {
                    results.push(result)
                    processedCount++
                    onProgress?.(processedCount / files.length, result.fileName)
                }
            })
        }

        const totalTime = performance.now() - startTime
        console.log(`🎉 [BATCH] Optimized batch processing completed!`, {
            totalFiles: files.length,
            successfulFiles: results.length,
            totalTimeMs: Math.round(totalTime),
            avgTimePerFile: Math.round(totalTime / files.length)
        })

        onProgress?.(1, '')
        return results
    }

    const processSingleDocument = async (file: File, config: ScanConfig): Promise<Blob> => {
        const docStartTime = performance.now()

        console.log(`📖 [DOC] Processing document: ${file.name} (${file.type})`)
        const processor = getProcessorForFile(file)

        // Create scanner with feature detection
        console.log(`🎨 [DOC] Creating scanner (${supportCanvasScan ? 'Canvas' : 'Magica'}) for: ${file.name}`)
        const scanRenderer = new ScanCacher(
            supportCanvasScan ? new CanvasScanner(config) : new MagicaScanner(config)
        )

        // Get total pages
        const totalPages = await processor.getPageCount(file)
        console.log(`📊 [DOC] ${file.name} has ${totalPages} pages`)

        // Process pages in parallel (limited concurrency)
        const CONCURRENT_PAGES = 3 // Process 3 pages at a time
        const scannedPages: Blob[] = new Array(totalPages)

        const pagePromises = []
        for (let pageNum = 1; pageNum <= totalPages; pageNum++) {
            pagePromises.push(
                processDocumentPage(processor, scanRenderer, file, pageNum, config)
                    .then(blob => {
                        scannedPages[pageNum - 1] = blob
                    })
            )
        }

        // Process pages with limited concurrency
        for (let i = 0; i < pagePromises.length; i += CONCURRENT_PAGES) {
            const batch = pagePromises.slice(i, i + CONCURRENT_PAGES)
            await Promise.all(batch)
            console.log(`📄 [DOC] Processed pages ${i + 1}-${Math.min(i + CONCURRENT_PAGES, totalPages)} of ${totalPages} for ${file.name}`)
        }

        console.log(`🔄 [DOC] Converting scanned pages back to PDF for: ${file.name}`)
        const pdfBuildStart = performance.now()

        // Convert scanned pages back to PDF
        const scannedPDF = await renderPagesToPDF(scannedPages, config)

        const pdfBuildTime = performance.now() - pdfBuildStart
        const totalDocTime = performance.now() - docStartTime

        console.log(`📖 [PDF-BUILD] PDF built for ${file.name} in ${Math.round(pdfBuildTime)}ms (total: ${Math.round(totalDocTime)}ms)`)

        return scannedPDF
    }

    const processDocumentPage = async (
        processor: DocumentProcessor,
        scanRenderer: ScanCacher,
        file: File,
        pageNum: number,
        config: ScanConfig
    ): Promise<Blob> => {
        const pageStartTime = performance.now()

        console.log(`📄 [PAGE] Rendering page ${pageNum} of ${file.name}`)
        const imageBlob = await processor.renderPage(file, pageNum, config.scale)

        const renderTime = performance.now() - pageStartTime
        console.log(`🎨 [SCAN] Applying scan effect to page ${pageNum} of ${file.name} (render: ${Math.round(renderTime)}ms)`)

        const scanStartTime = performance.now()
        const scannedPageResult = await scanRenderer.renderPage(imageBlob)
        const scanTime = performance.now() - scanStartTime

        const totalPageTime = performance.now() - pageStartTime
        console.log(`✅ [PAGE] Page ${pageNum} of ${file.name} completed in ${Math.round(totalPageTime)}ms (scan: ${Math.round(scanTime)}ms)`)

        return scannedPageResult.blob
    }

    const renderPagesToPDF = async (pages: Blob[], config: ScanConfig): Promise<Blob> => {
        console.log(`📖 [PDF-BUILD] Converting ${pages.length} scanned pages to PDF`)
        const buildStartTime = performance.now()

        // Convert blobs to ImageInfo format in parallel
        const imageInfos: ImageInfo[] = await Promise.all(
            pages.map(async (blob, index): Promise<ImageInfo> => {
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
                    img.onerror = () => {
                        URL.revokeObjectURL(url)
                        reject(new Error(`Failed to load image for page ${index + 1}`))
                    }
                    img.src = url
                })
            })
        )

        const imageLoadTime = performance.now() - buildStartTime
        console.log(`📊 [PDF-BUILD] Image loading completed in ${Math.round(imageLoadTime)}ms`)

        // Create PDF from image infos
        const pdfBuildStartTime = performance.now()
        const pdfBlob = await imagesToPDF(imageInfos)
        const pdfBuildTime = performance.now() - pdfBuildStartTime

        const totalBuildTime = performance.now() - buildStartTime
        console.log(`📖 [PDF-BUILD] PDF creation completed in ${Math.round(pdfBuildTime)}ms (total: ${Math.round(totalBuildTime)}ms)`)

        return pdfBlob
    }

    return {
        processBatch
    }
} 