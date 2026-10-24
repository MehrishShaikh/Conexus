// Optional live AI. The prototype never ships API keys in the browser bundle.
// To enable live answers, deploy a small server-side proxy (see docs/AI_PROXY.md) that holds the key,
// then set VITE_AI_ENDPOINT at build time. Without it the app uses clearly labelled simulated replies.

export const AI_ENDPOINT: string | undefined = import.meta.env.VITE_AI_ENDPOINT || undefined
export const TRANSLATE_ENDPOINT: string | undefined = import.meta.env.VITE_TRANSLATE_ENDPOINT || undefined

export const aiConfigured = Boolean(AI_ENDPOINT)

export interface AiAnswer {
  text: string
  simulated: boolean
}

export async function askAi(prompt: string, context: string): Promise<AiAnswer> {
  if (AI_ENDPOINT) {
    const res = await fetch(AI_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt, context }),
    })
    if (!res.ok) throw new Error(`AI service responded with ${res.status}.`)
    const data = (await res.json()) as { text?: string }
    if (!data.text) throw new Error('AI service returned an empty response.')
    return { text: data.text, simulated: false }
  }
  await new Promise((r) => setTimeout(r, 700))
  return { text: simulatedDoubtAnswer(prompt), simulated: true }
}

const BANK: { match: RegExp; text: string }[] = [
  { match: /3nf|bcnf|normali/i, text: 'A table is in BCNF when every determinant is a candidate key. 3NF is slightly weaker: it allows a non-key determinant if the dependent attribute is part of some candidate key. Check each functional dependency X → Y — if X is not a superkey and Y is not a prime attribute, the table is not even in 3NF. BCNF decomposition is always lossless but may lose a dependency; 3NF decomposition can always preserve dependencies.' },
  { match: /subnet|mask|cidr|\/\d{1,2}/i, text: 'A /20 prefix means the first 20 bits are the network part. In dotted decimal that is 255.255.240.0 (third octet = 11110000). The host part has 32 − 20 = 12 bits, so there are 2¹² − 2 = 4094 usable host addresses.' },
  { match: /round.?robin|scheduling|waiting time/i, text: 'Round-robin trades average waiting time for fairness and responsiveness. Because every process gets only a quantum at a time, short jobs finish later than under SJF, which raises the average waiting time. Smaller quanta increase context-switch overhead; very large quanta degrade towards FCFS.' },
  { match: /cycle|linked list|floyd/i, text: "Use Floyd's cycle-detection algorithm: advance a slow pointer by one node and a fast pointer by two. If they ever meet there is a cycle; if the fast pointer reaches null there is none. It runs in O(n) time and O(1) extra space." },
  { match: /deadlock/i, text: 'A deadlock needs four conditions at once: mutual exclusion, hold-and-wait, no pre-emption and circular wait. Break any one of them to prevent deadlock; the Banker\'s algorithm avoids it by only granting requests that leave the system in a safe state.' },
]

export function simulatedDoubtAnswer(prompt: string): string {
  const hit = BANK.find((b) => b.match.test(prompt))
  if (hit) return hit.text
  return 'This is a simulated demo reply, so it cannot reason about your specific question. A good next step: restate the doubt in one sentence, list what you already tried, and attach a photo of the working. Peers and faculty can then reply in the thread. Connect a live AI endpoint to get real answers.'
}
