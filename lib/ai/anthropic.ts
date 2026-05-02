import Anthropic from '@anthropic-ai/sdk'

// Handle missing API key during build time to prevent build failures
const apiKey = process.env.ANTHROPIC_API_KEY || 'sk-ant-dummy-key-for-build-purposes-only'

export const anthropic = new Anthropic({
  apiKey,
})
