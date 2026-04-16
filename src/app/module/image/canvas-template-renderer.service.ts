/**
 * Canvas Template Renderer Service
 * =================================
 * NestJS integration for @napi-rs/canvas templates.
 * Drop-in replacement for python-template-renderer.service.ts.
 *
 * Key differences from the Python renderer:
 *   - No subprocess spawning — runs in the same Node.js process
 *   - No stdin/stdout JSON — direct function calls
 *   - No filesystem write needed — returns Buffer directly
 *   - ~15-70ms per render vs ~600-1350ms with Python
 */
import path from 'path'
import fs from 'fs'
import { registerFonts, INSTAGRAM, type Dimensions } from './canvas-engine/core'
import { renderTravelPoster, type TravelPosterConfig } from './canvas-templates/travel-poster'
import { renderTourTravel, type TourTravelConfig } from './canvas-templates/tour-and-travel'
import { renderExploreActivities, type ExploreActivitiesConfig } from './canvas-templates/explore-activities'
import { renderExploreSlide, type ExploreSlideConfig } from './canvas-templates/explore-slide'
import { renderExploreDestinations, type ExploreDestinationsConfig, renderExploreDestinationSlide, type ExploreDestinationSlideConfig } from './canvas-templates/explore-destinations'
import { renderSummerHoliday, type SummerHolidayConfig } from './canvas-templates/summer-holiday'
import { renderSummerHolidaySlide, type SummerHolidaySlideConfig } from './canvas-templates/summer-holiday-slide'
import { renderItineraries, type ItinerariesConfig } from './canvas-templates/itineraries'
import { renderItinerariesSlide, type ItinerariesSlideConfig } from './canvas-templates/itineraries-slide'
// Logger: use console as fallback, wire up project logger when integrated into src/
const logger = {
	info: (...args: unknown[]) => console.log('[canvas]', ...args),
	warn: (...args: unknown[]) => console.warn('[canvas]', ...args),
	error: (...args: unknown[]) => console.error('[canvas]', ...args),
}

// ── Types ────────────────────────────────────────────────────────────

export type CanvasTemplateName =
	| 'travel-poster'
	| 'tour-and-travel'
	| 'explore-activities'
	| 'explore-slide'
	| 'explore-destinations'
	| 'explore-destination-slide'
	| 'summer-holiday'
	| 'summer-holiday-slide'
	| 'itineraries'
	| 'itineraries-slide'

export interface CanvasRenderRequest {
	template: CanvasTemplateName
	config: Record<string, unknown>
	base_image?: string            // absolute path to background image
	output?: string                // output file path (optional — saves to disk if provided)
	format?: 'PNG' | 'JPEG'
	aspect_ratio?: '4:5' | '1:1' | '1.91:1' | '16:9' | '9:16'
}

// ── Constants ────────────────────────────────────────────────────────

const PROCESSED_DIR = path.resolve(__dirname, '../../../../uploads/processed')

// ── Template Registry ────────────────────────────────────────────────

type TemplateRenderFn = (config: Record<string, unknown>, dims: Dimensions) => Promise<Buffer>

const TEMPLATE_REGISTRY: Record<CanvasTemplateName, TemplateRenderFn> = {
	'travel-poster': async (config, dims) => {
		return renderTravelPoster(config as unknown as TravelPosterConfig, dims)
	},
	'tour-and-travel': async (config, dims) => {
		return renderTourTravel(config as unknown as TourTravelConfig, dims)
	},
	'explore-activities': async (config, dims) => {
		return renderExploreActivities(config as unknown as ExploreActivitiesConfig, dims)
	},
	'explore-slide': async (config, dims) => {
		return renderExploreSlide(config as unknown as ExploreSlideConfig, dims)
	},
	'explore-destinations': async (config, dims) => {
		return renderExploreDestinations(config as unknown as ExploreDestinationsConfig, dims)
	},
	'explore-destination-slide': async (config, dims) => {
		return renderExploreDestinationSlide(config as unknown as ExploreDestinationSlideConfig, dims)
	},
	'summer-holiday': async (config, dims) => {
		return renderSummerHoliday(config as unknown as SummerHolidayConfig, dims)
	},
	'summer-holiday-slide': async (config, dims) => {
		return renderSummerHolidaySlide(config as unknown as SummerHolidaySlideConfig, dims)
	},
	'itineraries': async (config, dims) => {
		return renderItineraries(config as unknown as ItinerariesConfig, dims)
	},
	'itineraries-slide': async (config, dims) => {
		return renderItinerariesSlide(config as unknown as ItinerariesSlideConfig, dims)
	},
}

// ── Service ──────────────────────────────────────────────────────────

class CanvasTemplateRendererService {

	constructor() {
		// Register all fonts once at instantiation
		registerFonts()
	}

	/**
	 * Render a canvas template and return the image as a Buffer.
	 * This is the primary method — equivalent to pythonTemplateRenderer.render()
	 */
	async render(req: CanvasRenderRequest): Promise<Buffer> {
		const startTime = Date.now()

		const renderFn = TEMPLATE_REGISTRY[req.template]
		if (!renderFn) {
			throw new Error(`Unknown canvas template: ${req.template}`)
		}

		// Resolve dimensions
		const aspectRatio = req.aspect_ratio || '4:5'
		const dims = INSTAGRAM[aspectRatio]
		if (!dims) {
			throw new Error(`Unknown aspect ratio: ${aspectRatio}`)
		}

		// Inject base_image path into config
		const config = { ...req.config }
		if (req.base_image) {
			config.bgImagePath = req.base_image
		}

		// Render
		const buffer = await renderFn(config, dims)

		const elapsed = Date.now() - startTime
		logger.info(`[canvas-render] ${req.template} ${aspectRatio} rendered in ${elapsed}ms`)

		// Optionally save to disk
		if (req.output) {
			const dir = path.dirname(req.output)
			if (!fs.existsSync(dir)) {
				fs.mkdirSync(dir, { recursive: true })
			}
			fs.writeFileSync(req.output, buffer)
		}

		return buffer
	}

	/**
	 * Render and save to file, returning the file path.
	 * Equivalent to pythonTemplateRenderer.renderToFile()
	 */
	async renderToFile(req: CanvasRenderRequest): Promise<string> {
		const outputPath = req.output || this.generateOutputPath(req.format || 'PNG')
		await this.render({ ...req, output: outputPath })
		return outputPath
	}

	/**
	 * List all available canvas template names.
	 */
	listTemplates(): string[] {
		return Object.keys(TEMPLATE_REGISTRY)
	}

	private generateOutputPath(format: string): string {
		if (!fs.existsSync(PROCESSED_DIR)) {
			fs.mkdirSync(PROCESSED_DIR, { recursive: true })
		}
		const ext = format.toLowerCase() === 'jpeg' ? 'jpeg' : 'png'
		const name = `canvas-${Date.now()}-${Math.round(Math.random() * 1e6)}.${ext}`
		return path.join(PROCESSED_DIR, name)
	}
}

export const canvasTemplateRenderer = new CanvasTemplateRendererService()
