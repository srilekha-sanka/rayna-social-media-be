/**
 * Migration: Outstand → PostForMe
 *
 * Run with: npx ts-node scripts/migrate-outstand-to-postforme.ts
 *
 * This script:
 * 1. Renames social_accounts.outstand_account_id → postforme_account_id
 * 2. Adds posts.postforme_post_id column
 * 3. Removes Instagram-specific env references (INSTAGRAM_APP_ID, INSTAGRAM_APP_SECRET)
 */

import sequelize from '../src/db/config/database.config'

async function migrate() {
	const qi = sequelize.getQueryInterface()

	console.log('🔄 Starting Outstand → PostForMe migration...\n')

	// 1. Rename outstand_account_id → postforme_account_id on social_accounts
	try {
		await qi.renameColumn('social_accounts', 'outstand_account_id', 'postforme_account_id')
		console.log('✅ Renamed social_accounts.outstand_account_id → postforme_account_id')
	} catch (err: any) {
		if (err.message.includes('does not exist') || err.message.includes('already exists')) {
			console.log('⏭️  Column rename already applied (outstand_account_id → postforme_account_id)')
		} else {
			throw err
		}
	}

	// 2. Add postforme_post_id to posts table
	try {
		await qi.addColumn('posts', 'postforme_post_id', {
			type: 'VARCHAR(255)',
			allowNull: true,
		})
		console.log('✅ Added posts.postforme_post_id column')
	} catch (err: any) {
		if (err.message.includes('already exists')) {
			console.log('⏭️  Column posts.postforme_post_id already exists')
		} else {
			throw err
		}
	}

	console.log('\n✅ Migration complete!')
	process.exit(0)
}

migrate().catch((err) => {
	console.error('❌ Migration failed:', err)
	process.exit(1)
})
