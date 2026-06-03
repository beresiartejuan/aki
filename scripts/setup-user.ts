#!/usr/bin/env tsx
/**
 * Script para inicializar/cambiar credenciales de usuario
 * Uso: npx tsx scripts/setup-user.ts
 */

import bcrypt from 'bcryptjs';
import { db } from '../src/db/index';
import { users } from '../src/db/schema';
import { eq } from 'drizzle-orm';

const SALT_ROUNDS = 12;

async function setupUser() {
  const args = process.argv.slice(2);
  
  if (args.length < 2) {
    console.log('Uso: npx tsx scripts/setup-user.ts <username> <password>');
    console.log('Ejemplo: npx tsx scripts/setup-user.ts admin MiPassword123');
    process.exit(1);
  }

  const [username, password] = args;

  if (password.length < 6) {
    console.error('Error: La contraseña debe tener al menos 6 caracteres');
    process.exit(1);
  }

  try {
    // Hash password
    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

    // Check if user already exists
    const existingUser = await db.select().from(users).where(eq(users.username, username)).limit(1);

    if (existingUser.length > 0) {
      // Update existing user
      await db
        .update(users)
        .set({
          passwordHash,
          name: username,
        })
        .where(eq(users.id, existingUser[0].id));
      
      console.log(`✓ Contraseña actualizada para usuario: ${username}`);
    } else {
      // Create new user
      await db.insert(users).values({
        username,
        passwordHash,
        name: username,
        plan: 'free',
      });
      
      console.log(`✓ Usuario creado: ${username}`);
    }

    console.log('Credenciales guardadas correctamente.');
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

setupUser();
