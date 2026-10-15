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
 * The summary of a generated API reference page: the paragraph after its `Assembly:` line.
 * Namespace pages have no summary of their own. The plugin would take the first paragraph instead,
 * which on these pages is the namespace and assembly.
 */
function apiSummary(markdown: string): string {
  const lines = markdown.split(/\r?\n/);
  const assembly = lines.findIndex((line) => line.startsWith('Assembly:'));
  if (assembly < 0) return '';
  const paragraph: string[] = [];
  for (const line of lines.slice(assembly + 1)) {
    if (line.trim() === '') {
      if (paragraph.length) break;
      continue;
    }
    if (/^(```|#)/.test(line)) break;
    paragraph.push(line);
  }
  return plainText(paragraph.join(' '));
}

/**
 * Writes llms.txt files with docusaurus-plugin-llms: a site index at /llms.txt and, for each product,
 * /<dir>/llms.txt (guides and API links), /<dir>/llms-full.txt (guides) and /<dir>/llms-api-full.txt (API reference),
 * plus a Markdown copy of every guide next to its HTML. Only the current docs version of the default locale is used,
 * in sidebar order.
 */
export default function llmsTxtPlugin(context: LoadContext, options: LlmsTxtOptions): Plugin<void> {
  const {siteConfig, i18n, outDir, siteDir} = context;
  const siteUrl = siteConfig.url.replace(/\/+$/, '') + siteConfig.baseUrl;
  const guidesDir = (product: LlmsTxtProduct) => `${product.dir}/docs`;
  const apiDir = (product: LlmsTxtProduct) => `${product.dir}/api-reference`;
  const fileUrl = (filename: string) => `${siteUrl}${filename}`;

  // Filled once all content is loaded: each product's site-relative source paths in sidebar order,
  // its current version label, and the source path of every current page by permalink (no trailing slash).
  const sidebarOrder = new Map<string, string[]>();
  const currentLabel = new Map<string, string>();
  const sourceByPermalink = new Map<string, string>();

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

  // Second run: each product's index of guides and API reference, and the API reference in one file. It writes no
  // Markdown copies: the generated API pages have no front matter description, so the plugin would move their first
  // paragraph (the namespace line, or a namespace page's first entry) into the copy's header.
  const productsRun = (): LlmsOptions => ({
    ...common,
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
        rootContent:
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

  /**
   * Gives API reference links in an llms.txt their summary, strips HTML from every description,
   * and points links at the page's Markdown copy where the first run wrote one.
   */
  async function fixLinkDescriptions(filename: string) {
    const filePath = path.join(outDir, filename);
    const text = await fs.readFile(filePath, 'utf8');
    const apiDirs = options.products.map((product) => `${apiDir(product)}/`);
    const lines = await Promise.all(
      text.split('\n').map(async (line) => {
        const link = /^- \[(.*)\]\((\S+?)\)(?:: (.*))?$/.exec(line);
        if (!link) return line;
        const [, title, pageUrl, description = ''] = link;
        const permalink = decodeURIComponent(new URL(pageUrl).pathname).replace(/\.md$/, '');
        const hasCopy = await fs.access(path.join(outDir, `${permalink}.md`)).then(() => true, () => false);
        const url = hasCopy && !pageUrl.endsWith('.md') ? `${pageUrl}.md` : pageUrl;
        const source = sourceByPermalink.get(permalink);
        const summary =
          source && apiDirs.some((dir) => source.startsWith(dir))
            ? apiSummary(await fs.readFile(path.join(siteDir, source), 'utf8'))
            : plainText(description);
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
        for (const doc of current.docs) sourceByPermalink.set(doc.permalink.replace(/\/+$/, ''), doc.source.replace(/^@site\//, ''));
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
      }
      const files = ['llms.txt', ...options.products.flatMap((p) => ['llms.txt', 'llms-full.txt', 'llms-api-full.txt'].map((f) => `${p.dir}/${f}`))];
      for (const file of files) {
        const {size} = await fs.stat(path.join(outDir, file));
        console.log(`[llms-txt] ${file}: ${(size / 1024).toFixed(0)} KB`);
      }
    },
  };
}
