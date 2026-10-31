// The assistant sometimes answers in Markdown (### headings, **bold**, * bullets). The chat shows plain text, so those
// symbols are turned into readable text. The Edge Function (agentChat) has the same clean-up before it saves a reply.
export function plainChatText(input) {
  return String(input ?? "")
    .replace(/\r\n/g, "\n")
    .replace(/```[a-z]*\n?/gi, "")                       // code fences
    .replace(/^[ \t]{0,3}#{1,6}[ \t]*/gm, "")                   // ### headings
    .replace(/^[ \t]*[*\-+][ \t]+/gm, "• ")                      // * - + bullets
    .replace(/\*\*\*([^*\n]+)\*\*\*/g, "$1")              // ***bold italic***
    .replace(/\*\*([^*\n]+)\*\*/g, "$1")                  // **bold**
    .replace(/__([^_\n]+)__/g, "$1")                      // __bold__
    .replace(/(^|[^*\w])\*([^*\n]+)\*(?!\*)/g, "$1$2")    // *italic*
    .replace(/`([^`\n]+)`/g, "$1")                        // `code`
    .replace(/\[([^\]\n]+)\]\((?:[^)\n]+)\)/g, "$1")      // [label](link)
    .replace(/^[ \t]*[-*_]{3,}[ \t]*$/gm, "")                   // --- lines
    .replace(/\*{2,}/g, "")                               // stray ** left over mid-stream
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}
