import type { BlockProperties } from "grapesjs";

export type BlockDefinition = BlockProperties & { id: string };

const layout: BlockDefinition[] = [
  {
    id: "div",
    label: "Div",
    category: "Layout",
    content: `<div class="p-4 min-h-[60px]"></div>`,
  },
  {
    id: "section",
    label: "Section",
    category: "Layout",
    content: `<section class="p-8 min-h-[120px]"></section>`,
  },
  {
    id: "header",
    label: "Header",
    category: "Layout",
    content: `<header class="p-4 border-b"></header>`,
  },
  {
    id: "footer",
    label: "Footer",
    category: "Layout",
    content: `<footer class="p-4 border-t"></footer>`,
  },
  {
    id: "nav",
    label: "Nav",
    category: "Layout",
    content: `<nav class="flex gap-4 p-4"></nav>`,
  },
  {
    id: "main",
    label: "Main",
    category: "Layout",
    content: `<main class="p-8 min-h-[200px]"></main>`,
  },
  {
    id: "flex-row",
    label: "Flex row",
    category: "Layout",
    content: `<div class="flex flex-row gap-4 p-4"></div>`,
  },
  {
    id: "flex-col",
    label: "Flex column",
    category: "Layout",
    content: `<div class="flex flex-col gap-4 p-4"></div>`,
  },
];

const typography: BlockDefinition[] = [
  { id: "h1", label: "H1", category: "Typography", content: `<h1 class="text-4xl font-bold">Heading 1</h1>` },
  { id: "h2", label: "H2", category: "Typography", content: `<h2 class="text-3xl font-semibold">Heading 2</h2>` },
  { id: "h3", label: "H3", category: "Typography", content: `<h3 class="text-2xl font-semibold">Heading 3</h3>` },
  { id: "h4", label: "H4", category: "Typography", content: `<h4 class="text-xl font-medium">Heading 4</h4>` },
  { id: "h5", label: "H5", category: "Typography", content: `<h5 class="text-lg font-medium">Heading 5</h5>` },
  { id: "h6", label: "H6", category: "Typography", content: `<h6 class="text-base font-medium">Heading 6</h6>` },
  { id: "p", label: "Paragraph", category: "Typography", content: `<p class="text-base leading-relaxed">Paragraph text.</p>` },
  { id: "span", label: "Span", category: "Typography", content: `<span>inline text</span>` },
  { id: "a", label: "Link", category: "Typography", content: `<a href="#" class="text-blue-600 underline">Link</a>` },
];

const form: BlockDefinition[] = [
  {
    id: "form",
    label: "Form",
    category: "Form",
    content: `<form class="flex flex-col gap-4 p-4"></form>`,
  },
  {
    id: "input",
    label: "Input",
    category: "Form",
    content: `<input type="text" class="px-3 py-2 border rounded-md" placeholder="Text" />`,
  },
  {
    id: "textarea",
    label: "Textarea",
    category: "Form",
    content: `<textarea class="px-3 py-2 border rounded-md" rows="4" placeholder="Textarea"></textarea>`,
  },
  {
    id: "select",
    label: "Select",
    category: "Form",
    content: `<select class="px-3 py-2 border rounded-md"><option>Option 1</option><option>Option 2</option></select>`,
  },
  {
    id: "button",
    label: "Button",
    category: "Form",
    content: `<button class="px-4 py-2 bg-blue-600 text-white rounded-md cursor-pointer hover:bg-blue-700">Button</button>`,
  },
  {
    id: "label",
    label: "Label",
    category: "Form",
    content: `<label class="text-sm font-medium">Label</label>`,
  },
];

const media: BlockDefinition[] = [
  {
    id: "img",
    label: "Image",
    category: "Media",
    content: `<img src="" alt="" class="max-w-full h-auto" />`,
  },
  {
    id: "video",
    label: "Video",
    category: "Media",
    content: `<video controls class="max-w-full h-auto"></video>`,
  },
];

export const DEFAULT_BLOCKS: BlockDefinition[] = [...layout, ...typography, ...form, ...media];
