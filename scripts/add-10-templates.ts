import dotenv from 'dotenv'
dotenv.config()
import dbConnSeq from '../src/db/config/database.config'
import DesignTemplate from '../src/app/module/content-studio/design-template.model'

async function run() {
    try {
        await dbConnSeq.authenticate()
        console.log('DB connected.')

        // Clear existing templates for a clean slate
        await DesignTemplate.destroy({ where: {}, force: true })
        console.log('Cleared existing templates.')

        const baseTemplates = [
            {
                name: 'Heritage & Culture',
                slug: 'heritage',
                description: 'Cinematic cultural layout with calligraphy headline, serif title, and split bottom layout.',
                prompt_config: {
                    design_prompt: 'Cinematic masterpiece of {{headline}}, heritage architecture, golden hour lighting, deep shadows, rich textures, 8k resolution, photorealistic, premium travel aesthetics, stunning composition.',
                    dynamic_fields: ['headline', 'subheadline', 'tagline', 'price', 'includes', 'dates', 'brand_name'],
                },
            },
            {
                name: 'Lifestyle & Editorial',
                slug: 'lifestyle',
                description: 'Clean, airy editorial style for wellness, relaxation, and modern living.',
                prompt_config: {
                    design_prompt: 'High-end editorial lifestyle photography of {{headline}}, soft natural lighting, minimalist luxury, aspirational travel, clean composition, pastel tones, 8k, masterpiece.',
                    dynamic_fields: ['headline', 'tagline', 'subheadline', 'price', 'includes', 'brand_name'],
                },
            },
            {
                name: 'Bold Adventure',
                slug: 'adventure',
                description: 'Rugged, high-impact adventure layout with bold typography.',
                prompt_config: {
                    design_prompt: 'Epic adventure photography of {{headline}}, extreme perspective, dramatic lighting, vivid colors, high contrast, National Geographic style, super detailed, 8k resolution.',
                    dynamic_fields: ['headline', 'subheadline', 'price', 'includes', 'dates', 'brand_name'],
                },
            },
            {
                name: 'Minimalist Explorer',
                slug: 'explorer',
                description: 'Sans-serif focus with cinematic imagery.',
                prompt_config: {
                    design_prompt: 'Vast, minimalist cinematic landscape of {{headline}}, center-balanced composition, epic scale, 8k, highly detailed, serene and powerful.',
                    dynamic_fields: ['headline', 'subheadline', 'price', 'includes', 'brand_name'],
                },
            },
            {
                name: 'Luxury & Escape',
                slug: 'luxury',
                description: 'Ultra-luxury travel flyer with elegant script and gold tones.',
                prompt_config: {
                    design_prompt: 'Ultra-luxury five-star experience at {{headline}}, golden reflections, crystal clear water, 8k resolution, sharp focus, expensive atmosphere, masterpiece.',
                    dynamic_fields: ['headline', 'subheadline', 'tagline', 'price', 'brand_name'],
                },
            },
            {
                name: 'Flash Sale (Promo)',
                slug: 'promo',
                description: 'High urgency marketing layout.',
                prompt_config: {
                    design_prompt: 'Vibrant, high-energy travel background for {{headline}}, celebratory vibe, bright lighting, 8k, sharp and punchy colors.',
                    dynamic_fields: ['headline', 'subheadline', 'price', 'promo_code', 'brand_name'],
                },
            },
            {
                name: 'Nature & Wildlife',
                slug: 'nature',
                description: 'Organic, earthy layout for animals.',
                prompt_config: {
                    design_prompt: 'Majestic wildlife portrait of animals in {{headline}}, natural habitat, soft bokeh background, masterpiece wildlife photography, 8k, highly textured.',
                    dynamic_fields: ['headline', 'subheadline', 'dates', 'price', 'brand_name'],
                },
            },
            {
                name: 'Food & Culinary',
                slug: 'culinary',
                description: 'Bold culinary aesthetic.',
                prompt_config: {
                    design_prompt: 'Exquisite close-up of gourmet food at {{headline}}, steam rising, rich colors, shallow depth of field, 8k, mouth-watering detail.',
                    dynamic_fields: ['headline', 'tagline', 'price', 'location', 'brand_name'],
                },
            },
            {
                name: 'City & Skyline',
                slug: 'city',
                description: 'Urban, neon-chic layout.',
                prompt_config: {
                    design_prompt: 'Dazzling city skyline of {{headline}} at night, neon lights reflections, urban energy, 8k resolution, razor sharp architecture.',
                    dynamic_fields: ['headline', 'subheadline', 'price', 'includes', 'brand_name'],
                },
            },
            {
                name: 'Family Fun',
                slug: 'family',
                description: 'Playful and warm family layout.',
                prompt_config: {
                    design_prompt: 'Joyful family vacation at {{headline}}, splashing water, authentic laughter, sunny day, clear blue sky, vibrant happy colors, 8k.',
                    dynamic_fields: ['headline', 'subheadline', 'includes', 'contact', 'brand_name'],
                },
            },
            {
                name: 'Master Collage',
                slug: 'collage',
                description: 'Dynamic Polaroid-style collage with 4 distinct images and premium branding.',
                prompt_config: {
                    design_prompt: 'Professional National Geographic level travel photography of {{headline}}. High contrast, vibrant colors, stunning cinematic lighting, 8k resolution, photorealistic masterpiece, award-winning composition.',
                    dynamic_fields: ['headline', 'subheadline', 'price', 'promo_code', 'dates', 'includes', 'brand_name'],
                },
            }
        ]

        const finalTemplates: any[] = []
        let order = 1
        for (const t of baseTemplates) {
            finalTemplates.push({
                ...t,
                slug: t.slug + '-img',
                media_type: 'image',
                sort_order: order++,
                is_active: true
            })
            finalTemplates.push({
                ...t,
                name: t.name + ' (Reel)',
                slug: t.slug + '-vid',
                media_type: 'video',
                sort_order: order++,
                is_active: true
            })
        }

        await DesignTemplate.bulkCreate(finalTemplates)
        console.log(`Successfully added ${finalTemplates.length} templates.`)
        process.exit(0)
    } catch (error) {
        console.error('Error seeding templates:', error)
        process.exit(1)
    }
}

run()
