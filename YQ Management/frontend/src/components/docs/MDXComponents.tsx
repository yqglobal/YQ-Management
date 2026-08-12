import Callout from './Callout';
import Mermaid from './Mermaid';
import VersionHistory from './VersionHistory';
import RelatedDocs from './RelatedDocs';

// Map HTML tags to custom React components if needed
export const MDXComponents = {
  Callout,
  Mermaid,
  VersionHistory,
  RelatedDocs,
  // You can override standard tags too
  a: (props: any) => (
    <a {...props} className="text-indigo-400 hover:text-indigo-300 hover:underline" />
  ),
};
