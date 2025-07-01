import type { ScanConfig } from '@/utils/scan-renderer'
import { colorspaces } from '@/utils/scan-renderer/config.types'

export interface RandomConfigRanges {
    rotate: { min: number; max: number }
    rotate_var: { min: number; max: number }
    blur: { min: number; max: number }
    noise: { min: number; max: number }
    scale: { min: number; max: number }
    brightness: { min: number; max: number }
    yellowish: { min: number; max: number }
    contrast: { min: number; max: number }
    border: boolean // true means random, false means use base config
    colorspace: boolean // true means random, false means use base config
}

export const defaultRandomRanges: RandomConfigRanges = {
    rotate: { min: -2, max: 2 },
    rotate_var: { min: 0, max: 1 },
    blur: { min: 0.1, max: 1 },
    noise: { min: 0.1, max: 0.5 },
    scale: { min: 1.5, max: 3 },
    brightness: { min: 0.8, max: 1.2 },
    yellowish: { min: 0, max: 0.3 },
    contrast: { min: 0.9, max: 1.1 },
    border: true,
    colorspace: true
}

function randomInRange(min: number, max: number): number {
    return Math.random() * (max - min) + min
}

function randomChoice<T>(array: readonly T[]): T {
    return array[Math.floor(Math.random() * array.length)]
}

export function generateRandomConfig(
    baseConfig: ScanConfig,
    ranges: RandomConfigRanges
): ScanConfig {
    return {
        ...baseConfig,
        rotate: randomInRange(ranges.rotate.min, ranges.rotate.max),
        rotate_var: randomInRange(ranges.rotate_var.min, ranges.rotate_var.max),
        blur: randomInRange(ranges.blur.min, ranges.blur.max),
        noise: randomInRange(ranges.noise.min, ranges.noise.max),
        scale: randomInRange(ranges.scale.min, ranges.scale.max),
        brightness: randomInRange(ranges.brightness.min, ranges.brightness.max),
        yellowish: randomInRange(ranges.yellowish.min, ranges.yellowish.max),
        contrast: randomInRange(ranges.contrast.min, ranges.contrast.max),
        border: ranges.border ? Math.random() > 0.5 : baseConfig.border,
        colorspace: ranges.colorspace ? randomChoice(colorspaces) : baseConfig.colorspace
    }
}

export function getSettingRange(setting: keyof ScanConfig): { min: number; max: number } | null {
    const ranges: Record<string, { min: number; max: number }> = {
        rotate: { min: -5, max: 5 },
        rotate_var: { min: 0, max: 2 },
        blur: { min: 0, max: 2 },
        noise: { min: 0, max: 1 },
        scale: { min: 1, max: 3 },
        brightness: { min: 0, max: 2 },
        yellowish: { min: 0, max: 1 },
        contrast: { min: 0, max: 2 }
    }

    return ranges[setting] || null
} 