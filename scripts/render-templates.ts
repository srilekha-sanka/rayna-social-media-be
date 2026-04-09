/**
 * Renders all HTML templates as PNG images for visual inspection.
 * Run: npx ts-node scripts/render-templates.ts
 * Output: scripts/output/*.png
 */
import 'dotenv/config'
import fs from 'fs'
import path from 'path'
import https from 'https'
import http from 'http'
import puppeteer from 'puppeteer'

const TEMPLATES_DIR = path.join(__dirname, '..', 'templates')
const FONTS_DIR = path.join(__dirname, '..', 'assets', 'fonts')
const OUTPUT_DIR = path.join(__dirname, 'output')

if (!fs.existsSync(OUTPUT_DIR)) fs.mkdirSync(OUTPUT_DIR, { recursive: true })

// 4:5 portrait (Instagram default)
const WIDTH = 1080
const HEIGHT = 1350

// Sample data for poster templates
const POSTER_DATA: Record<string, Record<string, string>> = {
	'poster.html': {
		headline: 'Bali',
		price: 'AED 2,499/-',
		includes: 'Stay | Breakfast | Tours | Transfers',
		dates: '15 JUN | 5D-4N',
		contact: '+971 4 208 7444 | +91 20 6683 8877',
	},
	'lifestyle-poster.html': {
		headline: 'MALDIVES',
		tagline: 'Where Dreams Meet the Horizon',
		description: 'From hidden gems\nto iconic views,\ndiscover unforgettable\nmoments.',
	},
	'adventure-poster.html': {
		headline: 'Dubai',
		headlineFontSize: '14vh',
		currency: 'AED',
		amount: '1,299',
		includes: 'STAY | BREAKFAST | TOURS | TRANSFERS',
		dates: '20 JUL',
		duration: '3D-2N',
		contact: '+971 4 208 7444 | +91 20 6683 8877',
	},
	'heritage-poster.html': {
		headline: 'Bali',
		headlineFontSize: '20vh',
		subheadline: 'BALI EXPERIENCE',
		tagline: 'HERITAGE  •  CULTURE  •  ESCAPE',
		includes: 'STAY\nBREAKFAST\nTOURS\nTRANSFERS',
		dates: '15 JUN | 5D-4N',
		currency: 'AED',
		amount: '2,499',
		brandTagline: 'by your side',
	},
	'explorer-poster.html': {
		headline: 'THAILAND',
		headlineFontSize: '13vh',
		subheadline: 'BANGKOK • PHUKET • CHIANG MAI',
		bannerText: 'AED 1,899  •  5D-4N  •  ALL INCLUSIVE',
		contactLeft: '+971 4 208 7444',
		contactRight: '+91 20 6683 8877',
	},
	'gradient-cta.html': {
		title: 'Explore the Magic of Dubai Desert Safari',
		ctaText: 'BOOK NOW',
		subtitle: 'Experience the thrill of dune bashing, camel rides, and a BBQ dinner under the stars.',
		accentColor: '#F97316',
	},
	'minimal-text.html': {
		title: 'Crystal clear waters and pristine beaches await you in the Maldives',
	},
}

function downloadToBase64(url: string): Promise<string> {
	return new Promise((resolve, reject) => {
		const client = url.startsWith('https') ? https : http
		client.get(url, (res) => {
			if (res.statusCode && res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
				return downloadToBase64(res.headers.location).then(resolve, reject)
			}
			const chunks: Buffer[] = []
			res.on('data', (chunk: Buffer) => chunks.push(chunk))
			res.on('end', () => {
				const buf = Buffer.concat(chunks)
				resolve(`data:image/png;base64,${buf.toString('base64')}`)
			})
			res.on('error', reject)
		}).on('error', reject)
	})
}

function loadFontsCSS(): string {
	if (!fs.existsSync(FONTS_DIR)) return ''
	const fontFiles = fs.readdirSync(FONTS_DIR).filter(f => f.endsWith('.ttf') || f.endsWith('.otf'))
	let css = ''
	for (const file of fontFiles) {
		const isOtf = file.endsWith('.otf')
		const ext = isOtf ? '.otf' : '.ttf'
		const fontName = path.basename(file, ext).replace(/-/g, ' ')
		const data = fs.readFileSync(path.join(FONTS_DIR, file))
		const b64 = data.toString('base64')
		const mimeType = isOtf ? 'font/opentype' : 'font/truetype'
		const formatType = isOtf ? 'opentype' : 'truetype'
		css += `@font-face { font-family: '${fontName}'; src: url(data:${mimeType};base64,${b64}) format('${formatType}'); font-display: block; }\n`
	}
	return css
}

async function renderTemplate(browser: any, templateFile: string, data: Record<string, string>) {
	let html = fs.readFileSync(path.join(TEMPLATES_DIR, templateFile), 'utf-8')

	// Inject fonts
	const fontsCSS = loadFontsCSS()
	html = html.replace('</head>', `<style>${fontsCSS}</style></head>`)

	// Replace placeholders
	for (const [key, value] of Object.entries(data)) {
		html = html.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'g'), value)
	}

	// Set viewport CSS variables
	html = html.replace(/var\(--viewport-width\)/g, `${WIDTH}px`)
	html = html.replace(/var\(--viewport-height\)/g, `${HEIGHT}px`)

	// Add a background image placeholder (gradient to simulate a travel photo)
	const bgCSS = `
		body {
			background: linear-gradient(135deg, #1a5276 0%, #2e86c1 25%, #48c9b0 50%, #f4d03f 75%, #e67e22 100%) !important;
		}
	`
	html = html.replace('</style>', `${bgCSS}</style>`)

	const page = await browser.newPage()
	await page.setViewport({ width: WIDTH, height: HEIGHT })
	await page.setContent(html, { waitUntil: 'networkidle0' })

	// Wait for fonts to render
	await page.evaluate(() => (globalThis as any).document.fonts?.ready)
	await new Promise(r => setTimeout(r, 500))

	const outputPath = path.join(OUTPUT_DIR, templateFile.replace('.html', '.png'))
	await page.screenshot({ path: outputPath, type: 'png' })
	await page.close()

	console.log(`  ✓ ${templateFile} → ${outputPath}`)
	return outputPath
}

async function main() {
	console.log('Launching browser...')
	const browser = await puppeteer.launch({
		headless: true,
		args: ['--no-sandbox', '--disable-setuid-sandbox'],
	})

	// Load logo as base64 data URI for templates that need it
	const logoUrl = process.env.BRAND_LOGO_URL || ''
	if (logoUrl && POSTER_DATA['explorer-poster.html']) {
		try {
			const logoDataUri = await downloadToBase64(logoUrl)
			POSTER_DATA['explorer-poster.html'].logoUrl = logoDataUri
			console.log('Logo loaded as base64 data URI')
		} catch (err) {
			console.warn('Could not download logo, skipping:', err)
		}
	}

	console.log(`Rendering ${Object.keys(POSTER_DATA).length} templates at ${WIDTH}x${HEIGHT}...\n`)

	for (const [templateFile, data] of Object.entries(POSTER_DATA)) {
		await renderTemplate(browser, templateFile, data)
	}

	await browser.close()
	console.log(`\nDone! Images saved to: ${OUTPUT_DIR}`)
}

main().catch(err => {
	console.error('Error:', err)
	process.exit(1)
})
