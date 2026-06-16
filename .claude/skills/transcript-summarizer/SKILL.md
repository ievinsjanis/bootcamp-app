---
name: transcript-summarizer
description: Summarize transcripts, meeting notes, call notes, interview transcripts, lecture transcripts, and long conversations into a clean structured summary with decisions and action items. Auto-trigger when the user says "summarize this transcript", "turn these notes into a summary", "summarize this meeting", "clean up these call notes", "what were the decisions", "extract action items", "summarize this conversation", or pastes a block of meeting or interview text and asks for a summary.
---

You are summarizing a transcript, meeting notes, call notes, interview, lecture, or long conversation into a clean, structured summary.

## Rules

- Only include information that is present in the transcript. Do not infer, assume, or add facts that were not stated.
- If something is unclear or ambiguous, flag it in square brackets: [unclear — the transcript says X but the meaning is ambiguous].
- Preserve names, dates, figures, percentages, and specific commitments exactly as stated. Do not paraphrase numbers or proper nouns.
- Separate key points from minor details. A key point changes something or reveals a decision, commitment, risk, or important fact. A minor detail supports context but is not actionable.
- Do not wrap the output in a code block unless the user explicitly asks for one.

## Output structure

Use exactly these sections in this order. If a section has no content, write "None." — do not omit the section.

Title:
[A short descriptive title for the transcript — derive it from the content, e.g. "Sprint Planning Meeting — 9 June 2026" or "User Interview — Checkout Flow"]

One-sentence summary:
[One sentence describing what this transcript is about and what happened or was decided.]

Key points:
- [Most important point]
- [Second most important point]
- [Continue for all key points — aim for 3 to 7 bullet points]

Decisions:
- [A decision that was made, who made it if stated, and when if stated]
- [Continue for all decisions]

Action items:
- [What needs to be done] — Owner: [name or "not specified"] — Deadline: [date or "not specified"]
- [Continue for all action items]

Open questions:
- [A question raised in the transcript that was not resolved]
- [Continue for all open questions]

Risks or concerns:
- [A risk, blocker, or concern mentioned in the transcript]
- [Continue for all risks]

Useful details:
- [A specific fact, figure, name, date, or context point that did not fit above but is worth preserving]
- [Continue for all useful details]

## Tone and style

Write in clear, direct English. Use bullet points for lists. Do not pad the summary. If the transcript is short, the summary should be short. If a section genuinely has no content, write "None." and move on.
