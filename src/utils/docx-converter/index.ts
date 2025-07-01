import * as mammoth from 'mammoth'
import html2canvas from 'html2canvas'
import { jsPDF } from 'jspdf'

export async function convertDocxToPdf(docxBlob: Blob, fileName: string): Promise<Blob> {
    try {
        // Convert DOCX to HTML
        const arrayBuffer = await docxBlob.arrayBuffer()
        const result = await mammoth.convertToHtml({ arrayBuffer })
        const html = result.value

        // Create a temporary container to render HTML
        const container = document.createElement('div')
        container.style.position = 'absolute'
        container.style.left = '-9999px'
        container.style.top = '-9999px'
        container.style.width = '794px' // A4 width in pixels at 96 DPI
        container.style.padding = '40px'
        container.style.fontFamily = 'Arial, sans-serif'
        container.style.fontSize = '12px'
        container.style.lineHeight = '1.5'
        container.style.backgroundColor = 'white'
        container.innerHTML = html

        document.body.appendChild(container)

        try {
            // Convert HTML to canvas
            const canvas = await html2canvas(container, {
                width: 794,
                height: 1123, // A4 height in pixels at 96 DPI
                backgroundColor: '#ffffff',
                scale: 2 // Higher quality
            })

            // Convert canvas to PDF
            const pdf = new jsPDF({
                orientation: 'portrait',
                unit: 'px',
                format: [794, 1123]
            })

            const imgData = canvas.toDataURL('image/jpeg', 0.8)
            pdf.addImage(imgData, 'JPEG', 0, 0, 794, 1123)

            // Convert PDF to blob
            const pdfBlob = pdf.output('blob')
            return pdfBlob
        } finally {
            // Clean up
            document.body.removeChild(container)
        }
    } catch (error) {
        console.error('Error converting DOCX to PDF:', error)
        throw new Error(`Failed to convert ${fileName} to PDF: ${error}`)
    }
} 