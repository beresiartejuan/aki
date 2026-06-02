import type { APIRoute } from 'astro'
import { getAllChats } from '../../../db/queries/chats'

export const prerender = false

const DEFAULT_USER_ID = 'default-user'

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