import { execFile } from 'child_process'
import path from 'path'
import fs from 'fs'
import { logger } from '../../common/logger/logging'

// ── Types ────────────────────────────────────────────────────────────

export type PythonTemplateName =
	| 'promo-collage'
	| 'hotel-feature'
	| 'phone-mockup'
	| 'photo-board'
	| 'minimal-cta'

export interface PythonRenderRequest {
	template: PythonTemplateName
	config: Record<string, unknown>
	base_image?: string        // absolute path to background image
	output?: string            // output file path (auto-generated if omitted)
	format?: 'PNG' | 'JPEG'
	aspect_ratio?: '4:5' | '1:1' | '1.91:1'
}

interface PythonRenderResult {
	ok: boolean
	output?: string
	width?: number
	height?: number
	error?: string
}

// ── Constants ────────────────────────────────────────────────────────

const PYTHON_DIR = path.resolve(__dirname, '../../../../python-templates')
const RENDER_SCRIPT = path.join(PYTHON_DIR, 'render.py')
const PROCESSED_DIR = path.resolve(__dirname, '../../../../uploads/processed')
const PYTHON_BIN = process.env.PYTHON_BIN || 'python3'
const RENDER_TIMEOUT_MS = 30_000

// ── Service ──────────────────────────────────────────────────────────

class PythonTemplateRendererService {

	/**
	 * Render a Python/Pillow template and return the output image as a Buffer.
	 */
	async render(req: PythonRenderRequest): Promise<Buffer> {
		const outputPath = req.output || this.generateOutputPath(req.format || 'PNG')

		const payload: PythonRenderRequest = {
			...req,
			output: outputPath,
		}

		const result = await this.exec(payload)

		if (!result.ok) {
			throw new Error(`Python template render failed: ${result.error}`)
		}

		const finalPath = result.output || outputPath
		if (!fs.existsSync(finalPath)) {
			throw new Error(`Render output not found: ${finalPath}`)
		}

		return fs.readFileSync(finalPath)
	}

	/**
	 * Render and return the file path (no Buffer read — faster for large images).
	 */
	async renderToFile(req: PythonRenderRequest): Promise<string> {
		const outputPath = req.output || this.generateOutputPath(req.format || 'PNG')

		const payload: PythonRenderRequest = {
			...req,
			output: outputPath,
		}

		const result = await this.exec(payload)

		if (!result.ok) {
			throw new Error(`Python template render failed: ${result.error}`)
		}

		return result.output || outputPath
	}

	/**
	 * List all available Python template slugs.
	 */
	async listTemplates(): Promise<string[]> {
		return new Promise((resolve, reject) => {
			execFile(
				PYTHON_BIN,
				[RENDER_SCRIPT, '--list'],
				{ timeout: 5000 },
				(err, stdout, stderr) => {
					if (err) {
						logger.error(`Python list-templates failed: ${stderr || err.message}`)
						return reject(err)
					}
					try {
						const data = JSON.parse(stdout)
						resolve(data.templates || [])
					} catch (e) {
						reject(new Error(`Failed to parse Python output: ${stdout}`))
					}
				},
			)
		})
	}

	// ── Private ─────────────────────────────────────────────────────

	private exec(payload: PythonRenderRequest): Promise<PythonRenderResult> {
		return new Promise((resolve, reject) => {
			const child = execFile(
				PYTHON_BIN,
				[RENDER_SCRIPT],
				{ timeout: RENDER_TIMEOUT_MS, maxBuffer: 10 * 1024 * 1024 },
				(err, stdout, stderr) => {
					if (stderr) {
						logger.warn(`Python stderr: ${stderr.slice(0, 500)}`)
					}
					if (err) {
						logger.error(`Python render process error: ${err.message}`)
						return resolve({ ok: false, error: err.message })
					}
					try {
						const result: PythonRenderResult = JSON.parse(stdout)
						resolve(result)
					} catch (e) {
						resolve({ ok: false, error: `Invalid JSON from Python: ${stdout.slice(0, 200)}` })
					}
				},
			)

			// Feed request JSON via stdin
			child.stdin?.write(JSON.stringify(payload))
			child.stdin?.end()
		})
	}

	private generateOutputPath(format: string): string {
		if (!fs.existsSync(PROCESSED_DIR)) {
			fs.mkdirSync(PROCESSED_DIR, { recursive: true })
		}
		const ext = format.toLowerCase() === 'jpeg' ? 'jpeg' : 'png'
		const name = `py-${Date.now()}-${Math.round(Math.random() * 1e6)}.${ext}`
		return path.join(PROCESSED_DIR, name)
	}
}

export const pythonTemplateRenderer = new PythonTemplateRendererService()
