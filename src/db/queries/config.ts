import { eq } from "drizzle-orm";
import { db } from "../index.js";
import { 
  agentConfig, 
  users, 
  insertAgentConfigSchema, 
  selectAgentConfigSchema,
  insertUserSchema,
  selectUserSchema
} from "../schema.js";
import { safeQuery, type Result } from "../result.js";
import type { AgentConfig, InsertAgentConfig, User, InsertUser } from "../schema.js";

/**
 * Get agent configuration by ID
 */
export function getAgentConfig(agentId: string): Promise<Result<AgentConfig | undefined>> {
  return safeQuery(async () => {
    const result = await db
      .select()
      .from(agentConfig)
      .where(eq(agentConfig.id, agentId))
      .limit(1);
    
    if (result.length === 0) {
      return undefined;
    }
    
    // Validate result with Zod schema
    return selectAgentConfigSchema.parse(result[0]);
  });
}

/**
 * Insert or update agent configuration
 */
export function upsertAgentConfig(data: InsertAgentConfig): Promise<Result<AgentConfig>> {
  return safeQuery(async () => {
    // Validate input with Zod schema
    const validatedData = insertAgentConfigSchema.parse(data);
    
    const result = await db
      .insert(agentConfig)
      .values(validatedData)
      .onConflictDoUpdate({
        target: agentConfig.id,
        set: {
          ...validatedData,
          updatedAt: Date.now()
        }
      })
      .returning();
    
    // Validate result with Zod schema
    return selectAgentConfigSchema.parse(result[0]);
  });
}

/**
 * Get user by ID
 */
export function getUser(userId: string): Promise<Result<User | undefined>> {
  return safeQuery(async () => {
    const result = await db
      .select()
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);
    
    if (result.length === 0) {
      return undefined;
    }
    
    // Validate result with Zod schema
    return selectUserSchema.parse(result[0]);
  });
}

/**
 * Insert or update user
 */
export function upsertUser(data: InsertUser): Promise<Result<User>> {
  return safeQuery(async () => {
    // Validate input with Zod schema
    const validatedData = insertUserSchema.parse(data);
    
    const result = await db
      .insert(users)
      .values(validatedData)
      .onConflictDoUpdate({
        target: users.id,
        set: validatedData
      })
      .returning();
    
    // Validate result with Zod schema
    return selectUserSchema.parse(result[0]);
  });
}