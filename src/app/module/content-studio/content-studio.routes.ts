import { Router } from 'express'
import ContentStudioController from './content-studio.controller'

const controller = new ContentStudioController()
const contentStudioRouter = Router()

// Content Plans
contentStudioRouter.post('/plans/generate', controller.generatePlan)
contentStudioRouter.post('/plans/quick-create', controller.quickCreatePlan)
contentStudioRouter.get('/plans/by-date', controller.findPlansByDate)
contentStudioRouter.get('/plans', controller.findAllPlans)
contentStudioRouter.get('/plans/:id', controller.getPlan)
contentStudioRouter.patch('/plans/:id', controller.updatePlan)
contentStudioRouter.delete('/plans/:id', controller.deletePlan)

// Plan Approval Workflow
contentStudioRouter.post('/plans/:id/submit-review', controller.submitForReview)
contentStudioRouter.post('/plans/:id/approve', controller.approvePlan)
contentStudioRouter.post('/plans/:id/reject', controller.rejectPlan)

// Calendar Entries
contentStudioRouter.get('/calendar', controller.getCalendar)
contentStudioRouter.post('/entries', controller.createEntry)
contentStudioRouter.patch('/entries/:id', controller.updateEntry)
contentStudioRouter.delete('/entries/:id', controller.deleteEntry)
contentStudioRouter.post('/entries/bulk-update', controller.bulkUpdateEntries)
contentStudioRouter.post('/entries/:id/link-post', controller.linkToPost)

export { contentStudioRouter }
