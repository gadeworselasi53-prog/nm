const M = process.env.GEMINI_MODEL || "gemini-2.5-flash";
const gem = async (body) => {
  const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${M}:generateContent?key=${process.env.GEMINI_API_KEY}`,
    { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  const j = await r.json();
  if (!r.ok) throw new Error(j.error?.message || "Gemini error");
  return (j.candidates?.[0]?.content?.parts || []).map(p => p.text || "").join("");
};
const ok = (o) => ({ statusCode: 200, headers: { "Content-Type": "application/json" }, body: JSON.stringify(o) });
exports.handler = async (e) => {
  try {
    const { action, d, notes } = JSON.parse(e.body);
    if (action === "research") {
      const text = await gem({ tools: [{ google_search: {} }], contents: [{ role: "user", parts: [{ text:
`Find 15 distinct, real peer-reviewed journal articles (2016 or later, prefer last 5 years) indexed by Google Scholar on: "${d.title}". Aim: ${d.aim}.
For each give: authors (surnames + initials), year, article title, journal, volume(issue), pages, DOI/URL, aim/method/sample, key findings, limitation.
Never invent a source; if fewer than 15 are verifiable, list only those. Plain numbered list.` }] }] });
      return ok({ notes: text });
    }
    const text = await gem({ generationConfig: { responseMimeType: "application/json" }, contents: [{ role: "user", parts: [{ text:
`Write a pharmaceutics lab report as JSON using ONLY these researched articles for citations:
${notes}

STUDENT INPUT: ${JSON.stringify(d)}

RULES: Harvard in-text citations: one author (Acquah, 2025); two (Mensah and Kwakye, 2021); 3+ (Mensah et al., 2021). Paraphrase everything, no long quotes, no source-by-source lists.
- title: 10-15 words, no abbreviations. aim: one sentence starting "To", max 2 lines. objectives: max 5, each starting with an action verb ("To ...").
- introduction: ~1.5 pages, funnel (broad context -> topic -> gap -> aim), WITH in-text citations; last paragraph states the aim.
- literature: ~4 pages, grouped by theme (not by source), analyse -> synthesise -> evaluate, compare/contrast, cite all articles, end by linking to this study.
- materials: max 5 lines. methods: past tense passive, order performed, max 1 page, include precautions.
- results: state results only, refer to Table/Figure numbers; use ONLY the student's data and never invent numbers. calculation: one worked example (formula, substitution, answer with units) only if the data allows, else "".
- table: {caption, head:[], rows:[[]]} from the student's data (or null). figures: use the student's captions order.
- discussion: max 2 pages, interpret, compare with limits and the cited studies, errors, state if each objective was met. conclusion: max 5 lines, no new data.
- references: Harvard strings "Surname, A.B. and Surname, C. (Year) 'Title', Journal, vol(issue), pp. x-y. doi/url", only sources cited.
Return JSON: {title,aim,objectives:[],introduction:[],literature:[],materials,methods:[],results:[],calculation,table,discussion:[],conclusion,references:[]}` }] }] });
    return ok({ report: JSON.parse(text.replace(/```json|```/g, "").trim()) });
  } catch (err) { return { statusCode: 500, body: JSON.stringify({ error: err.message }) }; }
};
