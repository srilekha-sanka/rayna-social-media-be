import { Router } from 'express'
import CampaignController from './campaign.controller'

const campaignController = new CampaignController()
const campaignRouter = Router()

campaignRouter.post('/', campaignController.create)
campaignRouter.get('/', campaignController.findAll)
campaignRouter.get('/:id', campaignController.findById)
campaignRouter.patch('/:id', campaignController.update)
campaignRouter.delete('/:id', campaignController.delete)

export { campaignRouter }
