import re
import os

base = "/home/abhimanyu/Projects/YQ/YQ Management/frontend"

# 1. InviteMemberModal
p = f"{base}/src/components/modals/InviteMemberModal.tsx"
with open(p, "r") as f: content = f.read()
content = re.sub(r'ChevronDown,?', '', content)
content = re.sub(r'const \[selectedServiceIds, setSelectedServiceIds\] = useState<string\[\]>\(\[\]\);', r'const [selectedServiceIds] = useState<string[]>([]);', content)
content = re.sub(r'const { data: services = \[\] } = useQuery\({[^}]*}\);', r'', content)
content = content.replace('setInviteResult(res: any)', 'setInviteResult(res: unknown)')
content = content.replace('(res: any) =>', '(res: unknown) =>')
content = content.replace('(data: any)', '(data: Record<string, unknown>)')
content = content.replace('catch (e: any)', 'catch (e: Error | unknown)')
content = content.replace('(loc: any)', '(loc: { id: string; name: string })')
with open(p, "w") as f: f.write(content)

# 2. usePlan.ts
p = f"{base}/src/hooks/usePlan.ts"
with open(p, "r") as f: content = f.read()
content = content.replace('(q: any)', '(q: { frozenByQuota?: boolean })')
content = content.replace('(l: any)', '(l: { frozenByQuota?: boolean })')
content = content.replace('(s: any)', '(s: { frozenByQuota?: boolean })')
content = content.replace('(m: any)', '(m: { status?: string; isInvite?: boolean; frozenByQuota?: boolean })')
content = content.replace('(v: any)', '(v: { createdAt?: string })')
with open(p, "w") as f: f.write(content)

# 3. providers.tsx
p = f"{base}/src/pages/dashboard/settings/_components/providers.tsx"
with open(p, "r") as f: content = f.read()
content = content.replace('onSuccess: (res: any)', 'onSuccess: (res: unknown)')
with open(p, "w") as f: f.write(content)

# 4. staff.tsx
p = f"{base}/src/pages/dashboard/settings/_components/staff.tsx"
with open(p, "r") as f: content = f.read()
content = re.sub(r'Briefcase,\s*Edit2,\s*ToggleLeft,\s*ToggleRight,\s*ChevronDown,?', '', content)
content = content.replace('(loc: any)', '(loc: { id: string; name: string })')
content = re.sub(r'const canManageProviders = [^;]+;', '', content)
with open(p, "w") as f: f.write(content)

# 5. operations.tsx
p = f"{base}/src/pages/dashboard/settings/operations.tsx"
with open(p, "r") as f: content = f.read()
content = re.sub(r'Clock,?', '', content)
content = content.replace('(data: any)', '(data: Record<string, unknown>)')
content = content.replace('(res: any)', '(res: unknown)')
content = content.replace('catch (e: any)', 'catch (e: Error | unknown)')
content = content.replace('(loc: any)', '(loc: { id: string; name: string })')
content = content.replace('(svc: any)', '(svc: { id: string; name: string })')
content = content.replace('(e: any)', '(e: React.ChangeEvent<HTMLInputElement> | React.FormEvent | Error | unknown)')
content = re.sub(r'const updateServiceMutation = useMutation\([^)]+\);', '', content)
content = re.sub(r'const handleCreateLocation = \([^)]+\) => {[^}]+};', '', content)
content = re.sub(r'const startEditLocation = \([^)]+\) => {[^}]+};', '', content)
content = re.sub(r'const handleUpdateLocation = \([^)]+\) => {[^}]+};', '', content)
with open(p, "w") as f: f.write(content)

