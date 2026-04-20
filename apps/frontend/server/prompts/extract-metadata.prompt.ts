export function buildExtractMetadataSystem(summary: string, firstPage: string, lastPage: string): string {
  return `# Role
You are a precise Document Analysis Engine specialized in German business archives.
The document owner is **Benjamin Werner**. He is usually the recipient or sender — ignore him as a correspondent.

# Document Context

## Summary
${summary}

## First Page
${firstPage}

## Last Page
${lastPage}

You will receive several extraction tasks as follow-up messages.
For each task return ONLY the raw JSON object requested — no Markdown, no code blocks.`
}

export function buildExtractTitleMessage(): string {
  return `## Task: title
Extract a concise, meaningful title for a Document Management System.

Rules:
- Language: German (Deutsch) ONLY.
- Structure: "[Document Type] [Sender/Correspondent]".
- SMART DATE RULE: For recurring invoices (phone, internet, rent, electricity, subscription) or monthly statements, include the billing month and year.
  - BAD: "Rechnung Vodafone" → GOOD: "Rechnung Vodafone Januar 2024"
  - BAD: "Miete" → GOOD: "Miete 03/2024"
- Do NOT include physical addresses or file extensions.
- Max 80 characters.

Return: { "title": "..." }`
}

export function buildExtractSummaryMessage(): string {
  return `## Task: summary
Generate a concise, factual summary of the document.

Rules:
- Language: German (Deutsch) ONLY.
- Length: Strictly 2–5 sentences. Dense and information-rich.
- Start with the document type (e.g., "Eine Rechnung von...", "Ein Vertrag mit...").
- CRITICAL: If monetary amounts exist, you MUST mention the total amount and currency.
- Style: Neutral, professional, direct.
- Do NOT start with "Hier ist die Zusammenfassung" or similar.

Return: { "summary": "..." }`
}

export function buildExtractDateLanguageMessage(): string {
  return `## Task: documentDate + language
Extract the official issue date and the document language.

Rules for documentDate:
- Format: ISO 8601 (YYYY-MM-DD). Convert German formats (e.g. "31.12.2023" → "2023-12-31").
- Look for: "Datum", "Rechnungsdatum", "Leistungsdatum", "Berlin, den...".
- Do NOT extract due dates (Zahlungsziel) or birth dates unless they are the only date.
- Return null if no logical issue date is found. Do NOT use today's date.

Rules for language:
- 2-letter ISO language code (e.g., "de", "en").

Return: { "documentDate": "YYYY-MM-DD" | null, "language": "xx" }`
}

export function buildExtractTagsMessage(availableTags: string[]): string {
  return `## Task: tags
Choose 1 to 4 tags that apply to this document. Do NOT invent new tags.

Allowed tags:
 - ${availableTags.join('\n - ')}

Return: { "tags": ["...", "..."] }`
}

export function buildExtractDocumentTypeMessage(documentTypes: string[]): string {
  return `## Task: documentType
Select exactly ONE document type from the allowed list. Use the exact string. Do NOT invent new types.

Allowed document types:
${documentTypes.join(', ')}

Return: { "documentType": "..." }`
}

export function buildExtractCorrespondentMessage(correspondents: string[]): string {
  return `## Task: correspondent
Identify the other party involved in this document (not Benjamin Werner).

Rules:
- First check against the known correspondents list. If a close match exists, use the value from the list exactly.
- If no match, extract the name as it appears in the text.
- Prefer organization names over person names.

Known correspondents (prioritize these):
${correspondents.length ? correspondents.map((c) => `- ${c}`).join('\n') : '(none)'}

Return: { "correspondent": "..." }`
}
