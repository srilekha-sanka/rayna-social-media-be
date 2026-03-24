import Product from '../../app/module/product/product.model'
import { logger } from '../../app/common/logger/logging'

const RAYNA_PRODUCTS = [
	{
		name: 'Evening Desert Safari Dubai',
		description:
			'Experience the magic of the Arabian desert with our Evening Desert Safari. Enjoy thrilling dune bashing in a 4x4 Land Cruiser, ride a camel across golden sands, try sandboarding, and watch a mesmerizing sunset over the dunes. The evening continues at a traditional Bedouin camp with a BBQ dinner, live entertainment including belly dancing and Tanoura shows, shisha, and henna painting.',
		short_description: 'Dune bashing, BBQ dinner & live entertainment under the stars',
		price: 40.85,
		compare_at_price: 70.0,
		currency: 'AED',
		offer_label: '42% Off',
		category: 'Desert Safari Tours',
		city: 'Dubai',
		base_url: 'https://www.raynatours.com/dubai/desert-safari-tours/evening-desert-safari-e-508805',
		image_urls: [
			'https://images.unsplash.com/photo-1451337516015-6b6e9a44a8a3?w=1200',
			'https://images.unsplash.com/photo-1547234935-80c7145ec969?w=1200',
			'https://images.unsplash.com/photo-1549944850-84e00be4203b?w=1200',
			'https://images.unsplash.com/photo-1473186505569-9c61870c11f9?w=1200',
		],
		highlights: [
			'Pickup & drop-off from your hotel',
			'Dune bashing in Land Cruiser',
			'Camel ride & sandboarding',
			'BBQ dinner with vegetarian options',
			'Belly dance & Tanoura show',
			'Henna painting & shisha',
		],
		meta: { duration: '6 hours', pickup: true, meals: 'BBQ Dinner', group_size: 'Shared' },
	},
	{
		name: 'Burj Khalifa At The Top Tickets',
		description:
			"Visit the world's tallest building and enjoy breathtaking 360-degree views of Dubai from the observation deck on the 124th and 125th floors. At 555 meters high, the At The Top experience offers stunning views of the city skyline, the Arabian Gulf, and the surrounding desert. Includes interactive multimedia presentations about the building and Dubai's history.",
		short_description: "360° views from the world's tallest building — 124th & 125th floors",
		price: 149.0,
		compare_at_price: 289.0,
		currency: 'AED',
		offer_label: '48% Off',
		category: 'Burj Khalifa Tickets',
		city: 'Dubai',
		base_url: 'https://www.raynatours.com/dubai/burj-khalifa-tickets/burj-khalifa-at-the-top-tickets-e-18',
		image_urls: [
			'https://images.unsplash.com/photo-1582672060674-bc2bd808a8b5?w=1200',
			'https://images.unsplash.com/photo-1512453979798-5ea266f8880c?w=1200',
			'https://images.unsplash.com/photo-1518684079-3c830dcef090?w=1200',
		],
		highlights: [
			'Skip-the-line entry',
			'Access to 124th & 125th floor observation deck',
			'360-degree panoramic views',
			'Interactive multimedia presentations',
			'Outdoor terrace access',
		],
		meta: { duration: '1.5 hours', pickup: false, meals: null, group_size: 'Individual' },
	},
	{
		name: 'Dubai Frame Tickets',
		description:
			'Step into the iconic Dubai Frame, the largest picture frame in the world standing at 150 meters tall. Walk across the sky bridge with a glass floor for a thrilling view straight down, and enjoy panoramic views of Old Dubai on one side and New Dubai on the other. The ground floor museum takes you through Dubai\'s transformation from a fishing village to a global metropolis.',
		short_description: "Walk the world's largest picture frame with glass-floor sky bridge",
		price: 50.0,
		compare_at_price: 75.0,
		currency: 'AED',
		offer_label: '33% Off',
		category: 'Culture & Attractions',
		city: 'Dubai',
		base_url: 'https://www.raynatours.com/dubai/culture-and-attractions/dubai-frame-e-5066',
		image_urls: [
			'https://images.unsplash.com/photo-1597659840241-37e2b7c2f7b9?w=1200',
			'https://images.unsplash.com/photo-1580674684081-7617fbf3d745?w=1200',
		],
		highlights: [
			'Skip-the-line entry',
			'Glass-floor sky bridge walk',
			'Old vs New Dubai panoramic views',
			'Ground floor museum experience',
			'150 meters tall observation point',
		],
		meta: { duration: '1 hour', pickup: false, meals: null, group_size: 'Individual' },
	},
	{
		name: 'Atlantis Aquaventure Waterpark',
		description:
			'Dive into the ultimate waterpark adventure at Atlantis Aquaventure, the largest waterpark in the Middle East. With over 105 record-breaking slides and attractions, a private beach, marine animal experiences, and access to The Lost Chambers Aquarium housing 65,000 marine animals, this is a full day of family fun at the iconic Atlantis The Palm resort.',
		short_description: '105+ slides, private beach & aquarium at Atlantis The Palm',
		price: 249.0,
		compare_at_price: 340.0,
		currency: 'AED',
		offer_label: '27% Off',
		category: 'Water Parks',
		city: 'Dubai',
		base_url: 'https://www.raynatours.com/dubai/water-parks/atlantis-aquaventure-waterpark-e-3625',
		image_urls: [
			'https://images.unsplash.com/photo-1590523741831-ab7e8b8f9c7f?w=1200',
			'https://images.unsplash.com/photo-1582738411706-bfc8e691d1c2?w=1200',
			'https://images.unsplash.com/photo-1544551763-46a013bb70d5?w=1200',
		],
		highlights: [
			'105+ slides and attractions',
			'Access to The Lost Chambers Aquarium',
			'Private beach access',
			'Marine animal encounters',
			'Full-day access',
			'Locker & towel available for rent',
		],
		meta: { duration: 'Full day', pickup: false, meals: null, group_size: 'Individual' },
	},
	{
		name: 'Abu Dhabi City Tour from Dubai',
		description:
			'Explore the capital of the UAE on a full-day Abu Dhabi city tour departing from Dubai. Visit the magnificent Sheikh Zayed Grand Mosque, the stunning Qasr Al Watan presidential palace, cruise along the Corniche, explore Heritage Village, and stop for photos at Emirates Palace and Etihad Towers. A complete cultural immersion into Abu Dhabi\'s heritage and modern grandeur.',
		short_description: 'Sheikh Zayed Mosque, Qasr Al Watan & Corniche — full-day tour',
		price: 99.0,
		compare_at_price: 160.0,
		currency: 'AED',
		offer_label: '38% Off',
		category: 'City Tours',
		city: 'Abu Dhabi',
		base_url: 'https://www.raynatours.com/abu-dhabi/city-tours/abu-dhabi-city-tour-from-dubai-e-175',
		image_urls: [
			'https://images.unsplash.com/photo-1512632578888-169bbab5f12e?w=1200',
			'https://images.unsplash.com/photo-1587974928442-77dc3e0dba72?w=1200',
			'https://images.unsplash.com/photo-1578895101408-1a36b834405b?w=1200',
		],
		highlights: [
			'Hotel pickup & drop-off from Dubai',
			'Sheikh Zayed Grand Mosque visit',
			'Qasr Al Watan palace entry',
			'Corniche drive & photo stops',
			'Heritage Village visit',
			'Professional English-speaking guide',
		],
		meta: { duration: '10 hours', pickup: true, meals: null, group_size: 'Shared' },
	},
	{
		name: 'Dubai Marina Dhow Cruise Dinner',
		description:
			'Sail through the glittering Dubai Marina aboard a traditional wooden dhow. Enjoy a 2-hour cruise with an international buffet dinner, soft drinks, and live entertainment including a Tanoura dance performance. Take in the stunning views of the Marina skyline, JBR, and Ain Dubai — the world\'s largest observation wheel — all illuminated against the night sky.',
		short_description: '2-hour cruise with buffet dinner & Marina skyline views',
		price: 65.0,
		compare_at_price: 99.0,
		currency: 'AED',
		offer_label: '34% Off',
		category: 'Dhow Cruises',
		city: 'Dubai',
		base_url: 'https://www.raynatours.com/dubai/dhow-cruises/dubai-marina-dhow-cruise-dinner-e-492',
		image_urls: [
			'https://images.unsplash.com/photo-1512453979798-5ea266f8880c?w=1200',
			'https://images.unsplash.com/photo-1580674684081-7617fbf3d745?w=1200',
		],
		highlights: [
			'2-hour cruise through Dubai Marina',
			'International buffet dinner',
			'Soft drinks & water included',
			'Live Tanoura dance show',
			'Views of JBR, Ain Dubai & Marina skyline',
			'Welcome drink on boarding',
		],
		meta: { duration: '2 hours', pickup: true, meals: 'Buffet Dinner', group_size: 'Shared' },
	},
	{
		name: 'Museum of the Future Tickets',
		description:
			'Enter the Museum of the Future, an architectural marvel and one of Dubai\'s most iconic landmarks. Explore immersive exhibitions that take you on a journey to the year 2071 — 50 years into the UAE\'s future. Experience cutting-edge technology, AI, robotics, and space exploration exhibits. The building itself, covered in Arabic calligraphy, has been called the most beautiful building on Earth.',
		short_description: 'Journey to 2071 — immersive AI, space & tech exhibitions',
		price: 149.0,
		compare_at_price: 195.0,
		currency: 'AED',
		offer_label: '24% Off',
		category: 'Culture & Attractions',
		city: 'Dubai',
		base_url: 'https://www.raynatours.com/dubai/culture-and-attractions/museum-of-the-future-e-570123',
		image_urls: [
			'https://images.unsplash.com/photo-1591609209667-18f25681aeb1?w=1200',
			'https://images.unsplash.com/photo-1582672060674-bc2bd808a8b5?w=1200',
		],
		highlights: [
			'Skip-the-line fast-track entry',
			'Immersive future exhibitions',
			'AI & robotics interactive displays',
			'Space exploration experience',
			'Iconic architecture & photo opportunities',
		],
		meta: { duration: '2 hours', pickup: false, meals: null, group_size: 'Individual' },
	},
	{
		name: 'Ski Dubai Snow Park Tickets',
		description:
			'Experience snow in the desert at Ski Dubai, the first indoor ski resort in the Middle East located inside the Mall of the Emirates. Enjoy the Snow Park with tobogganing, zorbing, snow bumpers, an ice cave, and a chance to meet the colony of King and Gentoo penguins. The entire area is kept at a frosty -1°C to -2°C year-round with real snow.',
		short_description: 'Indoor snow park with penguins, tobogganing & zorbing',
		price: 160.0,
		compare_at_price: 230.0,
		currency: 'AED',
		offer_label: '30% Off',
		category: 'Water Parks',
		city: 'Dubai',
		base_url: 'https://www.raynatours.com/dubai/water-parks/ski-dubai-snow-park-e-4201',
		image_urls: [
			'https://images.unsplash.com/photo-1605540436563-5bca919ae766?w=1200',
			'https://images.unsplash.com/photo-1516483638261-f4dbaf036963?w=1200',
		],
		highlights: [
			'Unlimited access to Snow Park',
			'Tobogganing, zorbing & snow bumpers',
			'Penguin encounter available',
			'Ice cave exploration',
			'Winter clothing provided',
			'Located in Mall of the Emirates',
		],
		meta: { duration: '2–3 hours', pickup: false, meals: null, group_size: 'Individual' },
	},
]

export const seedProducts = async (): Promise<void> => {
	try {
		const existingCount = await Product.count()

		if (existingCount > 0) {
			logger.info(`[Seed] Skipping product seed — ${existingCount} products already exist`)
			return
		}

		await Product.bulkCreate(RAYNA_PRODUCTS)
		logger.info(`[Seed] Seeded ${RAYNA_PRODUCTS.length} Rayna Tours products`)
	} catch (error) {
		logger.error('[Seed] Failed to seed products:', error)
	}
}
