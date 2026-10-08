# Workspace Agent Rules: Performance, Token Saver & Tooling

## Context Optimization & Cache Discipline
1. **Progressive File Reading**: Use `StartLine` and `EndLine` parameters with `view_file` to inspect relevant portions of code rather than loading full files into context.
2. **Atomic Execution**: Provide direct code solutions and diffs without unnecessary filler phrases.
3. **Log & Command Summarization**: When running build scripts (`npm run build`, `vite`, etc.), summarize results and suppress repetitive stdout to protect context window limits.
4. **Skills On-Demand**: Use `agy-skills search <término>` o `agy-skills install <skill_id> --workspace` si necesitas activar habilidades especializadas del catálogo de más de 2.900 skills.
