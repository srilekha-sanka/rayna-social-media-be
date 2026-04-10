import puppeteer, { Browser, Page } from 'puppeteer'
import path from 'path'
import fs from 'fs'
import { logger } from '../../common/logger/logging'

// ── Types ────────────────────────────────────────────────────────────

export interface TemplateData {
	[key: string]: string | number | boolean | undefined
}

// ── Constants ────────────────────────────────────────────────────────

const TEMPLATES_DIR = path.join(__dirname, '../../../../templates')
const FONTS_DIR = path.join(__dirname, '../../../../assets/fonts')

// ── Font loading ─────────────────────────────────────────────────────

function loadFontsCSS(): string {
	const fonts: { family: string; file: string; weight: string; style: string }[] = [
		{ family: 'Montserrat', file: 'Montserrat.ttf', weight: '100 900', style: 'normal' },
		{ family: 'Great Vibes', file: 'GreatVibes-Regular.ttf', weight: '400', style: 'normal' },
		{ family: 'Dancing Script', file: 'DancingScript-Variable.ttf', weight: '400 700', style: 'normal' },
		{ family: 'Allura', file: 'Allura-Regular.ttf', weight: '400', style: 'normal' },
		{ family: 'Bebas Neue', file: 'BebasNeue-Regular.ttf', weight: '400', style: 'normal' },
		{ family: 'Oswald', file: 'Oswald-Bold.ttf', weight: '400 700', style: 'normal' },
		{ family: 'Kaushan Script', file: 'KaushanScript-Regular.ttf', weight: '400', style: 'normal' },
		{family: 'Playlist Script', file: 'Playlist-Script.otf', weight: '400', style: 'normal' },
		{ family: 'Playfair Display', file: 'PlayfairDisplay.ttf', weight: '100 900', style: 'normal' },
		{ family: 'Cormorant Garamond', file: 'CormorantGaramond.ttf', weight: '100 900', style: 'normal' },
		{ family: 'Cormorant Garamond', file: 'CormorantGaramond-Italic.ttf', weight: '100 900', style: 'italic' },
		{ family: 'Brittany Signature', file: 'BrittanySignature.ttf', weight: '400', style: 'normal' },
	]

	return fonts
		.filter(f => fs.existsSync(path.join(FONTS_DIR, f.file)))
		.map(f => {
			const fontPath = path.join(FONTS_DIR, f.file)
			const fontData = fs.readFileSync(fontPath).toString('base64')
			const isOtf = f.file.endsWith('.otf')
			const mimeType = isOtf ? 'font/opentype' : 'font/truetype'
			const formatType = isOtf ? 'opentype' : 'truetype'
			return `@font-face {
	font-family: '${f.family}';
	src: url(data:${mimeType};base64,${fontData}) format('${formatType}');
	font-weight: ${f.weight};
	font-style: ${f.style};
}`
		})
		.join('\n')
}

function getFontsCSS(): string {
	return loadFontsCSS()
}

// ── Service ──────────────────────────────────────────────────────────

class TemplateRendererService {
	private browser: Browser | null = null
	private templateCache = new Map<string, string>()

	// ── Browser lifecycle ────────────────────────────────────────────

	private async getBrowser(): Promise<Browser> {
		// If browser is dead or doesn't exist, create a new one
		if (!this.browser || !this.browser.connected) {
			if (this.browser) {
				try { await this.browser.close() } catch { /* already dead */ }
			}
			this.browser = await puppeteer.launch({
				headless: true,
				args: [
					'--no-sandbox',
					'--disable-setuid-sandbox',
					'--disable-dev-shm-usage',
					'--disable-gpu',
					'--disable-extensions',
					'--disable-background-networking',
					'--disable-translate',
					'--no-first-run',
				],
			})
			logger.info('Template renderer: browser launched')
		}
		return this.browser
	}

	private async createPage(): Promise<Page> {
		const browser = await this.getBrowser()
		const page = await browser.newPage()
		await page.setRequestInterception(true)
		page.on('request', (req) => {
			const type = req.resourceType()
			if (['image', 'media'].includes(type)) {
				req.abort()
			} else {
				req.continue()
			}
		})
		return page
	}

	async shutdown(): Promise<void> {
		if (this.browser) {
			try { await this.browser.close() } catch { /* ignore */ }
			this.browser = null
		}
	}

	// ── Template loading ────────────────────────────────────────────

	private loadTemplate(templateName: string): string {
		const templatePath = path.join(TEMPLATES_DIR, `${templateName}.html`)
		if (!fs.existsSync(templatePath)) {
			throw new Error(`Template not found: ${templateName} (looked at ${templatePath})`)
		}
		return fs.readFileSync(templatePath, 'utf-8')
	}

	clearCache(): void {
		this.templateCache.clear()
	}

	listTemplates(): string[] {
		if (!fs.existsSync(TEMPLATES_DIR)) return []
		return fs.readdirSync(TEMPLATES_DIR)
			.filter(f => f.endsWith('.html'))
			.map(f => f.replace('.html', ''))
	}

	// ── Rendering ───────────────────────────────────────────────────

	async render(
		templateName: string,
		data: TemplateData,
		viewport: { width: number; height: number },
	): Promise<Buffer> {
		const rawTemplate = this.loadTemplate(templateName)
		const html = this.injectData(rawTemplate, data, viewport)
		return this.screenshotHTML(html, viewport)
	}

	async renderHTML(
		html: string,
		viewport: { width: number; height: number },
	): Promise<Buffer> {
		return this.screenshotHTML(html, viewport)
	}

	/**
	 * Core render: create a fresh page, render, screenshot, close.
	 * No pool — each render gets a clean page to avoid stale session errors.
	 * If the browser is dead, it auto-restarts.
	 */
	private async screenshotHTML(
		html: string,
		viewport: { width: number; height: number },
		retried = false,
	): Promise<Buffer> {
		let page: Page | null = null
		try {
			page = await this.createPage()
			await page.setViewport({ width: viewport.width, height: viewport.height, deviceScaleFactor: 1 })
			await page.setContent(html, { waitUntil: 'domcontentloaded', timeout: 30000 })

			const buffer = await page.screenshot({
				type: 'png',
				omitBackground: true,
				fullPage: false,
				clip: { x: 0, y: 0, width: viewport.width, height: viewport.height },
			}) as Buffer

			return buffer
		} catch (err: any) {
			// If browser/session crashed, restart and retry once
			if (!retried && (
				err.message?.includes('Session closed') ||
				err.message?.includes('Target closed') ||
				err.message?.includes('Protocol error')
			)) {
				logger.warn(`Template renderer: session error, restarting browser and retrying`)
				this.browser = null
				return this.screenshotHTML(html, viewport, true)
			}
			throw err
		} finally {
			if (page) {
				try { await page.close() } catch { /* ignore */ }
			}
		}
	}

	// ── Data injection ──────────────────────────────────────────────

	private injectData(
		template: string,
		data: TemplateData,
		viewport: { width: number; height: number },
	): string {
		let html = template

		// Inject fonts CSS
		const fontsTag = `<style>${getFontsCSS()}</style>`
		if (html.includes('</head>')) {
			html = html.replace('</head>', `${fontsTag}</head>`)
		} else if (html.includes('<body')) {
			html = html.replace('<body', `${fontsTag}<body`)
		} else {
			html = fontsTag + html
		}

		// Replace {{key}} placeholders
		html = html.replace(/\{\{(\w+)\}\}/g, (_match, key) => {
			const value = data[key]
			if (value === undefined || value === null) return ''
			return this.escapeHTML(String(value))
		})

		// Inject viewport dimensions as CSS variables
		const dimensionsCSS = `<style>:root { --viewport-width: ${viewport.width}px; --viewport-height: ${viewport.height}px; }</style>`
		if (html.includes('</head>')) {
			html = html.replace('</head>', `${dimensionsCSS}</head>`)
		} else {
			html = dimensionsCSS + html
		}

		return html
	}

	private escapeHTML(str: string): string {
		return str
			.replace(/&/g, '&amp;')
			.replace(/</g, '&lt;')
			.replace(/>/g, '&gt;')
			.replace(/"/g, '&quot;')
			.replace(/'/g, '&#039;')
	}
}

export const templateRenderer = new TemplateRendererService()
