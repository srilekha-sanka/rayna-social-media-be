import Product from '../../app/module/product/product.model'
import { logger } from '../../app/common/logger/logging'

/**
 * Real product data scraped from https://www.raynatours.com
 * Descriptions, highlights, and images are verbatim from each product page.
 * AED prices derived from the site (INR→AED ratio from live page: ~25.5).
 */
const RAYNA_PRODUCTS = [
	// ─── 1. Evening Desert Safari (Dubai) ────────────────────
	{
		name: 'Evening Desert Safari',
		description:
			"A visit to Dubai can never be complete without a desert safari, and our Evening Desert Safari packs the best of both thrill and tradition. Enjoy a heart-racing 4X4 off-road journey through the highs and lows of Dubai's dunes, soak up the rich Bedouin culture and heritage, ride a camel, try Shisha smoking, pose for striking souvenir pictures in traditional Emirati dress, relish a sumptuous BBQ dinner with vegetarian and non-vegetarian dishes, and watch colorful Arabic folklore performances such as Tanura show and belly dance.",
		short_description: 'Dune bashing, BBQ dinner & live entertainment under the desert stars',
		price: 140.0,
		compare_at_price: 270.0,
		currency: 'AED',
		offer_label: 'Save 48%',
		category: 'Desert Safari Tours',
		city: 'Dubai',
		base_url: 'https://www.raynatours.com/dubai/desert-safari-tours/evening-desert-safari-e-508805',
		image_urls: [
			'https://d2cazmkfw8kdtj.cloudfront.net/Tour-Images/Final/Evening-Desert-Safari-508805/1759836916383_3_2.jpg',
			'https://d2cazmkfw8kdtj.cloudfront.net/Tour-Images/Final/Evening-Desert-Safari-508805/1759836133269_3_2.jpg',
			'https://d2cazmkfw8kdtj.cloudfront.net/Tour-Images/Final/Evening-Desert-Safari-508805/1759836231518_3_2.jpg',
			'https://d2cazmkfw8kdtj.cloudfront.net/Tour-Images/Final/Evening-Desert-Safari-508805/1759837288337_3_2.jpg',
		],
		highlights: [
			'Enjoy a heart-racing 4X4 off-road journey through Dubai\'s dunes',
			'Soak up the rich Bedouin culture and heritage',
			'Ride a camel, try Shisha smoking, pose in traditional Emirati dress',
			'Relish sumptuous BBQ dinner with vegetarian and non-vegetarian dishes',
			'Colorful Arabic folklore performances — Tanura show and belly dance',
			'Roundtrip hotel transfers included',
		],
		meta: { duration: 'Approx 3:30 PM – 8:00 PM', pickup: true, meals: 'Unlimited refreshments & BBQ buffet dinner', group_size: 'Shared', rating: '4.65', reviews: 440 },
	},

	// ─── 2. Burj Khalifa At The Top Tickets (Dubai) ─────────
	{
		name: 'Burj Khalifa At The Top Tickets',
		description:
			"Feel like you are on top of the world as you ascend Burj Khalifa's 'At the Top' observation deck, spanning its 124th and 125th floors. Watch a multimedia presentation that journeys back to Dubai's quaint past. Take in the swiftest ever elevator ride as you get transported to the observation deck in less than a minute. Scope out through the floor-to-ceiling glass windows to enjoy panoramic views. Zoom in the cutting-edge telescopes for a closer view of Dubai landmarks.",
		short_description: "360° views from the world's tallest building — 124th & 125th floors",
		price: 159.0,
		compare_at_price: null,
		currency: 'AED',
		offer_label: null,
		category: 'Burj Khalifa Tickets',
		city: 'Dubai',
		base_url: 'https://www.raynatours.com/dubai/burj-khalifa-tickets/burj-khalifa-at-the-top-tickets-e-18',
		image_urls: [
			'https://d2cazmkfw8kdtj.cloudfront.net/Tour-Images/Final/Burj-Khalifa-At-The-Top-Tickets-18/1759833985818_3_2.jpg',
			'https://d2cazmkfw8kdtj.cloudfront.net/Tour-Images/Final/Burj-Khalifa-At-The-Top-Tickets-18/1759834084528_3_2.jpg',
			'https://d2cazmkfw8kdtj.cloudfront.net/Tour-Images/Final/Burj-Khalifa-At-The-Top-Tickets-18/1759834183414_3_2.jpg',
			'https://d2cazmkfw8kdtj.cloudfront.net/Tour-Images/Final/Burj-Khalifa-At-The-Top-Tickets-18/1759834571653_3_2.jpg',
		],
		highlights: [
			"It's the best way to take in the world's tallest building up close",
			'Standard ticket offers access to the At the Top Observation Deck at 124th and 125th floors',
			"Watch a multimedia presentation that journeys back to Dubai's quaint past",
			'Take the swiftest ever elevator ride — ground to 124th floor in less than a minute',
			'Scope out through floor-to-ceiling glass windows to enjoy panoramic views',
			'Zoom in cutting-edge telescopes for a closer view of Dubai landmarks',
		],
		meta: { duration: '30 minutes view from the Observation Deck', pickup: false, meals: null, group_size: 'Individual' },
	},

	// ─── 3. Hot Air Balloon Dubai ────────────────────────────
	{
		name: 'Hot Air Balloon Dubai',
		description:
			"Take a break from the city's usual sights and mundane activities with this hot air balloon Dubai package. Prepare for a relaxed and exclusive aerial adventure over Dubai's picturesque desert. Glide across the sky effortlessly as you reach over 4,000 feet during your hot air balloon ride. Absorb the compelling sunrise views and appreciate the 360-degree views of the desert and its native occupants on your one-hour flight. Receive a flight certificate signed by your pilot at the end of the tour.",
		short_description: 'One-hour sunrise balloon flight over Dubai desert at 4,000+ feet',
		price: 650.0,
		compare_at_price: 1499.0,
		currency: 'AED',
		offer_label: 'Save 57%',
		category: 'Hot Air Balloon',
		city: 'Dubai',
		base_url: 'https://www.raynatours.com/dubai/hot-air-balloon/hot-air-balloon-dubai-e-19390',
		image_urls: [
			'https://d2cazmkfw8kdtj.cloudfront.net/Tour-Images/Final/Hot-Air-Balloon-Dubai-19390/1769613253060_3_2.jpg',
			'https://d2cazmkfw8kdtj.cloudfront.net/Tour-Images/Final/Hot-Air-Balloon-Dubai-19390/1759919041416_3_2.jpg',
			'https://d2cazmkfw8kdtj.cloudfront.net/Tour-Images/Final/Hot-Air-Balloon-Dubai-19390/1759919242278_3_2.jpg',
			'https://d2cazmkfw8kdtj.cloudfront.net/Tour-Images/Final/Hot-Air-Balloon-Dubai-19390/1759919803409_3_2.jpg',
		],
		highlights: [
			"Prepare for a relaxed and exclusive aerial adventure over Dubai's picturesque desert",
			'Glide across the sky effortlessly as you reach over 4,000 feet',
			'Absorb the compelling sunrise views and appreciate the 360-degree views',
			'Receive a flight certificate signed by your pilot',
			'Enjoy the flexibility to choose transfers on a shared or private basis',
		],
		meta: { duration: 'Approximately one-hour flight', pickup: true, meals: 'Tea, Coffee, Gahwa, and Dates', group_size: 'Shared', rating: '4.95', reviews: 94 },
	},

	// ─── 4. Dubai City Tour ──────────────────────────────────
	{
		name: 'Dubai City Tour',
		description:
			"Let our fully guided classical Dubai city tour take you through the city's unrivaled new and charismatic old sights. Starting with the regal majesty of Zabeel Palace, this half-day Dubai city tour journeys you to the past, treats you with the most imposing Dubai views, and lets you indulge in the most incredible experiences like an abra ride along the Dubai Creek.",
		short_description: 'Half-day guided tour of old & new Dubai with Creek abra ride',
		price: 75.0,
		compare_at_price: 125.0,
		currency: 'AED',
		offer_label: 'Save 40%',
		category: 'City Tours',
		city: 'Dubai',
		base_url: 'https://www.raynatours.com/dubai/city-tours/dubai-city-tour-e-33',
		image_urls: [
			'https://d2cazmkfw8kdtj.cloudfront.net/Tour-Images/Final/Dubai-City-Tour-33/1760084181121_3_2.jpg',
			'https://d2cazmkfw8kdtj.cloudfront.net/Tour-Images/Final/Dubai-City-Tour-33/1760083348809_3_2.jpg',
			'https://d2cazmkfw8kdtj.cloudfront.net/Tour-Images/Final/Dubai-City-Tour-33/1760083515736_3_2.jpg',
			'https://d2cazmkfw8kdtj.cloudfront.net/Tour-Images/Final/Dubai-City-Tour-33/1760083626189_3_2.jpg',
		],
		highlights: [
			"Discover Dubai's iconic modern sights and historic neighborhoods in a few hours",
			"Marvel at Zabeel Palace's grandeur, admire the sail-shaped Burj Al Arab",
			'Cruise the timeless Dubai Creek on a traditional abra (boat) ride',
			'Stroll the quaint streets of the Al Bastakiya Quarter',
			'Wander the packed alleys of the Gold Souk and the Spice Souk',
			'Fuel your artistic side at the Islamic Art Centre',
		],
		meta: { duration: 'Approx 08:30 AM – 2:30 PM', pickup: true, meals: null, group_size: 'Shared' },
	},

	// ─── 5. Atlantis Aquaventure Waterpark (Dubai) ───────────
	{
		name: 'Atlantis Aquaventure Waterpark',
		description:
			"A visit to Atlantis Aquaventure in the heart of the imposing Atlantis, The Palm Resort promises you experiences beyond any waterpark you've ever been to. From heart-racing slides to the lazy river and private beach relaxations, this premier water park in Dubai has everything to make your holiday both thrilling and memorable.",
		short_description: '105+ slides, private beach & Lost Chambers Aquarium at Atlantis The Palm',
		price: 318.0,
		compare_at_price: 330.0,
		currency: 'AED',
		offer_label: 'Save 4%',
		category: 'Water Parks',
		city: 'Dubai',
		base_url: 'https://www.raynatours.com/dubai/water-parks/atlantis-aquaventure-waterpark-e-3625',
		image_urls: [
			'https://d2cazmkfw8kdtj.cloudfront.net/Tour-Images/Final/Atlantis-Aquaventure-Waterpark-3625/1760013634626_3_2.jpg',
			'https://d2cazmkfw8kdtj.cloudfront.net/Tour-Images/Final/Atlantis-Aquaventure-Waterpark-3625/1760013737425_3_2.jpg',
			'https://d2cazmkfw8kdtj.cloudfront.net/Tour-Images/Final/Atlantis-Aquaventure-Waterpark-3625/1760013849623_3_2.jpg',
			'https://d2cazmkfw8kdtj.cloudfront.net/Tour-Images/Final/Atlantis-Aquaventure-Waterpark-3625/1760013960029_3_2.jpg',
		],
		highlights: [
			'One of the region\'s largest water parks at Atlantis, The Palm',
			'Daredevil experiences: Leap of Faith, Master Blast, Poseidon\'s Revenge',
			'Marine activities: Ray Feeding, Shark Snorkeling, Diving',
			'Atlantean Flyer zip line and Surf\'s Up wave rider',
			'Lost Chambers Aquarium with 65,000+ marine animals (Super Pass)',
			'700-meter Adventure Beach access',
		],
		meta: { duration: 'Approx 9:15 AM to 6:00 PM', pickup: false, meals: null, group_size: 'Individual' },
	},

	// ─── 6. Dubai Aquarium and Underwater Zoo ────────────────
	{
		name: 'Dubai Aquarium and Underwater Zoo',
		description:
			"Discover some of the most fascinating and rarest marine creatures at one of the world's largest suspended aquariums inside the Dubai Mall. See in detail over 33,000 marine animals in a 10-million-liter tank, walk through a 48-meter-long underwater tunnel for a captivating 270-degree view, and meet the King Croc which weighs over 750 kilograms and the Gentoo Penguins at Penguin Cove.",
		short_description: "World's largest suspended aquarium — 33,000+ marine animals in Dubai Mall",
		price: 150.0,
		compare_at_price: 209.0,
		currency: 'AED',
		offer_label: 'Save 28%',
		category: 'Theme Parks',
		city: 'Dubai',
		base_url: 'https://www.raynatours.com/dubai/theme-parks/dubai-aquarium-and-underwater-zoo-e-3636',
		image_urls: [
			'https://d2cazmkfw8kdtj.cloudfront.net/Tour-Images/Final/Dubai-Aquarium-and-Underwater-Zoo-3636/1759917679577_3_2.jpg',
			'https://d2cazmkfw8kdtj.cloudfront.net/Tour-Images/Final/Dubai-Aquarium-and-Underwater-Zoo-3636/1759917444870_3_2.jpg',
			'https://d2cazmkfw8kdtj.cloudfront.net/Tour-Images/Final/Dubai-Aquarium-and-Underwater-Zoo-3636/1759917827225_3_2.jpg',
			'https://d2cazmkfw8kdtj.cloudfront.net/Tour-Images/Final/Dubai-Aquarium-and-Underwater-Zoo-3636/1759917995319_3_2.jpg',
		],
		highlights: [
			'Discover some of the most fascinating and rarest marine creatures',
			'See in detail over 33,000 marine animals',
			'Captivating 270-degree view over the aquarium through a 48-meter-long underwater tunnel',
			'Meet the King Croc, which weighs over 750 kilograms',
			'Visit the Gentoo Penguins at the recently added Penguin Cove',
		],
		meta: { duration: 'Approx 10 AM to 11 PM', pickup: false, meals: null, group_size: 'Individual' },
	},

	// ─── 7. IMG Worlds of Adventure (Dubai) ──────────────────
	{
		name: 'IMG Worlds of Adventure',
		description:
			"Step into one of the world's largest indoor theme parks, occupying about 1.5 million square feet. Interact with your favorite superheroes at the Marvel Zone, hit games and rides based on your most adored cartoon characters at Cartoon Network, experience the fastest-of-its-kind Velociraptor ride at Lost Valley with 70 animatronic dinosaurs, and enjoy ghostly fun and thrills at the Haunted Town.",
		short_description: "World's largest indoor theme park — Marvel, Cartoon Network & Lost Valley",
		price: 195.0,
		compare_at_price: 365.0,
		currency: 'AED',
		offer_label: 'Save 47%',
		category: 'Theme Parks',
		city: 'Dubai',
		base_url: 'https://www.raynatours.com/dubai/theme-parks/img-worlds-of-adventure-e-4753',
		image_urls: [
			'https://d2cazmkfw8kdtj.cloudfront.net/Tour-Images/Final/IMG-Worlds-of-Adventure-4753/1760008208926_3_2.jpg',
			'https://d2cazmkfw8kdtj.cloudfront.net/Tour-Images/Final/IMG-Worlds-of-Adventure-4753/1760008294043_3_2.jpg',
			'https://d2cazmkfw8kdtj.cloudfront.net/Tour-Images/Final/IMG-Worlds-of-Adventure-4753/1760008344300_3_2.jpg',
			'https://d2cazmkfw8kdtj.cloudfront.net/Tour-Images/Final/IMG-Worlds-of-Adventure-4753/1760008428522_3_2.jpg',
		],
		highlights: [
			"Unlimited access to one of the world's largest indoor theme parks",
			'Interact with your favorite superheroes at Marvel Zone',
			'Hit games and rides based on your most adored cartoon characters',
			'The fastest-of-its-kind Velociraptor ride at Lost Valley',
			'Experience ghostly fun and thrills at the Haunted Town',
		],
		meta: { duration: 'Approx 12 noon to 10 PM', pickup: true, meals: null, group_size: 'Individual' },
	},

	// ─── 8. Museum of the Future (Dubai) ─────────────────────
	{
		name: 'Museum of the Future',
		description:
			'Museum of the Future is not just another museum devoted to contemporary creativity, but much beyond that. Employing the latest in design, prototyping, and technological advancements, the museum — just as the name says — is solely developed to craft the real next-generation exhibits that will journey you 50 years into the future, straight to the year 2071.',
		short_description: 'Journey to 2071 — immersive future exhibits in one of the world\'s most beautiful buildings',
		price: 149.0,
		compare_at_price: null,
		currency: 'AED',
		offer_label: null,
		category: 'Culture and Attractions',
		city: 'Dubai',
		base_url: 'https://www.raynatours.com/dubai/culture-and-attractions/museum-of-the-future-e-5116',
		image_urls: [
			'https://d2cazmkfw8kdtj.cloudfront.net/Tour-Images/Final/Museum-of-the-Future-5116/1760437357981_3_2.jpg',
			'https://d2cazmkfw8kdtj.cloudfront.net/Tour-Images/Final/Museum-of-the-Future-5116/1760437473510_3_2.jpg',
			'https://d2cazmkfw8kdtj.cloudfront.net/Tour-Images/Final/Museum-of-the-Future-5116/1760437567207_3_2.jpg',
			'https://d2cazmkfw8kdtj.cloudfront.net/Tour-Images/Final/Museum-of-the-Future-5116/1760437659384_3_2.jpg',
		],
		highlights: [
			"Enjoy access to one of the world's most beautiful museums",
			'Get an up-close look at its futuristic structure that sparkles like a stunning silver oval ring',
			'See the Arabic calligraphy engraved on its façade',
			'Walk into the future and straight to the year 2071',
			'Get ready to engage and revive your senses with the most immersive experiences',
		],
		meta: { duration: 'Approx 10 AM to 9:30 PM', pickup: false, meals: null, group_size: 'Individual' },
	},

	// ─── 9. Ski Dubai Tickets ────────────────────────────────
	{
		name: 'Ski Dubai Tickets',
		description:
			"Ski Dubai will retreat you from the blazing heat of Dubai and allow you to experience the snowy wonderland in the middle of the desert city. Gain hassle-free entry into the region's first indoor ski resort inside the Mall of the Emirates. Beat Dubai's intense sunrays throughout the year, with temperatures maintained at -4°C. Experience all your favorite winter activities, such as skiing and snowboarding.",
		short_description: "Region's first indoor ski resort — real snow, penguins & -4°C year-round",
		price: 209.0,
		compare_at_price: 265.0,
		currency: 'AED',
		offer_label: 'Save 21%',
		category: 'Theme Parks',
		city: 'Dubai',
		base_url: 'https://www.raynatours.com/dubai/theme-parks/ski-dubai-tickets-e-172',
		image_urls: [
			'https://d2cazmkfw8kdtj.cloudfront.net/Tour-Images/Final/Ski-Dubai-Tickets-172/1760080772245_3_2.jpg',
			'https://d2cazmkfw8kdtj.cloudfront.net/Tour-Images/Final/Ski-Dubai-Tickets-172/1760080588964_3_2.jpg',
			'https://d2cazmkfw8kdtj.cloudfront.net/Tour-Images/Final/Ski-Dubai-Tickets-172/1760080880953_3_2.jpg',
			'https://d2cazmkfw8kdtj.cloudfront.net/Tour-Images/Final/Ski-Dubai-Tickets-172/1760081069484_3_2.jpg',
		],
		highlights: [
			"Gain hassle-free entry into the region's first indoor ski resort inside the Mall of the Emirates",
			"Beat Dubai's intense sunrays throughout the year, with temperatures maintained at -4°C",
			'Five slopes of diverse sizes and levels cater to pro skiers, beginners, and first-timers',
			'3,000-square-meter snow park, complete with toboggan runs, sleds, snowballs, ice caves',
			'Chairlift, Mountain Thriller, and Snow Bullet rides',
			'Meet King and Gentoo penguins',
		],
		meta: { duration: 'Approx 10 AM to 11 PM', pickup: false, meals: null, group_size: 'Individual' },
	},

	// ─── 10. Dubai Frame ─────────────────────────────────────
	{
		name: 'Dubai Frame',
		description:
			"The Dubai Frame — come enjoy the stunning glimpse of the city's both classical new and pleasant old sights from a single frame. Witness the world's largest Picture Frame up close and in detail. Enjoy an exhilarating walk along the 93-meter-long glass bridge on the Sky Deck. Marvel at old and new Dubai from a single frame at a height of about 150 meters.",
		short_description: "World's largest Picture Frame — 150m Sky Deck with glass bridge walk",
		price: 52.0,
		compare_at_price: 53.0,
		currency: 'AED',
		offer_label: null,
		category: 'Culture and Attractions',
		city: 'Dubai',
		base_url: 'https://www.raynatours.com/dubai/culture-and-attractions/dubai-frame-e-5066',
		image_urls: [
			'https://d2cazmkfw8kdtj.cloudfront.net/Tour-Images/Final/Dubai-Frame-5066/1759912747531_3_2.jpg',
			'https://d2cazmkfw8kdtj.cloudfront.net/Tour-Images/Final/Dubai-Frame-5066/1759913298485_S.jpg',
			'https://d2cazmkfw8kdtj.cloudfront.net/Tour-Images/Final/Dubai-Frame-5066/1759913412987_3_2.jpg',
			'https://d2cazmkfw8kdtj.cloudfront.net/Tour-Images/Final/Dubai-Frame-5066/1759913687923_3_2.jpg',
		],
		highlights: [
			"Witness the world's largest Picture Frame up close and in detail",
			'Enjoy an exhilarating walk along the 93-meter-long glass bridge on the Sky Deck',
			'Marvel at old and new Dubai from a single frame at a height of about 150 meters',
			"Get the stunning 360-degree views over Dubai's extraordinary attractions",
			"Walk into Dubai's high tech future at the Future Gallery",
		],
		meta: { duration: '1 hour approx', pickup: false, meals: null, group_size: 'Individual' },
	},

	// ─── 11. Dhow Cruise Dinner - Marina (Dubai) ────────────
	{
		name: 'Dhow Cruise Dinner - Marina',
		description:
			"Our Marina Dhow Cruise combines magical sightseeing, delectable dining, and striking traditional entertainment shows in an elegant setting. Lasting for about 90 minutes, this Marina Dhow Cruise Dubai experience allows you to absorb the modern city's unrivaled architecture, opulent yachts, and breathtaking waterfront sights at their best.",
		short_description: '90-minute Marina cruise with 4-star buffet dinner & Tanura show',
		price: 65.0,
		compare_at_price: 70.0,
		currency: 'AED',
		offer_label: 'Save 7%',
		category: 'Dhow Cruise',
		city: 'Dubai',
		base_url: 'https://www.raynatours.com/dubai/dhow-cruise/dhow-cruise-dinner-marina-e-87',
		image_urls: [
			'https://d2cazmkfw8kdtj.cloudfront.net/Tour-Images/Final/Dhow-Cruise-Dinner---Marina-87/1767782326362_3_2.jpg',
			'https://d2cazmkfw8kdtj.cloudfront.net/Tour-Images/false-87/dhow-cruise-bg.jpg',
			'https://d2cazmkfw8kdtj.cloudfront.net/Tour-Images/false-87/dhow-cruise-front.jpg',
		],
		highlights: [
			"Admire Dubai's uber-contemporary cityscape from a subdued yet magical ambiance",
			"Take in the attractions across Dubai Marina from the dhow's air-conditioned lower deck or partly open upper deck",
			"Feel the layers of Dubai's fascinating culture and past as you sail down one of Dubai's most stylish neighborhoods",
		],
		meta: { duration: '90 minutes cruising', pickup: true, meals: 'International 4-Star buffet, welcome drinks, water, tea, coffee', group_size: 'Shared', rating: '4.83', reviews: 120 },
	},

	// ─── 12. AYA Universe Dubai ──────────────────────────────
	{
		name: 'AYA Universe Dubai',
		description:
			"Enjoy a day at Dubai's latest addition inside WAFI City Mall! Your AYA Universe tickets allow access to the facility's 12 zones that whisk you to a distant world, far from reality. Delight all your senses at the region's first-of-its-kind light and sound park. See the plants, pools, extraordinary creatures, galaxies, and celestial events. Get the feel of floating through time, witness the reverse waterfall.",
		short_description: "Region's first light & sound park — 12 immersive zones at WAFI City Mall",
		price: 110.0,
		compare_at_price: 135.0,
		currency: 'AED',
		offer_label: 'Save 19%',
		category: 'Theme Parks',
		city: 'Dubai',
		base_url: 'https://www.raynatours.com/dubai/theme-parks/aya-universe-dubai-e-508739',
		image_urls: [
			'https://d2cazmkfw8kdtj.cloudfront.net/Tour-Images/Final/AYA-Universe-Dubai-508739/1759991330182_3_2.jpg',
			'https://d2cazmkfw8kdtj.cloudfront.net/Tour-Images/Final/AYA-Universe-Dubai-508739/1759991391158_3_2.jpg',
			'https://d2cazmkfw8kdtj.cloudfront.net/Tour-Images/Final/AYA-Universe-Dubai-508739/1759991566266_3_2.jpg',
			'https://d2cazmkfw8kdtj.cloudfront.net/Tour-Images/Final/AYA-Universe-Dubai-508739/1759991660078_3_2.jpg',
		],
		highlights: [
			"Delight all your senses at the region's first-of-its-kind light and sound park",
			'Transport yourself to a new universe as you explore the 12 zones',
			'Prepare for the most immersive and surreal experiences in every zone',
			'See the plants, pools, extraordinary creatures, galaxies, and celestial events',
			'Get the feel of floating through time, witness the reverse waterfall',
		],
		meta: { duration: '1.5 hours approx', pickup: false, meals: null, group_size: 'Individual' },
	},

	// ─── 13. Legoland Dubai ──────────────────────────────────
	{
		name: 'Legoland Dubai',
		description:
			'Legoland Water Park Dubai is home to world-class slides and attractions specially designed for families with kids and a group of friends. Experience the thrill of twisting and turning down water slides in the enchanting LEGO-themed environment. Dive into its 20-plus cool games, rides, and slides, particularly designed for families of kids aged between 2 and 12 years.',
		short_description: "Region's first LEGO® water park — 20+ rides for families with kids aged 2-12",
		price: 235.0,
		compare_at_price: 330.0,
		currency: 'AED',
		offer_label: 'Save 29%',
		category: 'Theme Parks',
		city: 'Dubai',
		base_url: 'https://www.raynatours.com/dubai/theme-parks/legoland-dubai-e-4996',
		image_urls: [
			'https://d2cazmkfw8kdtj.cloudfront.net/Tour-Images/Final/Legoland-Dubai-4996/1759911451903_3_2.jpg',
			'https://d2cazmkfw8kdtj.cloudfront.net/Tour-Images/Final/Legoland-Dubai-4996/1759908921526_3_2.jpg',
			'https://d2cazmkfw8kdtj.cloudfront.net/Tour-Images/Final/Legoland-Dubai-4996/1759909400853_3_2.jpg',
			'https://d2cazmkfw8kdtj.cloudfront.net/Tour-Images/Final/Legoland-Dubai-4996/1759910448881_3_2.jpg',
		],
		highlights: [
			'Enjoy direct entry to the Legoland Water Park Dubai, the region\'s first water park exclusively themed around LEGO®',
			'Dive into its 20-plus cool games, rides, and slides, particularly designed for families of kids aged between 2 and 12 years',
			'Experience pulse-racing adventure and fun with Splash Out, Slide Racers, Red Rush, and Twin Chasers',
			'Let your toddlers make the most of DUPLO Splash Safari with fun-filled mini slides',
			'Get the chance to build your own raft with the colorful LEGO® bricks',
		],
		meta: { duration: 'Approx 11 AM to 9 PM', pickup: true, meals: null, group_size: 'Individual' },
	},

	// ─── 14. Dubai Safari Park ───────────────────────────────
	{
		name: 'Dubai Safari Park',
		description:
			"Explore one of the most diverse wildlife sanctuaries in the region at Dubai Safari Park. Home to over 3,000 animals from around the world spread across multiple themed villages, experience African, Asian, and Arabian wildlife in natural habitats, along with educational shows and an interactive children's farm.",
		short_description: '3,000+ animals across African, Asian & Arabian wildlife villages',
		price: 62.0,
		compare_at_price: null,
		currency: 'AED',
		offer_label: null,
		category: 'Culture and Attractions',
		city: 'Dubai',
		base_url: 'https://www.raynatours.com/dubai/culture-and-attractions/dubai-safari-park-e-5109',
		image_urls: [
			'https://d2cazmkfw8kdtj.cloudfront.net/Tour-Images/Final/Dubai-Safari-Park-5109/1759825934987_S.jpg',
			'https://d2cazmkfw8kdtj.cloudfront.net/Tour-Images/Final/Dubai-Safari-Park-5109/1759833628460_3_2.jpg',
			'https://d2cazmkfw8kdtj.cloudfront.net/Tour-Images/Final/Dubai-Safari-Park-5109/1759834072945_3_2.jpg',
			'https://d2cazmkfw8kdtj.cloudfront.net/Tour-Images/Final/Dubai-Safari-Park-5109/1759834175596_3_2.jpg',
		],
		highlights: [
			'3,000+ animals from across the globe',
			'African, Asian & Arabian wildlife villages in natural habitats',
			'Educational animal shows',
			"Interactive children's farm",
			'Open Safari Village bus tour',
		],
		meta: { duration: '3-4 hours', pickup: false, meals: null, group_size: 'Individual' },
	},

	// ─── 15. Dubai Dolphinarium ──────────────────────────────
	{
		name: 'Dubai Dolphinarium',
		description:
			'Enjoy a fun-filled experience at the Dubai Dolphinarium featuring live shows with dolphins and seals performing acrobatic tricks, dancing, singing, and painting. Located in Creek Park, it also offers interactive experiences including swimming with dolphins and up-close seal encounters.',
		short_description: 'Live dolphin & seal shows with acrobatic tricks at Creek Park',
		price: 59.0,
		compare_at_price: null,
		currency: 'AED',
		offer_label: null,
		category: 'Theme Parks',
		city: 'Dubai',
		base_url: 'https://www.raynatours.com/dubai/theme-parks/dubai-dolphinarium-e-65',
		image_urls: [
			'https://d2cazmkfw8kdtj.cloudfront.net/Tour-Images/Final/Dubai-Dolphinarium-65/1759909080348_3_2.jpg',
			'https://d2cazmkfw8kdtj.cloudfront.net/Tour-Images/Final/Dubai-Dolphinarium-65/1759909198784_3_2.jpg',
			'https://d2cazmkfw8kdtj.cloudfront.net/Tour-Images/Final/Dubai-Dolphinarium-65/1759909277449_3_2.jpg',
			'https://d2cazmkfw8kdtj.cloudfront.net/Tour-Images/Final/Dubai-Dolphinarium-65/1759909350672_3_2.jpg',
		],
		highlights: [
			'Live dolphin & seal acrobatic show',
			'Swimming with dolphins experience',
			'Up-close seal encounters',
			'Located in Creek Park',
		],
		meta: { duration: '1 hour', pickup: false, meals: null, group_size: 'Individual' },
	},

	// ─── 16. Sky Views Dubai ─────────────────────────────────
	{
		name: 'Sky Views Dubai',
		description:
			'Experience breathtaking views from the Sky Views Observatory located next to the Burj Khalifa. Walk on the glass-bottom Sky Walk at 219.5 meters, slide down the Sky Edge glass slide between the two towers, and enjoy panoramic views of Downtown Dubai from the observation deck.',
		short_description: 'Glass Sky Walk & Edge Slide at 219m next to Burj Khalifa',
		price: 80.0,
		compare_at_price: null,
		currency: 'AED',
		offer_label: null,
		category: 'Burj Khalifa Tickets',
		city: 'Dubai',
		base_url: 'https://www.raynatours.com/dubai/burj-khalifa-tickets/sky-views-dubai-e-508481',
		image_urls: [
			'https://d2cazmkfw8kdtj.cloudfront.net/Tour-Images/Final/Sky-Views-Dubai-508481/1759900250982_3_2.jpg',
			'https://d2cazmkfw8kdtj.cloudfront.net/Tour-Images/Final/Sky-Views-Dubai-508481/1759900374178_3_2.jpg',
			'https://d2cazmkfw8kdtj.cloudfront.net/Tour-Images/Final/Sky-Views-Dubai-508481/1759900458993_3_2.jpg',
			'https://d2cazmkfw8kdtj.cloudfront.net/Tour-Images/Final/Sky-Views-Dubai-508481/1759900596495_3_2.jpg',
		],
		highlights: [
			'Glass-bottom Sky Walk at 219.5 meters',
			'Sky Edge glass slide between towers',
			'Panoramic Downtown Dubai views',
			'Located next to Burj Khalifa',
		],
		meta: { duration: '1 hour', pickup: false, meals: null, group_size: 'Individual' },
	},

	// ─── 17. House of Hype (Dubai) ───────────────────────────
	{
		name: 'House of Hype',
		description:
			"House of Hype is Dubai's newest immersive social media experience featuring multiple themed rooms designed for the perfect photo and video content. From neon-lit tunnels to ball pits, mirror rooms, and interactive digital art — every corner is designed for maximum engagement.",
		short_description: 'Immersive Instagram-ready experience with themed rooms & digital art',
		price: 99.0,
		compare_at_price: null,
		currency: 'AED',
		offer_label: null,
		category: 'Theme Parks',
		city: 'Dubai',
		base_url: 'https://www.raynatours.com/dubai/theme-parks/house-of-hype-e-509318',
		image_urls: [
			'https://d2cazmkfw8kdtj.cloudfront.net/Tour-Images/Final/House-of-Hype-509318/1770179820383_3_2.jpg',
			'https://d2cazmkfw8kdtj.cloudfront.net/Tour-Images/Final/House-of-Hype-509318/1770178606437_3_2.jpg',
			'https://d2cazmkfw8kdtj.cloudfront.net/Tour-Images/Final/House-of-Hype-509318/1770178793675_3_2.jpg',
			'https://d2cazmkfw8kdtj.cloudfront.net/Tour-Images/Final/House-of-Hype-509318/1770178912788_3_2.jpg',
		],
		highlights: [
			'Multiple Instagram-ready themed rooms',
			'Neon-lit tunnels & mirror rooms',
			'Interactive digital art installations',
			'Ball pits & immersive spaces',
			'Perfect for content creation',
		],
		meta: { duration: '1.5 hours', pickup: false, meals: null, group_size: 'Individual' },
	},

	// ─── 18. Full Day Abu Dhabi City Tour ────────────────────
	{
		name: 'Full Day Abu Dhabi City Tour',
		description:
			"Set out on this full-day, guided city tour to acquaint yourself with Abu Dhabi's iconic and best-kept secrets. Marvel at Sheikh Zayed Grand Mosque's unrivaled splendor, and prepare for some creative snaps while passing through the Corniche, Emirates Palace Hotel, and Qasr Al Watan or Louvre Abu Dhabi Museum. Step back in time as you enter the Heritage Village.",
		short_description: 'Sheikh Zayed Mosque, Ferrari World & Heritage Village — guided full day',
		price: 385.0,
		compare_at_price: null,
		currency: 'AED',
		offer_label: null,
		category: 'City Tours',
		city: 'Abu Dhabi',
		base_url: 'https://www.raynatours.com/abu-dhabi/city-tours/full-day-abu-dhabi-city-tour-e-4826',
		image_urls: [
			'https://d2cazmkfw8kdtj.cloudfront.net/Tour-Images/Final/Full-Day-Abu-Dhabi-City-Tour-4826/1760092136384_3_2.jpg',
			'https://d2cazmkfw8kdtj.cloudfront.net/Tour-Images/Final/Full-Day-Abu-Dhabi-City-Tour-4826/1760091271124_3_2.jpg',
			'https://d2cazmkfw8kdtj.cloudfront.net/Tour-Images/Final/Full-Day-Abu-Dhabi-City-Tour-4826/1760091469363_3_2.jpg',
			'https://d2cazmkfw8kdtj.cloudfront.net/Tour-Images/Final/Full-Day-Abu-Dhabi-City-Tour-4826/1760091912997_3_2.jpg',
		],
		highlights: [
			"Cover all of Abu Dhabi's best sights in a day",
			'Sheikh Zayed Grand Mosque visit',
			'Drive Through at Ferrari World Abu Dhabi on Yas Island',
			'Drive Through at Qasr Al Watan or Louvre Abu Dhabi Museum',
			'Step back in time as you enter the Heritage Village',
			'Hotel pick-up and drop-off included',
		],
		meta: { duration: 'Full day from 08:30 AM', pickup: true, meals: null, group_size: 'Shared', rating: '4.83', reviews: 318 },
	},

	// ─── 19. Ferrari World Abu Dhabi ─────────────────────────
	{
		name: 'Ferrari World Abu Dhabi',
		description:
			"Prepare for an adventurous, fun-filled day in the world's first Ferrari-branded theme park with Ferrari World Abu Dhabi tickets. Featuring a wide spectrum of jaw-dropping rides and high-speed experiences, it is an absolute destination to enjoy an in-depth and unmatched understanding of one of the most iconic and adored automobile brands. Enjoy access to over 40 Ferrari-based rides, attractions and experiences.",
		short_description: "World's first Ferrari theme park — 40+ rides including Formula Rossa",
		price: 310.0,
		compare_at_price: null,
		currency: 'AED',
		offer_label: null,
		category: 'Theme Parks',
		city: 'Abu Dhabi',
		base_url: 'https://www.raynatours.com/abu-dhabi/theme-parks/ferrari-theme-park-abu-dhabi-e-4827',
		image_urls: [
			'https://d2cazmkfw8kdtj.cloudfront.net/Tour-Images/Final/Ferrari-Theme-Park-Abu-Dhabi-4827/1760006962646_3_2.jpg',
			'https://d2cazmkfw8kdtj.cloudfront.net/Tour-Images/Final/Ferrari-Theme-Park-Abu-Dhabi-4827/1760006683524_3_2.jpg',
			'https://d2cazmkfw8kdtj.cloudfront.net/Tour-Images/Final/Ferrari-Theme-Park-Abu-Dhabi-4827/1760007099043_3_2.jpg',
			'https://d2cazmkfw8kdtj.cloudfront.net/Tour-Images/Final/Ferrari-Theme-Park-Abu-Dhabi-4827/1760007328536_3_2.jpg',
		],
		highlights: [
			"Walk into the world's first Ferrari-branded theme park",
			'Enjoy access to over 40 Ferrari-based rides, attractions and experiences',
			'Hit the fastest-of-its-kind Formula Rossa Roller Coaster ride',
			'Experience Fiorano GT Challenge, Flying Aces, and Scuderia Challenge',
			"Let families and kids take to Speed of Magic, Nello's Adventure Land, Tyre Twist, and Viaggio in Italy",
		],
		meta: { duration: 'Approx 10:00 AM to 8:00 PM', pickup: true, meals: null, group_size: 'Individual' },
	},

	// ─── 20. SeaWorld Abu Dhabi ──────────────────────────────
	{
		name: 'SeaWorld Abu Dhabi',
		description:
			"Immerse yourself in the captivating and mysterious marine world at the UAE's first marine life theme park, featuring the world's biggest aquarium with over 58 million liters of water. Over 68,000 underwater creatures across eight zones spread over five levels. Over 100 shows and experiences that blend entertainment with fantastic marine life themes.",
		short_description: "UAE's first marine life theme park — world's biggest aquarium, 68,000+ creatures",
		price: 310.0,
		compare_at_price: null,
		currency: 'AED',
		offer_label: null,
		category: 'Theme Parks',
		city: 'Abu Dhabi',
		base_url: 'https://www.raynatours.com/abu-dhabi/theme-parks/seaworld-abu-dhabi-e-508806',
		image_urls: [
			'https://d2cazmkfw8kdtj.cloudfront.net/Tour-Images/Final/SeaWorld-Abu-Dhabi-508806/1760008548121_3_2.jpg',
			'https://d2cazmkfw8kdtj.cloudfront.net/Tour-Images/Final/SeaWorld-Abu-Dhabi-508806/1760008647134_3_2.jpg',
			'https://d2cazmkfw8kdtj.cloudfront.net/Tour-Images/Final/SeaWorld-Abu-Dhabi-508806/1760008730050_3_2.jpg',
			'https://d2cazmkfw8kdtj.cloudfront.net/Tour-Images/Final/SeaWorld-Abu-Dhabi-508806/1760008882100_3_2.jpg',
		],
		highlights: [
			'Immerse yourself in the captivating and mysterious marine world',
			'Over 68,000 underwater creatures across eight zones spread over five levels',
			'Over 100 shows and experiences blending entertainment with marine life',
			'One Ocean narrative experience',
			'Yas SeaWorld Research & Rescue facility',
		],
		meta: { duration: 'Approx 10:00 AM to 6:00 PM', pickup: true, meals: null, group_size: 'Individual' },
	},

	// ─── 21. Warner Bros World Abu Dhabi ─────────────────────
	{
		name: 'Warner Bros World Abu Dhabi',
		description:
			"A visit to Warner Bros. Abu Dhabi at Yas Island is sure to spur exciting fun and thrill in an impressive environment. Spread over its six exciting lands, each of the immersive offerings is inspired by classic characters that constitute the extensive library of the legendary Warner Bros. franchises, including Superman, Hanna Barbera, Looney Tunes, Scooby Doo, and Tom and Jerry.",
		short_description: "World's first Warner Bros. theme park — 6 lands, 60 rides on Yas Island",
		price: 310.0,
		compare_at_price: null,
		currency: 'AED',
		offer_label: null,
		category: 'Theme Parks',
		city: 'Abu Dhabi',
		base_url: 'https://www.raynatours.com/abu-dhabi/theme-parks/warner-bros-world-abu-dhabi-e-5184',
		image_urls: [
			'https://d2cazmkfw8kdtj.cloudfront.net/Tour-Images/Final/Warner-Bros-World-Abu-Dhabi-5184/1760010267917_3_2.jpg',
			'https://d2cazmkfw8kdtj.cloudfront.net/Tour-Images/Final/Warner-Bros-World-Abu-Dhabi-5184/1760009740534_3_2.jpg',
			'https://d2cazmkfw8kdtj.cloudfront.net/Tour-Images/Final/Warner-Bros-World-Abu-Dhabi-5184/1760009834942_3_2.jpg',
			'https://d2cazmkfw8kdtj.cloudfront.net/Tour-Images/Final/Warner-Bros-World-Abu-Dhabi-5184/1760010015065_3_2.jpg',
		],
		highlights: [
			"Gain easy entry into the world's first Warner Bros. theme park",
			'Enjoy unlimited access to six themed lands',
			'Take to 60 rides that let you relive some of your most adored superheroes',
			'Catch up with your all-time favorites — Tom and Jerry, Scooby Doo, Shaggy, Bugs Bunny, and Tweety',
			'Enjoy the chance to recharge your energy at its myriad cafes and restaurants',
		],
		meta: { duration: 'Approx 10:00 AM to 8:00 PM', pickup: true, meals: null, group_size: 'Individual' },
	},

	// ─── 22. Yas Waterworld (Abu Dhabi) ──────────────────────
	{
		name: 'Yas Waterworld',
		description:
			'Yas Waterworld is an absolute haven to enjoy water fun and thrill in the UAE. With over 40 plus cool and exciting rides, chance to hit Bubble Barrel — the largest surfable sheet in the world — and exclusive rides like Dawwama, Jebel Drop, Bandit Bomber, Falcons Falaj, Liwa Loop, and Hamlool\'s Hump.',
		short_description: "Abu Dhabi's largest water park — 40+ rides including world's largest surfable sheet",
		price: 265.0,
		compare_at_price: null,
		currency: 'AED',
		offer_label: null,
		category: 'Water Parks',
		city: 'Abu Dhabi',
		base_url: 'https://www.raynatours.com/abu-dhabi/water-parks/yas-waterworld-e-111',
		image_urls: [
			'https://d2cazmkfw8kdtj.cloudfront.net/Tour-Images/Final/Yas-Waterworld-111/1760000465432_3_2.jpg',
			'https://d2cazmkfw8kdtj.cloudfront.net/Tour-Images/Final/Yas-Waterworld-111/1760000358111_3_2.jpg',
			'https://d2cazmkfw8kdtj.cloudfront.net/Tour-Images/Final/Yas-Waterworld-111/1760000566348_3_2.jpg',
			'https://d2cazmkfw8kdtj.cloudfront.net/Tour-Images/Final/Yas-Waterworld-111/1760000679412_3_2.jpg',
		],
		highlights: [
			'Enjoy smooth access to the largest water park in Abu Dhabi',
			'With over 40 plus cool and exciting rides',
			'Chance to hit Bubble Barrel, the largest surfable sheet in the world',
			'Exclusive rides like Dawwama, Jebel Drop, Bandit Bomber, Falcons Falaj, Liwa Loop',
			"Kid-specific attractions such as Marah Fortress, Al Raha River, Tot's Playground, and Cannon Point",
		],
		meta: { duration: 'Approx 10:00 AM to 5:00 PM', pickup: true, meals: null, group_size: 'Individual' },
	},

	// ─── 23. Louvre Abu Dhabi ─────────────────────────────────
	{
		name: 'Louvre Abu Dhabi',
		description:
			"Enjoy smooth access to the Arabian Peninsula's first Universal Museum. Come face to face with a massive collection of classic artworks. Admire the breathtaking architecture that appears like a floating white structure. Experience the stunning rain of light phenomenon. Discover over 600 artworks arranged in 12 distinct sequences. See classic masterpieces loaned from legendary French institutions such as Musée d'Orsay and Musée du Louvre.",
		short_description: "Arabian Peninsula's first Universal Museum — 600+ artworks & rain of light",
		price: 70.0,
		compare_at_price: null,
		currency: 'AED',
		offer_label: null,
		category: 'Culture and Attractions',
		city: 'Abu Dhabi',
		base_url: 'https://www.raynatours.com/abu-dhabi/culture-and-attractions/louvre-abu-dhabi-e-5185',
		image_urls: [
			'https://d2cazmkfw8kdtj.cloudfront.net/Tour-Images/Final/Louvre-Abu-Dhabi-5185/1760073063110_3_2.jpg',
			'https://d2cazmkfw8kdtj.cloudfront.net/Tour-Images/Final/Louvre-Abu-Dhabi-5185/1760073222945_3_2.jpg',
			'https://d2cazmkfw8kdtj.cloudfront.net/Tour-Images/Final/Louvre-Abu-Dhabi-5185/1760073435876_3_2.jpg',
			'https://d2cazmkfw8kdtj.cloudfront.net/Tour-Images/Final/Louvre-Abu-Dhabi-5185/1760073643533_3_2.jpg',
		],
		highlights: [
			"Enjoy smooth access to the Arabian Peninsula's first Universal Museum",
			'Come face to face with a massive collection of classic artworks',
			'Admire the breathtaking architecture that appears like a floating white structure',
			'Experience the stunning rain of light phenomenon',
			'Discover over 600 artworks arranged in 12 distinct sequences',
		],
		meta: { duration: 'Approx 10:00 AM to 6:30 PM', pickup: false, meals: null, group_size: 'Individual' },
	},

	// ─── 24. Jebel Jais Zipline (Ras Al Khaimah) ────────────
	{
		name: 'Jebel Jais Zipline',
		description:
			"Take in the UAE's tallest mountain in the most exciting way with Jebel Jais Flight! This attraction at the ecological adventure park of Toroverde Ras al Khaimah is the Guinness World Records holder for the longest zipline in the world, as it beats Puerto Rico's Monster Zipline of 2,530-meter-long. It extends for an enormous 2,832 meters, lengthier than the size of 28 soccer pitches put together.",
		short_description: "Guinness World Record longest zipline — 2,832m at 130 km/h on UAE's tallest mountain",
		price: 370.0,
		compare_at_price: 399.0,
		currency: 'AED',
		offer_label: 'Save 7%',
		category: 'Adventures Tours',
		city: 'Ras Al Khaimah',
		base_url: 'https://www.raynatours.com/ras-al-khaimah/adventures-tours/jebel-jais-zipline-e-8937',
		image_urls: [
			'https://d2cazmkfw8kdtj.cloudfront.net/Tour-Images/Final/Jebel-Jais-Zipline-8937/1760337317788_3_2.jpg',
			'https://d2cazmkfw8kdtj.cloudfront.net/Tour-Images/Final/Jebel-Jais-Zipline-8937/1760337416664_3_2.jpg',
			'https://d2cazmkfw8kdtj.cloudfront.net/Tour-Images/Final/Jebel-Jais-Zipline-8937/1760338268177_3_2.jpg',
			'https://d2cazmkfw8kdtj.cloudfront.net/Tour-Images/Final/Jebel-Jais-Zipline-8937/1760338452124_3_2.jpg',
		],
		highlights: [
			'Let your adrenaline levels elevate as you combine fun, thrill and nature on the longest zipline in the world',
			'Kick off your zipline flight from the launch platform, perched at a height of 1,680 meters',
			"Fly over the UAE's highest mountain (Jebel Jais) like a superhero while hitting speeds up to 130 kilometers per hour",
			'Make a brief pause at a suspended platform of 1,280 meters high before you complete the adventure',
			'Return with the souvenir pictures of your once-in-a-lifetime experience',
		],
		meta: { duration: 'More than 3 minutes flight', pickup: false, meals: 'Refreshments included', group_size: 'Individual' },
	},

	// ─── 25. Dinner in Desert Ras Al Khaimah ─────────────────
	{
		name: 'Dinner in Desert Ras Al Khaimah',
		description:
			"Discover the serene charm of Ras Al Khaimah's desert with the Dinner in Desert, a relaxed and culturally rich safari experience designed for those who prefer serenity over thrill-packed adventure. Embark on a peaceful desert safari experience, enjoy a traditional Arabian welcome at the desert campsite, participate in cultural activities including camel riding, henna art, falconry, and shisha smoking, experience live Arabian entertainment shows, and treat your taste buds to a lavish buffet dinner with delicious BBQ specialties.",
		short_description: 'Peaceful desert dinner with Bedouin culture, camel rides & live entertainment',
		price: 250.0,
		compare_at_price: null,
		currency: 'AED',
		offer_label: null,
		category: 'Desert Safari Tours',
		city: 'Ras Al Khaimah',
		base_url: 'https://www.raynatours.com/ras-al-khaimah/desert-safari-tours/dinner-in-desert-ras-al-khaimah-e-5043',
		image_urls: [
			'https://d2cazmkfw8kdtj.cloudfront.net/Tour-Images/Final/Dinner-in-Desert-Ras-Al-Khaimah-5043/1759998604498_3_2.jpg',
			'https://d2cazmkfw8kdtj.cloudfront.net/Tour-Images/Final/Dinner-in-Desert-Ras-Al-Khaimah-5043/1759998331422_3_2.jpg',
			'https://d2cazmkfw8kdtj.cloudfront.net/Tour-Images/Final/Dinner-in-Desert-Ras-Al-Khaimah-5043/1759998531837_3_2.jpg',
			'https://d2cazmkfw8kdtj.cloudfront.net/Tour-Images/Final/Dinner-in-Desert-Ras-Al-Khaimah-5043/1759999004115_3_2.jpg',
		],
		highlights: [
			'Embark on a peaceful desert safari experience in Ras Al Khaimah, perfect for guests looking for a relaxed adventure without dune bashing',
			'Enjoy a traditional Arabian welcome at the desert campsite set amid striking desert landscapes',
			'Participate in cultural activities including camel riding, henna art, falconry, and shisha smoking',
			'Experience live Arabian entertainment shows, such as belly dance and Tanura performances',
			'Treat your taste buds to a lavish buffet dinner with delicious BBQ specialties and complimentary refreshments',
		],
		meta: { duration: 'Approx 5:30 PM – 9:00 PM', pickup: true, meals: 'BBQ buffet dinner & soft drinks', group_size: 'Shared', rating: '5', reviews: 33 },
	},

	// ─── 26. Universal Studios Singapore ─────────────────────
	{
		name: 'Universal Studios Singapore',
		description:
			'Your vacation remains incomplete without some entertainment and adventure, and the Singapore Universal Studio offers both. Based on the Hollywood theme, the Universal Studios is located in the Sentosa Island and makes the world of movies a reality! Gain smooth access to the first movie-inspired theme park in Southeast Asia. Immerse yourself in a magical world of movies as you explore its exciting zones.',
		short_description: "Southeast Asia's first movie theme park — 7 zones on Sentosa Island",
		price: 235.0,
		compare_at_price: null,
		currency: 'SGD',
		offer_label: null,
		category: 'Theme Parks',
		city: 'Singapore',
		base_url: 'https://www.raynatours.com/singapore/theme-parks/universal-studios-singapore-e-4686',
		image_urls: [
			'https://d2cazmkfw8kdtj.cloudfront.net/Tour-Images/Final/Universal-Studios-Singapore-4686/1760778918864_3_2.jpg',
			'https://d2cazmkfw8kdtj.cloudfront.net/Tour-Images/Final/Universal-Studios-Singapore-4686/1760778732701_3_2.jpg',
			'https://d2cazmkfw8kdtj.cloudfront.net/Tour-Images/Final/Universal-Studios-Singapore-4686/1760778818130_3_2.jpg',
			'https://d2cazmkfw8kdtj.cloudfront.net/Tour-Images/Final/Universal-Studios-Singapore-4686/1760779002645_3_2.jpg',
		],
		highlights: [
			'Gain smooth access to the first movie-inspired theme park in Southeast Asia',
			'Immerse yourself in a magical world of movies as you explore its exciting zones',
			'Pulse-racing roller coasters, fantastical rides, classic carousels and 4D Shrek show',
			'Walk into a world of movie magic — Ancient Egypt, the Lost World, Madagascar and more',
			'Flexibility to include convenient shared or private transfers',
		],
		meta: { duration: '10:00 AM to 8:00 PM', pickup: false, meals: null, group_size: 'Individual' },
	},

	// ─── 27. Gardens by the Bay (Singapore) ──────────────────
	{
		name: 'Gardens by the Bay',
		description:
			"Smooth entry into one of the world's most futuristic nature parks. Marvel at hundreds of thousands of plants and flowers as you discover its three diverse gardens. Experience the most exquisite in gardening and horticulture, thanks to its three bio-controlled conservatories. Witness the stunning Supertree Grove with 10 plus enormous man-made trees. Get the most incredible views over the garden and beyond with a walk across its 128-meter-long aerial walkway.",
		short_description: "World's most futuristic nature park — Supertrees, Cloud Forest & Flower Dome",
		price: 40.0,
		compare_at_price: 69.0,
		currency: 'SGD',
		offer_label: 'Save 42%',
		category: 'Nature and Wildlife',
		city: 'Singapore',
		base_url: 'https://www.raynatours.com/singapore/nature-and-wildlife/gardens-by-the-bay-e-4684',
		image_urls: [
			'https://d2cazmkfw8kdtj.cloudfront.net/Tour-Images/Final/Gardens-by-the-Bay-4684/1760687052897_3_2.jpg',
			'https://d2cazmkfw8kdtj.cloudfront.net/Tour-Images/Final/Gardens-by-the-Bay-4684/1760687160868_3_2.jpg',
			'https://d2cazmkfw8kdtj.cloudfront.net/Tour-Images/Final/Gardens-by-the-Bay-4684/1760687260080_3_2.jpg',
			'https://d2cazmkfw8kdtj.cloudfront.net/Tour-Images/Final/Gardens-by-the-Bay-4684/1760687353299_3_2.jpg',
		],
		highlights: [
			"Smooth entry into one of the world's most futuristic nature parks",
			'Marvel at hundreds of thousands of plants and flowers across three diverse gardens',
			'Three bio-controlled conservatories for the most exquisite horticulture',
			'Witness the stunning Supertree Grove with 10 plus enormous man-made trees',
			'Walk across the 128-meter-long aerial walkway for incredible views',
		],
		meta: { duration: 'All days 9:00 AM to 9:00 PM', pickup: false, meals: null, group_size: 'Individual' },
	},

	// ─── 28. Marina Bay Sands Sky Park (Singapore) ───────────
	{
		name: 'Marina Bay Sands Sky Park',
		description:
			"Marina Bay Sands is an unrivaled fitting in Singapore's cityscape, and what makes this world-class integrated resort absolutely super stunning is its approximately 340 meters long SkyPark. Gain an exclusive entry into the world's longest public cantilever which is perched above Marina Bay Sands' three sky-high towers. Immerse yourself in the finest city skyline views comprising Marina Bay, Gardens by the Bay and Supertree Grove.",
		short_description: "World's longest public cantilever — stunning Singapore skyline views from SkyPark",
		price: 100.81,
		compare_at_price: null,
		currency: 'AED',
		offer_label: null,
		category: 'City Tours',
		city: 'Singapore',
		base_url: 'https://www.raynatours.com/singapore/city-tours/marina-bay-sands-sky-park-e-5354',
		image_urls: [
			'https://d2cazmkfw8kdtj.cloudfront.net/Tour-Images/Final/Marina-Bay-Sands-Sky-Park-5354/1760695468917_3_2.jpg',
			'https://d2cazmkfw8kdtj.cloudfront.net/Tour-Images/Final/Marina-Bay-Sands-Sky-Park-5354/1760694973951_3_2.jpg',
			'https://d2cazmkfw8kdtj.cloudfront.net/Tour-Images/Final/Marina-Bay-Sands-Sky-Park-5354/1760695092860_3_2.jpg',
			'https://d2cazmkfw8kdtj.cloudfront.net/Tour-Images/Final/Marina-Bay-Sands-Sky-Park-5354/1760695141303_3_2.jpg',
		],
		highlights: [
			"Gain an exclusive entry into the world's longest public cantilever perched above Marina Bay Sands' three sky-high towers",
			'Immerse yourself in the finest city skyline views comprising Marina Bay, Gardens by the Bay and Supertree Grove',
			'Take a look at its massive infinity pool and refresh yourself with the cool greenery',
		],
		meta: { duration: '11:00 AM to 4:00 PM', pickup: false, meals: null, group_size: 'Individual' },
	},
]

export const seedProducts = async (): Promise<void> => {
	try {
		const existingCount = await Product.count()

		if (existingCount > 0) {
			logger.info(`[Seed] Skipping product seed — ${existingCount} products already exist`)
			return
		}

		const BATCH_SIZE = 10
		let seeded = 0

		for (let i = 0; i < RAYNA_PRODUCTS.length; i += BATCH_SIZE) {
			const batch = RAYNA_PRODUCTS.slice(i, i + BATCH_SIZE)
			await Product.bulkCreate(batch)
			seeded += batch.length
			logger.info(`[Seed] Batch ${Math.ceil((i + 1) / BATCH_SIZE)} — seeded ${seeded}/${RAYNA_PRODUCTS.length} products`)
		}

		logger.info(`[Seed] Completed seeding ${RAYNA_PRODUCTS.length} Rayna Tours products`)
	} catch (error) {
		logger.error('[Seed] Failed to seed products:', error)
	}
}

export const reseedProducts = async (): Promise<void> => {
	try {
		await Product.destroy({ where: {}, force: true })
		logger.info('[Seed] Cleared existing products')

		const BATCH_SIZE = 10
		let seeded = 0

		for (let i = 0; i < RAYNA_PRODUCTS.length; i += BATCH_SIZE) {
			const batch = RAYNA_PRODUCTS.slice(i, i + BATCH_SIZE)
			await Product.bulkCreate(batch)
			seeded += batch.length
			logger.info(`[Seed] Batch ${Math.ceil((i + 1) / BATCH_SIZE)} — seeded ${seeded}/${RAYNA_PRODUCTS.length} products`)
		}

		logger.info(`[Seed] Re-seeded ${RAYNA_PRODUCTS.length} Rayna Tours products`)
	} catch (error) {
		logger.error('[Seed] Failed to re-seed products:', error)
	}
}
