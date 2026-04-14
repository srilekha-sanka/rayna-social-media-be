import Product from './product.model'
import { logger } from '../../common/logger/logging'

const ENRICHED_FEED_URL = 'https://data-projects-flax.vercel.app/api/enriched-feed?format=json'

interface EnrichedProduct {
	productId: number
	name: string
	type: string
	normalPrice: number
	salePrice: number
	currency: string
	country: string
	city: string
	cityId: number
	url: string
	image: string
	item_group_id: string
	listing_rating: number
	listing_reviewCount: number
	listing_amenities: string
	_enriched: boolean
	detail_title: string
	detail_shareUrl: string
	detail_promotionBadge: string
	location_address: string
	location_title: string
	location_latitude: number
	location_longitude: number
	amenities_all: string
	amenity_duration: string
	amenity_pickup: string
	amenity_transport: string
	amenity_meals: string
	amenity_language: string
	amenity_group_size: string
	amenity_hotel: string
	amenity_nights: string
	amenity_confirmation: string
	amenity_voucher: string
	amenity_cancellation: string
	description_text: string
	price_totalPrice: number
	price_discount: number
	price_discountedPrice: number
	price_availabilityStatus: string
	price_bookingUrl: string
	price_variant: string
	price_yachtType: string
	review_averageRating: number
	review_totalCount: number
	review_excellent: number
	review_veryGood: number
	review_average: number
	review_poor: number
	review_terrible: number
	all_image_links: string
	image_count: number
	yacht_type: string
	yacht_minGuests: string
	yacht_maxGuests: string
	holiday_hotels: string
	holiday_tours: string
	holiday_categories: string
	cruise_nextDate: string
	cruise_totalDates: number
}

function formatCategory(itemGroupId: string): string {
	if (!itemGroupId) return 'General'
	return itemGroupId
		.split('-')
		.map((word) => word.charAt(0).toUpperCase() + word.slice(1))
		.join(' ')
}

function buildHighlights(product: EnrichedProduct): string[] {
	const highlights: string[] = []

	if (product.amenity_duration) highlights.push(product.amenity_duration)
	if (product.amenity_pickup) highlights.push(product.amenity_pickup)
	if (product.amenity_transport) highlights.push(product.amenity_transport)
	if (product.amenity_meals) highlights.push(product.amenity_meals)
	if (product.amenity_confirmation) highlights.push(product.amenity_confirmation)
	if (product.amenity_cancellation) highlights.push(product.amenity_cancellation)
	if (product.amenity_language) highlights.push(product.amenity_language)
	if (product.amenity_group_size) highlights.push(product.amenity_group_size)

	return highlights
}

function mapToProduct(p: EnrichedProduct) {
	const hasDiscount = p.price_discount > 0 && p.normalPrice !== p.salePrice
	const imageUrls = p.all_image_links
		? p.all_image_links.split(',').map((url: string) => url.trim()).filter(Boolean)
		: p.image
			? [p.image]
			: []

	const shortDesc = p.description_text
		? p.description_text.split('.').slice(0, 2).join('.').trim() + '.'
		: null

	return {
		// ── Core fields ──
		name: p.name,
		description: p.description_text || p.name,
		short_description: shortDesc && shortDesc.length <= 500 ? shortDesc : shortDesc?.substring(0, 497) + '...',
		price: p.salePrice || p.normalPrice,
		compare_at_price: hasDiscount ? p.normalPrice : null,
		currency: p.currency || 'AED',
		offer_label: p.detail_promotionBadge || (hasDiscount ? `${p.price_discount}% Off` : null),
		category: formatCategory(p.item_group_id),
		city: p.city,
		base_url: p.url,
		image_urls: imageUrls,
		highlights: buildHighlights(p),

		// ── Source identity ──
		source_product_id: p.productId || null,
		product_type: p.type || null,

		// ── Location ──
		country: p.country || null,
		city_id: p.cityId ? Number(p.cityId) || null : null,
		address: p.location_address || null,
		latitude: p.location_latitude ? Number(p.location_latitude) || null : null,
		longitude: p.location_longitude ? Number(p.location_longitude) || null : null,

		// ── Ratings & reviews ──
		avg_rating: Number(p.review_averageRating || p.listing_rating) || null,
		review_count: Number(p.review_totalCount || p.listing_reviewCount) || 0,

		// ── Amenities ──
		duration: p.amenity_duration || null,
		pickup: p.amenity_pickup || null,
		transport: p.amenity_transport || null,
		meals: p.amenity_meals || null,
		language: p.amenity_language || null,
		group_size: p.amenity_group_size || null,
		confirmation: p.amenity_confirmation || null,
		cancellation: p.amenity_cancellation || null,
		amenities_raw: p.amenities_all || null,

		// ── Booking & pricing ──
		availability_status: p.price_availabilityStatus || null,
		booking_url: p.price_bookingUrl || null,
		price_variant: p.price_variant || null,
		promotion_badge: p.detail_promotionBadge || null,
		image_count: Number(p.image_count) || 0,

		// ── Additional enriched feed fields ──
		detail_title: p.detail_title || null,
		detail_share_url: p.detail_shareUrl || null,
		voucher: p.amenity_voucher || null,
		total_price: p.price_totalPrice ? Number(p.price_totalPrice) || null : null,
		discount_percent: p.price_discount ? Number(p.price_discount) || null : null,
		discounted_price: p.price_discountedPrice ? Number(p.price_discountedPrice) || null : null,
		listing_amenities: p.listing_amenities || null,
		price_yacht_type: p.price_yachtType || null,

		// ── Type-specific data (sparse, stays in meta) ──
		meta: {
			reviews_breakdown: {
				excellent: p.review_excellent,
				very_good: p.review_veryGood,
				average: p.review_average,
				poor: p.review_poor,
				terrible: p.review_terrible,
			},
			location_title: p.location_title || null,
			yacht: p.yacht_type ? { type: p.yacht_type, min_guests: p.yacht_minGuests, max_guests: p.yacht_maxGuests } : null,
			holiday: p.holiday_hotels ? { hotels: p.holiday_hotels, tours: p.holiday_tours, categories: p.holiday_categories } : null,
			cruise: p.cruise_totalDates > 0 ? { next_date: p.cruise_nextDate, total_dates: p.cruise_totalDates } : null,
			hotel: p.amenity_hotel || null,
			nights: p.amenity_nights || null,
		},
	}
}

export async function syncProductsFromFeed(): Promise<{ created: number; updated: number; total: number }> {
	logger.info('[Product Sync] Fetching enriched feed from API...')

	const response = await fetch(ENRICHED_FEED_URL)

	if (!response.ok) {
		throw new Error(`[Product Sync] API responded with ${response.status}: ${response.statusText}`)
	}

	const data = (await response.json()) as { products: EnrichedProduct[] }
	const apiProducts: EnrichedProduct[] = data.products

	if (!apiProducts || apiProducts.length === 0) {
		logger.warn('[Product Sync] No products returned from API')
		return { created: 0, updated: 0, total: 0 }
	}

	logger.info(`[Product Sync] Received ${apiProducts.length} products from API. Syncing...`)

	let created = 0
	let updated = 0
	const BATCH_SIZE = 50

	for (let i = 0; i < apiProducts.length; i += BATCH_SIZE) {
		const batch = apiProducts.slice(i, i + BATCH_SIZE)

		for (const apiProduct of batch) {
			const mapped = mapToProduct(apiProduct)

			const existing = await Product.findOne({
				where: { name: mapped.name, city: mapped.city },
			})

			if (existing) {
				await existing.update(mapped)
				updated++
			} else {
				await Product.create(mapped)
				created++
			}
		}

		logger.info(`[Product Sync] Progress: ${Math.min(i + BATCH_SIZE, apiProducts.length)}/${apiProducts.length}`)
	}

	logger.info(`[Product Sync] Complete — ${created} created, ${updated} updated, ${apiProducts.length} total`)
	return { created, updated, total: apiProducts.length }
}

export async function seedProductsFromFeed(): Promise<void> {
	try {
		const existingCount = await Product.count()

		if (existingCount > 0) {
			logger.info(`[Product Sync] Skipping sync — ${existingCount} products already exist. Use POST /api/v1/products/sync to force re-sync.`)
			return
		}

		await syncProductsFromFeed()
	} catch (error) {
		logger.error('[Product Sync] Failed to seed products from feed:', error)
	}
}
