/**
 * Canvas Engine Core
 * ==================
 * Font registration, dimension presets, color helpers, and base template class.
 * Powered by @napi-rs/canvas (Skia engine).
 */
import { createCanvas, GlobalFonts, type Canvas, type SKRSContext2D } from '@napi-rs/canvas'
import path from 'path'

// ── Font Registration ──────────────────────────────────────────────

const FONTS_DIR = path.resolve(__dirname, '../../../../../assets/fonts')

/**
 * FONT_MAP: Maps our internal key → font file + the ACTUAL family name
 * that Skia registers (verified via GlobalFonts.families output).
 *
 * IMPORTANT: The family name MUST match what Skia reads from the font file's
 * internal metadata, NOT what we pass to registerFromPath(). Skia uses the
 * font's built-in family name for matching in CSS font strings.
 */
const FONT_MAP: Record<string, { file: string; family: string }> = {
	montserrat:      { file: 'Montserrat.ttf',              family: 'Montserrat' },
	bebas:           { file: 'BebasNeue-Regular.ttf',        family: 'Bebas Neue' },
	playfair:        { file: 'PlayfairDisplay.ttf',          family: 'PlayfairDisplay' },
	'dancing-script':{ file: 'DancingScript-Variable.ttf',   family: 'Dancing Script' },
	'great-vibes':   { file: 'GreatVibes-Regular.ttf',       family: 'Great Vibes' },
	allura:          { file: 'Allura-Regular.ttf',           family: 'Allura' },
	oswald:          { file: 'Oswald-Bold.ttf',              family: 'Oswald' },
	kaushan:         { file: 'KaushanScript-Regular.ttf',    family: 'KaushanScript' },
	playlist:        { file: 'Playlist-Script.otf',          family: 'Playlist' },
	cormorant:       { file: 'CormorantGaramond.ttf',        family: 'Cormorant' },
	'cormorant-italic': { file: 'CormorantGaramond-Italic.ttf', family: 'CormorantItalic' },
	brittany:        { file: 'BrittanySignature.ttf',        family: 'BrittanySignature' },
	'dm-sans':       { file: 'DMSans-Regular.woff',          family: 'DM Sans' },
	'dm-sans-medium':{ file: 'DMSans-Medium.woff',           family: 'DM Sans' },
	'dm-sans-bold':  { file: 'DMSans-Bold.woff',             family: 'DM Sans' },
}

let fontsRegistered = false

export function registerFonts(): void {
	if (fontsRegistered) return
	for (const [, entry] of Object.entries(FONT_MAP)) {
		const fontPath = path.join(FONTS_DIR, entry.file)
		GlobalFonts.registerFromPath(fontPath, entry.family)
	}
	fontsRegistered = true
}

/**
 * Get the CSS font string for canvas context.
 * Format: "[weight] [size]px [family]"
 *
 * IMPORTANT: The family name must be quoted if it contains spaces.
 */
export function fontString(name: string, size: number, weight: number = 400): string {
	const entry = FONT_MAP[name]
	if (!entry) throw new Error(`Unknown font: ${name}`)
	const family = entry.family.includes(' ') ? `"${entry.family}"` : entry.family
	return `${weight} ${size}px ${family}`
}

/**
 * Shorthand font presets matching the Python engine.
 *
 * Montserrat variable font on this system supports weights:
 *   100, 400, 600, 700, 800
 * So "black" (900) maps to 800 (the heaviest available).
 */
export const FONT_PRESETS: Record<string, { name: string; weight: number }> = {
	'montserrat':          { name: 'montserrat', weight: 400 },
	'montserrat-medium':   { name: 'montserrat', weight: 600 },
	'montserrat-semibold': { name: 'montserrat', weight: 600 },
	'montserrat-bold':     { name: 'montserrat', weight: 700 },
	'montserrat-extrabold':{ name: 'montserrat', weight: 800 },
	'montserrat-black':    { name: 'montserrat', weight: 800 },
	'dancing-script':      { name: 'dancing-script', weight: 400 },
	'dancing-script-bold': { name: 'dancing-script', weight: 700 },
	'bebas':               { name: 'bebas', weight: 400 },
	'playfair':            { name: 'playfair', weight: 400 },
	'great-vibes':         { name: 'great-vibes', weight: 400 },
	'allura':              { name: 'allura', weight: 400 },
	'oswald':              { name: 'oswald', weight: 700 },
	'kaushan':             { name: 'kaushan', weight: 400 },
	'playlist':            { name: 'playlist', weight: 400 },
	'cormorant':           { name: 'cormorant', weight: 400 },
	'brittany':            { name: 'brittany', weight: 400 },
	'dm-sans':             { name: 'dm-sans', weight: 400 },
	'dm-sans-medium':      { name: 'dm-sans', weight: 500 },
	'dm-sans-bold':        { name: 'dm-sans', weight: 700 },
}

/** Resolve a preset name (like 'montserrat-black') to a CSS font string */
export function preset(presetName: string, size: number): string {
	const p = FONT_PRESETS[presetName]
	if (!p) throw new Error(`Unknown font preset: ${presetName}`)
	return fontString(p.name, size, p.weight)
}

// ── Dimension Presets ──────────────────────────────────────────────

export interface Dimensions {
	width: number
	height: number
}

export const INSTAGRAM: Record<string, Dimensions> = {
	'4:5':    { width: 1080, height: 1350 },
	'1:1':    { width: 1080, height: 1080 },
	'1.91:1': { width: 1080, height: 566 },
	'16:9':   { width: 1920, height: 1080 },
	'9:16':   { width: 1080, height: 1920 },
}

// ── Color Helpers ──────────────────────────────────────────────────

/** Parse hex/rgb/tuple to CSS color string */
export function toCSS(color: string | number[]): string {
	if (typeof color === 'string') return color
	if (color.length === 4) return `rgba(${color[0]}, ${color[1]}, ${color[2]}, ${color[3] / 255})`
	return `rgb(${color[0]}, ${color[1]}, ${color[2]})`
}

/** Parse a hex string to [r, g, b] or [r, g, b, a] */
export function hexToRgb(hex: string): number[] {
	const h = hex.replace('#', '')
	if (h.length === 6) {
		return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)]
	}
	if (h.length === 8) {
		return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16), parseInt(h.slice(6, 8), 16)]
	}
	return [0, 0, 0]
}

/** Parse color from any format (hex string, rgb array, css string) to CSS string */
export function parseColor(val: unknown, fallback: string = '#000000'): string {
	if (!val) return fallback
	if (typeof val === 'string') return val
	if (Array.isArray(val)) return toCSS(val)
	return fallback
}

// ── Canvas Factory ─────────────────────────────────────────────────

export function createTemplateCanvas(dims: Dimensions): { canvas: Canvas; ctx: SKRSContext2D } {
	registerFonts()
	const canvas = createCanvas(dims.width, dims.height)
	const ctx = canvas.getContext('2d')
	return { canvas, ctx }
}

// ── Utility Helpers ────────────────────────────────────────────────

/** Convert a 0..1 fraction to pixel value */
export function px(fraction: number, total: number): number {
	return Math.round(fraction * total)
}

/** Clamp value between min and max */
export function clamp(val: number, min: number, max: number): number {
	return Math.max(min, Math.min(max, val))
}

export { Canvas, SKRSContext2D }
