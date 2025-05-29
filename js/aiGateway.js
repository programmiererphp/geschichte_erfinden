
// Lightweight ES-Module Wrapper für OpenRouter + Bildgenerator
// Im MVP nur JSON-Fetch; Fehler werfen TimeoutError bei >60 s

const DEFAULT_TIMEOUT = 60000; // ms

export class AiGateway {
  #apiKey;
  #model;
  constructor(apiKey, model = "openai/o3") {
    this.#apiKey = apiKey;
    this.#model = model;
  }

  setModel(m) { this.#model = m; }
  setKey(k) { this.#apiKey = k; }

  async completion(prompt, maxTokens = 512, temperature = 0.7) {
    if (!this.#apiKey) throw new Error("NoApiKey");
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort("TimeoutError"), DEFAULT_TIMEOUT);

    try {
      const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${this.#apiKey}`
        },
        body: JSON.stringify({
          model: this.#model,
          messages: [{ role: "user", content: prompt }],
          max_tokens: maxTokens,
          temperature
        }),
        signal: controller.signal
      });
      if (!res.ok) throw new Error(`LLM ${res.status}`);
      const json = await res.json();
      return {
        text: json.choices[0].message.content,
        usage: json.usage
      };
    } finally { clearTimeout(id); }
  }

  // Bildgenerator – Beispiel für DALL·E 3
  async generateImage(prompt, size = "512x512") {
    if (!this.#apiKey) throw new Error("NoApiKey");
    const res = await fetch("https://api.openai.com/v1/images/generations", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${this.#apiKey}`
      },
      body: JSON.stringify({
        model: "dall-e-3",
        prompt,
        size,
        n: 1
      })
    });
    const json = await res.json();
    const url = json.data?.[0]?.url;
    const blob = await fetch(url).then(r => r.blob());
    return blob;
  }
}
