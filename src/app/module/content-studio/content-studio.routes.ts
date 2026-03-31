import { Router } from 'express'
import ContentStudioController from './content-studio.controller'

const controller = new ContentStudioController()
const contentStudioRouter = Router()

// Jobs
contentStudioRouter.get('/jobs/:jobId', controller.getJobStatus)

// Content Plans
contentStudioRouter.post('/plans/generate', controller.generatePlan)
contentStudioRouter.post('/plans/quick-create', controller.quickCreatePlan)
contentStudioRouter.get('/plans/by-date', controller.findPlansByDate)
contentStudioRouter.get('/plans', controller.findAllPlans)
contentStudioRouter.get('/plans/:id', controller.getPlan)
contentStudioRouter.patch('/plans/:id', controller.updatePlan)
contentStudioRouter.delete('/plans/:id', controller.deletePlan)

// Generate entries into existing plan
contentStudioRouter.post('/plans/:id/generate-entries', controller.generateEntries)

// Plan Approval Workflow
contentStudioRouter.post('/plans/:id/submit-review', controller.submitForReview)
contentStudioRouter.post('/plans/:id/approve', controller.approvePlan)
contentStudioRouter.post('/plans/:id/reject', controller.rejectPlan)

// Review Queue
contentStudioRouter.get('/review-queue', controller.getReviewQueue)

// Scheduling
contentStudioRouter.get('/suggested-times', controller.getSuggestedTimes)

// Post Composer — compose entry into post, generate content, preview
contentStudioRouter.post('/entries/:id/compose', controller.composeEntry)
contentStudioRouter.post('/entries/:id/generate-content', controller.generatePostContent)
contentStudioRouter.get('/posts/:id/preview', controller.previewPost)

// Calendar Entries
contentStudioRouter.get('/calendar', controller.getCalendar)
contentStudioRouter.post('/entries', controller.createEntry)
contentStudioRouter.patch('/entries/:id', controller.updateEntry)
contentStudioRouter.delete('/entries/:id', controller.deleteEntry)

export { contentStudioRouter }
