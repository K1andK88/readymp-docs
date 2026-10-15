import fs from 'fs/promises';
import path from 'path';
import type {LoadContext, Plugin} from '@docusaurus/types';
import type {LoadedContent} from '@docusaurus/plugin-content-docs';
import docusaurusPluginLLMs, {type PluginOptions as LlmsOptions} from 'docusaurus-plugin-llms';

// This runs in Node.js - Don't use client-side code here (browser APIs, JSX...)

/** One product on the site: a docs plugin instance with guides in `docs/` and the API reference in `api-reference/`. */
export type LlmsTxtProduct = {
  /** Id of the product's docs plugin instance ('default' for the preset one). */
  docsPluginId: string;
  /** Product name used in titles, such as 'OblivionMP'. */
  name: string;
  /** The docs instance's `path` and `routeBasePath`, such as 'oblivion-mp'. Its LLM files are written there. */
  dir: string;
  /** One sentence describing the product, shown under the title of its files. */
  description: string;
};

export type LlmsTxtOptions = {
  products: LlmsTxtProduct[];
};

type SidebarItem = {type: string; id?: string; items?: SidebarItem[]; link?: {type: string; id?: string}};

/** Doc ids of a sidebar in reading order, category link pages before their items. */
function sidebarDocIds(items: SidebarItem[]): string[] {
  return items.flatMap((item) => {
    if (item.type === 'doc' || item.type === 'ref') return item.id ? [item.id] : [];
    if (item.type === 'category') {
      const link = item.link?.type === 'doc' && item.link.id ? [item.link.id] : [];
      return [...link, ...sidebarDocIds(item.items ?? [])];
    }
    return [];
  });
}

/** Escapes glob syntax so a file path matches only itself in the plugin's include and order patterns. */
function literalGlob(filePath: string): string {
  return filePath.replace(/[\\*?[\]{}()!+@]/g, '\\$&');
}

/** Markdown or HTML inline text as plain text on one line. */
function plainText(text: string): string {
  return text
    .replace(/<[^>]+>/g, '')
    .replace(/!?\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/\\([\\`*_{}[\]()#+\-.!<>])/g, '$1')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Shortens a description the way the plugin does for llms.txt. */
function truncate(text: string): string {
  return text.length <= 150 ? text : `${text.substring(0, 147).trimEnd()}...`;
}

/**
 * Writes llms.txt files with docusaurus-plugin-llms: a site index at /llms.txt and, for each product,
 * /<dir>/llms.txt (guides and API links), /<dir>/llms-full.txt (guides) and /<dir>/llms-api-full.txt (API reference),
 * plus a Markdown copy of every page next to its HTML, with absolute links. Only the current docs version of the default
 * locale is used, in sidebar order.
 */
export default function llmsTxtPlugin(context: LoadContext, options: LlmsTxtOptions): Plugin<void> {
  const {siteConfig, i18n, outDir} = context;
  const siteUrl = siteConfig.url.replace(/\/+$/, '') + siteConfig.baseUrl;
  const guidesDir = (product: LlmsTxtProduct) => `${product.dir}/docs`;
  const apiDir = (product: LlmsTxtProduct) => `${product.dir}/api-reference`;
  const fileUrl = (filename: string) => `${siteUrl}${filename}`;

  // Filled once all content is loaded: each product's site-relative source paths in sidebar order, and its current
  // version label.
  const sidebarOrder = new Map<string, string[]>();
  const currentLabel = new Map<string, string>();

  const productFiles = (product: LlmsTxtProduct) => {
    const version = currentLabel.get(product.docsPluginId);
    return {
      title: `${product.name} docs`,
      description: product.description,
      orderPatterns: (sidebarOrder.get(product.docsPluginId) ?? []).map(literalGlob),
      ...(version ? {version} : {}),
    };
  };

  // Shared by both runs: every file is a custom one, so each product gets its own set.
  const common: LlmsOptions = {generateLLMsTxt: false, generateLLMsFullTxt: false, excludeImports: true, logLevel: 'quiet'};

  // First run: the guides, with a Markdown copy of each one that llms.txt links to, as llmstxt.org recommends.
  const guidesRun = (): LlmsOptions => ({
    ...common,
    docsDir: options.products.map((product) => ({path: guidesDir(product), routeBasePath: guidesDir(product), label: `${product.name} guides`})),
    generateMarkdownFiles: true,
    customLLMFiles: [
      {
        filename: 'llms.txt',
        title: siteConfig.title,
        description: siteConfig.tagline,
        includePatterns: options.products.map((product) => `${guidesDir(product)}/**`),
        orderPatterns: options.products.flatMap((product) => (sidebarOrder.get(product.docsPluginId) ?? []).map(literalGlob)),
        fullContent: false,
        rootContent: [
          'The guides of each product are listed below. Each product also has its own files:',
          '',
          ...options.products.map(
            (product) =>
              `- ${product.name}: [index of guides and API reference](${fileUrl(`${product.dir}/llms.txt`)}), ` +
              `[guides, full text](${fileUrl(`${product.dir}/llms-full.txt`)}), ` +
              `[API reference, full text](${fileUrl(`${product.dir}/llms-api-full.txt`)})`,
          ),
        ].join('\n'),
      },
      ...options.products.map((product) => ({
        ...productFiles(product),
        filename: `${product.dir}/llms-full.txt`,
        includePatterns: [`${guidesDir(product)}/**`],
        fullContent: true,
        rootContent: `Every ${product.name} guide in one file. The API reference is in ${fileUrl(`${product.dir}/llms-api-full.txt`)}`,
      })),
    ],
  });

  // Second run: each product's index of guides and API reference, and the API reference in one file, with a Markdown
  // copy of every API page. The guides' copies come out the same as the first run's.
  const productsRun = (): LlmsOptions => ({
    ...common,
    generateMarkdownFiles: true,
    docsDir: options.products.flatMap((product) => [
      {path: guidesDir(product), routeBasePath: guidesDir(product), label: `${product.name} guides`},
      {path: apiDir(product), routeBasePath: apiDir(product), label: `${product.name} API reference`},
    ]),
    customLLMFiles: options.products.flatMap((product) => [
      {
        ...productFiles(product),
        filename: `${product.dir}/llms.txt`,
        includePatterns: [`${guidesDir(product)}/**`, `${apiDir(product)}/**`],
        fullContent: false,
        // Under a heading of its own: links before the first section count as orphans to llms.txt checkers
        rootContent:
          '## Full text\n\n' +
          `- [Guides, full text](${fileUrl(`${product.dir}/llms-full.txt`)}): every guide below in one file.\n` +
          `- [API reference, full text](${fileUrl(`${product.dir}/llms-api-full.txt`)}): every API reference page below in one file.`,
      },
      {
        ...productFiles(product),
        title: `${product.name} API reference`,
        filename: `${product.dir}/llms-api-full.txt`,
        includePatterns: [`${apiDir(product)}/**`],
        fullContent: true,
        rootContent: `Every ${product.name} API reference page in one file, generated from the SDK's XML doc comments. The guides are in ${fileUrl(`${product.dir}/llms-full.txt`)}`,
      },
    ]),
  });

  /** Strips HTML from every description in an llms.txt, and points links at the page's Markdown copy. */
  async function fixLinkDescriptions(filename: string) {
    const filePath = path.join(outDir, filename);
    const text = await fs.readFile(filePath, 'utf8');
    const lines = await Promise.all(
      text.split('\n').map(async (line) => {
        const link = /^- \[(.*)\]\((\S+?)\)(?:: (.*))?$/.exec(line);
        if (!link) return line;
        const [, title, pageUrl, description = ''] = link;
        const permalink = decodeURIComponent(new URL(pageUrl).pathname).replace(/\.md$/, '');
        const hasCopy = await fs.access(path.join(outDir, `${permalink}.md`)).then(() => true, () => false);
        const url = hasCopy && !pageUrl.endsWith('.md') ? `${pageUrl}.md` : pageUrl;
        const summary = plainText(description);
        return `- [${title}](${url})${summary ? `: ${truncate(summary)}` : ''}`;
      }),
    );
    await fs.writeFile(filePath, lines.join('\n'));
  }

  /** Drops the second heading of a generic type, whose `<T\>` the plugin's cleaning cut from the page's own H1. */
  async function fixGenericHeadings(filename: string) {
    const filePath = path.join(outDir, filename);
    const text = await fs.readFile(filePath, 'utf8');
    await fs.writeFile(filePath, text.replace(/^(## (.+?)<[^\n]*>(?: \([^)\n]*\))?\n\n)## \2\n\n/gm, '$1'));
  }

  /** Every `.md` file under a folder of the build output, as paths relative to it with forward slashes. */
  async function markdownCopies(dir: string): Promise<string[]> {
    const found: string[] = [];
    const walk = async (rel: string) => {
      const entries = await fs.readdir(path.join(outDir, rel), {withFileTypes: true}).catch(() => []);
      for (const entry of entries) {
        const child = `${rel}/${entry.name}`;
        if (entry.isDirectory()) await walk(child);
        else if (entry.name.endsWith('.md')) found.push(child);
      }
    };
    await walk(dir);
    return found;
  }

  /**
   * Makes the relative links in Markdown absolute, pointing at the target page's copy. `sourceDir` is the folder of the
   * page's source file, which its links are relative to. A link names a source file (`x.md`, `x.mdx`) or, as Docusaurus
   * also allows, leaves the extension out. Anything else, an image say, has no copy and is left as it is.
   */
  function absoluteLinks(text: string, sourceDir: string, copies: Set<string>, byName?: Map<string, string | null>): string {
    return text.replace(/\]\(([^)\s#]+?)(#[^)\s]*)?\)/g, (match, target: string, anchor = '') => {
      if (/^[a-z]+:/i.test(target) || target.startsWith('/')) return match;
      // docfx escapes the anchor separator, which the Wukong reference still carries as `x.md\#anchor`
      if (anchor) target = target.replace(/\\$/, '');
      const parts = path.posix.normalize(path.posix.join(sourceDir, target)).replace(/\.mdx?$/, '').split('/');
      // a page named after its folder is served at the folder
      if (parts.length > 1 && parts[parts.length - 1] === parts[parts.length - 2]) parts.pop();
      let resolved: string | null | undefined = parts.join('/');
      // a link within the page's own folder, where the source folder is not known: found by its unique file name
      if (!copies.has(`${resolved}.md`) && byName && !target.includes('/')) resolved = byName.get(target.replace(/\.mdx?$/, ''));
      return resolved && copies.has(`${resolved}.md`) ? `](${siteUrl}${resolved}.md${anchor})` : match;
    });
  }

  /**
   * Makes the relative links in a product's Markdown copies and full-text files absolute. A copy is written at its
   * page's URL, but its links are relative to the page's source file, and the two differ for a page named after its
   * folder: Docusaurus serves NS/NS.md at NS, so its copy is NS.md, one folder up from its source. In a full-text file
   * every page is one section, in the order the files were written in.
   */
  async function fixLinks(product: LlmsTxtProduct) {
    const copies = [...(await markdownCopies(guidesDir(product))), ...(await markdownCopies(apiDir(product)))];
    const existing = new Set(copies);
    for (const copy of copies) {
      const stem = copy.replace(/\.md$/, '');
      const isFolderPage = await fs.stat(path.join(outDir, stem)).then((stat) => stat.isDirectory(), () => false);
      const filePath = path.join(outDir, copy);
      const text = await fs.readFile(filePath, 'utf8');
      const fixed = absoluteLinks(text, isFolderPage ? stem : path.posix.dirname(copy), existing);
      if (fixed !== text) await fs.writeFile(filePath, fixed);
    }

    // Every API page's source is one folder deep, a namespace's folder, so one base serves the whole file. A link within
    // that folder names only the file, which is unique in the API reference.
    const byName = new Map<string, string | null>();
    for (const copy of copies.filter((copy) => copy.startsWith(`${apiDir(product)}/`))) {
      const name = path.posix.basename(copy, '.md');
      byName.set(name, byName.has(name) ? null : copy.replace(/\.md$/, ''));
    }
    const apiFull = path.join(outDir, `${product.dir}/llms-api-full.txt`);
    await fs.writeFile(apiFull, absoluteLinks(await fs.readFile(apiFull, 'utf8'), `${apiDir(product)}/namespace`, existing, byName));

    // The guides sit at any depth: each section takes the folder of its page, in sidebar order. If the sections and the
    // sidebar disagree on how many pages there are, the links are left as they are rather than guessed.
    const guidesFull = path.join(outDir, `${product.dir}/llms-full.txt`);
    const sections = (await fs.readFile(guidesFull, 'utf8')).split(/^(?=## )/m);
    const sources = (sidebarOrder.get(product.docsPluginId) ?? []).filter((source) => source.startsWith(`${guidesDir(product)}/`));
    if (sections.length - 1 !== sources.length) {
      console.warn(`[llms-txt] ${product.dir}/llms-full.txt has ${sections.length - 1} pages, the sidebar ${sources.length}; links left relative`);
      return;
    }
    const fixedSections = sections.map((section, i) => (i === 0 ? section : absoluteLinks(section, path.posix.dirname(sources[i - 1]), existing)));
    await fs.writeFile(guidesFull, fixedSections.join(''));
  }

  // Validates the options at startup instead of after the build.
  docusaurusPluginLLMs(context, guidesRun());
  docusaurusPluginLLMs(context, productsRun());

  return {
    name: 'llms-txt',

    async allContentLoaded({allContent}) {
      const docsContent = allContent['docusaurus-plugin-content-docs'] ?? {};
      for (const product of options.products) {
        const content = docsContent[product.docsPluginId] as LoadedContent | undefined;
        const current = content?.loadedVersions.find((version) => version.versionName === 'current');
        if (!current) throw new Error(`llms-txt: no current version for docs plugin '${product.docsPluginId}'`);
        const sourceById = new Map(current.docs.map((doc) => [doc.id, doc.source.replace(/^@site\//, '')]));
        const ids = Object.values(current.sidebars).flatMap((sidebar) => sidebarDocIds(sidebar as SidebarItem[]));
        sidebarOrder.set(product.docsPluginId, [...new Set(ids)].flatMap((id) => sourceById.get(id) ?? []));
        currentLabel.set(product.docsPluginId, current.label);
      }
    },

    async postBuild(props) {
      // Each locale is built separately; the files come from the default locale only.
      if (i18n.currentLocale !== i18n.defaultLocale) return;
      await docusaurusPluginLLMs(context, guidesRun()).postBuild!(props);
      await docusaurusPluginLLMs(context, productsRun()).postBuild!(props);
      await fixLinkDescriptions('llms.txt');
      for (const product of options.products) {
        await fixLinkDescriptions(`${product.dir}/llms.txt`);
        await fixGenericHeadings(`${product.dir}/llms-api-full.txt`);
        await fixLinks(product);
      }
      const files = ['llms.txt', ...options.products.flatMap((p) => ['llms.txt', 'llms-full.txt', 'llms-api-full.txt'].map((f) => `${p.dir}/${f}`))];
      for (const file of files) {
        const {size} = await fs.stat(path.join(outDir, file));
        console.log(`[llms-txt] ${file}: ${(size / 1024).toFixed(0)} KB`);
      }
    },
  };
}
