(function () {
  const allowedLinkAttributes = new Set([
    "as",
    "crossorigin",
    "href",
    "media",
    "referrerpolicy",
    "rel",
    "title",
    "type",
  ]);
  const allowedLinkRels = new Set(["dns-prefetch", "preconnect", "preload", "stylesheet"]);
  const allowedPreloadAsValues = new Set(["font", "style"]);
  const allowedCrossoriginValues = new Set(["", "anonymous", "use-credentials"]);
  const allowedReferrerPolicies = new Set([
    "",
    "no-referrer",
    "no-referrer-when-downgrade",
    "origin",
    "origin-when-cross-origin",
    "same-origin",
    "strict-origin",
    "strict-origin-when-cross-origin",
    "unsafe-url",
  ]);

  function parseWebfontTags(markup) {
    if (typeof markup !== "string" || markup.trim() === "") {
      return { entries: [], errors: [] };
    }

    const entries = [];
    const errors = [];
    const tagPattern = /<style\b([^>]*)>([\s\S]*?)<\/style\s*>|<link\b([^>]*)\/?>/gi;
    let match = null;
    let lastIndex = 0;

    while ((match = tagPattern.exec(markup))) {
      addUnsupportedTextError(markup.slice(lastIndex, match.index), errors);

      if (match[2] !== undefined) {
        addStyleEntry(match[1], match[2], entries, errors);
      } else {
        addLinkEntry(match[3], entries, errors);
      }

      lastIndex = tagPattern.lastIndex;
    }

    addUnsupportedTextError(markup.slice(lastIndex), errors);

    if (entries.length === 0 && errors.length === 0) {
      errors.push("Add at least one <style> or <link> tag.");
    }

    return { entries, errors: uniqueErrors(errors) };
  }

  function createElements(documentRef, markup) {
    const result = parseWebfontTags(markup);
    if (result.errors.length > 0) {
      throw new Error(result.errors.join(" "));
    }

    return result.entries.map((entry) => {
      const element = documentRef.createElement(entry.tag);

      if (entry.tag === "style") {
        element.textContent = entry.css;
        return element;
      }

      for (const [name, value] of Object.entries(entry.attrs)) {
        element.setAttribute(name, value);
      }

      return element;
    });
  }

  function addUnsupportedTextError(value, errors) {
    if (value.trim() !== "") {
      errors.push("Only <style> and style or font-related <link> tags are supported.");
    }
  }

  function addStyleEntry(rawAttributes, css, entries, errors) {
    if (rawAttributes.trim() !== "") {
      errors.push("<style> tags cannot include attributes.");
      return;
    }

    if (css.trim() === "") {
      errors.push("<style> tags cannot be empty.");
      return;
    }

    entries.push({ tag: "style", css });
  }

  function addLinkEntry(rawAttributes, entries, errors) {
    const parsed = parseAttributes(rawAttributes);
    errors.push(...parsed.errors);

    if (parsed.errors.length > 0) {
      return;
    }

    const attrs = normalizeLinkAttributes(parsed.attrs, errors);
    if (!attrs) {
      return;
    }

    entries.push({ tag: "link", attrs });
  }

  function parseAttributes(rawAttributes) {
    const attrs = {};
    const errors = [];
    const source = rawAttributes.replace(/\/\s*$/, "");
    const attrPattern = /([A-Za-z][\w:-]*)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+)))?/g;
    let match = null;
    let lastIndex = 0;

    while ((match = attrPattern.exec(source))) {
      if (source.slice(lastIndex, match.index).trim() !== "") {
        errors.push("Could not parse one or more tag attributes.");
        break;
      }

      const name = match[1].toLowerCase();
      const value = match[2] ?? match[3] ?? match[4] ?? "";

      if (Object.hasOwn(attrs, name)) {
        errors.push(`Duplicate ${name} attribute.`);
        break;
      }

      attrs[name] = value.trim();
      lastIndex = attrPattern.lastIndex;
    }

    if (source.slice(lastIndex).trim() !== "") {
      errors.push("Could not parse one or more tag attributes.");
    }

    return { attrs, errors };
  }

  function normalizeLinkAttributes(attrs, errors) {
    for (const name of Object.keys(attrs)) {
      if (!allowedLinkAttributes.has(name)) {
        errors.push(`<link> attribute ${name} is not supported.`);
      }
    }

    const href = attrs.href ?? "";
    if (!/^https:\/\//i.test(href)) {
      errors.push("<link> href must use https://.");
    }

    const relTokens = (attrs.rel ?? "")
      .toLowerCase()
      .split(/\s+/)
      .filter(Boolean);
    if (relTokens.length === 0 || !relTokens.some((rel) => allowedLinkRels.has(rel))) {
      errors.push("<link> rel must be stylesheet, preconnect, preload, or dns-prefetch.");
    }

    for (const rel of relTokens) {
      if (!allowedLinkRels.has(rel)) {
        errors.push(`<link> rel ${rel} is not supported.`);
      }
    }

    const asValue = (attrs.as ?? "").toLowerCase();
    if (relTokens.includes("preload") && !allowedPreloadAsValues.has(asValue)) {
      errors.push('<link rel="preload"> must use as="font" or as="style".');
    }

    const crossorigin = (attrs.crossorigin ?? "").toLowerCase();
    if (!allowedCrossoriginValues.has(crossorigin)) {
      errors.push("<link> crossorigin must be anonymous or use-credentials.");
    }

    const referrerPolicy = (attrs.referrerpolicy ?? "").toLowerCase();
    if (!allowedReferrerPolicies.has(referrerPolicy)) {
      errors.push("<link> referrerpolicy is not supported.");
    }

    if (errors.length > 0) {
      return null;
    }

    const normalized = {
      rel: relTokens.join(" "),
      href,
    };

    for (const name of ["as", "crossorigin", "referrerpolicy", "media", "type", "title"]) {
      if (Object.hasOwn(attrs, name)) {
        normalized[name] = attrs[name];
      }
    }

    return normalized;
  }

  function uniqueErrors(errors) {
    return [...new Set(errors)];
  }

  globalThis.TermPttWebfontTags = {
    createElements,
    parseWebfontTags,
  };
})();
