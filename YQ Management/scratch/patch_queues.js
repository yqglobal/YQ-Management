const fs = require('fs');
const file = 'frontend/src/pages/dashboard/queues/index.tsx';
let content = fs.readFileSync(file, 'utf8');

// 1. Import PrintQRModal and Printer icon
content = content.replace(
  "import { LinkServicesModal } from '../../../components/modals/LinkServicesModal';",
  "import { LinkServicesModal } from '../../../components/modals/LinkServicesModal';\nimport PrintQRModal from '../../../components/PrintQRModal';"
);
content = content.replace(
  "import { Plus, X, Loader2, ListOrdered, Settings2, PlayCircle, PauseCircle, CheckCircle2 } from 'lucide-react';",
  "import { Plus, X, Loader2, ListOrdered, Settings2, PlayCircle, PauseCircle, CheckCircle2, Printer } from 'lucide-react';"
);

// 2. Add state for PrintQRModal
content = content.replace(
  "const [showQuotaModal, setShowQuotaModal] = useState(false);",
  "const [showQuotaModal, setShowQuotaModal] = useState(false);\n  const [isPrintQRModalOpen, setIsPrintQRModalOpen] = useState(false);"
);

// 3. Add Print QR Button in Header
const headerReplacement = `          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsPrintQRModalOpen(true)}
              disabled={isLoading || queues.length === 0}
              className="flex items-center gap-2 px-4 py-2.5 bg-surface-container-low dark:bg-white/5 border border-border dark:border-dark-border hover:bg-surface-container dark:hover:bg-white/10 text-on-surface dark:text-white rounded-xl font-medium transition-colors text-sm disabled:opacity-50"
            >
              <Printer strokeWidth={1.5} className="w-4 h-4" />
              Print QR
            </button>
            <button
              onClick={() => plan.isAtQueueLimit ? setShowQuotaModal(true) : setIsModalOpen(true)}
              className="flex items-center gap-2 px-5 py-2.5 bg-primary hover:bg-primary-container text-white rounded-xl font-semibold transition-all shadow-sm border border-primary/20 hover:-translate-y-0.5 w-fit"
            >
              <Plus strokeWidth={1.5} className="w-5 h-5" />
              Create Queue
            </button>
          </div>`;
content = content.replace(
  /<button[\s\S]*?Create Queue\n\s*<\/button>/m,
  headerReplacement
);

// 4. Add the PrintQRModal component at the bottom before closing tag
content = content.replace(
  "    </AdminLayout>",
  "      <PrintQRModal \n        open={isPrintQRModalOpen} \n        onClose={() => setIsPrintQRModalOpen(false)} \n        queues={queues} \n      />\n    </AdminLayout>"
);

fs.writeFileSync(file, content);
console.log('Patched queues/index.tsx');
