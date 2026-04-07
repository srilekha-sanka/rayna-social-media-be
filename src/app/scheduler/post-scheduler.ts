import cron from 'node-cron'
import { Op } from 'sequelize'
import Post from '../module/post/post.model'
import CalendarEntry from '../module/content-studio/calendar-entry.model'
import { postForMeService } from '../module/postforme/postforme.service'
import { logger } from '../common/logger/logging'

class PostScheduler {
	start() {
		// Check every 2 minutes for PostForMe post status updates
		cron.schedule('*/2 * * * *', async () => {
			try {
				// 1. Check PUBLISHING posts — poll PostForMe for final result
				const publishingPosts = await Post.findAll({
					where: {
						status: 'PUBLISHING',
						postforme_post_id: { [Op.ne]: null },
						is_active: true,
					},
				})

				for (const post of publishingPosts) {
					try {
						const pfmPost = await postForMeService.getPost(post.postforme_post_id!)

						if (pfmPost.status === 'processed') {
							await post.update({ status: 'PUBLISHED', published_at: new Date() })

							if (post.calendar_entry_id) {
								await CalendarEntry.update({ status: 'PUBLISHED' }, { where: { id: post.calendar_entry_id } })
							}

							logger.info(`[Scheduler] Post ${post.id} confirmed published via PostForMe`)
						}
					} catch (err: any) {
						logger.error(`[Scheduler] Failed to check post ${post.id}: ${err.message}`)
					}
				}

				// 2. Check SCHEDULED posts that have passed their scheduled_at
				//    but don't have a postforme_post_id (edge case: scheduled locally but not sent to PFM)
				const now = new Date()
				const missedPosts = await Post.findAll({
					where: {
						status: 'SCHEDULED',
						is_active: true,
						scheduled_at: { [Op.lte]: now },
						postforme_post_id: null,
					},
				})

				if (missedPosts.length) {
					logger.warn(`[Scheduler] Found ${missedPosts.length} missed scheduled post(s) without PostForMe ID`)

					for (const post of missedPosts) {
						await post.update({ status: 'FAILED' })
						logger.error(`[Scheduler] Marked post ${post.id} as FAILED — missing PostForMe post ID`)
					}
				}
			} catch (err: any) {
				logger.error(`[Scheduler] Error in publish cron: ${err.message}`)
			}
		})

		logger.info('[Scheduler] Post status monitor started (runs every 2 minutes)')
	}
}

export const postScheduler = new PostScheduler()
