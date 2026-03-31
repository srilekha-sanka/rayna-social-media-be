import cron from 'node-cron'
import { Op } from 'sequelize'
import Post from '../module/post/post.model'
import CalendarEntry from '../module/content-studio/calendar-entry.model'
import { instagramService } from '../module/instagram/instagram.service'
import { logger } from '../common/logger/logging'

class PostScheduler {
	start() {
		// Run every minute to check for posts that need publishing
		cron.schedule('* * * * *', async () => {
			try {
				const now = new Date()

				const posts = await Post.findAll({
					where: {
						status: 'SCHEDULED',
						is_active: true,
						scheduled_at: { [Op.lte]: now },
					},
				})

				if (!posts.length) return

				logger.info(`[Scheduler] Found ${posts.length} post(s) ready to publish`)

				for (const post of posts) {
					try {
						await post.update({ status: 'PUBLISHING' })

						const platforms = post.platforms || []

						if (platforms.includes('instagram')) {
							await instagramService.publishPost(post.id, post.author_id)
						} else {
							await post.update({ status: 'PUBLISHED', published_at: new Date() })
						}

						if (post.calendar_entry_id) {
							await CalendarEntry.update({ status: 'PUBLISHED' }, { where: { id: post.calendar_entry_id } })
						}

						logger.info(`[Scheduler] Published post ${post.id} on ${platforms.join(', ')}`)
					} catch (err: any) {
						logger.error(`[Scheduler] Failed to publish post ${post.id}: ${err.message}`)
						await post.update({ status: 'FAILED' })
					}
				}
			} catch (err: any) {
				logger.error(`[Scheduler] Error in publish cron: ${err.message}`)
			}
		})

		logger.info('[Scheduler] Post auto-publish scheduler started (runs every minute)')
	}
}

export const postScheduler = new PostScheduler()
