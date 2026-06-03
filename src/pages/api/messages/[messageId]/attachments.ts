import type { APIRoute } from 'astro';
import fs from 'fs/promises';
import path from 'path';
import { createAttachment } from '../../../db/queries/attachments';
import { getMessageById } from '../../../db/queries/messages';

export const prerender = false;

const MAX_FILE_SIZE = 6 * 1024 * 1024; // 6MB
const UPLOAD_DIR = './uploads';

// Ensure upload directory exists
async function ensureUploadDir() {
  try {
    await fs.access(UPLOAD_DIR);
  } catch {
    await fs.mkdir(UPLOAD_DIR, { recursive: true });
  }
}

function getFileExtension(filename: string): string {
  return path.extname(filename).toLowerCase();
}

function generateUniqueFilename(originalName: string): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 10);
  const extension = getFileExtension(originalName);
  return `${timestamp}-${random}${extension}`;
}

export const POST: APIRoute = async ({ request, params }) => {
  try {
    const { messageId } = params;

    if (!messageId) {
      return new Response(JSON.stringify({ error: 'Message ID is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Verify message exists
    const messageResult = await getMessageById(messageId);

    if (!messageResult.ok || !messageResult.data) {
      return new Response(JSON.stringify({ error: 'Message not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const contentType = request.headers.get('content-type') || '';

    if (!contentType.includes('multipart/form-data')) {
      return new Response(JSON.stringify({ error: 'Content type must be multipart/form-data' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return new Response(JSON.stringify({ error: 'No file provided' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Check file size
    if (file.size > MAX_FILE_SIZE) {
      return new Response(JSON.stringify({ error: 'File size exceeds 6MB limit' }), {
        status: 413,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Generate unique filename
    const uniqueFilename = generateUniqueFilename(file.name);
    const filePath = path.join(UPLOAD_DIR, uniqueFilename);

    // Ensure upload directory exists
    await ensureUploadDir();

    // Save file
    const buffer = Buffer.from(await file.arrayBuffer());
    await fs.writeFile(filePath, buffer);

    // Create attachment record
    const attachmentResult = await createAttachment({
      messageId,
      filename: uniqueFilename,
      originalName: file.name,
      fileType: file.type || 'application/octet-stream',
      fileSize: file.size,
      filePath: filePath,
    });

    if (!attachmentResult.ok) {
      // Clean up file if DB insert fails
      await fs.unlink(filePath);
      throw attachmentResult.error;
    }

    return new Response(JSON.stringify(attachmentResult.data), {
      status: 201,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Upload error:', error);
    return new Response(
      JSON.stringify({
        error: 'Upload failed',
        detail: error instanceof Error ? error.message : 'Unknown error',
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
};
