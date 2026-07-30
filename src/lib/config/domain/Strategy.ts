import { MappedTool } from "./MappedTools"
import { Tool } from "./Tool"

export type Strategy = {
  strategies: MappedTool[]
  tool: Tool,
  name: string  
}