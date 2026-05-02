import Anthropic from '@anthropic-ai/sdk'

// Lazy initialization to prevent build-time crashes
let _anthropic: Anthropic | null = null

export function getAnthropic() {
  if (!_anthropic) {
    const apiKey = process.env.ANTHROPIC_API_KEY || 'sk-ant-sid01-dummy-key-for-build'
    _anthropic = new Anthropic({
      apiKey,
    })
  }
  return _anthropic
}

// For backwards compatibility with existing imports
export const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY || 'sk-ant-sid01-dummy-key-for-build',
})
