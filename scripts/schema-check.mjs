#!/usr/bin/env node
/**
 * Structured data (JSON-LD) validator.
 *
 * Extracts every `type: "application/ld+json"` script from src/routes/**,
 * parses the object literal and validates it against schema.org expectations:
 * required properties per @type, @context/@type presence, URL/date shapes.
 *
 * Usage: node scripts/schema-check.mjs [--strict]
 */
import { readFileSync, readdirSync, existsSync } from "node:fs";
import { join } from "node:path";
import { writeSection, readReport } from "./report-store.mjs";

const ROUTES_DIR = "src/routes";
const strict = process.argv.includes("--strict");

/** required + recommended properties per schema.org type */
const SCHEMA_RULES = {
  Organization: { required: ["name", "url"], recommended: ["logo", "sameAs"] },
  WebSite: { required: ["name", "url"], recommended: ["potentialAction"] },
  WebPage: { required: ["name", "url"], recommended: ["description"] },
  Article: {
    required: ["headline", "author", "datePublished"],
    recommended: ["image", "dateModified", "publisher", "description"],
  },
  BlogPosting: {
    required: ["headline", "author", "datePublished"],
    recommended: ["image", "dateModified", "publisher"],
  },
  BreadcrumbList: { required: ["itemListElement"], recommended: [] },
  FAQPage: { required: ["mainEntity"], recommended: [] },
  Product: { required: ["name"], recommended: ["image", "description", "offers"] },
  SoftwareApplication: {
    required: ["name", "applicationCategory"],
    recommended: ["operatingSystem", "offers"],
  },
};

const DATE_RE = /^\d{4}-\d{2}-\d{2}/;

function routeFiles(dir) {
  return readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const p = join(dir, e.name);
    if (e.isDirectory()) return routeFiles(p);
    return /\.tsx$/.test(e.name) ? [p] : [];
  });
}

function routeLabel(file) {
  const rel = file.slice(ROUTES_DIR.length + 1).replace(/\.tsx$/, "");
  if (rel === "__root") return "(sitewide)";
  if (rel === "index") return "/";
  return "/" + rel.replace(/\.index$/, "").split(".").join("/");
}

/** Pulls the balanced object literal that follows JSON.stringify( */
function extractObjects(src) {
  const out = [];
  const re = /JSON\.stringify\(\s*\{/g;
  let m;
  while ((m = re.exec(src))) {
    const start = src.indexOf("{", m.index);
    let depth = 0;
    for (let i = start; i < src.length; i++) {
      const ch = src[i];
      if (ch === "{") depth++;
      else if (ch === "}") {
        depth--;
        if (depth === 0) {
          out.push(src.slice(start, i + 1));
          re.lastIndex = i;
          break;
        }
      }
    }
  }
  return out;
}

/** Evaluates a static object literal; identifiers resolve to a proxy so
 * loader-driven values (loaderData.title) don't break validation. */
/** top-level `const NAME = "value";` string constants */
function constants(src) {
  const map = {};
  for (const m of src.matchAll(/^const\s+([A-Za-z0-9_$]+)\s*=\s*\n?\s*[`"']([^`"']*)[`"'];/gm)) {
    map[m[1]] = m[2];
  }
  return map;
}

function evalObject(text, consts = {}) {
  const proxy = new Proxy(
    { ...consts },
    {
      get: (target, prop) => {
        if (prop === Symbol.unscopables) return undefined;
        if (typeof prop === "string" && prop in target) return target[prop];
        if (prop === Symbol.toPrimitive) return () => "dynamic";
        return proxy;
      },
      has: () => true,
    },
  );
  try {
    // eslint-disable-next-line no-new-func
    const fn = new Function("scope", `with (scope) { return (${text}); }`);
    return { value: fn(proxy), dynamic: /loaderData|params|\$\{/.test(text) };
  } catch (error) {
    return { error: String(error.message ?? error) };
  }
}

const isDynamic = (v) => typeof v === "object" && v !== null && !Array.isArray(v) && !("@type" in v) && Object.keys(v).length === 0;

const issues = [];
const graphs = [];

for (const file of routeFiles(ROUTES_DIR)) {
  const src = readFileSync(file, "utf8");
  if (!src.includes("application/ld+json")) continue;
  const route = routeLabel(file);
  const add = (rule, message) => issues.push({ route, rule, message });

  for (const text of extractObjects(src)) {
    if (!/["']?@type["']?\s*:/.test(text)) continue;
    const parsed = evalObject(text, constants(src));
    if (parsed.error) {
      add("parse", `JSON-LD block could not be parsed: ${parsed.error}`);
      continue;
    }
    const node = parsed.value;
    const type = node["@type"];
    graphs.push({ route, type: String(type ?? "unknown") });

    if (!node["@context"]) add("context", `${type ?? "block"} is missing @context`);
    else if (!String(node["@context"]).includes("schema.org"))
      add("context", `@context should be https://schema.org (got ${node["@context"]})`);

    if (!type) {
      add("type", "JSON-LD block is missing @type");
      continue;
    }

    const rules = SCHEMA_RULES[type];
    if (!rules) {
      add("type", `unknown/unsupported @type "${type}" — no validation rules`);
      continue;
    }

    for (const key of rules.required) {
      const v = node[key];
      if (v === undefined || v === null || v === "" || isDynamic(v))
        add("required", `${type} is missing required field "${key}"`);
    }
    for (const key of rules.recommended) {
      if (node[key] === undefined)
        add("recommended", `${type} is missing recommended field "${key}"`);
    }

    for (const key of ["url", "logo", "image"]) {
      const v = node[key];
      if (typeof v === "string" && v && !/^https?:\/\//.test(v))
        add("url", `${type}.${key} should be an absolute URL (got "${v}")`);
    }
    for (const key of ["datePublished", "dateModified"]) {
      const v = node[key];
      if (typeof v === "string" && v && !DATE_RE.test(v))
        add("date", `${type}.${key} should be ISO 8601 (got "${v}")`);
    }
    if (type === "BreadcrumbList" && Array.isArray(node.itemListElement)) {
      node.itemListElement.forEach((item, i) => {
        if (!item || typeof item !== "object") return;
        for (const key of ["position", "name"]) {
          if (item[key] === undefined)
            add("required", `BreadcrumbList item ${i + 1} is missing "${key}"`);
        }
        if (item.item === undefined && item["@id"] === undefined)
          add("recommended", `BreadcrumbList item ${i + 1} has no item URL`);
      });
    }
  }
}

const errors = issues.filter((i) => ["parse", "required", "type", "context", "url", "date"].includes(i.rule));
const warnings = issues.filter((i) => i.rule === "recommended");

const previous = readReport().sections["schema-check"]?.issues ?? [];
const key = (i) => `${i.route}|${i.rule}|${i.message}`;
const prevKeys = new Set(previous.map(key));
const nowKeys = issues.map(key);

writeSection(
  "schema-check",
  {
    label: "Structured data (JSON-LD)",
    status: errors.length ? "fail" : warnings.length ? "warn" : "pass",
    summary: `${graphs.length} JSON-LD node(s) across ${new Set(graphs.map((g) => g.route)).size} route(s) — ${errors.length} error(s), ${warnings.length} warning(s)`,
    issues,
    meta: { nodes: graphs },
  },
  {
    regressions: nowKeys.filter((k) => !prevKeys.has(k)),
    fixes: [...prevKeys].filter((k) => !nowKeys.includes(k)),
  },
);

console.log(`\nSchema check — ${graphs.length} JSON-LD node(s) validated.`);
for (const g of graphs) console.log(`  • ${g.route}: ${g.type}`);
for (const i of issues) console.log(`  [${i.rule}] ${i.route}: ${i.message}`);
if (!issues.length) console.log("  All structured data matches schema expectations.");
if (errors.length && strict) process.exit(1);
if (!existsSync("src/generated/seo-report.json")) process.exitCode = 0;
