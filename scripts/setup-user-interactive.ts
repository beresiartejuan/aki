#!/usr/bin/env tsx
/**
 * Script interactivo para crear el primer usuario
 * Uso: pnpm setup:user
 */

import bcrypt from 'bcryptjs';
import { db } from '../src/db/index';
import { users } from '../src/db/schema';
import { eq } from 'drizzle-orm';
import * as readline from 'readline';

const SALT_ROUNDS = 12;

function askQuestion(rl: readline.Interface, question: string): Promise<string> {
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      resolve(answer.trim());
    });
  });
}

function askPassword(rl: readline.Interface, question: string): Promise<string> {
  return new Promise((resolve) => {
    // Use stdin directly to avoid echoing
    process.stdout.write(question);
    const stdin = process.stdin;
    stdin.setRawMode(true);
    stdin.resume();
    stdin.setEncoding('utf8');

    let password = '';

    const onData = (char: string) => {
      char = char.toString();

      if (char === '\n' || char === '\r' || char === '\u0004') {
        stdin.setRawMode(false);
        stdin.pause();
        stdin.removeListener('data', onData);
        process.stdout.write('\n');
        resolve(password);
        return;
      }

      if (char === '\u0003') {
        // Ctrl+C
        process.stdout.write('\n');
        process.exit(0);
      }

      if (char === '\u007f') {
        // Backspace
        if (password.length > 0) {
          password = password.slice(0, -1);
          process.stdout.write('\b \b');
        }
      } else {
        password += char;
        process.stdout.write('*');
      }
    };

    stdin.on('data', onData);
  });
}

async function setupUser() {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  try {
    console.log('\n🔧 Configuración de Usuario - Aki Chat\n');

    // Get username
    const username = await askQuestion(rl, 'Nombre de usuario: ');
    
    if (!username) {
      console.error('❌ Error: El nombre de usuario es obligatorio');
      process.exit(1);
    }

    // Get name
    const name = await askQuestion(rl, 'Nombre completo: ');
    
    if (!name) {
      console.error('❌ Error: El nombre completo es obligatorio');
      process.exit(1);
    }

    // Get password
    const password = await askPassword(rl, 'Contraseña (mínimo 6 caracteres): ');
    
    if (password.length < 6) {
      console.error('❌ Error: La contraseña debe tener al menos 6 caracteres');
      process.exit(1);
    }

    // Confirm password
    const confirmPassword = await askPassword(rl, 'Confirmar contraseña: ');
    
    if (password !== confirmPassword) {
      console.error('❌ Error: Las contraseñas no coinciden');
      process.exit(1);
    }

    console.log('\n⏳ Creando usuario...');

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
          name,
        })
        .where(eq(users.id, existingUser[0].id));
      
      console.log(`✅ Contraseña actualizada para usuario: ${username}`);
    } else {
      // Create new user
      await db.insert(users).values({
        username,
        passwordHash,
        name,
        plan: 'free',
      });
      
      console.log(`✅ Usuario creado: ${username}`);
    }

    console.log('\n🎉 Configuración completada exitosamente.\n');
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Error:', error);
    process.exit(1);
  } finally {
    rl.close();
  }
}

setupUser();
