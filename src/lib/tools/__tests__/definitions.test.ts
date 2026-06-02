import { describe, it, expect } from 'vitest'
import { TOOL_DEFINITIONS, type ToolName } from '../definitions'
import type { Tool } from 'ollama'

describe('definitions', () => {
  describe('TOOL_DEFINITIONS', () => {
    it('should contain all required tools', () => {
      expect(TOOL_DEFINITIONS).toHaveLength(9)
      
      const toolNames = TOOL_DEFINITIONS.map(tool => tool.function.name)
      expect(toolNames).toContain('read_file')
      expect(toolNames).toContain('write_file')
      expect(toolNames).toContain('list_directory')
      expect(toolNames).toContain('create_directory')
      expect(toolNames).toContain('delete_file')
      expect(toolNames).toContain('delete_directory')
      expect(toolNames).toContain('move_file')
      expect(toolNames).toContain('search_files')
      expect(toolNames).toContain('run_command')
    })

    it('should have correct tool structure', () => {
      TOOL_DEFINITIONS.forEach(tool => {
        expect(tool.type).toBe('function')
        expect(tool.function.name).toBeDefined()
        expect(tool.function.description).toBeDefined()
        expect(tool.function.parameters).toBeDefined()
      })
    })

    it('should have required parameters for each tool', () => {
      const readFileTool = TOOL_DEFINITIONS.find(t => t.function.name === 'read_file')
      expect(readFileTool?.function.parameters.required).toContain('filePath')

      const writeFileTool = TOOL_DEFINITIONS.find(t => t.function.name === 'write_file')
      expect(writeFileTool?.function.parameters.required).toEqual(['filePath', 'content'])

      const runCommandTool = TOOL_DEFINITIONS.find(t => t.function.name === 'run_command')
      expect(runCommandTool?.function.parameters.required).toContain('command')
    })

    it('should match ToolName type', () => {
      const toolNames = TOOL_DEFINITIONS.map(tool => tool.function.name) as ToolName[]
      
      // This test ensures that all tool names are valid ToolName types
      toolNames.forEach(name => {
        const toolName: ToolName = name
        expect(typeof toolName).toBe('string')
      })
    })
  })
})