import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';

const docsDirectory = path.join(process.cwd(), 'content', 'docs');

export interface DocMetadata {
  title: string;
  description?: string;
  version?: string;
  status?: 'Draft' | 'Published' | 'Deprecated';
  owner?: string;
  audience?: string;
  relatedDocs?: string[];
  lastUpdated?: string;
  order?: number;
}

export interface DocData extends DocMetadata {
  slug: string;
  slugAsParams: string[];
}

export interface SidebarItem {
  title: string;
  slug: string;
  order: number;
}

export interface SidebarSection {
  title: string;
  slug: string;
  items: SidebarItem[];
  order: number;
}

// Ensure directory exists
if (!fs.existsSync(docsDirectory)) {
  fs.mkdirSync(docsDirectory, { recursive: true });
}

export function getDocSlugs(dir = docsDirectory): string[] {
  if (!fs.existsSync(dir)) return [];
  
  let slugs: string[] = [];
  const files = fs.readdirSync(dir);

  for (const file of files) {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      slugs = slugs.concat(getDocSlugs(fullPath));
    } else if (file.endsWith('.mdx')) {
      slugs.push(fullPath.replace(docsDirectory + '/', '').replace(/\.mdx$/, ''));
    }
  }

  return slugs;
}

export function getDocBySlug(slugArray: string[]): { data: DocMetadata; content: string } | null {
  // Try exactly as given
  const relativePath = slugArray.join('/');
  let fullPath = path.join(docsDirectory, `${relativePath}.mdx`);
  
  // If not found, try index.mdx inside a directory
  if (!fs.existsSync(fullPath)) {
    fullPath = path.join(docsDirectory, relativePath, 'index.mdx');
  }

  if (!fs.existsSync(fullPath)) {
    return null;
  }

  const fileContents = fs.readFileSync(fullPath, 'utf8');
  const { data, content } = matter(fileContents);

  return {
    data: data as DocMetadata,
    content,
  };
}

export function getAllDocs(): DocData[] {
  const slugs = getDocSlugs();
  const docs = slugs.map((slug) => {
    const slugArray = slug.split('/');
    const doc = getDocBySlug(slugArray);
    if (!doc) return null;
    return {
      ...doc.data,
      slug,
      slugAsParams: slugArray,
    };
  }).filter(Boolean) as DocData[];

  return docs.sort((a, b) => (a.order || 999) - (b.order || 999));
}

// Generate a sidebar from the folder structure. 
// 1st level folders become sections, 2nd level files become items.
export function getSidebar(): SidebarSection[] {
  const docs = getAllDocs();
  const sectionsMap: Record<string, SidebarSection> = {};

  docs.forEach((doc) => {
    const slugParts = doc.slugAsParams;
    const isRootItem = slugParts.length === 1;
    
    let sectionSlug = 'root';
    let itemSlug = doc.slug;
    let sectionTitle = 'Overview';

    if (!isRootItem) {
      sectionSlug = slugParts[0];
      // Try to find the index.mdx for this section to get its title
      const sectionIndex = docs.find(d => d.slug === `${sectionSlug}/index` || d.slug === sectionSlug);
      sectionTitle = sectionIndex?.title || sectionSlug.charAt(0).toUpperCase() + sectionSlug.slice(1);
    }

    if (!sectionsMap[sectionSlug]) {
      // Find section order from its index file if it exists
      const sectionIndex = docs.find(d => d.slug === `${sectionSlug}/index` || d.slug === sectionSlug);
      sectionsMap[sectionSlug] = {
        title: sectionTitle,
        slug: sectionSlug,
        items: [],
        order: sectionIndex?.order || 999,
      };
    }

    // Skip index files from being nested items
    if (slugParts[slugParts.length - 1] === 'index') {
      return;
    }

    sectionsMap[sectionSlug].items.push({
      title: doc.title || doc.slug,
      slug: doc.slug,
      order: doc.order || 999,
    });
  });

  // Sort sections and items
  const sections = Object.values(sectionsMap).sort((a, b) => a.order - b.order);
  sections.forEach(section => {
    section.items.sort((a, b) => a.order - b.order);
  });

  return sections;
}

export function getPrevNext(slug: string) {
  const sidebar = getSidebar();
  const flatItems: SidebarItem[] = [];
  
  sidebar.forEach(section => {
    flatItems.push(...section.items);
  });

  const currentIndex = flatItems.findIndex(item => item.slug === slug);
  if (currentIndex === -1) {
    // If it's an index file, we might not find it in items.
    return { prev: null, next: null };
  }

  return {
    prev: currentIndex > 0 ? flatItems[currentIndex - 1] : null,
    next: currentIndex < flatItems.length - 1 ? flatItems[currentIndex + 1] : null,
  };
}
