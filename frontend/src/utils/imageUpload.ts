export interface CompressedImageResult {
  dataUrl: string
  originalBytes: number
  compressedBytes: number
  width: number
  height: number
}

interface CompressImageOptions {
  maxDimension?: number
  quality?: number
  mimeType?: string
}

function readFileAsDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        resolve(reader.result)
        return
      }
      reject(new Error('Could not read file'))
    }
    reader.onerror = () => reject(new Error('Could not read file'))
    reader.readAsDataURL(file)
  })
}

function loadImage(dataUrl: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image()
    image.onload = () => resolve(image)
    image.onerror = () => reject(new Error('Could not decode image'))
    image.src = dataUrl
  })
}

function canvasToDataUrl(canvas: HTMLCanvasElement, mimeType: string, quality: number) {
  return canvas.toDataURL(mimeType, quality)
}

function estimateBase64Bytes(dataUrl: string) {
  const [, base64 = ''] = dataUrl.split(',')
  const padding = (base64.match(/=+$/)?.[0].length ?? 0)
  return Math.max(0, Math.floor((base64.length * 3) / 4) - padding)
}

export async function compressImageFile(
  file: File,
  {
    maxDimension = 1600,
    quality = 0.82,
    mimeType = 'image/webp',
  }: CompressImageOptions = {}
): Promise<CompressedImageResult> {
  const dataUrl = await readFileAsDataUrl(file)
  const image = await loadImage(dataUrl)

  const ratio = Math.min(1, maxDimension / Math.max(image.width, image.height))
  const width = Math.max(1, Math.round(image.width * ratio))
  const height = Math.max(1, Math.round(image.height * ratio))

  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height

  const context = canvas.getContext('2d')
  if (!context) {
    throw new Error('Image compression is not available in this browser')
  }

  context.drawImage(image, 0, 0, width, height)

  const compressedDataUrl = canvasToDataUrl(canvas, mimeType, quality)

  return {
    dataUrl: compressedDataUrl,
    originalBytes: file.size,
    compressedBytes: estimateBase64Bytes(compressedDataUrl),
    width,
    height,
  }
}

export function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}
