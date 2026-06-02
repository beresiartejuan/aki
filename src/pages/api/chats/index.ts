import type { APIRoute } from 'astro'
import { getAllChats, createChat } from '../../../db/queries/chats'
import { DEFAULT_USER_ID, DEFAULT_AGENT_ID } from '../../../lib/constants'
import { randomUUID } from 'crypto'

export const prerender = false

export const GET: APIRoute = async () => {
  try {
    const result = await getAllChats(DEFAULT_USER_ID)
    
    if (!result.ok) {
      return new Response(
        JSON.stringify({ error: 'Database error', detail: result.error.message }),
        {
          status: 500,
          headers: { 'Content-Type': 'application/json' }
        }
      )
    }
    
    return new Response(
      JSON.stringify(result.data),
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

export const POST: APIRoute = async ({ request }) => {
  try {
    const body = await request.json().catch(() => ({}))
    const title = body?.title?.trim() || 'Nueva conversación'
    
    const result = await createChat({
      id: randomUUID(),
      userId: DEFAULT_USER_ID,
      agentConfigId: DEFAULT_AGENT_ID,
      title,
      createdAt: Date.now(),
      updatedAt: Date.now()
    })
    
    if (!result.ok) {
      return new Response(
        JSON.stringify({ error: 'Database error', detail: result.error.message }),
        {
          status: 500,
          headers: { 'Content-Type': 'application/json' }
        }
      )
    }
    
    return new Response(
      JSON.stringify(result.data),
      {
        status: 201,
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