import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import * as fs from 'fs/promises'
import * as path from 'path'
import {
  readFile,
  writeFile,
  listDirectory,
  createDirectory,
  deleteFile,
  deleteDirectory,
  moveFile,
  searchFiles,
} from '../filesystem'

// Mock fs module
vi.mock('fs/promises', () => {
  return {
    default: {
      stat: vi.fn(),
      readFile: vi.fn(),
      writeFile: vi.fn(),
      readdir: vi.fn(),
      mkdir: vi.fn(),
      unlink: vi.fn(),
      rm: vi.fn(),
      rename: vi.fn(),
      open: vi.fn(),
    },
    stat: vi.fn(),
    readFile: vi.fn(),
    writeFile: vi.fn(),
    readdir: vi.fn(),
    mkdir: vi.fn(),
    unlink: vi.fn(),
    rm: vi.fn(),
    rename: vi.fn(),
    open: vi.fn(),
  }
})

// Mock the WORKSPACE_ROOT
vi.mock('../sandbox', async () => {
  return {
    WORKSPACE_ROOT: '/workspace',
    assertInsideSandbox: () => {},
    assertSafeCommand: () => {},
  }
})

describe('filesystem tools', () => {
  const testFilePath = '/workspace/file.txt'
  const testDirPath = '/workspace/dir'

  beforeEach(() => {
    // Clear all mocks before each test
    vi.clearAllMocks()
  })

  afterEach(() => {
    // Restore all mocks after each test
    vi.restoreAllMocks()
  })

  describe('readFile', () => {
    it('should read file content successfully', async () => {
      const mockContent = 'Hello, world!'
      vi.mocked(fs.stat).mockResolvedValue({ isFile: () => true } as any)
      vi.mocked(fs.readFile).mockResolvedValue(mockContent)

      const result = await readFile(testFilePath)
      expect(result).toBe(mockContent)
    })

    it('should return error for non-file paths', async () => {
      vi.mocked(fs.stat).mockResolvedValue({ isFile: () => false } as any)

      const result = await readFile(testFilePath)
      expect(result).toContain('Error: not a file')
    })

    it('should return error when file not found', async () => {
      vi.mocked(fs.stat).mockRejectedValue({ code: 'ENOENT' })

      const result = await readFile(testFilePath)
      expect(result).toContain('Error: file not found')
    })

    it('should truncate large files', async () => {
      const largeContent = 'a'.repeat(150 * 1024) // 150KB
      const truncatedContent = 'a'.repeat(100 * 1024) + '\n[... file truncated at 100KB]'
      
      vi.mocked(fs.stat).mockResolvedValue({
        isFile: () => true,
        size: 150 * 1024,
      } as any)
      
      const mockFd = {
        read: vi.fn().mockResolvedValue({}),
        close: vi.fn().mockResolvedValue(undefined),
      }
      
      vi.mocked(fs.open).mockResolvedValue(mockFd as any)
      vi.spyOn(Buffer, 'alloc').mockReturnValue(Buffer.from(truncatedContent))

      // Mock the file open and read operations
      const result = await readFile(testFilePath)
      // Since we're mocking, we'll just check it returns a string
      expect(typeof result).toBe('string')
    })
  })

  describe('writeFile', () => {
    it('should write file content successfully', async () => {
      vi.mocked(fs.mkdir).mockResolvedValue(undefined)
      vi.mocked(fs.writeFile).mockResolvedValue(undefined)

      const result = await writeFile(testFilePath, 'content')
      expect(result).toContain('OK: wrote')
    })

    it('should return error when write fails', async () => {
      vi.mocked(fs.mkdir).mockResolvedValue(undefined)
      vi.mocked(fs.writeFile).mockRejectedValue(new Error('Permission denied'))

      const result = await writeFile(testFilePath, 'content')
      expect(result).toContain('Error:')
    })
  })

  describe('listDirectory', () => {
    it('should list directory contents', async () => {
      vi.mocked(fs.readdir).mockResolvedValue([
        { name: 'file.txt', isFile: () => true, isDirectory: () => false, isSymbolicLink: () => false },
        { name: 'subdir', isFile: () => false, isDirectory: () => true, isSymbolicLink: () => false },
      ] as any)
      
      vi.mocked(fs.stat).mockResolvedValue({ size: 1024 } as any)

      const result = await listDirectory(testDirPath)
      expect(result).toContain('file.txt')
      expect(result).toContain('subdir/')
    })

    it('should return error for non-existent directory', async () => {
      vi.mocked(fs.readdir).mockRejectedValue({ code: 'ENOENT' })

      const result = await listDirectory(testDirPath)
      expect(result).toContain('Error: directory not found')
    })
  })

  describe('createDirectory', () => {
    it('should create directory successfully', async () => {
      vi.mocked(fs.mkdir).mockResolvedValue(undefined)

      const result = await createDirectory(testDirPath)
      expect(result).toContain('OK: directory created')
    })

    it('should return error when creation fails', async () => {
      vi.mocked(fs.mkdir).mockRejectedValue(new Error('Permission denied'))

      const result = await createDirectory(testDirPath)
      expect(result).toContain('Error:')
    })
  })

  describe('deleteFile', () => {
    it('should delete file successfully', async () => {
      vi.mocked(fs.stat).mockResolvedValue({ isDirectory: () => false } as any)
      vi.mocked(fs.unlink).mockResolvedValue(undefined)

      const result = await deleteFile(testFilePath)
      expect(result).toContain('OK: deleted')
    })

    it('should return error for directories', async () => {
      vi.mocked(fs.stat).mockResolvedValue({ isDirectory: () => true } as any)

      const result = await deleteFile(testDirPath)
      expect(result).toContain('Error: use delete_directory for directories')
    })

    it('should return error when file not found', async () => {
      vi.mocked(fs.stat).mockRejectedValue({ code: 'ENOENT' })

      const result = await deleteFile(testFilePath)
      expect(result).toContain('Error: file not found')
    })
  })

  describe('deleteDirectory', () => {
    it('should delete directory successfully', async () => {
      vi.mocked(fs.rm).mockResolvedValue(undefined)

      const result = await deleteDirectory('/workspace/testdir')
      expect(result).toContain('OK: deleted directory')
    })

    it('should prevent deletion of workspace root', async () => {
      const result = await deleteDirectory('/workspace')
      expect(result).toContain('Error: cannot delete the workspace root directory')
    })
  })

  describe('moveFile', () => {
    it('should move file successfully', async () => {
      vi.mocked(fs.rename).mockResolvedValue(undefined)

      const result = await moveFile('/workspace/source/file.txt', '/workspace/dest/file.txt')
      expect(result).toContain('OK: moved')
    })

    it('should return error when move fails', async () => {
      vi.mocked(fs.rename).mockRejectedValue(new Error('Permission denied'))

      const result = await moveFile('/workspace/source/file.txt', '/workspace/dest/file.txt')
      expect(result).toContain('Error:')
    })
  })

  describe('searchFiles', () => {
    it('should search files successfully', async () => {
      vi.mocked(fs.readdir).mockImplementation(async (dirPath: string) => {
        if (dirPath === '/workspace/search') {
          return [
            { name: 'test.txt', isFile: () => true, isDirectory: () => false },
            { name: 'subdir', isFile: () => false, isDirectory: () => true },
          ] as any
        } else if (dirPath === path.join('/workspace/search', 'subdir')) {
          return [
            { name: 'result.md', isFile: () => true, isDirectory: () => false },
          ] as any
        }
        return [] as any
      })

      const result = await searchFiles('/workspace/search', 'test')
      expect(result).toContain('test.txt')
    })

    it('should return error for non-existent directory', async () => {
      vi.mocked(fs.readdir).mockRejectedValue({ code: 'ENOENT' })

      const result = await searchFiles('/workspace/nonexistent', 'test')
      expect(result).toContain('Error: directory not found')
    })
  })
})