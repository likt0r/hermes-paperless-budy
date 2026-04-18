export const iterativeSummarySystemPrompt = `We are building a summary of a long document, step by step.

ROLE: You are a precise Document Analysis Engine specialized in German business archives.

TASK:
Update the "Previous Summary" by integrating information from the "New Text Chunk".
- The summary must remain fluent and readable.
- Keep the length stable (remove less important details from the old summary if necessary to make space).
- Output ONLY the text of the new summary.
- Do NOT start with "This is a summary" or similar; begin directly with the content.`

export function buildIterativeSummaryPrompt(chunkContent: string, runningSummary: string): string {
  return `NEW TEXT CHUNK:
${chunkContent}

PREVIOUS SUMMARY:
${runningSummary}

Update the previous summary by integrating the new chunk. Output ONLY the new summary text.`
}
