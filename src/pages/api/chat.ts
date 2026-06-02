import type { APIRoute } from 'astro'
import { z } from 'zod'
import { getChatById } from '../../db/queries/chats'
import { runAgentTurn } from '../../lib/agent'

export const prerender = false

// Request body schema
const chatRequestSchema = z.object({
  chatId: z.string(),
  message: z.string(),
  thinking: z.boolean().optional()
})

export const POST: APIRoute = async ({ request }) => {
  try {
    // 1. Parse and validate body with Zod
    const body = await request.json()
    const parsedBody = chatRequestSchema.safeParse(body)
    
    if (!parsedBody.success) {
      return new Response(
        JSON.stringify({
          error: 'Invalid request',
          issues: parsedBody.error.issues
        }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        }
      )
    }
    
    const { chatId, message, thinking } = parsedBody.data

    // 2. Verify the chat exists
    const chatResult = await getChatById(chatId)
    if (!chatResult.ok) {
      return new Response(
        JSON.stringify({ error: 'Database error', detail: chatResult.error.message }),
        {
          status: 500,
          headers: { 'Content-Type': 'application/json' }
        }
      )
    }
    
    if (!chatResult.data) {
      return new Response(
        JSON.stringify({ error: 'Chat not found' }),
        {
          status: 404,
          headers: { 'Content-Type': 'application/json' }
        }
      )
    }

    // 3. Call runAgentTurn
    const result = await runAgentTurn(chatId, message, thinking ?? false)
    
    // 4. Handle result
    if (!result.ok) {
      return new Response(
        JSON.stringify({
          error: 'Agent error',
          detail: result.error.message
        }),
        {
          status: 500,
          headers: { 'Content-Type': 'application/json' }
        }
      )
    }

    // 5. Return success response
    return new Response(
      JSON.stringify({
        content: result.data.content,
        thinking: result.data.thinking
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      }
    )
  } catch (error) {
    return new Response(
      JSON.stringify({
        error: 'Internal server error',
        detail: error instanceof Error ? error.message : 'Unknown error'
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    )
  }
}